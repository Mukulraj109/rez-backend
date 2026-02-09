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
import reorderService from '../services/reorderService';
import activityService from '../services/activityService';
import referralService from '../services/referralService';
import cashbackService from '../services/cashbackService';
import userProductService from '../services/userProductService';
import couponService from '../services/couponService';
import achievementService from '../services/achievementService';
// Note: StorePromoCoin removed - using wallet.brandedCoins instead
import { Wallet } from '../models/Wallet';
import { calculatePromoCoinsEarned, calculatePromoCoinsWithTierBonus, getCoinsExpiryDate } from '../config/promoCoins.config';
import { CHECKOUT_CONFIG } from '../config/checkoutConfig';
import { Subscription } from '../models/Subscription';
import { SMSService } from '../services/SMSService';
import EmailService from '../services/EmailService';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import { MainCategorySlug } from '../models/CoinTransaction';

const VALID_CATEGORY_SLUGS: MainCategorySlug[] = ['food-dining', 'beauty-wellness', 'grocery-essentials', 'fitness-sports', 'healthcare', 'fashion', 'education-learning', 'home-services', 'travel-experiences', 'entertainment', 'financial-lifestyle', 'electronics'];

/**
 * Get the root MainCategory slug for a store.
 * Traverses the category hierarchy up to the root (parentCategory === null).
 */
async function getStoreCategorySlug(storeId: string): Promise<MainCategorySlug | null> {
  try {
    const store = await Store.findById(storeId).select('category').lean();
    if (!store?.category) return null;

    let categoryId = store.category.toString();
    let maxDepth = 5; // Safety limit

    while (maxDepth-- > 0) {
      const cat = await Category.findById(categoryId).select('slug parentCategory').lean();
      if (!cat) return null;

      if (!cat.parentCategory) {
        // This is the root category
        const slug = cat.slug as MainCategorySlug;
        return VALID_CATEGORY_SLUGS.includes(slug) ? slug : null;
      }

      categoryId = cat.parentCategory.toString();
    }

    return null;
  } catch (err) {
    console.error('[ORDER] Error getting store category slug:', err);
    return null;
  }
}
import { Refund } from '../models/Refund';
import merchantWalletService from '../services/merchantWalletService';
import orderSocketService from '../services/orderSocketService';
import merchantNotificationService from '../services/merchantNotificationService';

