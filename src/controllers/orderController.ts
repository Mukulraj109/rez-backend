import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { Order } from '../models/Order';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { User } from '../models/User';
import {
  sendSuccess,
  sendNotFound,
  sendBadRequest,
  sendUnauthorized
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import stockSocketService from '../services/stockSocketService';
import { pct } from '../utils/currency';
import reorderService from '../services/reorderService';
import activityService from '../services/activityService';
import referralService from '../services/referralService';
import cashbackService from '../services/cashbackService';
import challengeService from '../services/challengeService';
import userProductService from '../services/userProductService';
import couponService from '../services/couponService';
import achievementService from '../services/achievementService';
import gamificationEventBus from '../events/gamificationEventBus';
import { reputationService } from '../services/reputationService';
import { walletService } from '../services/walletService';
import { processConversion } from '../services/creatorService';
// Note: StorePromoCoin removed - using wallet.brandedCoins instead
import { Wallet } from '../models/Wallet';
import { calculatePromoCoinsEarned, calculatePromoCoinsWithTierBonus, getCoinsExpiryDate } from '../config/promoCoins.config';
import SmartSpendItem from '../models/SmartSpendItem';
import { CHECKOUT_CONFIG } from '../config/checkoutConfig';
import { Subscription } from '../models/Subscription';
import { SMSService } from '../services/SMSService';
import EmailService from '../services/EmailService';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import { MainCategorySlug, CoinTransaction } from '../models/CoinTransaction';
import { LedgerEntry } from '../models/LedgerEntry';
import { logger } from '../config/logger';
import redisService from '../services/redisService';
import { CacheInvalidator } from '../utils/cacheHelper';

const VALID_CATEGORY_SLUGS: MainCategorySlug[] = ['food-dining', 'beauty-wellness', 'grocery-essentials', 'fitness-sports', 'healthcare', 'fashion', 'education-learning', 'home-services', 'travel-experiences', 'entertainment', 'financial-lifestyle', 'electronics'];

// In-memory cache for category→root slug mapping (avoids N DB calls per order)
const CATEGORY_ROOT_CACHE_KEY = 'cache:category-root-map';
const CATEGORY_ROOT_CACHE_TTL = 300; // 5 minutes
let localCategoryCache: Map<string, string | null> | null = null;
let localCacheTTL = 0;

/**
 * Build or retrieve a map of categoryId → root MainCategory slug.
 * Cached in Redis (5min) with in-memory fallback.
 */
async function getCategoryRootMap(): Promise<Map<string, string | null>> {
  // Check local memory cache first
  if (localCategoryCache && Date.now() < localCacheTTL) {
    return localCategoryCache;
  }

  // Try Redis cache
  try {
    const cached = await redisService.get<[string, string | null][]>(CATEGORY_ROOT_CACHE_KEY);
    if (cached) {
      localCategoryCache = new Map<string, string | null>(cached);
      localCacheTTL = Date.now() + CATEGORY_ROOT_CACHE_TTL * 1000;
      return localCategoryCache;
    }
  } catch { /* Redis unavailable — build from DB */ }

  // Build from DB: load all categories in one query
  const allCategories = await Category.find({}).select('slug parentCategory').lean();
  const catMap = new Map<string, { slug: string; parentId: string | null }>();
  for (const cat of allCategories) {
    catMap.set(cat._id.toString(), {
      slug: cat.slug,
      parentId: cat.parentCategory ? cat.parentCategory.toString() : null,
    });
  }

  // Resolve each category to its root slug
  const rootMap = new Map<string, string | null>();
  for (const [catId] of catMap) {
    let currentId: string | null = catId;
    let depth = 5;
    let rootSlug: string | null = null;

    while (currentId && depth-- > 0) {
      const entry = catMap.get(currentId);
      if (!entry) break;
      if (!entry.parentId) {
        // Root category found
        rootSlug = VALID_CATEGORY_SLUGS.includes(entry.slug as MainCategorySlug) ? entry.slug : null;
        break;
      }
      currentId = entry.parentId;
    }
    rootMap.set(catId, rootSlug);
  }

  // Cache in Redis + memory
  try {
    await redisService.set(CATEGORY_ROOT_CACHE_KEY, [...rootMap], CATEGORY_ROOT_CACHE_TTL);
  } catch { /* Redis unavailable */ }
  localCategoryCache = rootMap;
  localCacheTTL = Date.now() + CATEGORY_ROOT_CACHE_TTL * 1000;

  return rootMap;
}

/**
 * Get the root MainCategory slug for a store.
 * Uses cached category hierarchy (1 DB query for all categories, cached 5min).
 */
async function getStoreCategorySlug(storeId: string): Promise<MainCategorySlug | null> {
  try {
    const store = await Store.findById(storeId).select('category').lean();
    if (!store?.category) return null;

    const rootMap = await getCategoryRootMap();
    const rootSlug = rootMap.get(store.category.toString());
    return (rootSlug as MainCategorySlug) || null;
  } catch (err) {
    logger.error('[ORDER] Error getting store category slug:', err);
    return null;
  }
}
import { Refund } from '../models/Refund';
import merchantWalletService from '../services/merchantWalletService';
import orderSocketService from '../services/orderSocketService';
import merchantNotificationService from '../services/merchantNotificationService';
import { isValidTransition, isValidMerchantTransition, STATUS_TRANSITIONS, MERCHANT_TRANSITIONS, ACTIVE_STATUSES, PAST_STATUSES, getOrderProgress } from '../config/orderStateMachine';
import etaService from '../services/etaService';

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create order from cart
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deliveryAddress
 *               - paymentMethod
 *             properties:
 *               deliveryAddress:
 *                 type: object
 *                 required: [name, phone, addressLine1, city, state, pincode]
 *                 properties:
 *                   name:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   addressLine1:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   pincode:
 *                     type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: [cod, wallet, razorpay, upi, card, netbanking, stripe]
 *               specialInstructions:
 *                 type: string
 *               couponCode:
 *                 type: string
 *               voucherCode:
 *                 type: string
 *               coinsUsed:
 *                 type: object
 *                 description: Coin amounts to deduct from wallet
 *                 properties:
 *                   rezCoins:
 *                     type: number
 *                     description: REZ coins to use
 *                   promoCoins:
 *                     type: number
 *                     description: Promo coins to use
 *                   storePromoCoins:
 *                     type: number
 *                     description: Store promo coins to use
 *               storeId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *               idempotencyKey:
 *                 type: string
 *               fulfillmentType:
 *                 type: string
 *                 enum: [delivery, pickup, dine_in]
 *               fulfillmentDetails:
 *                 type: object
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error (empty cart, invalid payment, etc.)
 *       401:
 *         description: Unauthorized
 */
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { deliveryAddress, paymentMethod, specialInstructions, couponCode, voucherCode, coinsUsed, storeId, items: requestItems, redemptionCode, offerRedemptionCode, lockFeeDiscount: clientLockFeeDiscount, idempotencyKey, pickId, fulfillmentType: reqFulfillmentType, fulfillmentDetails: reqFulfillmentDetails } = req.body;
  const fulfillmentType = reqFulfillmentType || 'delivery';

  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Idempotency check: prevent duplicate orders from network retries
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ user: userId, idempotencyKey }).session(session).lean();
      if (existingOrder) {
        await session.abortTransaction();
        session.endSession();
        return sendSuccess(res, { order: existingOrder }, 'Order already exists');
      }
    }

    // Get user's cart
    const cart = await Cart.findOne({ user: userId })
      .populate({
        path: 'items.product',
        select: 'name image images isActive inventory'
      })
      .populate({
        path: 'items.store',
        select: 'name logo'
      })
      .session(session).lean();

    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, 'Cart is empty');
    }

    // Filter cart items by storeId if provided (for multi-store order splitting)
    let itemsToProcess = cart.items;
    if (storeId) {
      itemsToProcess = cart.items.filter((item: any) => {
        const itemStoreId = typeof item.store === 'object' ? item.store._id?.toString() : item.store?.toString();
        return itemStoreId === storeId;
      });
      if (itemsToProcess.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, 'No items found for the specified store');
      }
    }

    // Also support filtering by specific product IDs (for more granular control)
    if (requestItems && Array.isArray(requestItems) && requestItems.length > 0) {
      const productIds = requestItems.map((item: any) => item.product?.toString() || item.id?.toString()).filter(Boolean);
      if (productIds.length > 0) {
        itemsToProcess = itemsToProcess.filter((item: any) => {
          const itemProductId = typeof item.product === 'object' ? item.product._id?.toString() : item.product?.toString();
          return productIds.includes(itemProductId);
        });
      }
    }

    // Create a virtual cart object with filtered items for order processing
    const orderCart = {
      ...cart.toObject(),
      items: itemsToProcess
    };

    // Validate payment method
    const validPaymentMethods = ['cod', 'wallet', 'razorpay', 'upi', 'card', 'netbanking', 'stripe'];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, `Invalid payment method. Allowed: ${validPaymentMethods.join(', ')}`);
    }

    // Validate address fields based on fulfillment type.
    // Delivery requires full address; non-delivery accepts minimal address.
    const isDeliveryOrder = fulfillmentType === 'delivery';
    const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
    const pincodeRegex = /^\d{6}$/;

    if (isDeliveryOrder) {
      if (!deliveryAddress) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, 'Delivery address is required');
      }

      const requiredAddressFields = ['name', 'phone', 'addressLine1', 'city', 'state', 'pincode'];
      const missingFields = requiredAddressFields.filter(field => !deliveryAddress[field]);
      if (missingFields.length > 0) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, `Missing required address fields: ${missingFields.join(', ')}`);
      }

      const cleanPhone = String(deliveryAddress.phone || '').replace(/[\s-]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, 'Invalid phone number format');
      }

      if (!pincodeRegex.test(String(deliveryAddress.pincode || ''))) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, 'Invalid pincode format (must be 6 digits)');
      }
    } else if (deliveryAddress) {
      const requiredNonDeliveryFields = ['name', 'phone'];
      const missingNonDeliveryFields = requiredNonDeliveryFields.filter(field => !deliveryAddress[field]);
      if (missingNonDeliveryFields.length > 0) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, `Missing required address fields: ${missingNonDeliveryFields.join(', ')}`);
      }

      const cleanPhone = String(deliveryAddress.phone || '').replace(/[\s-]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, 'Invalid phone number format');
      }

      if (deliveryAddress.pincode && !pincodeRegex.test(String(deliveryAddress.pincode))) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, 'Invalid pincode format (must be 6 digits)');
      }
    }

    // Validate all items belong to the same store (using filtered orderCart)
    const storeIds = new Set(orderCart.items.map((item: any) => {
      const store = item.store;
      return typeof store === 'object' ? store._id?.toString() : store?.toString();
    }).filter(Boolean));

    if (storeIds.size > 1) {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, 'All items must be from the same store. Please create separate orders for different stores.');
    }

    // Validate coin balances if coins are being used
    if (coinsUsed && (coinsUsed.rezCoins > 0 || coinsUsed.storePromoCoins > 0 || coinsUsed.promoCoins > 0)) {
      // Validate REZ coins
      if (coinsUsed.rezCoins > 0) {
        const coinService = require('../services/coinService').default;
        const userCoinBalance = await coinService.getCoinBalance(userId);
        if (userCoinBalance < coinsUsed.rezCoins) {
          await session.abortTransaction();
          session.endSession();
          logger.error('[CREATE ORDER] Insufficient REZ coin balance:', {
            required: coinsUsed.rezCoins,
            available: userCoinBalance
          });
          return sendBadRequest(res, `Insufficient REZ coin balance. Required: ${coinsUsed.rezCoins}, Available: ${userCoinBalance}`);
        }
      }

      // Load wallet ONCE for both promo and branded coin validations (avoids duplicate DB query)
      const needsWalletValidation = coinsUsed.promoCoins > 0 || coinsUsed.storePromoCoins > 0;
      const validationWallet = needsWalletValidation
        ? await Wallet.findOne({ user: userId }).session(session).lean()
        : null;

      // Validate promo coins (reuses validationWallet)
      if (coinsUsed.promoCoins > 0) {
        const promoCoin = (validationWallet as any)?.coins?.find((c: any) => c.type === 'promo');
        const promoBalance = promoCoin?.amount || 0;
        if (promoBalance < coinsUsed.promoCoins) {
          await session.abortTransaction();
          session.endSession();
          logger.error('[CREATE ORDER] Insufficient promo coin balance:', {
            required: coinsUsed.promoCoins,
            available: promoBalance
          });
          return sendBadRequest(res, `Insufficient promo coin balance. Required: ${coinsUsed.promoCoins}, Available: ${promoBalance}`);
        }
        // Pre-checkout expiry check: reject if promo coins have expired
        // Check legacy wallet field
        const promoExpiryRaw = promoCoin?.promoDetails?.expiryDate || promoCoin?.expiryDate;
        if (promoExpiryRaw) {
          const expDate = new Date(promoExpiryRaw as string | number | Date);
          if (expDate <= new Date()) {
            await session.abortTransaction();
            session.endSession();
            return sendBadRequest(res, 'Your promo coins have expired. Please refresh your wallet balance.');
          }
        }
        // Also check CoinTransaction-based expiry (new system)
        const expiredPromoTx = await CoinTransaction.findOne({
          user: userId,
          type: 'earned',
          'metadata.coinType': 'promo',
          expiresAt: { $lte: new Date() },
          'metadata.isExpired': { $ne: true },
        }).session(session).lean();
        if (expiredPromoTx) {
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res, 'Some of your promo coins have expired. Please refresh your wallet balance.');
        }
      }

      // Validate store promo coins (reuses validationWallet — no extra DB query)
      if (coinsUsed.storePromoCoins > 0) {
        // Get the store from the first order item - now using branded coins
        const firstItem = orderCart.items[0];
        const orderStoreId = typeof firstItem.store === 'object'
          ? (firstItem.store as any)._id
          : firstItem.store;

        if (orderStoreId) {
          const brandedCoin = (validationWallet as any)?.brandedCoins?.find(
            (bc: any) => bc.merchantId?.toString() === orderStoreId.toString()
          );
          const brandedBalance = brandedCoin?.amount || 0;

          if (brandedBalance < coinsUsed.storePromoCoins) {
            await session.abortTransaction();
            session.endSession();
            logger.error('[CREATE ORDER] Insufficient branded coin balance:', {
              required: coinsUsed.storePromoCoins,
              available: brandedBalance
            });
            return sendBadRequest(res, `Insufficient store coin balance. Required: ${coinsUsed.storePromoCoins}, Available: ${brandedBalance}`);
          }
        }
      }
    }

    // Validate products availability and build order items
    const orderItems = [];
    const stockUpdates = []; // Track stock updates for atomic operation

    for (const cartItem of orderCart.items) {
      const product = cartItem.product as any;
      const store = cartItem.store as any;

      if (!product) {
        await session.abortTransaction();
        session.endSession();
        logger.error('[CREATE ORDER] Product is null/undefined for cart item');
        return sendBadRequest(res, 'Invalid product in cart');
      }

      if (!store) {
        await session.abortTransaction();
        session.endSession();
        logger.error('[CREATE ORDER] Store is null/undefined for product:', product.name);
        return sendBadRequest(res, `Product "${product.name}" has no associated store`);
      }

      if (!product.isActive) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, `Product "${product.name}" is not available`);
      }

      // Check stock availability and prepare atomic update
      const requestedQuantity = cartItem.quantity;
      let availableStock = 0;
      let updateQuery: any = {};
      let stockCheckQuery: any = { _id: product._id };

      // Skip stock deduction for unlimited products (digital goods, etc.)
      if (product.inventory?.unlimited) {
        // No stock update needed for unlimited products
      } else if (cartItem.variant && product.inventory?.variants?.length > 0) {
        // Handle variant stock
        const variant = product.inventory.variants.find((v: any) =>
          v.type === cartItem.variant?.type && v.value === cartItem.variant?.value
        );

        if (!variant) {
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res, `Variant not found for product "${product.name}"`);
        }

        availableStock = variant.stock;
        // Check if sufficient stock
        if (availableStock < requestedQuantity) {
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res,
            `Insufficient stock for "${product.name}" (${variant.type}: ${variant.value}). Available: ${availableStock}, Requested: ${requestedQuantity}`
          );
        }

        // Prepare atomic update for variant stock AND main product stock
        const mainStock = product.inventory?.stock || 0;
        const newMainStock = mainStock - requestedQuantity;
        updateQuery = {
          $inc: {
            'inventory.variants.$[variant].stock': -requestedQuantity,
            'inventory.stock': -requestedQuantity
          }
        };
        stockCheckQuery['inventory.variants'] = {
          $elemMatch: {
            type: cartItem.variant.type,
            value: cartItem.variant.value,
            stock: { $gte: requestedQuantity }
          }
        };

        // Set isAvailable to false if main stock becomes 0
        if (newMainStock <= 0) {
          updateQuery.$set = {
            'inventory.isAvailable': false
          };
        }

        stockUpdates.push({
          productId: product._id,
          updateQuery,
          stockCheckQuery,
          arrayFilters: [{
            'variant.type': cartItem.variant.type,
            'variant.value': cartItem.variant.value
          }]
        });

      } else {
        // Handle main product stock
        availableStock = product.inventory?.stock || 0;
        // Check if sufficient stock
        if (availableStock < requestedQuantity) {
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res,
            `Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${requestedQuantity}`
          );
        }

        // Prepare atomic update for main product stock
        updateQuery = {
          $inc: {
            'inventory.stock': -requestedQuantity
          }
        };
        stockCheckQuery['inventory.stock'] = { $gte: requestedQuantity };

        // Set isAvailable to false if stock becomes 0
        const newStock = availableStock - requestedQuantity;
        if (newStock === 0) {
          updateQuery.$set = {
            'inventory.isAvailable': false
          };
        }

        stockUpdates.push({
          productId: product._id,
          updateQuery,
          stockCheckQuery,
          arrayFilters: null
        });
      }

      // Get product image - provide default if missing
      const productImage = product.image || product.images?.[0] || 'https://via.placeholder.com/150';

      // Build order item
      const orderItem: any = {
        product: product._id,
        store: store._id,
        storeName: store.name, // Store name for display without populate
        name: product.name,
        image: productImage,
        quantity: cartItem.quantity,
        variant: cartItem.variant || undefined,
        price: cartItem.price || 0,
        originalPrice: cartItem.originalPrice || cartItem.price || 0,
        discount: cartItem.discount || 0,
        subtotal: (cartItem.price || 0) * cartItem.quantity
      };

      // Propagate Smart Spend source for enhanced Privé coin earning
      if (cartItem.metadata?.source === 'smart_spend' && cartItem.metadata?.smartSpendItemId) {
        try {
          const ssItem = await SmartSpendItem.findById(cartItem.metadata.smartSpendItemId).select('coinRewardRate').lean();
          if (ssItem) {
            orderItem.smartSpendSource = {
              smartSpendItemId: cartItem.metadata.smartSpendItemId,
              coinRewardRate: ssItem.coinRewardRate, // snapshot rate at order time
            };
          }
        } catch (ssErr) {
          // SmartSpendItem lookup failed - non-critical
        }
      }

      orderItems.push(orderItem);
    }

    // Note: Stock deduction is now deferred until payment is confirmed
    // This prevents stock being locked for failed payments
    // Stock deduction will happen in paymentService.handlePaymentSuccess()

    // BUGFIX: Calculate totals from filtered items, NOT full cart
    // For multi-store orders, each order should only include its store's items
    const filteredSubtotal = itemsToProcess.reduce((sum: number, item: any) => {
      return sum + ((item.price || 0) * (item.quantity || 1));
    }, 0);

    // Use filtered subtotal for this order (not full cart subtotal)
    const subtotal = filteredSubtotal;

    // Calculate tax (5%) on filtered subtotal
    const taxRate = 0.05;
    const tax = Math.round(subtotal * taxRate * 100) / 100;

    // Calculate discount proportionally based on filtered items ratio
    const fullCartSubtotal = cart.totals.subtotal || 0;
    const discountRatio = fullCartSubtotal > 0 ? subtotal / fullCartSubtotal : 1;
    const baseDiscount = Math.round((cart.totals.discount || 0) * discountRatio * 100) / 100;

    // Calculate 15% platform fee on SUBTOTAL ONLY (excludes tax and delivery)
    const platformFeeRate = CHECKOUT_CONFIG.merchantFee?.percentage || 0.15;
    const minFee = CHECKOUT_CONFIG.merchantFee?.minFee || 2;
    const maxFee = CHECKOUT_CONFIG.merchantFee?.maxFee || 10000;
    let platformFee = Math.round(subtotal * platformFeeRate * 100) / 100;
    // Apply min/max constraints
    platformFee = Math.max(minFee, Math.min(maxFee, platformFee));
    const merchantPayout = Math.round((subtotal - platformFee) * 100) / 100;

    // Apply partner benefits to order
    const partnerBenefitsService = require('../services/partnerBenefitsService').default;

    // Calculate base delivery fee for THIS order's subtotal
    // For non-delivery fulfillment types (pickup, drive_thru, dine_in), delivery fee is 0
    const FREE_DELIVERY_THRESHOLD = 500;
    const STANDARD_DELIVERY_FEE = 50;
    const baseDeliveryFee = fulfillmentType !== 'delivery' ? 0 :
      (subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE);

    const partnerBenefits = await partnerBenefitsService.applyPartnerBenefits({
      subtotal,
      deliveryFee: baseDeliveryFee, // Use calculated delivery fee for this order
      userId: userId.toString()
    });
    
    // Use partner-adjusted values
    const deliveryFee = partnerBenefits.deliveryFee;
    let discount = baseDiscount + partnerBenefits.birthdayDiscount;
    const cashback = partnerBenefits.cashbackAmount;
    
    // Apply partner voucher if provided (FIXED: Issue #4 - Voucher redemption)
    let voucherDiscount = 0;
    let voucherApplied = '';
    if (voucherCode) {
      const partnerService = require('../services/partnerService').default;
      const voucherResult = await partnerService.applyVoucher(
        userId.toString(), 
        voucherCode, 
        subtotal
      );
      
      if (voucherResult.valid) {
        voucherDiscount = voucherResult.discount;
        voucherApplied = voucherCode;
        discount += voucherDiscount;
      } else {
        // Don't fail order creation, just don't apply the voucher
      }
    }

    // Apply deal redemption code if provided
    let redemptionDiscount = 0;
    let appliedRedemption: any = null;
    if (redemptionCode) {
      const DealRedemption = require('../models/DealRedemption').default;

      const redemption = await DealRedemption.findOne({
        redemptionCode: redemptionCode.toUpperCase(),
        user: new mongoose.Types.ObjectId(userId),
      }).session(session).lean();

      if (redemption) {
        // Check if redemption is active - return error if not
        if (redemption.status !== 'active') {
          await session.abortTransaction();
          session.endSession();
          const statusMessages: Record<string, string> = {
            'pending': 'This deal code is pending payment confirmation',
            'used': 'This deal code has already been used',
            'expired': 'This deal code has expired',
            'cancelled': 'This deal code was cancelled'
          };
          return sendBadRequest(res, statusMessages[redemption.status] || `Deal code is ${redemption.status}`);
        } else if (new Date(redemption.expiresAt) < new Date()) {
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res, 'This deal code has expired');
        } else {
          // Calculate the benefit
          const deal = redemption.dealSnapshot;
          if (deal?.cashback) {
            const match = deal.cashback.match(/(\d+)/);
            if (match) {
              const value = parseInt(match[1]);
              redemptionDiscount = deal.cashback.includes('%')
                ? pct(subtotal, value)
                : value;
            }
          } else if (deal?.discount) {
            const match = deal.discount.match(/(\d+)/);
            if (match) {
              const value = parseInt(match[1]);
              redemptionDiscount = deal.discount.includes('%')
                ? pct(subtotal, value)
                : value;
            }
          }

          // Apply max benefit cap from campaign
          if (redemption.campaignSnapshot?.maxBenefit && redemptionDiscount > redemption.campaignSnapshot.maxBenefit) {
            redemptionDiscount = redemption.campaignSnapshot.maxBenefit;
          }

          appliedRedemption = redemption;
          discount += redemptionDiscount;
        }
      } else {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, 'Invalid deal code. Please check the code and try again.');
      }
    }

    // Apply offer redemption code if provided (RED-xxx format cashback vouchers)
    let offerRedemptionCashback = 0;
    let appliedOfferRedemption: any = null;
    if (offerRedemptionCode) {
      const OfferRedemption = require('../models/OfferRedemption').default;
      const Offer = require('../models/Offer').default;

      const offerRedemption = await OfferRedemption.findOne({
        $or: [
          { redemptionCode: offerRedemptionCode.toUpperCase() },
          { verificationCode: offerRedemptionCode }
        ],
        user: new mongoose.Types.ObjectId(userId),
      }).populate('offer', 'title cashbackPercentage restrictions').session(session).lean();

      if (offerRedemption) {
        // Check if redemption is active
        if (offerRedemption.status !== 'active') {
          await session.abortTransaction();
          session.endSession();
          const statusMessages: Record<string, string> = {
            'pending': 'This voucher is pending activation',
            'used': 'This voucher has already been used',
            'expired': 'This voucher has expired',
            'cancelled': 'This voucher was cancelled'
          };
          return sendBadRequest(res, statusMessages[offerRedemption.status] || `Voucher is ${offerRedemption.status}`);
        }

        // Check expiry
        if (new Date(offerRedemption.expiryDate) < new Date()) {
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res, 'This voucher has expired');
        }

        const offer = offerRedemption.offer as any;

        // Check minimum order value
        if (offer?.restrictions?.minOrderValue && subtotal < offer.restrictions.minOrderValue) {
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res, `Minimum order value of ₹${offer.restrictions.minOrderValue} required for this voucher`);
        }

        // Calculate cashback
        const cashbackPercentage = offer?.cashbackPercentage || 0;
        offerRedemptionCashback = pct(subtotal, cashbackPercentage);

        // Apply max discount cap
        if (offer?.restrictions?.maxDiscountAmount && offerRedemptionCashback > offer.restrictions.maxDiscountAmount) {
          offerRedemptionCashback = offer.restrictions.maxDiscountAmount;
        }

        appliedOfferRedemption = offerRedemption;
      } else {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, 'Invalid voucher code. Please check the code and try again.');
      }
    }

    // Calculate coin discount from coinsUsed
    const coinDiscount = coinsUsed
      ? (coinsUsed.rezCoins || 0) + (coinsUsed.promoCoins || 0) + (coinsUsed.storePromoCoins || 0)
      : 0;

    // Lock fee discount (amount already paid by customer when locking item)
    const lockFeeDiscount = Number(clientLockFeeDiscount) || 0;
    if (lockFeeDiscount > 0) {
    }

    // Validate coin discount doesn't exceed order total (prevent negative payment)
    const maxAllowedCoinDiscount = subtotal + tax + deliveryFee - discount - lockFeeDiscount;
    if (coinDiscount > maxAllowedCoinDiscount) {
      await session.abortTransaction();
      session.endSession();
      logger.error('[CREATE ORDER] Coin discount exceeds order total:', {
        coinDiscount,
        maxAllowedCoinDiscount
      });
      return sendBadRequest(res, `Coin discount (₹${coinDiscount}) exceeds order total (₹${maxAllowedCoinDiscount})`);
    }

    // Calculate total with partner benefits, voucher, lock fee, and coin discount
    let total = subtotal + tax + deliveryFee - discount - lockFeeDiscount - coinDiscount;
    if (total < 0) total = 0;

    // Generate order number
    const orderCount = await Order.countDocuments().session(session);
    const orderNumber = `ORD${Date.now()}${String(orderCount + 1).padStart(4, '0')}`;

    // Get primary store - use storeId from request (for multi-store orders) or extract from first item
    const primaryStoreId = storeId || orderItems[0]?.store;

    // Validate fulfillment type against store serviceCapabilities
    const FULFILLMENT_TO_CAPABILITY: Record<string, string> = {
      delivery: 'homeDelivery',
      pickup: 'storePickup',
      drive_thru: 'driveThru',
      dine_in: 'dineIn'
    };

    // Fetch store once for fulfillment validation, address lookup, and details
    const primaryStoreDoc = (fulfillmentType !== 'delivery' && primaryStoreId)
      ? await Store.findById(primaryStoreId).select('serviceCapabilities name location').lean().session(session)
      : null;

    if (fulfillmentType !== 'delivery' && primaryStoreId) {
      const capKey = FULFILLMENT_TO_CAPABILITY[fulfillmentType];
      const capEnabled = (primaryStoreDoc?.serviceCapabilities as any)?.[capKey]?.enabled;
      if (!capEnabled) {
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, `This store does not support ${fulfillmentType.replace('_', ' ')} orders`);
      }
    }

    // Map fulfillment type to delivery method
    const FULFILLMENT_TO_METHOD: Record<string, string> = {
      delivery: 'standard',
      pickup: 'pickup',
      drive_thru: 'drive_thru',
      dine_in: 'dine_in'
    };
    const deliveryMethod = FULFILLMENT_TO_METHOD[fulfillmentType] || 'standard';

    // For non-delivery fulfillment types, override delivery fee to 0
    const finalDeliveryFee = fulfillmentType === 'delivery' ? deliveryFee : 0;

    // Recalculate total if delivery fee changed due to fulfillment type
    let finalTotal = total;
    if (finalDeliveryFee !== deliveryFee) {
      finalTotal = subtotal + tax + finalDeliveryFee - discount - lockFeeDiscount - coinDiscount;
      if (finalTotal < 0) finalTotal = 0;
    }

    // Build delivery address: for non-delivery types, use minimal address or store address
    let orderDeliveryAddress = deliveryAddress;
    if (fulfillmentType !== 'delivery' && (!deliveryAddress || !deliveryAddress.addressLine1)) {
      orderDeliveryAddress = {
        name: deliveryAddress?.name || 'Store Pickup',
        phone: deliveryAddress?.phone || '',
        addressLine1: primaryStoreDoc?.location?.address || 'Store Address',
        city: primaryStoreDoc?.location?.city || '',
        state: primaryStoreDoc?.location?.state || '',
        pincode: primaryStoreDoc?.location?.pincode || '',
        country: 'India'
      };
    }

    // Build fulfillment details
    let fulfillmentDetailsData: any = undefined;
    if (fulfillmentType !== 'delivery') {
      fulfillmentDetailsData = {
        storeAddress: primaryStoreDoc?.location?.address,
        storeCoordinates: primaryStoreDoc?.location?.coordinates,
        ...(reqFulfillmentDetails || {}),
      };
      if (fulfillmentType === 'pickup') {
        fulfillmentDetailsData.estimatedReadyTime = new Date(Date.now() + 20 * 60 * 1000);
      } else if (fulfillmentType === 'drive_thru') {
        fulfillmentDetailsData.estimatedReadyTime = new Date(Date.now() + 10 * 60 * 1000);
      }
    }

    // Create order
    const order = new Order({
      orderNumber,
      user: userId,
      store: primaryStoreId,
      fulfillmentType,
      fulfillmentDetails: fulfillmentDetailsData,
      idempotencyKey: idempotencyKey || undefined,
      items: orderItems,
      totals: {
        subtotal,
        tax,
        delivery: finalDeliveryFee,
        discount,
        lockFeeDiscount,
        cashback,
        total: finalTotal,
        paidAmount: paymentMethod === 'cod' ? 0 : finalTotal,
        platformFee,
        merchantPayout
      },
      payment: {
        method: paymentMethod,
        status: paymentMethod === 'cod' ? 'pending' : 'awaiting_payment',
        coinsUsed: coinsUsed ? {
          rezCoins: coinsUsed.rezCoins || 0,
          promoCoins: coinsUsed.promoCoins || 0,
          storePromoCoins: coinsUsed.storePromoCoins || 0,
          totalCoinsValue: (coinsUsed.rezCoins || 0) + (coinsUsed.promoCoins || 0) + (coinsUsed.storePromoCoins || 0)
        } : undefined
      },
      delivery: {
        method: deliveryMethod,
        status: 'pending',
        address: orderDeliveryAddress,
        deliveryFee: finalDeliveryFee
      },
      timeline: [{
        status: 'placed',
        message: fulfillmentType === 'delivery' ? 'Order placed - awaiting payment' :
                 fulfillmentType === 'pickup' ? 'Pickup order placed' :
                 fulfillmentType === 'drive_thru' ? 'Drive-thru order placed' :
                 fulfillmentType === 'dine_in' ? 'Dine-in order placed' :
                 'Order placed - awaiting payment',
        timestamp: new Date()
      }],
      status: 'placed',
      couponCode: cart.coupon?.code,
      specialInstructions,
      // Add redemption info if a deal code was applied
      redemption: appliedRedemption ? {
        code: appliedRedemption.redemptionCode,
        discount: redemptionDiscount,
        dealTitle: appliedRedemption.campaignSnapshot?.title,
      } : undefined,
      // Add offer redemption info if an offer voucher was applied
      offerRedemption: appliedOfferRedemption ? {
        code: appliedOfferRedemption.redemptionCode,
        cashback: offerRedemptionCashback,
        offerTitle: (appliedOfferRedemption.offer as any)?.title || 'Offer Cashback',
      } : undefined,
      // Creator pick attribution
      analytics: pickId ? { attributionPickId: pickId } : undefined,
    });

    await order.save({ session });

    // Mark deal redemption as used if applied
    if (appliedRedemption) {
      appliedRedemption.status = 'used';
      appliedRedemption.usedAt = new Date();
      appliedRedemption.orderId = order._id;
      appliedRedemption.benefitApplied = redemptionDiscount;
      await appliedRedemption.save({ session });
    }

    // Mark offer redemption as used and credit cashback if applied
    if (appliedOfferRedemption && offerRedemptionCashback > 0) {
      // Mark as used
      appliedOfferRedemption.status = 'used';
      appliedOfferRedemption.usedDate = new Date();
      appliedOfferRedemption.order = order._id;
      appliedOfferRedemption.usedAmount = offerRedemptionCashback;
      await appliedOfferRedemption.save({ session });

      // Credit cashback to user's wallet via walletService (handles wallet creation, CoinTransaction, ledger, audit)
      await walletService.credit({
        userId: String(order.user),
        amount: offerRedemptionCashback,
        source: 'purchase_reward',
        description: `Offer cashback from order #${order.orderNumber}`,
        operationType: 'offer_cashback',
        referenceId: String(order._id),
        referenceModel: 'Order',
        metadata: { orderId: order._id, orderNumber: order.orderNumber },
        session,
      });
      // Send push notification (async, don't wait)
      try {
        const NotificationService = require('../services/notificationService').default;
        NotificationService.sendToUser(userId.toString(), {
          title: 'Cashback Credited! 🎉',
          body: `₹${offerRedemptionCashback} cashback has been added to your wallet for order #${order.orderNumber}`,
          data: {
            type: 'cashback_credited',
            amount: offerRedemptionCashback,
            orderId: (order as any)._id?.toString() || '',
            orderNumber: order.orderNumber,
          }
        }).catch((err: any) => logger.error('Failed to send cashback notification:', err));
      } catch (notifError) {
        logger.error('Failed to send cashback notification:', notifError);
      }

    }

    // For COD orders, deduct stock immediately since payment confirmation never happens
    if (paymentMethod === 'cod') {
      for (const stockUpdate of stockUpdates) {
        try {
          const updateResult = await Product.findOneAndUpdate(
            stockUpdate.stockCheckQuery,
            stockUpdate.updateQuery,
            {
              session,
              arrayFilters: stockUpdate.arrayFilters || undefined,
              new: true
            }
          );

          if (!updateResult) {
            // Stock became insufficient during transaction - rollback
            await session.abortTransaction();
            session.endSession();
            logger.error('[CREATE ORDER] Stock became insufficient during order creation');
            return sendBadRequest(res, 'Stock became unavailable. Please try again.');
          }

          // Emit real-time stock update
          if (stockSocketService) {
            const product = await Product.findById(stockUpdate.productId).select('inventory').lean() as any;
            if (product) {
              stockSocketService.emitStockUpdate(
                stockUpdate.productId.toString(),
                product.inventory?.stock || 0
              );
            }
          }
        } catch (stockError) {
          logger.error('[CREATE ORDER] Failed to deduct stock:', stockError);
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res, 'Failed to process order. Please try again.');
        }
      }

      // Invalidate product cache for items whose stock changed
      for (const stockUpdate of stockUpdates) {
        CacheInvalidator.invalidateProduct(stockUpdate.productId.toString()).catch(() => {});
      }
    }

    // Deduct coins for COD orders immediately (INSIDE TRANSACTION - ATOMIC)
    // Online payments deduct coins in PaymentService after payment confirmation
    if (paymentMethod === 'cod' && coinsUsed && coinDiscount > 0) {
      // Determine the store's root category for category-specific coin deduction
      const firstCartItem = orderCart.items[0];
      const codStoreId = firstCartItem?.store
        ? (typeof firstCartItem.store === 'object' ? (firstCartItem.store as any)._id : firstCartItem.store)
        : null;
      const codCategory = codStoreId ? await getStoreCategorySlug(codStoreId.toString()) : null;

      // Deduct REZ coins atomically with $gte guard (prevents double-spend on concurrent requests)
      let deductedFromCategory = false;
      if (coinsUsed.rezCoins && coinsUsed.rezCoins > 0) {
        // Try category balance first, fall back to global
        if (codCategory) {
          const catDeductResult = await Wallet.findOneAndUpdate(
            {
              user: userId,
              [`categoryBalances.${codCategory}.available`]: { $gte: coinsUsed.rezCoins }
            },
            {
              $inc: {
                [`categoryBalances.${codCategory}.available`]: -coinsUsed.rezCoins,
                'statistics.totalSpent': coinsUsed.rezCoins
              },
              $set: { lastTransactionAt: new Date() }
            },
            { new: true, session }
          );
          if (catDeductResult) {
            deductedFromCategory = true;
          }
        }

        if (!deductedFromCategory) {
          // Fall back to global ReZ coins — atomic deduction
          const rezDeductResult = await Wallet.findOneAndUpdate(
            {
              user: userId,
              'balance.available': { $gte: coinsUsed.rezCoins },
              'coins': { $elemMatch: { type: 'rez', amount: { $gte: coinsUsed.rezCoins } } }
            },
            {
              $inc: {
                'balance.available': -coinsUsed.rezCoins,
                'coins.$.amount': -coinsUsed.rezCoins,
                'statistics.totalSpent': coinsUsed.rezCoins
              },
              $set: { lastTransactionAt: new Date(), 'coins.$.lastUsed': new Date() }
            },
            { new: true, session }
          );

          if (!rezDeductResult) {
            await session.abortTransaction();
            session.endSession();
            logger.error('Insufficient rez coins in wallet at time of deduction', { userId, requested: coinsUsed.rezCoins });
            return sendBadRequest(res, 'Insufficient REZ coins. Balance may have changed.');
          }
        }

        const { CoinTransaction } = require('../models/CoinTransaction');
        await CoinTransaction.createTransaction(
          userId.toString(),
          'spent',
          coinsUsed.rezCoins,
          'purchase',
          `COD Order: ${orderNumber}`,
          { orderId: order._id, orderNumber, paymentMethod: 'cod' },
          deductedFromCategory ? codCategory : null
        );

        // Also update UserLoyalty.categoryCoins if deducted from category
        if (deductedFromCategory && codCategory) {
          try {
            const UserLoyalty = require('../models/UserLoyalty').default || require('../models/UserLoyalty').UserLoyalty;
            await UserLoyalty.findOneAndUpdate(
              { userId: userId.toString(), [`categoryCoins.${codCategory}.available`]: { $gte: coinsUsed.rezCoins } },
              { $inc: { [`categoryCoins.${codCategory}.available`]: -coinsUsed.rezCoins } },
              { session }
            );
          } catch (loyaltyErr) {
            logger.error('[CREATE ORDER] Failed to update UserLoyalty categoryCoins:', loyaltyErr);
          }
        }
      }

      // Deduct promo coins atomically
      if (coinsUsed.promoCoins && coinsUsed.promoCoins > 0) {
        const promoDeductResult = await Wallet.findOneAndUpdate(
          {
            user: userId,
            'coins': { $elemMatch: { type: 'promo', amount: { $gte: coinsUsed.promoCoins } } }
          },
          {
            $inc: { 'coins.$.amount': -coinsUsed.promoCoins },
            $set: { lastTransactionAt: new Date(), 'coins.$.lastUsed': new Date() }
          },
          { new: true, session }
        );

        if (!promoDeductResult) {
          await session.abortTransaction();
          session.endSession();
          logger.error('Insufficient promo coins at time of deduction', { userId, requested: coinsUsed.promoCoins });
          return sendBadRequest(res, 'Insufficient Promo coins. Balance may have changed.');
        }
      }

      // Deduct branded coins atomically (store-specific coins)
      if (coinsUsed.storePromoCoins && coinsUsed.storePromoCoins > 0) {
        const firstItem = orderCart.items[0];
        const deductStoreId = typeof firstItem.store === 'object'
          ? (firstItem.store as any)._id
          : firstItem.store;

        if (deductStoreId) {
          const brandedDeductResult = await Wallet.findOneAndUpdate(
            {
              user: userId,
              'brandedCoins': {
                $elemMatch: {
                  merchantId: deductStoreId,
                  amount: { $gte: coinsUsed.storePromoCoins }
                }
              }
            },
            {
              $inc: {
                'brandedCoins.$.amount': -coinsUsed.storePromoCoins,
                'statistics.totalSpent': coinsUsed.storePromoCoins
              },
              $set: { lastTransactionAt: new Date(), 'brandedCoins.$.lastUsed': new Date() }
            },
            { new: true, session }
          );

          if (!brandedDeductResult) {
            await session.abortTransaction();
            session.endSession();
            logger.error('Insufficient branded coins at time of deduction', { userId, requested: coinsUsed.storePromoCoins });
            return sendBadRequest(res, 'Insufficient store coins. Balance may have changed.');
          }
        }
      }
      // Record ledger entry for coin deduction (non-blocking — don't fail order)
      try {
        const ledgerService = require('../services/ledgerService').default || require('../services/ledgerService');
        const { Types: MongoTypes } = require('mongoose');
        const PLATFORM_FLOAT_ID = new MongoTypes.ObjectId('000000000000000000000002');
        await ledgerService.recordEntry({
          debitAccount: { type: 'user_wallet', id: new MongoTypes.ObjectId(userId) },
          creditAccount: { type: 'platform_float', id: PLATFORM_FLOAT_ID },
          amount: coinDiscount,
          coinType: 'nuqta',
          operationType: 'order_coin_deduction',
          referenceId: String(order._id),
          referenceModel: 'Order',
          metadata: {
            description: `Coin payment for COD order ${orderNumber}`,
            idempotencyKey: `order_coin_${String(order._id)}`,
          },
        });
      } catch (ledgerErr) {
        logger.error('[ORDER:LEDGER] Failed to create ledger entry for coin deduction (non-blocking):', ledgerErr);
      }
    }

    // Mark voucher as used if one was applied
    if (voucherApplied) {
      try {
        const partnerService = require('../services/partnerService').default;
        await partnerService.markVoucherUsed(userId.toString(), voucherApplied);
      } catch (error) {
        logger.error('[VOUCHER] Error marking voucher as used:', error);
        // Don't fail order creation if voucher marking fails
      }
    }
    
    // Check for transaction bonus (every 11 orders)
    // Note: This is checked after order placement, but bonus is only awarded after delivery
    try {
      await partnerBenefitsService.checkTransactionBonus(userId.toString());
    } catch (error) {
      logger.error('[PARTNER BENEFITS] Error checking transaction bonus:', error);
      // Don't fail order creation if bonus check fails
    }

    // Note: Cart is NOT cleared here - it will be cleared after successful payment
    // This allows users to retry payment if it fails

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // NOTE: Merchant wallet credit moved to delivery (see updateOrderStatus).
    // Both COD and online payment orders only credit merchant wallet when status = 'delivered'.

    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate('items.product', 'name image images')
      .populate('items.store', 'name logo')
      .populate('user', 'profile.firstName profile.lastName profile.phoneNumber').lean();

    // Mark coupon as used if one was applied
    // Check both cart.coupon (from DB) and couponCode (from request body)
    // Frontend passes couponCode in request but doesn't save it to cart DB
    const appliedCouponCode = cart.coupon?.code || couponCode;
    if (appliedCouponCode) {
      const couponResult = await couponService.markCouponAsUsed(
        new Types.ObjectId(userId),
        appliedCouponCode,
        order._id as Types.ObjectId
      );
      if (!couponResult.success) {
        // Note: Order is already created, so we don't fail the request
        // The discount was already applied to the order total
      }
    }

    // Create activity for order placement
    if (populatedOrder) {
      const storeData = populatedOrder.items[0]?.store as any;
      const storeName = storeData?.name || 'Store';
      await activityService.order.onOrderPlaced(
        new Types.ObjectId(userId),
        populatedOrder._id as Types.ObjectId,
        storeName,
        total
      );
    }

    // Emit gamification event for order creation
    gamificationEventBus.emit('order_placed', {
      userId,
      entityId: String(populatedOrder?._id),
      entityType: 'order',
      amount: total,
      source: { controller: 'orderController', action: 'createOrder' }
    });

    // Send notifications to customer and merchant (all independent — run in parallel)
    try {
      const user = populatedOrder?.user as any;
      const userPhone = user?.profile?.phoneNumber || user?.phoneNumber || user?.phone;
      const userName = user?.profile?.firstName || user?.fullName || 'Customer';
      const userEmail = user?.email;
      const storeData = populatedOrder?.items[0]?.store as any;
      const storeName = storeData?.name || 'Store';
      const orderNumber = populatedOrder?.orderNumber || (order._id as any).toString();

      const notifPromises: Promise<any>[] = [];

      // Send SMS to customer
      if (userPhone) {
        notifPromises.push(SMSService.sendOrderConfirmation(userPhone, orderNumber, storeName));
      }

      // Send email to customer
      if (userEmail && userName) {
        const orderItems = populatedOrder?.items.map((item: any) => ({
          name: item.product?.name || 'Product',
          quantity: item.quantity,
          price: item.price * item.quantity
        })) || [];

        notifPromises.push(EmailService.sendOrderConfirmation(userEmail, userName, {
          orderId: (order._id as any).toString(),
          orderNumber,
          items: orderItems,
          subtotal: populatedOrder?.totals?.subtotal || 0,
          deliveryFee: populatedOrder?.delivery?.deliveryFee || 0,
          total: populatedOrder?.totals?.total || 0,
          estimatedDelivery: 'Within 30-45 minutes',
          storeName,
          deliveryAddress: deliveryAddress
        }));
      }

      // Send new order alert to merchant (fetch store contact in parallel with customer notifications)
      if (storeData?._id) {
        notifPromises.push(
          Store.findById(storeData._id).select('contact merchant').lean().then(async (store) => {
            if (!store) return;
            const merchantPhone = store?.contact?.phone;
            const merchantId = (store as any)?.merchant?.toString();

            const merchantPromises: Promise<any>[] = [];

            if (merchantPhone) {
              merchantPromises.push(SMSService.sendNewOrderAlertToMerchant(merchantPhone, orderNumber, userName, total));
              if (total > 10000) {
                merchantPromises.push(SMSService.sendHighValueOrderAlert(merchantPhone, orderNumber, total));
              }
            }

            if (merchantId) {
              merchantPromises.push(merchantNotificationService.notifyNewOrder({
                merchantId,
                orderId: (order._id as any).toString(),
                orderNumber,
                customerName: userName,
                totalAmount: total,
                itemCount: populatedOrder?.items?.length || 0,
                paymentMethod,
              }));
            }

            await Promise.all(merchantPromises);
          })
        );
      }

      await Promise.all(notifPromises);

    } catch (error) {
      logger.error('[ORDER] Error sending notifications:', error);
      // Don't fail order creation if notifications fail
    }

    sendSuccess(res, populatedOrder, 'Order created successfully', 201);

  } catch (error: any) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();

    logger.error('[CREATE ORDER] Error:', error);
    logger.error('[CREATE ORDER] Error message:', error.message);
    logger.error('[CREATE ORDER] Error stack:', error.stack);
    logger.error('[CREATE ORDER] Error name:', error.name);

    // Log more details about the error
    if (error.name === 'TypeError') {
      logger.error('[CREATE ORDER] This is a TypeError - likely null/undefined access');
    }

    throw new AppError(`Failed to create order: ${error.message}`, 500);
  }
});

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: List user orders
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: statusGroup
 *         schema:
 *           type: string
 *           enum: [active, past]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, amount_high, amount_low]
 *           default: newest
 *     responses:
 *       200:
 *         description: Paginated list of user orders
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         orders:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/OrderSummary'
 *                         nextCursor:
 *                           type: string
 *                         hasMore:
 *                           type: boolean
 *                         counts:
 *                           type: object
 *                           properties:
 *                             active:
 *                               type: integer
 *                             past:
 *                               type: integer
 *                         pagination:
 *                           type: object
 *       401:
 *         description: Unauthorized
 */