// Create new order from cart
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { deliveryAddress, paymentMethod, specialInstructions, couponCode, voucherCode, coinsUsed, storeId, items: requestItems, redemptionCode, offerRedemptionCode, lockFeeDiscount: clientLockFeeDiscount } = req.body;

  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('📦 [CREATE ORDER] Starting order creation for user:', userId);
    console.log('📦 [CREATE ORDER] RAW req.body keys:', Object.keys(req.body));
    console.log('📦 [CREATE ORDER] RAW req.body.storeId:', req.body.storeId);
    console.log('📦 [CREATE ORDER] RAW req.body.items:', req.body.items?.length);
    console.log('💰 [CREATE ORDER] coinsUsed received from frontend:', JSON.stringify(coinsUsed));
    console.log('💳 [CREATE ORDER] Payment method:', paymentMethod);
    console.log('🏪 [CREATE ORDER] StoreId filter:', storeId || 'none (all items)');
    console.log('📦 [CREATE ORDER] Request items:', requestItems?.length || 'not provided');
    console.log('🎁 [CREATE ORDER] Redemption code received:', redemptionCode || 'none');
    console.log('🔒 [CREATE ORDER] Lock fee discount received:', clientLockFeeDiscount || 0);
    console.log('🔍 [CREATE ORDER DEBUG] Full req.body:', JSON.stringify(req.body, null, 2));

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
      .session(session);

    console.log('📦 [CREATE ORDER] Cart found:', cart ? 'Yes' : 'No');
    console.log('📦 [CREATE ORDER] Cart items:', cart?.items.length || 0);

    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, 'Cart is empty');
    }

    // Filter cart items by storeId if provided (for multi-store order splitting)
    let itemsToProcess = cart.items;
    if (storeId) {
      console.log('🏪 [CREATE ORDER] Filtering items for store:', storeId);
      itemsToProcess = cart.items.filter((item: any) => {
        const itemStoreId = typeof item.store === 'object' ? item.store._id?.toString() : item.store?.toString();
        return itemStoreId === storeId;
      });
      console.log('🏪 [CREATE ORDER] Items after store filter:', itemsToProcess.length);

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
        console.log('📦 [CREATE ORDER] Filtering by product IDs:', productIds);
        itemsToProcess = itemsToProcess.filter((item: any) => {
          const itemProductId = typeof item.product === 'object' ? item.product._id?.toString() : item.product?.toString();
          return productIds.includes(itemProductId);
        });
        console.log('📦 [CREATE ORDER] Items after product filter:', itemsToProcess.length);
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

    // Validate delivery address
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

    // Validate phone number format (Indian format)
    const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
    const cleanPhone = deliveryAddress.phone.replace(/[\s-]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, 'Invalid phone number format');
    }

    // Validate pincode format (6 digits for India)
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(deliveryAddress.pincode)) {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, 'Invalid pincode format (must be 6 digits)');
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

    console.log('✅ [CREATE ORDER] Validation passed: payment method, address, and store check');

    // Validate coin balances if coins are being used
    if (coinsUsed && (coinsUsed.rezCoins > 0 || coinsUsed.storePromoCoins > 0 || coinsUsed.promoCoins > 0)) {
      console.log('💰 [CREATE ORDER] Validating coin balances:', coinsUsed);

      // Validate REZ coins
      if (coinsUsed.rezCoins > 0) {
        const coinService = require('../services/coinService').default;
        const userCoinBalance = await coinService.getCoinBalance(userId);
        if (userCoinBalance < coinsUsed.rezCoins) {
          await session.abortTransaction();
          session.endSession();
          console.error('❌ [CREATE ORDER] Insufficient REZ coin balance:', {
            required: coinsUsed.rezCoins,
            available: userCoinBalance
          });
          return sendBadRequest(res, `Insufficient REZ coin balance. Required: ${coinsUsed.rezCoins}, Available: ${userCoinBalance}`);
        }
        console.log('✅ [CREATE ORDER] REZ coin balance validated:', { required: coinsUsed.rezCoins, available: userCoinBalance });
      }

      // Validate promo coins
      if (coinsUsed.promoCoins > 0) {
        const wallet = await Wallet.findOne({ user: userId });
        const promoCoin = wallet?.coins?.find((c: any) => c.type === 'promo');
        const promoBalance = promoCoin?.amount || 0;
        if (promoBalance < coinsUsed.promoCoins) {
          await session.abortTransaction();
          session.endSession();
          console.error('❌ [CREATE ORDER] Insufficient promo coin balance:', {
            required: coinsUsed.promoCoins,
            available: promoBalance
          });
          return sendBadRequest(res, `Insufficient promo coin balance. Required: ${coinsUsed.promoCoins}, Available: ${promoBalance}`);
        }
        console.log('✅ [CREATE ORDER] Promo coin balance validated:', { required: coinsUsed.promoCoins, available: promoBalance });
      }

      // Validate store promo coins
      if (coinsUsed.storePromoCoins > 0) {
        // Get the store from the first order item - now using branded coins
        const firstItem = orderCart.items[0];
        const orderStoreId = typeof firstItem.store === 'object'
          ? (firstItem.store as any)._id
          : firstItem.store;

        if (orderStoreId) {
          // Get branded coins balance from wallet
          const wallet = await Wallet.findOne({ user: userId });
          const brandedCoin = wallet?.brandedCoins?.find(
            (bc: any) => bc.merchantId?.toString() === orderStoreId.toString()
          );
          const brandedBalance = brandedCoin?.amount || 0;
          
          if (brandedBalance < coinsUsed.storePromoCoins) {
            await session.abortTransaction();
            session.endSession();
            console.error('❌ [CREATE ORDER] Insufficient branded coin balance:', {
              required: coinsUsed.storePromoCoins,
              available: brandedBalance
            });
            return sendBadRequest(res, `Insufficient store coin balance. Required: ${coinsUsed.storePromoCoins}, Available: ${brandedBalance}`);
          }
          console.log('✅ [CREATE ORDER] Branded coin balance validated:', { required: coinsUsed.storePromoCoins, available: brandedBalance });
        }
      }
    }

    // Validate products availability and build order items
    const orderItems = [];
    const stockUpdates = []; // Track stock updates for atomic operation

    for (const cartItem of orderCart.items) {
      const product = cartItem.product as any;
      const store = cartItem.store as any;

      console.log('📦 [CREATE ORDER] Processing cart item:', {
        productId: product?._id,
        productName: product?.name,
        storeId: store?._id,
        storeName: store?.name,
        quantity: cartItem.quantity,
        price: cartItem.price,
        variant: cartItem.variant
      });

      if (!product) {
        await session.abortTransaction();
        session.endSession();
        console.error('❌ [CREATE ORDER] Product is null/undefined for cart item');
        return sendBadRequest(res, 'Invalid product in cart');
      }

      if (!store) {
        await session.abortTransaction();
        session.endSession();
        console.error('❌ [CREATE ORDER] Store is null/undefined for product:', product.name);
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
        console.log('📦 [CREATE ORDER] Skipping stock check for unlimited product:', product.name);
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
        console.log('📦 [CREATE ORDER] Variant stock check:', {
          product: product.name,
          variant: `${variant.type}: ${variant.value}`,
          availableStock,
          requestedQuantity
        });

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
        console.log('📦 [CREATE ORDER] Product stock check:', {
          product: product.name,
          availableStock,
          requestedQuantity
        });

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

      orderItems.push({
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
      });
    }

    console.log('📦 [CREATE ORDER] All stock checks passed. Stock will be deducted after payment confirmation.');

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

    console.log('💰 [CREATE ORDER] Calculated filtered totals:', {
      filteredSubtotal: subtotal,
      fullCartSubtotal,
      discountRatio,
      tax,
      baseDiscount,
      itemCount: itemsToProcess.length
    });

    // Calculate 15% platform fee on SUBTOTAL ONLY (excludes tax and delivery)
    const platformFeeRate = CHECKOUT_CONFIG.merchantFee?.percentage || 0.15;
    const minFee = CHECKOUT_CONFIG.merchantFee?.minFee || 2;
    const maxFee = CHECKOUT_CONFIG.merchantFee?.maxFee || 10000;
    let platformFee = Math.round(subtotal * platformFeeRate * 100) / 100;
    // Apply min/max constraints
    platformFee = Math.max(minFee, Math.min(maxFee, platformFee));
    const merchantPayout = Math.round((subtotal - platformFee) * 100) / 100;

    console.log('💰 [PLATFORM FEE] Calculated merchant fees:', {
      subtotal,
      platformFeeRate: `${platformFeeRate * 100}%`,
      platformFee,
      merchantPayout
    });

    // Apply partner benefits to order
    console.log('👥 [PARTNER BENEFITS] Applying partner benefits to order...');
    const partnerBenefitsService = require('../services/partnerBenefitsService').default;

    // BUGFIX: Calculate base delivery fee for THIS order's subtotal, not full cart
    // Standard: ₹50 delivery fee, free if subtotal >= ₹500
    const FREE_DELIVERY_THRESHOLD = 500;
    const STANDARD_DELIVERY_FEE = 50;
    const baseDeliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;

    const partnerBenefits = await partnerBenefitsService.applyPartnerBenefits({
      subtotal,
      deliveryFee: baseDeliveryFee, // Use calculated delivery fee for this order
      userId: userId.toString()
    });
    
    console.log('👥 [PARTNER BENEFITS] Benefits applied:', {
      cashbackRate: partnerBenefits.cashbackRate,
      cashbackAmount: partnerBenefits.cashbackAmount,
      deliveryFee: partnerBenefits.deliveryFee,
      deliverySavings: partnerBenefits.deliverySavings,
      birthdayDiscount: partnerBenefits.birthdayDiscount,
      totalSavings: partnerBenefits.totalSavings,
      appliedBenefits: partnerBenefits.appliedBenefits
    });
    
    // Use partner-adjusted values
    const deliveryFee = partnerBenefits.deliveryFee;
    let discount = baseDiscount + partnerBenefits.birthdayDiscount;
    const cashback = partnerBenefits.cashbackAmount;
    
    // Apply partner voucher if provided (FIXED: Issue #4 - Voucher redemption)
    let voucherDiscount = 0;
    let voucherApplied = '';
    if (voucherCode) {
      console.log('🎫 [VOUCHER] Attempting to apply voucher:', voucherCode);
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
        console.log(`✅ [VOUCHER] Applied ${voucherResult.offerTitle}: ₹${voucherDiscount} discount`);
      } else {
        console.warn(`⚠️ [VOUCHER] Invalid voucher: ${voucherResult.error}`);
        // Don't fail order creation, just don't apply the voucher
      }
    }

    // Apply deal redemption code if provided
    let redemptionDiscount = 0;
    let appliedRedemption: any = null;
    if (redemptionCode) {
      console.log('🎁 [REDEMPTION] Attempting to apply deal redemption code:', redemptionCode);
      const DealRedemption = require('../models/DealRedemption').default;

      const redemption = await DealRedemption.findOne({
        redemptionCode: redemptionCode.toUpperCase(),
        user: new mongoose.Types.ObjectId(userId),
      }).session(session);

      if (redemption) {
        // Check if redemption is active - return error if not
        if (redemption.status !== 'active') {
          console.warn(`⚠️ [REDEMPTION] Code already ${redemption.status}:`, redemptionCode);
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
          console.warn('⚠️ [REDEMPTION] Code has expired:', redemptionCode);
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
                ? Math.round(subtotal * (value / 100))
                : value;
            }
          } else if (deal?.discount) {
            const match = deal.discount.match(/(\d+)/);
            if (match) {
              const value = parseInt(match[1]);
              redemptionDiscount = deal.discount.includes('%')
                ? Math.round(subtotal * (value / 100))
                : value;
            }
          }

          // Apply max benefit cap from campaign
          if (redemption.campaignSnapshot?.maxBenefit && redemptionDiscount > redemption.campaignSnapshot.maxBenefit) {
            redemptionDiscount = redemption.campaignSnapshot.maxBenefit;
          }

          appliedRedemption = redemption;
          discount += redemptionDiscount;
          console.log(`✅ [REDEMPTION] Applied deal code ${redemptionCode}: ${redemptionDiscount} discount`);
        }
      } else {
        console.warn('⚠️ [REDEMPTION] Code not found or does not belong to user:', redemptionCode);
        await session.abortTransaction();
        session.endSession();
        return sendBadRequest(res, 'Invalid deal code. Please check the code and try again.');
      }
    }

    // Apply offer redemption code if provided (RED-xxx format cashback vouchers)
    let offerRedemptionCashback = 0;
    let appliedOfferRedemption: any = null;
    if (offerRedemptionCode) {
      console.log('🎟️ [OFFER REDEMPTION] Attempting to apply offer code:', offerRedemptionCode);
      const OfferRedemption = require('../models/OfferRedemption').default;
      const Offer = require('../models/Offer').default;

      const offerRedemption = await OfferRedemption.findOne({
        $or: [
          { redemptionCode: offerRedemptionCode.toUpperCase() },
          { verificationCode: offerRedemptionCode }
        ],
        user: new mongoose.Types.ObjectId(userId),
      }).populate('offer', 'title cashbackPercentage restrictions').session(session);

      if (offerRedemption) {
        // Check if redemption is active
        if (offerRedemption.status !== 'active') {
          console.warn(`⚠️ [OFFER REDEMPTION] Code already ${offerRedemption.status}:`, offerRedemptionCode);
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
          console.warn('⚠️ [OFFER REDEMPTION] Code has expired:', offerRedemptionCode);
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res, 'This voucher has expired');
        }

        const offer = offerRedemption.offer as any;

        // Check minimum order value
        if (offer?.restrictions?.minOrderValue && subtotal < offer.restrictions.minOrderValue) {
          console.warn('⚠️ [OFFER REDEMPTION] Min order value not met:', {
            required: offer.restrictions.minOrderValue,
            current: subtotal
          });
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res, `Minimum order value of ₹${offer.restrictions.minOrderValue} required for this voucher`);
        }

        // Calculate cashback
        const cashbackPercentage = offer?.cashbackPercentage || 0;
        offerRedemptionCashback = Math.round(subtotal * (cashbackPercentage / 100));

        // Apply max discount cap
        if (offer?.restrictions?.maxDiscountAmount && offerRedemptionCashback > offer.restrictions.maxDiscountAmount) {
          offerRedemptionCashback = offer.restrictions.maxDiscountAmount;
        }

        appliedOfferRedemption = offerRedemption;
        console.log(`✅ [OFFER REDEMPTION] Applied offer code ${offerRedemptionCode}: ₹${offerRedemptionCashback} cashback (${cashbackPercentage}%)`);
      } else {
        console.warn('⚠️ [OFFER REDEMPTION] Code not found or does not belong to user:', offerRedemptionCode);
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
      console.log('🔒 [LOCK FEE] Lock fee discount applied:', lockFeeDiscount);
    }

    // Validate coin discount doesn't exceed order total (prevent negative payment)
    const maxAllowedCoinDiscount = subtotal + tax + deliveryFee - discount - lockFeeDiscount;
    if (coinDiscount > maxAllowedCoinDiscount) {
      await session.abortTransaction();
      session.endSession();
      console.error('❌ [CREATE ORDER] Coin discount exceeds order total:', {
        coinDiscount,
        maxAllowedCoinDiscount
      });
      return sendBadRequest(res, `Coin discount (₹${coinDiscount}) exceeds order total (₹${maxAllowedCoinDiscount})`);
    }

    // Calculate total with partner benefits, voucher, lock fee, and coin discount
    let total = subtotal + tax + deliveryFee - discount - lockFeeDiscount - coinDiscount;
    if (total < 0) total = 0;

    console.log('📦 [CREATE ORDER] Order totals (with partner benefits, voucher & coins):', {
      subtotal,
      tax,
      deliveryFee,
      discount,
      voucherDiscount,
      redemptionDiscount,
      offerRedemptionCashback,
      lockFeeDiscount,
      coinDiscount,
      cashback,
      total,
      partnerBenefitsApplied: partnerBenefits.appliedBenefits,
      voucherApplied,
      redemptionCodeApplied: appliedRedemption?.redemptionCode,
      offerRedemptionCodeApplied: appliedOfferRedemption?.redemptionCode,
      coinsUsed
    });

    // Generate order number
    const orderCount = await Order.countDocuments().session(session);
    const orderNumber = `ORD${Date.now()}${String(orderCount + 1).padStart(4, '0')}`;

    console.log('📦 [CREATE ORDER] Generated order number:', orderNumber);

    // Get primary store - use storeId from request (for multi-store orders) or extract from first item
    const primaryStoreId = storeId || orderItems[0]?.store;
    console.log('🏪 [CREATE ORDER] Primary store for order:', primaryStoreId);

    // Create order
    const order = new Order({
      orderNumber,
      user: userId,
      store: primaryStoreId, // Set primary store for easy access/population
      items: orderItems,
      totals: {
        subtotal,
        tax,
        delivery: deliveryFee,
        discount,
        lockFeeDiscount,
        cashback,
        total,
        paidAmount: paymentMethod === 'cod' ? 0 : total,
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
        method: 'standard',
        status: 'pending',
        address: deliveryAddress,
        deliveryFee
      },
      timeline: [{
        status: 'placed',
        message: 'Order placed - awaiting payment',
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
      } : undefined
    });

    await order.save({ session });

    console.log('📦 [CREATE ORDER] Order saved successfully:', order.orderNumber);

    // Mark deal redemption as used if applied
    if (appliedRedemption) {
      console.log('🎁 [REDEMPTION] Marking redemption as used:', appliedRedemption.redemptionCode);
      appliedRedemption.status = 'used';
      appliedRedemption.usedAt = new Date();
      appliedRedemption.orderId = order._id;
      appliedRedemption.benefitApplied = redemptionDiscount;
      await appliedRedemption.save({ session });
      console.log('✅ [REDEMPTION] Redemption marked as used');
    }

    // Mark offer redemption as used and credit cashback if applied
    if (appliedOfferRedemption && offerRedemptionCashback > 0) {
      console.log('🎟️ [OFFER REDEMPTION] Marking offer redemption as used:', appliedOfferRedemption.redemptionCode);

      // Mark as used
      appliedOfferRedemption.status = 'used';
      appliedOfferRedemption.usedDate = new Date();
      appliedOfferRedemption.order = order._id;
      appliedOfferRedemption.usedAmount = offerRedemptionCashback;
      await appliedOfferRedemption.save({ session });

      // Credit cashback to user's wallet (create wallet if doesn't exist)
      let userWallet = await Wallet.findOne({ user: userId }).session(session);
      if (!userWallet) {
        console.log('🏦 [OFFER REDEMPTION] Creating wallet for user:', userId);
        userWallet = new Wallet({
          user: userId,
          balance: { total: 0, available: 0, pending: 0 },
          coins: [],
          currency: 'INR',
          isActive: true
        });
        await userWallet.save({ session });
      }

      const balanceBefore = userWallet.balance.total;
      userWallet.balance.total += offerRedemptionCashback;
      userWallet.balance.available += offerRedemptionCashback;

      // Add to rez coins
      const rezCoin = userWallet.coins.find((c: any) => c.type === 'rez');
      if (rezCoin) {
        rezCoin.amount += offerRedemptionCashback;
        rezCoin.lastEarned = new Date();
      } else {
        userWallet.coins.push({
          type: 'rez',
          amount: offerRedemptionCashback,
          lastEarned: new Date()
        } as any);
      }

      await userWallet.save({ session });

      // Create transaction record for cashback
      const { Transaction } = require('../models/Transaction');
      const cashbackTransaction = new Transaction({
        user: userId,
        type: 'credit',
        amount: offerRedemptionCashback,
        currency: userWallet.currency || 'INR',
        category: 'cashback',
        description: `Cashback from order #${order.orderNumber}`,
        status: {
          current: 'completed',
          history: [{
            status: 'completed',
            timestamp: new Date(),
            reason: 'Offer cashback credited on order placement',
          }],
        },
        source: {
          type: 'cashback',
          reference: appliedOfferRedemption._id,
          description: `Order cashback - ${(appliedOfferRedemption.offer as any)?.title || 'Offer'}`,
          metadata: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            offerId: appliedOfferRedemption.offer?._id || appliedOfferRedemption.offer,
            redemptionCode: appliedOfferRedemption.redemptionCode,
          },
        },
        balanceBefore,
        balanceAfter: userWallet.balance.total,
      });

      await cashbackTransaction.save({ session });
      console.log(`✅ [OFFER REDEMPTION] Cashback of ₹${offerRedemptionCashback} credited to wallet`);

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
        }).catch((err: any) => console.error('Failed to send cashback notification:', err));
      } catch (notifError) {
        console.error('Failed to send cashback notification:', notifError);
      }

      console.log('✅ [OFFER REDEMPTION] Offer redemption processed successfully');
    }

    // For COD orders, deduct stock immediately since payment confirmation never happens
    if (paymentMethod === 'cod') {
      console.log('📦 [CREATE ORDER] Deducting stock for COD order...');

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
            console.error('❌ [CREATE ORDER] Stock became insufficient during order creation');
            return sendBadRequest(res, 'Stock became unavailable. Please try again.');
          }

          // Emit real-time stock update
          if (stockSocketService) {
            const product = await Product.findById(stockUpdate.productId).select('inventory');
            if (product) {
              stockSocketService.emitStockUpdate(
                stockUpdate.productId.toString(),
                product.inventory?.stock || 0
              );
            }
          }
        } catch (stockError) {
          console.error('❌ [CREATE ORDER] Failed to deduct stock:', stockError);
          await session.abortTransaction();
          session.endSession();
          return sendBadRequest(res, 'Failed to process order. Please try again.');
        }
      }

      console.log('✅ [CREATE ORDER] Stock deducted successfully for COD order');
    }

    // Deduct coins for COD orders immediately (INSIDE TRANSACTION - ATOMIC)
    // Online payments deduct coins in PaymentService after payment confirmation
    if (paymentMethod === 'cod' && coinsUsed && coinDiscount > 0) {
      console.log('💰 [CREATE ORDER] Deducting coins for COD order (atomic):', coinsUsed);

      // Get wallet with session for atomic operation
      const wallet = await Wallet.findOne({ user: userId }).session(session);

      if (!wallet) {
        await session.abortTransaction();
        session.endSession();
        console.error('❌ [CREATE ORDER] Wallet not found for coin deduction');
        return sendBadRequest(res, 'Wallet not found. Cannot process coin payment.');
      }

      // Determine the store's root category for category-specific coin deduction
      const firstCartItem = orderCart.items[0];
      const codStoreId = firstCartItem?.store
        ? (typeof firstCartItem.store === 'object' ? (firstCartItem.store as any)._id : firstCartItem.store)
        : null;
      const codCategory = codStoreId ? await getStoreCategorySlug(codStoreId.toString()) : null;

      // Deduct REZ coins from Wallet model
      if (coinsUsed.rezCoins && coinsUsed.rezCoins > 0) {
        // Try category balance first, fall back to global
        let deductedFromCategory = false;
        if (codCategory) {
          const catBal = wallet.getCategoryBalance(codCategory);
          if (catBal >= coinsUsed.rezCoins) {
            wallet.deductCategoryCoins(codCategory, coinsUsed.rezCoins);
            deductedFromCategory = true;
            console.log(`✅ [CREATE ORDER] REZ coins deducted from ${codCategory} category balance:`, coinsUsed.rezCoins);
          }
        }

        if (!deductedFromCategory) {
          // Fall back to global ReZ coins
          const rezCoin = wallet.coins.find((c: any) => c.type === 'rez');
          if (!rezCoin || rezCoin.amount < coinsUsed.rezCoins) {
            await session.abortTransaction();
            session.endSession();
            console.error('❌ [CREATE ORDER] Insufficient rez coins in wallet at time of deduction');
            return sendBadRequest(res, 'Insufficient REZ coins. Balance may have changed.');
          }

          rezCoin.amount -= coinsUsed.rezCoins;
          rezCoin.lastUsed = new Date();
          wallet.markModified('coins');
          wallet.balance.available = Math.max(0, wallet.balance.available - coinsUsed.rezCoins);
        }

        // balance.total is recalculated by the pre-save hook (available + pending + cashback + categoryTotal)
        // so we do NOT manually decrement it here — it would cause double-deduction
        wallet.statistics.totalSpent += coinsUsed.rezCoins;
        wallet.lastTransactionAt = new Date();
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
        console.log('✅ [CREATE ORDER] REZ coins deducted from wallet for COD:', coinsUsed.rezCoins, deductedFromCategory ? `(${codCategory})` : '(global)');

        // Also update UserLoyalty.categoryCoins if deducted from category
        if (deductedFromCategory && codCategory) {
          try {
            const UserLoyalty = require('../models/UserLoyalty').default || require('../models/UserLoyalty').UserLoyalty;
            const loyalty = await UserLoyalty.findOne({ userId: userId.toString() });
            if (loyalty && loyalty.categoryCoins) {
              const catCoins = loyalty.categoryCoins.get(codCategory);
              if (catCoins) {
                catCoins.available = Math.max(0, catCoins.available - coinsUsed.rezCoins);
                loyalty.categoryCoins.set(codCategory, catCoins);
                loyalty.markModified('categoryCoins');
                await loyalty.save();
              }
            }
          } catch (loyaltyErr) {
            console.error('[CREATE ORDER] Failed to update UserLoyalty categoryCoins:', loyaltyErr);
          }
        }
      }

      // Deduct promo coins
      if (coinsUsed.promoCoins && coinsUsed.promoCoins > 0) {
        const promoCoin = wallet.coins.find((c: any) => c.type === 'promo');
        if (!promoCoin || promoCoin.amount < coinsUsed.promoCoins) {
          await session.abortTransaction();
          session.endSession();
          console.error('❌ [CREATE ORDER] Insufficient promo coins at time of deduction');
          return sendBadRequest(res, 'Insufficient Promo coins. Balance may have changed.');
        }

        promoCoin.amount -= coinsUsed.promoCoins;
        promoCoin.lastUsed = new Date();
        wallet.lastTransactionAt = new Date();

        console.log('✅ [CREATE ORDER] Promo coins deducted for COD:', coinsUsed.promoCoins);
      }

      // Deduct branded coins (store-specific coins)
      if (coinsUsed.storePromoCoins && coinsUsed.storePromoCoins > 0) {
        const firstItem = orderCart.items[0];
        const deductStoreId = typeof firstItem.store === 'object'
          ? (firstItem.store as any)._id
          : firstItem.store;

        if (deductStoreId) {
          const brandedCoin = wallet.brandedCoins?.find(
            (bc: any) => bc.merchantId?.toString() === deductStoreId.toString()
          );

          if (!brandedCoin || brandedCoin.amount < coinsUsed.storePromoCoins) {
            await session.abortTransaction();
            session.endSession();
            console.error('❌ [CREATE ORDER] Insufficient branded coins at time of deduction');
            return sendBadRequest(res, 'Insufficient store coins. Balance may have changed.');
          }

          brandedCoin.amount -= coinsUsed.storePromoCoins;
          brandedCoin.lastUsed = new Date();
          wallet.balance.total = Math.max(0, wallet.balance.total - coinsUsed.storePromoCoins);
          wallet.statistics.totalSpent += coinsUsed.storePromoCoins;
          wallet.lastTransactionAt = new Date();

          console.log('✅ [CREATE ORDER] Branded coins deducted for COD:', coinsUsed.storePromoCoins);
        }
      }

      // Save wallet with session (atomic)
      await wallet.save({ session });
      console.log('✅ [CREATE ORDER] All coins deducted atomically for COD order');
    }

    // Mark voucher as used if one was applied
    if (voucherApplied) {
      try {
        console.log('🎫 [VOUCHER] Marking voucher as used:', voucherApplied);
        const partnerService = require('../services/partnerService').default;
        await partnerService.markVoucherUsed(userId.toString(), voucherApplied);
        console.log('✅ [VOUCHER] Voucher marked as used successfully');
      } catch (error) {
        console.error('❌ [VOUCHER] Error marking voucher as used:', error);
        // Don't fail order creation if voucher marking fails
      }
    }
    
    // Check for transaction bonus (every 11 orders)
    // Note: This is checked after order placement, but bonus is only awarded after delivery
    try {
      console.log('🎁 [PARTNER BENEFITS] Checking transaction bonus eligibility...');
      const bonusAmount = await partnerBenefitsService.checkTransactionBonus(userId.toString());
      if (bonusAmount > 0) {
        console.log(`✅ [PARTNER BENEFITS] Transaction bonus will be awarded: ₹${bonusAmount}`);
      }
    } catch (error) {
      console.error('❌ [PARTNER BENEFITS] Error checking transaction bonus:', error);
      // Don't fail order creation if bonus check fails
    }

    // Note: Cart is NOT cleared here - it will be cleared after successful payment
    // This allows users to retry payment if it fails

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ [CREATE ORDER] Transaction committed successfully');
    console.log('💳 [CREATE ORDER] Order created with status "pending_payment"');
    console.log('📌 [CREATE ORDER] Stock will be deducted after payment confirmation');

    // NOTE: Merchant wallet credit moved to delivery (see updateOrderStatus).
    // Both COD and online payment orders only credit merchant wallet when status = 'delivered'.

    // Populate order for response
    const populatedOrder = await Order.findById(order._id)
      .populate('items.product', 'name image images')
      .populate('items.store', 'name logo')
      .populate('user', 'profile.firstName profile.lastName profile.phoneNumber');

    console.log('📦 [CREATE ORDER] Order creation complete');

    // Mark coupon as used if one was applied
    // Check both cart.coupon (from DB) and couponCode (from request body)
    // Frontend passes couponCode in request but doesn't save it to cart DB
    const appliedCouponCode = cart.coupon?.code || couponCode;
    if (appliedCouponCode) {
      console.log('🎟️ [CREATE ORDER] Marking coupon as used:', appliedCouponCode);
      const couponResult = await couponService.markCouponAsUsed(
        new Types.ObjectId(userId),
        appliedCouponCode,
        order._id as Types.ObjectId
      );
      if (!couponResult.success) {
        console.warn(`⚠️ [CREATE ORDER] Failed to mark coupon as used: ${couponResult.error}`);
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

    // Trigger achievement update for order creation
    try {
      await achievementService.triggerAchievementUpdate(userId, 'order_created');
    } catch (error) {
      console.error('❌ [ORDER] Error triggering achievement update:', error);
    }

    // Send notifications to customer and merchant
    try {
      const user = populatedOrder?.user as any;
      const userPhone = user?.profile?.phoneNumber || user?.phoneNumber || user?.phone;
      const userName = user?.profile?.firstName || user?.fullName || 'Customer';
      const userEmail = user?.email;
      const storeData = populatedOrder?.items[0]?.store as any;
      const storeName = storeData?.name || 'Store';
      const orderNumber = populatedOrder?.orderNumber || (order._id as any).toString();

      // Send SMS to customer
      if (userPhone) {
        console.log('📱 [ORDER] Sending order confirmation SMS to customer...');
        await SMSService.sendOrderConfirmation(userPhone, orderNumber, storeName);
      }

      // Send email to customer
      if (userEmail && userName) {
        console.log('📧 [ORDER] Sending order confirmation email to customer...');
        const orderItems = populatedOrder?.items.map((item: any) => ({
          name: item.product?.name || 'Product',
          quantity: item.quantity,
          price: item.price * item.quantity
        })) || [];

        await EmailService.sendOrderConfirmation(userEmail, userName, {
          orderId: (order._id as any).toString(),
          orderNumber,
          items: orderItems,
          subtotal: populatedOrder?.totals?.subtotal || 0,
          deliveryFee: populatedOrder?.delivery?.deliveryFee || 0,
          total: populatedOrder?.totals?.total || 0,
          estimatedDelivery: 'Within 30-45 minutes',
          storeName,
          deliveryAddress: deliveryAddress
        });
      }

      // Send new order alert to merchant
      if (storeData?._id) {
        console.log('📱 [ORDER] Sending new order alert to merchant...');
        const store = await Store.findById(storeData._id).select('contact merchant');
        const merchantPhone = store?.contact?.phone;
        const merchantId = (store as any)?.merchant?.toString();

        if (merchantPhone) {
          await SMSService.sendNewOrderAlertToMerchant(
            merchantPhone,
            orderNumber,
            userName,
            total
          );

          // Send high-value order alert if total > ₹10,000
          if (total > 10000) {
            console.log('💰 [ORDER] Sending high-value order alert to merchant...');
            await SMSService.sendHighValueOrderAlert(merchantPhone, orderNumber, total);
          }
        }

        // Send in-app notification to merchant
        if (merchantId) {
          console.log('📬 [ORDER] Sending in-app notification to merchant...');
          await merchantNotificationService.notifyNewOrder({
            merchantId,
            orderId: (order._id as any).toString(),
            orderNumber,
            customerName: userName,
            totalAmount: total,
            itemCount: populatedOrder?.items?.length || 0,
            paymentMethod,
          });
        }
      }

      console.log('✅ [ORDER] All notifications sent successfully');
    } catch (error) {
      console.error('❌ [ORDER] Error sending notifications:', error);
      // Don't fail order creation if notifications fail
    }

    sendSuccess(res, populatedOrder, 'Order created successfully', 201);

  } catch (error: any) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();

    console.error('❌ [CREATE ORDER] Error:', error);
    console.error('❌ [CREATE ORDER] Error message:', error.message);
    console.error('❌ [CREATE ORDER] Error stack:', error.stack);
    console.error('❌ [CREATE ORDER] Error name:', error.name);

    // Log more details about the error
    if (error.name === 'TypeError') {
      console.error('❌ [CREATE ORDER] This is a TypeError - likely null/undefined access');
    }

    throw new AppError(`Failed to create order: ${error.message}`, 500);
  }
});

// Get user's orders
export const getUserOrders = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { status, page = 1, limit = 20 } = req.query;

  try {
    const query: any = { user: userId };
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const orders = await Order.find(query)
      .populate('items.product', 'name images basePrice')
      .populate('items.store', 'name logo')
      .populate('store', 'name logo location') // Populate top-level store
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Order.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Orders retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch orders', 500);
  }
});

// Get single order by ID
export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;

  console.log('📦 [GET ORDER BY ID] Request:', { orderId, userId });

  try {
    const order = await Order.findOne({
      _id: orderId,
      user: userId
    })
    .populate('items.product', 'name images basePrice description')
    .populate('items.store', 'name logo location')
    .populate('store', 'name logo location') // Top-level store field
    .populate('user', 'profile.firstName profile.lastName profile.phoneNumber profile.email')
    .lean();

    if (!order) {
      // Debug: Check if order exists but belongs to different user
      const orderExists = await Order.findById(orderId).select('_id user orderNumber').lean();
      console.log('⚠️ [GET ORDER BY ID] Order not found for user:', {
        orderId,
        userId,
        orderExists: !!orderExists,
        orderOwner: orderExists?.user?.toString(),
        orderNumber: orderExists?.orderNumber,
        userMismatch: orderExists ? orderExists.user?.toString() !== userId : 'N/A'
      });
      return sendNotFound(res, 'Order not found');
    }

    console.log('✅ [GET ORDER BY ID] Order found:', { orderId, orderNumber: order.orderNumber });
    sendSuccess(res, order, 'Order retrieved successfully');

  } catch (error: any) {
    console.error('❌ [GET ORDER BY ID] Error:', error.message);
    throw new AppError('Failed to fetch order', 500);
  }
});