export const getUserOrders = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { status, statusGroup, page = 1, limit = 20, cursor, search, dateFrom, dateTo, sort = 'newest' } = req.query;

  try {
    const query: any = { user: userId };

    // Status group filter (for tracking page tabs)
    if (statusGroup === 'active') {
      query.status = { $in: ACTIVE_STATUSES };
    } else if (statusGroup === 'past') {
      query.status = { $in: PAST_STATUSES };
    } else if (status && status !== 'all') {
      // Individual status filter (backwards compatible)
      query.status = status;
    }

    // Cursor-based pagination: fetch orders older than cursor
    if (cursor) {
      query._id = { $lt: new Types.ObjectId(cursor as string) };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) query.createdAt.$lte = new Date(dateTo as string);
    }

    // Server-side search: order number, item name, store name
    if (search && (search as string).trim()) {
      const searchStr = (search as string).trim();
      query.$or = [
        { orderNumber: { $regex: searchStr, $options: 'i' } },
        { 'items.name': { $regex: searchStr, $options: 'i' } },
        { 'items.storeName': { $regex: searchStr, $options: 'i' } },
      ];
    }

    // Sort options
    const sortMap: Record<string, any> = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      amount_high: { 'totals.total': -1 },
      amount_low: { 'totals.total': 1 },
    };
    const sortOption = sortMap[sort as string] || { createdAt: -1 };

    const safeLimit = Math.min(Number(limit) || 20, 50);

    // If using cursor pagination, don't use skip
    const useCursor = !!cursor;
    const skip = useCursor ? 0 : (Number(page) - 1) * safeLimit;

    // Fetch orders + counts in parallel
    const [orders, total, counts] = await Promise.all([
      Order.find(query)
        .populate('items.product', 'name images basePrice')
        .populate('items.store', 'name logo')
        .populate('store', 'name logo location')
        .sort(sortOption)
        .skip(skip)
        .limit(safeLimit + 1) // Fetch one extra to check hasMore
        .lean(),
      Order.countDocuments(query),
      // Always return active/past counts for the user
      Order.aggregate([
        { $match: { user: new Types.ObjectId(userId) } },
        {
          $facet: {
            active: [
              { $match: { status: { $in: ACTIVE_STATUSES } } },
              { $count: 'count' },
            ],
            past: [
              { $match: { status: { $in: PAST_STATUSES } } },
              { $count: 'count' },
            ],
          },
        },
      ]).option({ allowDiskUse: true }),
    ]);

    // Check if there are more results
    const hasMore = orders.length > safeLimit;
    if (hasMore) orders.pop(); // Remove the extra item

    const nextCursor = hasMore && orders.length > 0 ? String(orders[orders.length - 1]._id) : null;
    const totalPages = Math.ceil(total / safeLimit);

    const activeCounts = counts[0]?.active?.[0]?.count || 0;
    const pastCounts = counts[0]?.past?.[0]?.count || 0;

    // Attach ETA and progress to each order (non-blocking, best-effort)
    const enrichedOrders = await Promise.all(
      orders.map(async (order: any) => {
        try {
          const calculatedETA = await etaService.getFormattedETA(order);
          const progress = getOrderProgress(order.status);
          return { ...order, calculatedETA, progress };
        } catch {
          return order;
        }
      })
    );

    sendSuccess(res, {
      orders: enrichedOrders,
      nextCursor,
      hasMore,
      counts: { active: activeCounts, past: pastCounts },
      pagination: {
        page: Number(page),
        limit: safeLimit,
        total,
        totalPages,
        current: Number(page),
        pages: totalPages,
        hasNext: hasMore || Number(page) < totalPages,
        hasPrev: Number(page) > 1,
      }
    }, 'Orders retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch orders', 500);
  }
});