// Cancel order
export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;
  const { reason } = req.body;

  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log('🚫 [CANCEL ORDER] Starting cancellation for order:', orderId);

    const order = await Order.findOne({
      _id: orderId,
      user: userId
    }).session(session);

    console.log('🚫 [CANCEL ORDER] Order found:', order ? 'Yes' : 'No');

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return sendNotFound(res, 'Order not found');
    }

    console.log('🚫 [CANCEL ORDER] Current status:', order.status);

    // Check if order can be cancelled
    if (!['placed', 'confirmed', 'preparing'].includes(order.status)) {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, 'Order cannot be cancelled at this stage');
    }

    console.log('🚫 [CANCEL ORDER] Updating order status to cancelled');

    // Restore stock for cancelled order items
    console.log('🚫 [CANCEL ORDER] Restoring stock for order items...');
    const stockRestorations: Array<{ productId: string; storeId: string; newStock: number; productName: string }> = [];

    for (const orderItem of order.items) {
      const productId = orderItem.product;
      const quantity = orderItem.quantity;
      const variant = orderItem.variant;

      console.log('🚫 [CANCEL ORDER] Restoring stock for:', {
        productId,
        quantity,
        variant
      });

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
          console.log('✅ [CANCEL ORDER] Variant stock restored for product:', productId);
          const newStock = updateResult.inventory?.stock ?? 0;
          const storeId = updateResult.store?.toString() || '';
          stockRestorations.push({
            productId: updateResult._id.toString(),
            storeId,
            newStock,
            productName: updateResult.name || 'Unknown Product'
          });
        } else {
          console.warn('⚠️ [CANCEL ORDER] Could not restore variant stock for product:', productId);
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
          console.log('✅ [CANCEL ORDER] Product stock restored for product:', productId);
          const newStock = updateResult.inventory?.stock ?? 0;
          const storeId = updateResult.store?.toString() || '';
          stockRestorations.push({
            productId: updateResult._id.toString(),
            storeId,
            newStock,
            productName: updateResult.name || 'Unknown Product'
          });
        } else {
          console.warn('⚠️ [CANCEL ORDER] Could not restore stock for product:', productId);
        }
      }
    }

    // Refund coins if they were used in this order
    if (order.payment?.coinsUsed) {
      console.log('💰 [CANCEL ORDER] Refunding coins used in order:', order.payment.coinsUsed);
      const userId = order.user;

      // Support both rezCoins (new) and wasilCoins (legacy) field names
      const rezCoins = (order.payment.coinsUsed as any).rezCoins || (order.payment.coinsUsed as any).wasilCoins || 0;
      const promoCoins = (order.payment.coinsUsed as any).promoCoins || 0;
      const storePromoCoins = (order.payment.coinsUsed as any).storePromoCoins || 0;

      // Refund REZ coins
      if (rezCoins > 0) {
        try {
          const wallet = await Wallet.findOne({ user: userId }).session(session);
          if (wallet) {
            const rezCoin = wallet.coins.find((c: any) => c.type === 'rez');
            if (rezCoin) {
              rezCoin.amount += rezCoins;
              wallet.balance.available += rezCoins;
              wallet.balance.total += rezCoins;
              wallet.lastTransactionAt = new Date();
              await wallet.save({ session });
              console.log('✅ [CANCEL ORDER] REZ coins refunded:', rezCoins);
            }
          }

          // Create refund transaction record
          const coinService = require('../services/coinService').default;
          await coinService.awardCoins(
            userId.toString(),
            rezCoins,
            'refund',
            `Refund for cancelled order: ${order.orderNumber}`
          );
        } catch (coinError) {
          console.error('❌ [CANCEL ORDER] Failed to refund REZ coins:', coinError);
        }
      }

      // Refund promo coins
      if (promoCoins > 0) {
        try {
          const wallet = await Wallet.findOne({ user: userId }).session(session);
          if (wallet) {
            const promoCoin = wallet.coins.find((c: any) => c.type === 'promo');
            if (promoCoin) {
              promoCoin.amount += promoCoins;
              wallet.lastTransactionAt = new Date();
              await wallet.save({ session });
              console.log('✅ [CANCEL ORDER] Promo coins refunded:', promoCoins);
            }
          }
        } catch (coinError) {
          console.error('❌ [CANCEL ORDER] Failed to refund promo coins:', coinError);
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
            const wallet = await Wallet.findOne({ user: userId }).session(session);
            if (wallet) {
              await wallet.addBrandedCoins(
                new Types.ObjectId(storeId.toString()),
                storeName,
                storePromoCoins
              );
              console.log('✅ [CANCEL ORDER] Store promo coins refunded:', storePromoCoins);
            }
          }
        } catch (coinError) {
          console.error('❌ [CANCEL ORDER] Failed to refund store promo coins:', coinError);
        }
      }
    }

    // Reverse offer redemption cashback if applied
    if ((order as any).offerRedemption?.code) {
      console.log('🎟️ [CANCEL ORDER] Reversing offer redemption cashback...');
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
          console.log('✅ [CANCEL ORDER] Offer redemption restored to active:', redemptionCode);

          // Deduct cashback from user's wallet if it was credited
          if (cashbackAmount > 0) {
            const wallet = await Wallet.findOne({ user: userId }).session(session);
            if (wallet) {
              const balanceBefore = wallet.balance.total;

              // Deduct from wallet balance
              wallet.balance.total = Math.max(0, wallet.balance.total - cashbackAmount);
              wallet.balance.available = Math.max(0, wallet.balance.available - cashbackAmount);

              // Deduct from rez coins
              const rezCoin = wallet.coins.find((c: any) => c.type === 'rez');
              if (rezCoin) {
                rezCoin.amount = Math.max(0, rezCoin.amount - cashbackAmount);
              }

              await wallet.save({ session });

              // Create reversal transaction record
              const reversalTransaction = new Transaction({
                user: userId,
                type: 'debit',
                amount: cashbackAmount,
                currency: wallet.currency || 'INR',
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
                balanceBefore,
                balanceAfter: wallet.balance.total,
              });

              await reversalTransaction.save({ session });
              console.log(`✅ [CANCEL ORDER] Cashback of ₹${cashbackAmount} reversed from wallet`);

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
                }).catch((err: any) => console.error('Failed to send reversal notification:', err));
              } catch (notifError) {
                console.error('Failed to send reversal notification:', notifError);
              }
            }
          }
        } else {
          console.warn('⚠️ [CANCEL ORDER] Offer redemption not found or already reverted:', redemptionCode);
        }
      } catch (redemptionError) {
        console.error('❌ [CANCEL ORDER] Failed to reverse offer redemption:', redemptionError);
        // Continue with cancellation even if redemption reversal fails
      }
    }

    // Update order status
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = reason || 'Customer request';

    console.log('🚫 [CANCEL ORDER] Saving order...');

    await order.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ [CANCEL ORDER] Order cancelled and stock restored successfully');

    // Emit Socket.IO events for stock restorations after transaction success
    for (const restoration of stockRestorations) {
      try {
        console.log('🔌 [CANCEL ORDER] Emitting stock update via Socket.IO:', restoration);
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
        console.error('❌ [CANCEL ORDER] Socket emission failed:', socketError);
      }
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

    console.error('❌ [CANCEL ORDER] Error:', error);
    console.error('❌ [CANCEL ORDER] Error message:', error.message);
    console.error('❌ [CANCEL ORDER] Error stack:', error.stack);
    throw new AppError(`Failed to cancel order: ${error.message}`, 500);
  }
});