/**
 * @swagger
 * /api/orders/counts:
 *   get:
 *     summary: Quick order count by status
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order counts grouped by status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 */
export const getOrderCounts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const counts = await Order.aggregate([
      { $match: { user: new Types.ObjectId(userId) } },
      {
        $facet: {
          active: [
            { $match: { status: { $in: ACTIVE_STATUSES } } },
            { $count: 'count' },
          ],
          past: [
            { $match: { status: { $in: PAST_STATUSES } } },
            { $count: 'count' },
          ],
        },
      },
    ]).option({ allowDiskUse: true });

    sendSuccess(res, {
      active: counts[0]?.active?.[0]?.count || 0,
      past: counts[0]?.past?.[0]?.count || 0,
    }, 'Order counts retrieved');
  } catch (error) {
    throw new AppError('Failed to fetch order counts', 500);
  }
});

/**
 * @swagger
 * /api/orders/{orderId}:
 *   get:
 *     summary: Get single order with populated items, store, progress, and ETA
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;

  try {
    const orders = await Order.aggregate([
      { $match: { _id: new Types.ObjectId(orderId), user: new Types.ObjectId(userId) } },
      // Lookup top-level store
      { $lookup: {
        from: 'stores', localField: 'store', foreignField: '_id', as: '_storeDoc',
        pipeline: [{ $project: { name: 1, logo: 1, location: 1 } }]
      }},
      { $unwind: { path: '$_storeDoc', preserveNullAndEmptyArrays: true } },
      // Lookup user
      { $lookup: {
        from: 'users', localField: 'user', foreignField: '_id', as: '_userDoc',
        pipeline: [{ $project: { 'profile.firstName': 1, 'profile.lastName': 1, 'profile.phoneNumber': 1, 'profile.email': 1 } }]
      }},
      { $unwind: { path: '$_userDoc', preserveNullAndEmptyArrays: true } },
      // Collect all product IDs and store IDs from items for batch lookups
      { $lookup: {
        from: 'products',
        let: { productIds: '$items.product' },
        pipeline: [
          { $match: { $expr: { $in: ['$_id', '$$productIds'] } } },
          { $project: { name: 1, images: 1, basePrice: 1, description: 1 } }
        ],
        as: '_products'
      }},
      { $lookup: {
        from: 'stores',
        let: { storeIds: '$items.store' },
        pipeline: [
          { $match: { $expr: { $in: ['$_id', '$$storeIds'] } } },
          { $project: { name: 1, logo: 1, location: 1 } }
        ],
        as: '_itemStores'
      }},
      // Merge looked-up data into items
      { $addFields: {
        items: {
          $map: {
            input: '$items',
            as: 'item',
            in: {
              $mergeObjects: [
                '$$item',
                {
                  product: {
                    $ifNull: [
                      { $arrayElemAt: [{ $filter: { input: '$_products', as: 'p', cond: { $eq: ['$$p._id', '$$item.product'] } } }, 0] },
                      '$$item.product'
                    ]
                  },
                  store: {
                    $ifNull: [
                      { $arrayElemAt: [{ $filter: { input: '$_itemStores', as: 's', cond: { $eq: ['$$s._id', '$$item.store'] } } }, 0] },
                      '$$item.store'
                    ]
                  }
                }
              ]
            }
          }
        },
        store: { $ifNull: ['$_storeDoc', '$store'] },
        user: { $ifNull: ['$_userDoc', '$user'] }
      }},
      // Remove temporary lookup arrays
      { $project: { _storeDoc: 0, _userDoc: 0, _products: 0, _itemStores: 0 } }
    ]).option({ allowDiskUse: true });

    const order = orders[0] || null;

    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    // Enrich with ETA and progress
    let enrichedOrder: any = order;
    try {
      const calculatedETA = await etaService.getFormattedETA(order);
      const progress = getOrderProgress(order.status);
      enrichedOrder = { ...order, calculatedETA, progress };
    } catch {
      // Non-critical, use order as-is
    }

    sendSuccess(res, enrichedOrder, 'Order retrieved successfully');

  } catch (error: any) {
    logger.error('[GET ORDER BY ID] Error:', error.message);
    throw new AppError('Failed to fetch order', 500);
  }
});

/**
 * @swagger
 * /api/orders/{orderId}/cancel:
 *   patch:
 *     summary: Cancel order (restores stock, refunds coins/payment)
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Order cannot be cancelled (invalid status)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;
  const { reason } = req.body;

  // ATOMIC IDEMPOTENCY GUARD — claim the order for cancellation
  // Only one concurrent caller can transition from cancellable status to 'cancelling'
  // Use { new: false } to get the original status for rollback
  const preClaimOrder = await Order.findOneAndUpdate(
    {
      _id: orderId,
      user: userId,
      status: { $in: ['placed', 'confirmed', 'preparing'] }
    },
    { $set: { status: 'cancelling' } },
    { new: false }
  );
  const claimedOrder = preClaimOrder;
  const originalStatus = preClaimOrder?.status || 'placed';

  if (!claimedOrder) {
    const existing = await Order.findOne({ _id: orderId, user: userId }).lean();
    if (!existing) {
      return sendNotFound(res, 'Order not found');
    }
    if (existing.status === 'cancelled' || (existing.status as string) === 'cancelling') {
      return sendBadRequest(res, 'Order is already cancelled');
    }
    return sendBadRequest(res, 'Order cannot be cancelled at this stage');
  }

  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session).lean();
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return sendNotFound(res, 'Order not found');
    }

    // Restore stock for cancelled order items
    const stockRestorations: Array<{ productId: string; storeId: string; newStock: number; productName: string }> = [];

    for (const orderItem of order.items) {
      const productId = orderItem.product;
      const quantity = orderItem.quantity;
      const variant = orderItem.variant;

      if (variant) {
        // Restore variant stock
        const updateResult = await Product.findOneAndUpdate(
          {
            _id: productId,
            'inventory.variants': {
              $elemMatch: {
                type: variant.type,
                value: variant.value
              }
            }
          },
          {
            $inc: {
              'inventory.variants.$[variant].stock': quantity
            }
          },
          {
            session,
            new: true,
            arrayFilters: [{
              'variant.type': variant.type,
              'variant.value': variant.value
            }]
          }
        );

        if (updateResult) {
          const newStock = updateResult.inventory?.stock ?? 0;
          const storeId = updateResult.store?.toString() || '';
          stockRestorations.push({
            productId: updateResult._id.toString(),
            storeId,
            newStock,
            productName: updateResult.name || 'Unknown Product'
          });
        } else {
        }
      } else {
        // Restore main product stock
        const updateResult = await Product.findByIdAndUpdate(
          productId,
          {
            $inc: {
              'inventory.stock': quantity
            },
            $set: {
              'inventory.isAvailable': true
            }
          },
          {
            session,
            new: true
          }
        );

        if (updateResult) {
          const newStock = updateResult.inventory?.stock ?? 0;
          const storeId = updateResult.store?.toString() || '';
          stockRestorations.push({
            productId: updateResult._id.toString(),
            storeId,
            newStock,
            productName: updateResult.name || 'Unknown Product'
          });
        } else {
        }
      }
    }

    // Refund coins if they were used in this order
    if (order.payment?.coinsUsed) {
      const userId = order.user;

      // Support both rezCoins (new) and wasilCoins (legacy) field names
      const rezCoins = (order.payment.coinsUsed as any).rezCoins || (order.payment.coinsUsed as any).wasilCoins || 0;
      const promoCoins = (order.payment.coinsUsed as any).promoCoins || 0;
      const storePromoCoins = (order.payment.coinsUsed as any).storePromoCoins || 0;

      // Refund REZ coins via refundService (centralized refund pipeline)
      if (rezCoins > 0) {
        try {
          const { refundService } = await import('../services/refundService');
          await refundService.processRefund({
            userId: userId.toString(),
            amount: rezCoins,
            reason: `Order cancelled: ${order.orderNumber}`,
            refundType: 'order_cancel',
            referenceId: `order:${order._id}:rez`,
            referenceModel: 'Order',
            skipNotification: true, // Notification sent at end of cancel flow
          });
        } catch (coinError) {
          logger.error('[CANCEL ORDER] Failed to refund REZ coins:', coinError);
        }
      }

      // Refund promo coins
      if (promoCoins > 0) {
        try {
          const wallet = await Wallet.findOne({ user: userId }).session(session).lean();
          if (wallet) {
            const promoCoin = wallet.coins.find((c: any) => c.type === 'promo');
            if (promoCoin) {
              promoCoin.amount += promoCoins;
              wallet.markModified('coins');
              wallet.lastTransactionAt = new Date();
              await wallet.save({ session });
            }
          }
        } catch (coinError) {
          logger.error('[CANCEL ORDER] Failed to refund promo coins:', coinError);
        }
      }

      // Refund store promo coins (branded coins)
      if (storePromoCoins > 0) {
        try {
          const firstItem = order.items[0];
          const storeId = typeof firstItem.store === 'object'
            ? (firstItem.store as any)._id
            : firstItem.store;
          const storeName = typeof firstItem.store === 'object'
            ? (firstItem.store as any).name || 'Store'
            : 'Store';

          if (storeId) {
            const wallet = await Wallet.findOne({ user: userId }).session(session).lean();
            if (wallet) {
              await wallet.addBrandedCoins(
                new Types.ObjectId(storeId.toString()),
                storeName,
                storePromoCoins
              );
            }
          }
        } catch (coinError) {
          logger.error('[CANCEL ORDER] Failed to refund store promo coins:', coinError);
        }
      }
    }

    // Reverse offer redemption cashback if applied
    if ((order as any).offerRedemption?.code) {
      const OfferRedemption = require('../models/OfferRedemption').default;
      const { Transaction } = require('../models/Transaction');

      const cashbackAmount = (order as any).offerRedemption?.cashback || 0;
      const redemptionCode = (order as any).offerRedemption?.code;

      try {
        // Find and restore the offer redemption to active status
        const offerRedemption = await OfferRedemption.findOneAndUpdate(
          {
            redemptionCode: redemptionCode,
            user: userId,
            status: 'used'
          },
          {
            $set: {
              status: 'active',
              usedDate: null,
              order: null,
              usedAmount: null
            }
          },
          { session, new: true }
        );

        if (offerRedemption) {
          // Deduct cashback from user's wallet if it was credited
          if (cashbackAmount > 0) {
            // Use walletService for atomic debit + CoinTransaction + LedgerEntry
            await walletService.debit({
              userId,
              amount: cashbackAmount,
              source: 'order',
              description: `Cashback reversed for cancelled order #${order.orderNumber}`,
              operationType: 'cashback_reversal',
              referenceId: `cashback-reversal:${order._id}`,
              referenceModel: 'Order',
              metadata: { orderId: order._id, orderNumber: order.orderNumber },
              session,
            });

            {

              // Create reversal transaction record
              const reversalTransaction = new Transaction({
                user: userId,
                type: 'debit',
                amount: cashbackAmount,
                currency: 'RC',
                category: 'cashback_reversal',
                description: `Cashback reversed for cancelled order #${order.orderNumber}`,
                status: {
                  current: 'completed',
                  history: [{
                    status: 'completed',
                    timestamp: new Date(),
                    reason: 'Order cancelled - cashback reversed',
                  }],
                },
                source: {
                  type: 'cashback_reversal',
                  reference: offerRedemption._id,
                  description: `Reversal - ${(order as any).offerRedemption?.offerTitle || 'Offer Cashback'}`,
                  metadata: {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    redemptionCode: redemptionCode,
                  },
                },
                balanceBefore: 0,
                balanceAfter: 0,
              });

              await reversalTransaction.save({ session });
              // Send notification about reversal
              try {
                const NotificationService = require('../services/notificationService').default;
                NotificationService.sendToUser(userId.toString(), {
                  title: 'Cashback Reversed',
                  body: `₹${cashbackAmount} cashback has been reversed due to order #${order.orderNumber} cancellation. Your voucher is now available again.`,
                  data: {
                    type: 'cashback_reversed',
                    amount: cashbackAmount,
                    orderId: (order as any)._id?.toString() || '',
                    orderNumber: order.orderNumber,
                  }
                }).catch((err: any) => logger.error('Failed to send reversal notification:', err));
              } catch (notifError) {
                logger.error('Failed to send reversal notification:', notifError);
              }
            }
          }
        } else {
        }
      } catch (redemptionError) {
        logger.error('[CANCEL ORDER] Failed to reverse offer redemption:', redemptionError);
        // Continue with cancellation even if redemption reversal fails
      }
    }

    // Update order status
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = reason || 'Customer request';

    await order.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Emit Socket.IO events for stock restorations and invalidate cache after transaction success
    for (const restoration of stockRestorations) {
      try {
        stockSocketService.emitStockUpdate(
          restoration.productId,
          restoration.newStock,
          {
            storeId: restoration.storeId,
            reason: 'return'
          }
        );
      } catch (socketError) {
        // Log but don't fail the cancellation if socket emission fails
        logger.error('[CANCEL ORDER] Socket emission failed:', socketError);
      }
      // Invalidate product cache after stock restoration
      CacheInvalidator.invalidateProduct(restoration.productId).catch(() => {});
    }

    // Create activity for order cancellation
    const storeData = order.items[0]?.store as any;
    const storeName = storeData?.name || storeData?.toString() || 'Store';
    await activityService.order.onOrderCancelled(
      new Types.ObjectId(userId),
      order._id as Types.ObjectId,
      storeName
    );

    sendSuccess(res, order, 'Order cancelled successfully');

  } catch (error: any) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();

    // Reset status from 'cancelling' back to previous state so it can be retried
    try {
      await Order.findByIdAndUpdate(orderId, { $set: { status: originalStatus } });
    } catch (resetError) {
      logger.error('[CANCEL ORDER] Failed to reset status:', resetError);
    }

    logger.error('[CANCEL ORDER] Error:', error.message);
    throw new AppError(`Failed to cancel order: ${error.message}`, 500);
  }
});

/**
 * @swagger
 * /api/orders/{orderId}/status:
 *   patch:
 *     summary: Update order status (admin/store owner only)
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [placed, confirmed, preparing, ready, dispatched, delivered, cancelled, returned, refunded]
 *               estimatedDeliveryTime:
 *                 type: string
 *                 format: date-time
 *               trackingInfo:
 *                 type: object
 *                 properties:
 *                   trackingNumber:
 *                     type: string
 *                   carrier:
 *                     type: string
 *                   estimatedDelivery:
 *                     type: string
 *                     format: date-time
 *                   location:
 *                     type: string
 *                   notes:
 *                     type: string
 *                     maxLength: 500
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid status transition
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status, estimatedDeliveryTime, trackingInfo } = req.body;

  try {
    const order = await Order.findById(orderId).lean();

    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    // Validate status transition using centralized state machine
    if (order.status !== status && !isValidTransition(order.status, status)) {
      const allowed = STATUS_TRANSITIONS[order.status] || [];
      return sendBadRequest(
        res,
        `Invalid status transition from '${order.status}' to '${status}'. Allowed: ${allowed.join(', ') || 'none'}`
      );
    }

    // For merchant-initiated updates, enforce stricter transitions
    const userRole = (req as any).userRole;
    if (userRole === 'merchant' || userRole === 'store_owner') {
      if (order.status !== status && !isValidMerchantTransition(order.status, status)) {
        const allowed = MERCHANT_TRANSITIONS[order.status] || [];
        return sendBadRequest(
          res,
          `Merchants can only transition from '${order.status}' to: ${allowed.join(', ') || 'none'}. Cannot skip states.`
        );
      }
    }

    // Update status
    order.status = status;

    // Update tracking info if provided
    if (trackingInfo) {
      order.tracking = {
        ...order.tracking,
        ...trackingInfo,
        lastUpdated: new Date()
      };
    }

    // Update estimated delivery time
    if (estimatedDeliveryTime) {
      order.estimatedDeliveryTime = new Date(estimatedDeliveryTime);
    }

    // Set delivery time if status is delivered
    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('items.product', 'name images')
      .populate('items.store', 'name')
      .populate('user', 'profile.firstName profile.lastName').lean();

    // Create activity for order delivery
    if (status === 'delivered' && populatedOrder) {
      const storeData = populatedOrder.items[0]?.store as any;
      const storeName = storeData?.name || 'Store';
      const userIdObj = typeof populatedOrder.user === 'object' ? (populatedOrder.user as any)._id : populatedOrder.user;
      await activityService.order.onOrderDelivered(
        userIdObj as Types.ObjectId,
        populatedOrder._id as Types.ObjectId,
        storeName
      );

      // Update challenge progress for order delivery (non-blocking)
      challengeService.updateProgress(
        String(userIdObj), 'order_count', 1,
        { orderId: String(populatedOrder._id) }
      ).catch(err => logger.error('[ORDER] Challenge progress update failed:', err));

      challengeService.updateProgress(
        String(userIdObj), 'spend_amount', populatedOrder.totals.total,
        { orderId: String(populatedOrder._id) }
      ).catch(err => logger.error('[ORDER] Challenge spend progress update failed:', err));

      // Process referral rewards when order is delivered
      try {
        // Check if this is referee's first order (process referral completion)
        await referralService.processFirstOrder({
          refereeId: userIdObj as Types.ObjectId,
          orderId: populatedOrder._id as Types.ObjectId,
          orderAmount: populatedOrder.totals.total,
        });

        // Check for milestone bonus (3rd order)
        const deliveredOrdersCount = await Order.countDocuments({
          user: userIdObj,
          status: 'delivered',
        });

        if (deliveredOrdersCount >= 3) {
          await referralService.processMilestoneBonus(
            userIdObj as Types.ObjectId,
            deliveredOrdersCount
          );
        }
      } catch (error) {
        logger.error('[ORDER] Error processing referral rewards:', error);
        // Don't fail the order update if referral processing fails
      }

      // Award purchase reward coins on delivery
      // Smart Spend items get enhanced rate; regular items get default 5%
      try {
        const coinService = require('../services/coinService');
        const defaultRate = 0.05;

        // Check if any order items came from Smart Spend
        const smartSpendItems = populatedOrder.items.filter((item: any) => item.smartSpendSource?.coinRewardRate);
        const regularItems = populatedOrder.items.filter((item: any) => !item.smartSpendSource?.coinRewardRate);

        // Award enhanced coins for Smart Spend items
        if (smartSpendItems.length > 0) {
          const smartSpendSubtotal = smartSpendItems.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);
          const smartSpendRate = smartSpendItems[0]!.smartSpendSource!.coinRewardRate;
          let smartSpendCoins = smartSpendRate > 1
            ? Math.floor(smartSpendRate) // fixed amount
            : Math.floor(smartSpendSubtotal * smartSpendRate); // percentage

          // Apply max cap if stored
          if (smartSpendCoins > 0) {
            const firstItem = smartSpendItems[0];
            const rewardStoreId = firstItem?.store
              ? (typeof firstItem.store === 'object' ? (firstItem.store as any)._id : firstItem.store)
              : null;
            const rewardCategory = rewardStoreId ? await getStoreCategorySlug(rewardStoreId.toString()) : null;
            const ratePercent = Math.round(smartSpendRate * 100);

            await coinService.awardCoins(
              userIdObj.toString(),
              smartSpendCoins,
              'smart_spend_reward',
              `${ratePercent}% Smart Spend reward for order ${populatedOrder.orderNumber}`,
              { orderId: populatedOrder._id, smartSpendItemId: smartSpendItems[0]!.smartSpendSource!.smartSpendItemId },
              rewardCategory
            );
            // Increment purchases count on SmartSpendItem
            try {
              await SmartSpendItem.findByIdAndUpdate(
                smartSpendItems[0]!.smartSpendSource!.smartSpendItemId,
                { $inc: { purchases: 1 } }
              );
            } catch (_) { /* non-critical */ }
          }
        }

        // Award default 5% for regular (non-Smart Spend) items
        const regularSubtotal = regularItems.length > 0
          ? regularItems.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0)
          : (smartSpendItems.length === 0 ? populatedOrder.totals.subtotal : 0);
        const regularCoins = Math.floor(regularSubtotal * defaultRate);

        if (regularCoins > 0) {
          const firstItem = regularItems[0] || populatedOrder.items[0];
          const rewardStoreId = firstItem?.store
            ? (typeof firstItem.store === 'object' ? (firstItem.store as any)._id : firstItem.store)
            : null;
          const rewardCategory = rewardStoreId ? await getStoreCategorySlug(rewardStoreId.toString()) : null;

          await coinService.awardCoins(
            userIdObj.toString(),
            regularCoins,
            'purchase_reward',
            `5% purchase reward for order ${populatedOrder.orderNumber}`,
            { orderId: populatedOrder._id },
            rewardCategory
          );
        }
      } catch (coinError) {
        logger.error('[ORDER] Failed to award purchase reward coins:', coinError);
      }

      // Auto-trigger matching bonus campaigns on order delivery
      try {
        const bonusCampaignService = require('../services/bonusCampaignService');
        const firstItemForBonus = populatedOrder.items[0];
        const bonusStoreId = firstItemForBonus?.store
          ? (typeof firstItemForBonus.store === 'object' ? (firstItemForBonus.store as any)._id : firstItemForBonus.store)
          : null;
        const bonusCategory = bonusStoreId ? await getStoreCategorySlug(bonusStoreId.toString()) : null;

        const orderIdStr = (populatedOrder as any)._id.toString();
        const baseClaimData = {
          transactionRef: { type: 'order' as const, refId: orderIdStr },
          transactionAmount: populatedOrder.totals.subtotal,
          paymentMethod: populatedOrder.payment?.method,
          category: bonusCategory || undefined,
          storeId: bonusStoreId?.toString(),
        };

        // All bonus campaign claims are independent — run in parallel
        const bonusPromises: Promise<any>[] = [
          bonusCampaignService.autoClaimForTransaction('cashback_boost', userIdObj.toString(), baseClaimData),
          bonusCampaignService.autoClaimForTransaction('first_transaction_bonus', userIdObj.toString(), baseClaimData),
          bonusCampaignService.autoClaimForTransaction('festival_offer', userIdObj.toString(), baseClaimData),
          bonusCampaignService.autoClaimForTransaction('bank_offer', userIdObj.toString(), baseClaimData),
        ];

        if (bonusCategory) {
          bonusPromises.push(
            bonusCampaignService.autoClaimForTransaction('category_multiplier', userIdObj.toString(), {
              ...baseClaimData,
              category: bonusCategory,
            })
          );
        }

        await Promise.all(bonusPromises);
      } catch (bonusErr) {
        logger.error('[ORDER] Bonus campaign auto-claim failed (non-blocking):', bonusErr);
      }

      // Credit merchant wallet on delivery (merchant gets subtotal minus 15% platform fee)
      try {
        const firstItem = populatedOrder.items[0];
        if (firstItem && firstItem.store) {
          const storeId = typeof firstItem.store === 'object'
            ? (firstItem.store as any)._id
            : firstItem.store;

          const store = await Store.findById(storeId).lean();

          if (store && store.merchantId) {
            const grossAmount = populatedOrder.totals.subtotal || 0;
            const platformFee = populatedOrder.totals.platformFee || 0;

            const walletResult = await merchantWalletService.creditOrderPayment(
              store.merchantId.toString(),
              populatedOrder._id as Types.ObjectId,
              populatedOrder.orderNumber,
              grossAmount,
              platformFee,
              storeId
            );

            // Emit real-time notification to merchant
            if (walletResult) {
              orderSocketService.emitMerchantWalletUpdated({
                merchantId: store.merchantId.toString(),
                storeId: storeId.toString(),
                storeName: store.name,
                transactionType: 'credit',
                amount: grossAmount - platformFee,
                orderId: (populatedOrder._id as Types.ObjectId).toString(),
                orderNumber: populatedOrder.orderNumber,
                newBalance: {
                  total: walletResult.balance?.total || 0,
                  available: walletResult.balance?.available || 0,
                  pending: walletResult.balance?.pending || 0
                },
                timestamp: new Date()
              });

              // Send in-app notification for payment received
              await merchantNotificationService.notifyPaymentReceived({
                merchantId: store.merchantId.toString(),
                orderId: (populatedOrder._id as Types.ObjectId).toString(),
                orderNumber: populatedOrder.orderNumber,
                amount: grossAmount - platformFee,
                paymentMethod: populatedOrder.payment?.method || 'online',
              });
            }
          }
        }
      } catch (walletError) {
        logger.error('[ORDER] Failed to credit merchant wallet:', walletError);
      }

      // Credit 5% admin commission to platform wallet on delivery (5% of subtotal)
      try {
        const adminWalletService = require('../services/adminWalletService').default;
        const subtotal = populatedOrder.totals.subtotal || 0;
        const adminCommission = Math.floor(subtotal * 0.05);
        if (adminCommission > 0) {
          await adminWalletService.creditOrderCommission(
            populatedOrder._id as Types.ObjectId,
            populatedOrder.orderNumber,
            subtotal
          );
        }
      } catch (adminError) {
        logger.error('[ORDER] Failed to credit admin wallet:', adminError);
      }

      // Run independent post-delivery tasks in parallel (cashback, user products, creator conversion)
      {
        const postDeliveryTasks: Promise<any>[] = [
          cashbackService.createCashbackFromOrder(populatedOrder._id as Types.ObjectId)
            .catch((err: any) => logger.error('[ORDER] Error creating cashback:', err)),
          userProductService.createUserProductsFromOrder(populatedOrder._id as Types.ObjectId)
            .catch((err: any) => logger.error('[ORDER] Error creating user products:', err)),
        ];

        const attributionPickId = populatedOrder.analytics?.attributionPickId;
        if (attributionPickId) {
          postDeliveryTasks.push(
            processConversion(
              attributionPickId.toString(),
              (populatedOrder._id as Types.ObjectId).toString(),
              userIdObj.toString(),
              populatedOrder.totals.subtotal,
              req.ip
            ).catch((err: any) => logger.error('[ORDER] Error processing creator conversion:', err))
          );
        }

        await Promise.all(postDeliveryTasks);
      }

      // Award store promo coins for delivered order
      try {
        // Get user's subscription tier for bonus calculation
        let userTier = 'free';
        try {
          const subscription = await Subscription.findOne({
            user: userIdObj,
            status: 'active'
          }).select('tier').lean();
          if (subscription?.tier) {
            userTier = subscription.tier;
          }
        } catch (tierError) {
        }

        // Calculate promo coins with tier bonus
        const orderValue = populatedOrder.totals.total;
        const coinsToEarn = calculatePromoCoinsWithTierBonus(orderValue, userTier);
        const baseCoins = calculatePromoCoinsEarned(orderValue);
        const bonusCoins = coinsToEarn - baseCoins;

        if (coinsToEarn > 0) {
          // Get store info from first item (assuming single store per order)
          const firstItem = populatedOrder.items[0];
          const storeData = firstItem.store as any;
          const storeId = typeof storeData === 'object' ? storeData._id : storeData;
          const storeName = typeof storeData === 'object' ? storeData.name : 'Store';
          const storeLogo = typeof storeData === 'object' ? storeData.logo : undefined;

          if (storeId) {
            // Award branded coins (store-specific coins)
            const wallet = await Wallet.findOne({ user: userIdObj }).lean();
            if (wallet) {
              await wallet.addBrandedCoins(
                new Types.ObjectId(storeId.toString()),
                storeName,
                coinsToEarn,
                storeLogo
              );
            }
          } else {
          }
        } else {
        }
      } catch (error) {
        logger.error('[ORDER] Error awarding promo coins:', error);
        // Don't fail the order update if promo coin creation fails
      }

      // Emit gamification event for order delivery
      gamificationEventBus.emit('order_delivered', {
        userId: String(populatedOrder.user),
        entityId: String(populatedOrder._id),
        entityType: 'order',
        amount: populatedOrder.totals?.total,
        source: { controller: 'orderController', action: 'updateOrderStatus' }
      });

      // Recalculate Privé reputation on order delivery (fire-and-forget)
      reputationService.onOrderCompleted(userIdObj as Types.ObjectId)
        .catch(err => logger.error('[ORDER] Reputation recalculation failed:', err));

      // Update partner progress for order delivery
      try {
        const partnerService = require('../services/partnerService').default;
        const orderId = populatedOrder._id as Types.ObjectId;
        await partnerService.updatePartnerProgress(
          userIdObj.toString(),
          orderId.toString()
        );
      } catch (error) {
        logger.error('[ORDER] Error updating partner progress:', error);
        // Don't fail the order update if partner progress update fails
      }
    }

    sendSuccess(res, populatedOrder, 'Order status updated successfully');

  } catch (error) {
    throw new AppError('Failed to update order status', 500);
  }
});

/**
 * @swagger
 * /api/orders/{orderId}/tracking:
 *   get:
 *     summary: Get tracking info with timeline
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order tracking details with timeline
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export const getOrderTracking = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;

  try {
    const order = await Order.findOne({ 
      _id: orderId, 
      user: userId 
    })
    .select('status tracking estimatedDeliveryTime deliveredAt createdAt items fulfillmentType fulfillmentDetails delivery store orderNumber timeline')
    .populate('items.product', 'name images')
    .populate('store', 'name location')
    .lean();

    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    // Create tracking timeline
    const timeline = [
      {
        status: 'pending',
        title: 'Order Placed',
        description: 'Your order has been placed successfully',
        timestamp: order.createdAt,
        completed: true
      },
      {
        status: 'confirmed',
        title: 'Order Confirmed',
        description: 'Store has confirmed your order',
        timestamp: order.status !== 'placed' ? order.createdAt : null,
        completed: !['placed'].includes(order.status)
      },
      {
        status: 'preparing',
        title: 'Preparing',
        description: 'Your order is being prepared',
        timestamp: null,
        completed: !['pending', 'confirmed'].includes(order.status)
      },
      {
        status: 'shipped',
        title: 'Shipped',
        description: 'Your order has been shipped',
        timestamp: null,
        completed: ['delivered'].includes(order.status)
      },
      {
        status: 'delivered',
        title: 'Delivered',
        description: 'Order delivered successfully',
        timestamp: order.deliveredAt,
        completed: order.status === 'delivered'
      }
    ];

    sendSuccess(res, {
      orderId: order._id,
      currentStatus: order.status,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      timeline,
      tracking: order.tracking
    }, 'Order tracking retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch order tracking', 500);
  }
});

/**
 * @swagger
 * /api/orders/{orderId}/rate:
 *   post:
 *     summary: Rate and review an order
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               review:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Order rated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error (invalid rating, already rated, etc.)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export const rateOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;
  const { rating, review } = req.body;

  try {
    const order = await Order.findOne({ 
      _id: orderId, 
      user: userId 
    });

    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    if (order.status !== 'delivered') {
      return sendBadRequest(res, 'Can only rate delivered orders');
    }

    if (order.rating) {
      return sendBadRequest(res, 'Order already rated');
    }

    // Update order with rating
    order.rating = {
      score: Number(rating),
      review,
      ratedAt: new Date()
    };

    await order.save();

    // Update partner review task progress
    try {
      const partnerService = require('../services/partnerService').default;
      const Partner = require('../models/Partner').default;
      
      const partner = await Partner.findOne({ userId }).lean();
      if (partner) {
        const reviewTask = partner.tasks.find((t: any) => t.type === 'review');
        if (reviewTask && reviewTask.progress.current < reviewTask.progress.target) {
          reviewTask.progress.current += 1;
          
          if (reviewTask.progress.current >= reviewTask.progress.target) {
            reviewTask.completed = true;
            reviewTask.completedAt = new Date();
          }
          
          await partner.save();
        }
      }
    } catch (error) {
      logger.error('[REVIEW] Error updating partner review task:', error);
      // Don't fail the review if partner update fails
    }

    sendSuccess(res, order, 'Order rated successfully');

  } catch (error) {
    throw new AppError('Failed to rate order', 500);
  }
});

/**
 * @swagger
 * /api/orders/stats:
 *   get:
 *     summary: Get user order statistics (totalOrders, totalSpent, completedOrders, etc.)
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User order statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 */
export const getOrderStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const stats = await Order.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$pricing.total' },
          averageOrderValue: { $avg: '$pricing.total' },
          pendingOrders: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'confirmed', 'preparing', 'shipped']] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]).option({ allowDiskUse: true });

    const userStats = stats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      pendingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0
    };

    // Get recent orders
    const recentOrders = await Order.find({ user: userId })
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    sendSuccess(res, {
      stats: userStats,
      recentOrders
    }, 'Order statistics retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch order statistics', 500);
  }
});