// Update order status (admin/store owner)
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status, estimatedDeliveryTime, trackingInfo } = req.body;

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return sendNotFound(res, 'Order not found');
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
      .populate('user', 'profile.firstName profile.lastName');

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
        console.error('❌ [ORDER] Error processing referral rewards:', error);
        // Don't fail the order update if referral processing fails
      }

      // Award 5% purchase reward coins on delivery (5% of subtotal, NOT total)
      // Coins go to the store's MainCategory balance
      try {
        const coinService = require('../services/coinService');
        const purchaseRewardRate = 0.05;
        const coinsToAward = Math.floor(populatedOrder.totals.subtotal * purchaseRewardRate);
        if (coinsToAward > 0) {
          // Determine the store's root category for category-specific coins
          const firstItem = populatedOrder.items[0];
          const rewardStoreId = firstItem?.store
            ? (typeof firstItem.store === 'object' ? (firstItem.store as any)._id : firstItem.store)
            : null;
          const rewardCategory = rewardStoreId ? await getStoreCategorySlug(rewardStoreId.toString()) : null;

          console.log('🪙 [ORDER] Awarding 5% purchase reward on delivery:', coinsToAward, 'coins', rewardCategory ? `(${rewardCategory})` : '(global)');
          await coinService.awardCoins(
            userIdObj.toString(),
            coinsToAward,
            'purchase_reward',
            `5% purchase reward for order ${populatedOrder.orderNumber}`,
            { orderId: populatedOrder._id },
            rewardCategory
          );
          console.log('✅ [ORDER] Purchase reward coins awarded:', coinsToAward, rewardCategory ? `to ${rewardCategory}` : 'globally');
        }
      } catch (coinError) {
        console.error('[ORDER] Failed to award purchase reward coins:', coinError);
      }

      // Credit merchant wallet on delivery (merchant gets subtotal minus 15% platform fee)
      try {
        const firstItem = populatedOrder.items[0];
        if (firstItem && firstItem.store) {
          const storeId = typeof firstItem.store === 'object'
            ? (firstItem.store as any)._id
            : firstItem.store;

          const store = await Store.findById(storeId);

          if (store && store.merchantId) {
            console.log('💰 [ORDER] Crediting merchant wallet on delivery...');

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

            console.log('✅ [ORDER] Merchant wallet credited:', {
              gross: grossAmount,
              fee: platformFee,
              net: grossAmount - platformFee
            });

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
        console.error('❌ [ORDER] Failed to credit merchant wallet:', walletError);
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
          console.log('✅ [ORDER] Admin wallet credited:', adminCommission);
        }
      } catch (adminError) {
        console.error('❌ [ORDER] Failed to credit admin wallet:', adminError);
      }

      // Create cashback for delivered order
      try {
        console.log('💰 [ORDER] Creating cashback for delivered order:', populatedOrder._id);
        await cashbackService.createCashbackFromOrder(populatedOrder._id as Types.ObjectId);
        console.log('✅ [ORDER] Cashback created successfully');
      } catch (error) {
        console.error('❌ [ORDER] Error creating cashback:', error);
        // Don't fail the order update if cashback creation fails
      }

      // Create user products for delivered order
      try {
        console.log('📦 [ORDER] Creating user products for delivered order:', populatedOrder._id);
        await userProductService.createUserProductsFromOrder(populatedOrder._id as Types.ObjectId);
        console.log('✅ [ORDER] User products created successfully');
      } catch (error) {
        console.error('❌ [ORDER] Error creating user products:', error);
        // Don't fail the order update if user product creation fails
      }

      // Award store promo coins for delivered order
      try {
        console.log('💎 [ORDER] Awarding store promo coins for delivered order:', populatedOrder._id);

        // Get user's subscription tier for bonus calculation
        let userTier = 'free';
        try {
          const subscription = await Subscription.findOne({
            user: userIdObj,
            status: 'active'
          }).select('tier');
          if (subscription?.tier) {
            userTier = subscription.tier;
          }
        } catch (tierError) {
          console.warn('⚠️ [ORDER] Could not fetch user tier, using free tier:', tierError);
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
            const wallet = await Wallet.findOne({ user: userIdObj });
            if (wallet) {
              await wallet.addBrandedCoins(
                new Types.ObjectId(storeId.toString()),
                storeName,
                coinsToEarn,
                storeLogo
              );
              console.log(`✅ [ORDER] Awarded ${coinsToEarn} branded coins (base: ${baseCoins}, tier bonus: ${bonusCoins}, tier: ${userTier}) for store ${storeName}`);
            }
          } else {
            console.warn('⚠️ [ORDER] Could not determine store ID for branded coins');
          }
        } else {
          console.log('ℹ️ [ORDER] Order value too low for coins or coins disabled');
        }
      } catch (error) {
        console.error('❌ [ORDER] Error awarding promo coins:', error);
        // Don't fail the order update if promo coin creation fails
      }

      // Trigger achievement update for order delivery
      try {
        await achievementService.triggerAchievementUpdate(populatedOrder.user, 'order_delivered');
      } catch (error) {
        console.error('❌ [ORDER] Error triggering achievement update:', error);
      }

      // Update partner progress for order delivery
      try {
        const partnerService = require('../services/partnerService').default;
        const orderId = populatedOrder._id as Types.ObjectId;
        await partnerService.updatePartnerProgress(
          userIdObj.toString(),
          orderId.toString()
        );
        console.log('✅ [ORDER] Partner progress updated successfully');
      } catch (error) {
        console.error('❌ [ORDER] Error updating partner progress:', error);
        // Don't fail the order update if partner progress update fails
      }
    }

    sendSuccess(res, populatedOrder, 'Order status updated successfully');

  } catch (error) {
    throw new AppError('Failed to update order status', 500);
  }
});