/**
 * @swagger
 * /api/orders/{orderId}/reorder:
 *   post:
 *     summary: Reorder all items from a previous order
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Reorder created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Original order not found
 */
export const reorderFullOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;

  try {
    // Validate and add to cart
    const result = await reorderService.addToCart(userId, orderId);

    sendSuccess(res, result, 'Items added to cart successfully');

  } catch (error: any) {
    logger.error('[REORDER] Full order reorder error:', error);
    throw error;
  }
});

/**
 * @swagger
 * /api/orders/{orderId}/reorder/items:
 *   post:
 *     summary: Reorder selected items from a previous order
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemIds
 *             properties:
 *               itemIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *     responses:
 *       201:
 *         description: Selected items reordered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error (empty itemIds, etc.)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Original order not found
 */
export const reorderItems = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { itemIds } = req.body;
  const userId = req.userId!;

  try {
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return sendBadRequest(res, 'Item IDs are required');
    }

    // Validate and add to cart
    const result = await reorderService.addToCart(userId, orderId, itemIds);

    sendSuccess(res, result, 'Selected items added to cart successfully');

  } catch (error: any) {
    logger.error('[REORDER] Selective reorder error:', error);
    throw error;
  }
});

/**
 * @swagger
 * /api/orders/{orderId}/reorder/validate:
 *   get:
 *     summary: Validate items for reorder (check availability and prices)
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: itemIds
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *         description: Item IDs to validate (pass multiple via ?itemIds=id1&itemIds=id2)
 *     responses:
 *       200:
 *         description: Reorder validation result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export const validateReorder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { itemIds } = req.query;
  const userId = req.userId!;

  try {
    let selectedItemIds: string[] | undefined;
    if (itemIds) {
      selectedItemIds = Array.isArray(itemIds) ? itemIds as string[] : [itemIds as string];
    }

    const validation = await reorderService.validateReorder(userId, orderId, selectedItemIds);

    sendSuccess(res, validation, 'Reorder validation complete');

  } catch (error: any) {
    logger.error('[REORDER] Validation error:', error);
    throw error;
  }
});

/**
 * @swagger
 * /api/orders/reorder/frequently-ordered:
 *   get:
 *     summary: Get frequently ordered items
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *     responses:
 *       200:
 *         description: List of frequently ordered items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 */