// Get order tracking info
export const getOrderTracking = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;

  try {
    const order = await Order.findOne({ 
      _id: orderId, 
      user: userId 
    })
    .select('status tracking estimatedDeliveryTime deliveredAt createdAt items')
    .populate('items.product', 'name images')
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

// Rate and review order
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
      
      const partner = await Partner.findOne({ userId });
      if (partner) {
        const reviewTask = partner.tasks.find((t: any) => t.type === 'review');
        if (reviewTask && reviewTask.progress.current < reviewTask.progress.target) {
          reviewTask.progress.current += 1;
          
          if (reviewTask.progress.current >= reviewTask.progress.target) {
            reviewTask.completed = true;
            reviewTask.completedAt = new Date();
          }
          
          await partner.save();
          console.log('✅ [REVIEW] Partner review task updated:', reviewTask.progress.current, '/', reviewTask.progress.target);
        }
      }
    } catch (error) {
      console.error('❌ [REVIEW] Error updating partner review task:', error);
      // Don't fail the review if partner update fails
    }

    sendSuccess(res, order, 'Order rated successfully');

  } catch (error) {
    throw new AppError('Failed to rate order', 500);
  }
});

// Get order statistics for user
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
    ]);

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

// Re-order full order
export const reorderFullOrder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;

  try {
    console.log('🔄 [REORDER] Starting full order reorder:', { userId, orderId });

    // Validate and add to cart
    const result = await reorderService.addToCart(userId, orderId);

    console.log('✅ [REORDER] Full order reorder complete:', {
      addedItems: result.addedItems.length,
      skippedItems: result.skippedItems.length
    });

    sendSuccess(res, result, 'Items added to cart successfully');

  } catch (error: any) {
    console.error('❌ [REORDER] Full order reorder error:', error);
    throw error;
  }
});