export const getFrequentlyOrdered = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { limit = 10 } = req.query;

  try {
    const items = await reorderService.getFrequentlyOrdered(userId, Number(limit));

    sendSuccess(res, items, 'Frequently ordered items retrieved successfully');

  } catch (error: any) {
    logger.error('[REORDER] Frequently ordered error:', error);
    throw error;
  }
});

/**
 * @swagger
 * /api/orders/reorder/suggestions:
 *   get:
 *     summary: Personalized reorder suggestions
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Personalized reorder suggestions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 */
export const getReorderSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const suggestions = await reorderService.getReorderSuggestions(userId);

    sendSuccess(res, suggestions, 'Reorder suggestions retrieved successfully');

  } catch (error: any) {
    logger.error('[REORDER] Suggestions error:', error);
    throw error;
  }
});

/**
 * @swagger
 * /api/orders/{orderId}/refund-request:
 *   post:
 *     summary: Request refund for an order (delivered/cancelled within 7 days)
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *               refundItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Refund request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error (order not eligible, reason too short, etc.)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export const requestRefund = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;
  const { reason, refundItems } = req.body;

  try {
    // Verify order belongs to user
    const order = await Order.findOne({ _id: orderId, user: userId }).lean();
    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    // Validate refund eligibility
    if (order.payment.status !== 'paid' && order.payment.status !== 'partially_refunded') {
      return sendBadRequest(res, 'Only paid or partially refunded orders can be refunded');
    }

    // Check if already fully refunded
    const alreadyRefunded = order.totals.refundAmount || 0;
    const remaining = order.totals.paidAmount - alreadyRefunded;
    if (remaining <= 0) {
      return sendBadRequest(res, 'Order is already fully refunded');
    }

    if (!['delivered', 'cancelled'].includes(order.status)) {
      return sendBadRequest(res, 'Refund can only be requested for delivered or cancelled orders');
    }

    // Check refund window (e.g., 7 days for delivered orders)
    if (order.status === 'delivered') {
      const deliveredAt = order.delivery?.deliveredAt;
      if (!deliveredAt) {
        return sendBadRequest(res, 'Delivery date not found');
      }

      const daysSinceDelivery = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDelivery > 7) {
        return sendBadRequest(res, 'Refund window has expired (7 days)');
      }
    }

    // Calculate refund amount
    let refundAmount = order.totals.paidAmount - (order.totals.refundAmount || 0);
    const refundType = refundItems && refundItems.length > 0 ? 'partial' : 'full';

    if (refundType === 'partial') {
      refundAmount = refundItems.reduce((sum: number, item: any) => {
        const orderItem = order.items.find((oi: any) => oi._id.toString() === item.itemId);
        if (orderItem) {
          return sum + (orderItem.price * item.quantity);
        }
        return sum;
      }, 0);
    }

    // Create refund record
    const refund = new Refund({
      order: order._id,
      user: userId,
      orderNumber: order.orderNumber,
      paymentMethod: (order.payment.method || 'razorpay') as 'razorpay' | 'stripe' | 'wallet' | 'cod',
      refundAmount,
      refundType,
      refundReason: reason,
      refundedItems: refundItems?.map((item: any) => {
        const orderItem = order.items.find((oi: any) => oi._id.toString() === item.itemId);
        return {
          itemId: item.itemId,
          productId: orderItem?.product,
          quantity: item.quantity,
          refundAmount: orderItem ? orderItem.price * item.quantity : 0
        };
      }) || [],
      status: 'pending',
      estimatedArrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await refund.save();

    // Notify admin/merchant for approval
    try {
      // Get user information
      const user = await User.findById(userId).lean();
      const customerName = user?.profile?.firstName || user?.phoneNumber || 'Customer';
      const refundId = (refund._id as any)?.toString() || '';
      
      // Get store information from order
      const storeIds = [...new Set(order.items.map((item: any) => item.store?.toString()).filter(Boolean))];
      
      if (storeIds.length > 0) {
        const Store = (await import('../models/Store')).Store;
        const stores = await Store.find({ _id: { $in: storeIds } }).select('name contact owner').lean();
        
        for (const store of stores) {
          // Get merchant contact info
          const merchantPhone = store.contact?.phone;
          const merchantEmail = store.contact?.email;
          const storeName = store.name || 'Store';
          
          // Send SMS to merchant
          if (merchantPhone) {
            try {
              await SMSService.sendRefundRequestNotification(
                merchantPhone,
                order.orderNumber,
                refundAmount,
                refundType
              );
            } catch (smsError) {
              logger.error(`[REFUND REQUEST] Failed to send SMS to merchant:`, smsError);
            }
          }
          
          // Send email to merchant
          if (merchantEmail) {
            try {
              await EmailService.sendRefundRequestNotification(
                merchantEmail,
                storeName,
                {
                  orderNumber: order.orderNumber,
                  refundAmount,
                  refundType,
                  refundReason: reason,
                  customerName,
                  refundId
                }
              );
            } catch (emailError) {
              logger.error(`[REFUND REQUEST] Failed to send email to merchant:`, emailError);
            }
          }
        }
      }
      
      // Also notify admin if admin email is configured
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        try {
          await EmailService.sendAdminRefundRequestNotification(
            adminEmail,
            {
              orderNumber: order.orderNumber,
              refundAmount,
              refundType,
              refundReason: reason,
              customerName,
              refundId
            }
          );
        } catch (adminError) {
          logger.error(`[REFUND REQUEST] Failed to send admin notification:`, adminError);
        }
      }
    } catch (notificationError) {
      logger.error('[REFUND REQUEST] Error sending notifications:', notificationError);
      // Don't fail refund request if notifications fail
    }

    sendSuccess(res, {
      refundId: (refund._id as any)?.toString() || '',
      orderNumber: order.orderNumber,
      refundAmount,
      refundType,
      status: 'pending',
      message: 'Refund request submitted successfully. It will be reviewed within 24-48 hours.'
    }, 'Refund request submitted successfully', 201);

  } catch (error: any) {
    logger.error('[REFUND REQUEST] Error:', error);
    throw new AppError(`Failed to request refund: ${error.message}`, 500);
  }
});

/**
 * @swagger
 * /api/orders/refunds:
 *   get:
 *     summary: List user refunds
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Paginated list of user refunds
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 */
export const getUserRefunds = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { status, page = 1, limit = 20 } = req.query;

  try {
    const query: any = { user: userId };
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const refunds = await Refund.find(query)
      .populate('order', 'orderNumber totals.total createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Refund.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      refunds,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Refunds retrieved successfully');

  } catch (error: any) {
    logger.error('[GET REFUNDS] Error:', error);
    throw new AppError('Failed to fetch refunds', 500);
  }
});

/**
 * @swagger
 * /api/orders/refunds/{refundId}:
 *   get:
 *     summary: Get single refund details
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: refundId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Refund details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Refund not found
 */
export const getRefundDetails = asyncHandler(async (req: Request, res: Response) => {
  const { refundId } = req.params;
  const userId = req.userId!;

  try {
    const refund = await Refund.findOne({ _id: refundId, user: userId })
      .populate('order', 'orderNumber totals items createdAt')
      .populate('refundedItems.productId', 'name image')
      .lean();

    if (!refund) {
      return sendNotFound(res, 'Refund not found');
    }

    sendSuccess(res, refund, 'Refund details retrieved successfully');

  } catch (error: any) {
    logger.error('[GET REFUND DETAILS] Error:', error);
    throw new AppError('Failed to fetch refund details', 500);
  }
});

/**
 * @swagger
 * /api/orders/{orderId}/financial:
 *   get:
 *     summary: Financial audit trail with ledger entries, coin transactions, and refunds
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order financial details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export const getOrderFinancialDetails = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;

  try {
    const order = await Order.findOne({ _id: orderId, user: userId })
      .select('orderNumber status totals payment timeline cancellation createdAt')
      .lean();

    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    // Get coin transactions related to this order
    const coinTransactions = await CoinTransaction.find({
      $or: [
        { 'metadata.orderId': orderId },
        { 'metadata.orderId': String(order._id) },
      ],
    }).select('amount source type description createdAt metadata').lean();

    // Get ledger entries for this order
    const ledgerEntries = await LedgerEntry.find({
      referenceId: String(order._id),
      referenceModel: 'Order',
    }).select('pairId accountType direction amount coinType operationType createdAt').lean();

    // Get refunds for this order
    const refunds = await Refund.find({
      order: order._id,
      user: userId,
    }).select('amount status reason processedAt createdAt refundedItems').lean();

    sendSuccess(res, {
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        totals: order.totals,
        payment: order.payment,
        cancellation: order.cancellation,
        createdAt: order.createdAt,
      },
      coinTransactions,
      ledgerEntries,
      refunds,
    }, 'Order financial details retrieved');

  } catch (error: any) {
    logger.error('[ORDER FINANCIAL] Error:', error);
    throw new AppError('Failed to fetch order financial details', 500);
  }
});