// Re-order selected items
export const reorderItems = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { itemIds } = req.body;
  const userId = req.userId!;

  try {
    console.log('🔄 [REORDER] Starting selective reorder:', { userId, orderId, itemIds });

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return sendBadRequest(res, 'Item IDs are required');
    }

    // Validate and add to cart
    const result = await reorderService.addToCart(userId, orderId, itemIds);

    console.log('✅ [REORDER] Selective reorder complete:', {
      addedItems: result.addedItems.length,
      skippedItems: result.skippedItems.length
    });

    sendSuccess(res, result, 'Selected items added to cart successfully');

  } catch (error: any) {
    console.error('❌ [REORDER] Selective reorder error:', error);
    throw error;
  }
});

// Validate reorder (check availability and prices)
export const validateReorder = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { itemIds } = req.query;
  const userId = req.userId!;

  try {
    console.log('🔍 [REORDER] Validating reorder:', { userId, orderId, itemIds });

    let selectedItemIds: string[] | undefined;
    if (itemIds) {
      selectedItemIds = Array.isArray(itemIds) ? itemIds as string[] : [itemIds as string];
    }

    const validation = await reorderService.validateReorder(userId, orderId, selectedItemIds);

    console.log('✅ [REORDER] Validation complete:', {
      canReorder: validation.canReorder,
      itemCount: validation.items.length
    });

    sendSuccess(res, validation, 'Reorder validation complete');

  } catch (error: any) {
    console.error('❌ [REORDER] Validation error:', error);
    throw error;
  }
});

// Get frequently ordered items
export const getFrequentlyOrdered = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { limit = 10 } = req.query;

  try {
    console.log('📊 [REORDER] Getting frequently ordered items:', { userId, limit });

    const items = await reorderService.getFrequentlyOrdered(userId, Number(limit));

    console.log('✅ [REORDER] Frequently ordered items retrieved:', items.length);

    sendSuccess(res, items, 'Frequently ordered items retrieved successfully');

  } catch (error: any) {
    console.error('❌ [REORDER] Frequently ordered error:', error);
    throw error;
  }
});

// Get reorder suggestions
export const getReorderSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    console.log('💡 [REORDER] Getting reorder suggestions:', { userId });

    const suggestions = await reorderService.getReorderSuggestions(userId);

    console.log('✅ [REORDER] Reorder suggestions retrieved:', suggestions.length);

    sendSuccess(res, suggestions, 'Reorder suggestions retrieved successfully');

  } catch (error: any) {
    console.error('❌ [REORDER] Suggestions error:', error);
    throw error;
  }
});

/**
 * Request refund for an order (user-facing)
 * POST /api/orders/:orderId/refund-request
 */
export const requestRefund = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;
  const { reason, refundItems } = req.body;

  try {
    console.log('💰 [REFUND REQUEST] User requesting refund:', { orderId, userId, reason });

    // Verify order belongs to user
    const order = await Order.findOne({ _id: orderId, user: userId });
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

    console.log('✅ [REFUND REQUEST] Refund request created:', refund._id);

    // Notify admin/merchant for approval
    try {
      console.log('📧 [REFUND REQUEST] Sending notification to merchant/admin...');
      
      // Get user information
      const user = await User.findById(userId);
      const customerName = user?.profile?.firstName || user?.phoneNumber || 'Customer';
      const refundId = (refund._id as any)?.toString() || '';
      
      // Get store information from order
      const storeIds = [...new Set(order.items.map((item: any) => item.store?.toString()).filter(Boolean))];
      
      if (storeIds.length > 0) {
        const Store = (await import('../models/Store')).Store;
        const stores = await Store.find({ _id: { $in: storeIds } }).select('name contact owner');
        
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
              console.log(`✅ [REFUND REQUEST] SMS sent to merchant: ${merchantPhone}`);
            } catch (smsError) {
              console.error(`❌ [REFUND REQUEST] Failed to send SMS to merchant:`, smsError);
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
              console.log(`✅ [REFUND REQUEST] Email sent to merchant: ${merchantEmail}`);
            } catch (emailError) {
              console.error(`❌ [REFUND REQUEST] Failed to send email to merchant:`, emailError);
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
          console.log(`✅ [REFUND REQUEST] Admin notification sent`);
        } catch (adminError) {
          console.error(`❌ [REFUND REQUEST] Failed to send admin notification:`, adminError);
        }
      }
    } catch (notificationError) {
      console.error('❌ [REFUND REQUEST] Error sending notifications:', notificationError);
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
    console.error('❌ [REFUND REQUEST] Error:', error);
    throw new AppError(`Failed to request refund: ${error.message}`, 500);
  }
});

/**
 * Get refund history for user
 * GET /api/orders/refunds
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
    console.error('❌ [GET REFUNDS] Error:', error);
    throw new AppError('Failed to fetch refunds', 500);
  }
});

/**
 * Get refund details
 * GET /api/orders/refunds/:refundId
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
    console.error('❌ [GET REFUND DETAILS] Error:', error);
    throw new AppError('Failed to fetch refund details', 500);
  }
});