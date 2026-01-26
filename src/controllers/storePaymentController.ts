/**
 * Store Payment Controller
 *
 * Handles all store payment related operations including:
 * - QR code generation and management
 * - Store payment settings
 * - Payment initiation and confirmation
 * - Offers retrieval for store payments
 */

import { Request, Response } from 'express';
import { Store, IStorePaymentSettings } from '../models/Store';
import { QRCodeService } from '../services/qrCodeService';
import mongoose, { Types } from 'mongoose';
import { StorePayment, IPaymentRewards } from '../models/StorePayment';
import stripeService from '../services/stripeService';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import Discount from '../models/Discount';
// Note: StorePromoCoin model removed - using wallet.brandedCoins instead

// ==================== QR CODE HANDLERS ====================

/**
 * Generate QR code for a store
 * POST /api/store-payment/generate-qr/:storeId
 */
export const generateStoreQR = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const merchantId = req.merchantId;

    // Verify store belongs to merchant
    const store = await Store.findOne({
      _id: storeId,
      merchantId: merchantId,
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or you do not have permission to access it',
      });
    }

    // Check if store already has a QR code
    if (store.storeQR?.code && store.storeQR?.qrImageUrl) {
      return res.status(200).json({
        success: true,
        message: 'QR code already exists',
        data: {
          code: store.storeQR.code,
          qrImageUrl: store.storeQR.qrImageUrl,
          isActive: store.storeQR.isActive,
          generatedAt: store.storeQR.generatedAt,
        },
      });
    }

    // Generate new QR code
    const result = await QRCodeService.generateStoreQR(storeId);

    res.status(201).json({
      success: true,
      message: 'QR code generated successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error generating store QR:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate QR code',
    });
  }
};

/**
 * Regenerate QR code for a store (invalidates old one)
 * POST /api/store-payment/regenerate-qr/:storeId
 */
export const regenerateQR = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const merchantId = req.merchantId;

    // Verify store belongs to merchant
    const store = await Store.findOne({
      _id: storeId,
      merchantId: merchantId,
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or you do not have permission to access it',
      });
    }

    // Regenerate QR code
    const result = await QRCodeService.regenerateStoreQR(storeId);

    res.status(200).json({
      success: true,
      message: 'QR code regenerated successfully. Old QR code is now invalid.',
      data: result,
    });
  } catch (error: any) {
    console.error('Error regenerating store QR:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to regenerate QR code',
    });
  }
};

/**
 * Get QR code details for a store
 * GET /api/store-payment/qr/:storeId
 */
export const getStoreQRDetails = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const merchantId = req.merchantId;

    // Verify store belongs to merchant
    const store = await Store.findOne({
      _id: storeId,
      merchantId: merchantId,
    }).select('storeQR name');

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or you do not have permission to access it',
      });
    }

    const qrDetails = await QRCodeService.getStoreQRDetails(storeId);

    res.status(200).json({
      success: true,
      data: {
        storeName: store.name,
        ...qrDetails,
      },
    });
  } catch (error: any) {
    console.error('Error getting QR details:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get QR code details',
    });
  }
};

/**
 * Toggle QR code active status
 * PATCH /api/store-payment/qr/:storeId/toggle
 */
export const toggleQRStatus = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { isActive } = req.body;
    const merchantId = req.merchantId;

    // Verify store belongs to merchant
    const store = await Store.findOne({
      _id: storeId,
      merchantId: merchantId,
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or you do not have permission to access it',
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value',
      });
    }

    if (isActive) {
      await QRCodeService.activateQR(storeId);
    } else {
      await QRCodeService.deactivateQR(storeId);
    }

    res.status(200).json({
      success: true,
      message: `QR code ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive },
    });
  } catch (error: any) {
    console.error('Error toggling QR status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to toggle QR status',
    });
  }
};

/**
 * Lookup store by QR code (for customers)
 * POST /api/store-payment/lookup (authenticated)
 * GET /api/store-payment/lookup/:qrCode (public)
 */
export const lookupStoreByQR = async (req: Request, res: Response) => {
  try {
    // Get QR code from body or params
    const qrCode = req.body?.qrCode || req.params?.qrCode;

    if (!qrCode) {
      return res.status(400).json({
        success: false,
        message: 'QR code is required',
      });
    }

    // Validate QR code format
    if (!QRCodeService.isValidQRCode(qrCode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format',
      });
    }

    // Lookup store
    const result = await QRCodeService.lookupStoreByQR(qrCode);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error || 'Store not found',
      });
    }

    res.status(200).json({
      success: true,
      data: result.store,
    });
  } catch (error: any) {
    console.error('Error looking up store by QR:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to lookup store',
    });
  }
};

// ==================== PAYMENT SETTINGS HANDLERS ====================

/**
 * Get payment settings for a store
 * GET /api/store-payment/settings/:storeId
 */
export const getPaymentSettings = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const merchantId = req.merchantId;

    const store = await Store.findOne({
      _id: storeId,
      merchantId: merchantId,
    }).select('paymentSettings rewardRules name');

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or you do not have permission to access it',
      });
    }

    // Return settings with defaults if not set
    const defaultPaymentSettings = {
      acceptUPI: true,
      acceptCards: true,
      acceptPayLater: false,
      acceptRezCoins: true,
      acceptPromoCoins: true,
      maxCoinRedemptionPercent: 100,
      allowHybridPayment: true,
      allowOffers: true,
      allowCashback: true,
      upiId: '',
      upiName: '',
    };

    const defaultRewardRules = {
      baseCashbackPercent: 5,
      reviewBonusCoins: 5,
      socialShareBonusCoins: 10,
      minimumAmountForReward: 100,
      extraRewardThreshold: undefined,
      extraRewardCoins: undefined,
      visitMilestoneRewards: [],
    };

    res.status(200).json({
      success: true,
      data: {
        storeName: store.name,
        paymentSettings: { ...defaultPaymentSettings, ...store.paymentSettings },
        rewardRules: { ...defaultRewardRules, ...store.rewardRules },
      },
    });
  } catch (error: any) {
    console.error('Error getting payment settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payment settings',
    });
  }
};

/**
 * Update payment settings for a store
 * PUT /api/store-payment/settings/:storeId
 */
export const updatePaymentSettings = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { paymentSettings, rewardRules } = req.body;
    const merchantId = req.merchantId;

    // Verify store belongs to merchant
    const store = await Store.findOne({
      _id: storeId,
      merchantId: merchantId,
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or you do not have permission to access it',
      });
    }

    // Validate payment settings
    if (paymentSettings) {
      if (
        paymentSettings.maxCoinRedemptionPercent !== undefined &&
        (paymentSettings.maxCoinRedemptionPercent < 0 ||
          paymentSettings.maxCoinRedemptionPercent > 100)
      ) {
        return res.status(400).json({
          success: false,
          message: 'maxCoinRedemptionPercent must be between 0 and 100',
        });
      }
    }

    // Validate reward rules
    if (rewardRules) {
      if (
        rewardRules.baseCashbackPercent !== undefined &&
        (rewardRules.baseCashbackPercent < 0 || rewardRules.baseCashbackPercent > 100)
      ) {
        return res.status(400).json({
          success: false,
          message: 'baseCashbackPercent must be between 0 and 100',
        });
      }
    }

    // Update settings
    const updateData: any = {};
    if (paymentSettings) {
      updateData.paymentSettings = { ...store.paymentSettings, ...paymentSettings };
    }
    if (rewardRules) {
      updateData.rewardRules = { ...store.rewardRules, ...rewardRules };
    }

    const updatedStore = await Store.findByIdAndUpdate(storeId, updateData, { new: true }).select(
      'paymentSettings rewardRules name'
    );

    res.status(200).json({
      success: true,
      message: 'Payment settings updated successfully',
      data: {
        storeName: updatedStore?.name,
        paymentSettings: updatedStore?.paymentSettings,
        rewardRules: updatedStore?.rewardRules,
      },
    });
  } catch (error: any) {
    console.error('Error updating payment settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update payment settings',
    });
  }
};

// ==================== OFFERS HANDLERS ====================

/**
 * Get offers for store payment
 * GET /api/store-payment/offers/:storeId
 */
export const getStorePaymentOffers = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { amount } = req.query;
    const userId = (req as any).user?.id;

    // Validate amount if provided
    const billAmount = amount ? parseFloat(amount as string) : 0;

    // Get store with payment settings
    const store = await Store.findById(storeId)
      .select('paymentSettings rewardRules offers name')
      .populate('offers.discounts');

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      });
    }

    // Check if store allows offers
    if (!store.paymentSettings?.allowOffers) {
      return res.status(200).json({
        success: true,
        data: {
          storeOffers: [],
          bankOffers: [],
          rezOffers: [],
          bestOffer: null,
          message: 'This store does not currently have offers enabled',
        },
      });
    }

    // Build store offers from store data
    const storeOffers = [];

    // Basic cashback offer from reward rules
    if (store.paymentSettings?.allowCashback && store.rewardRules?.baseCashbackPercent) {
      storeOffers.push({
        id: `cashback-${storeId}`,
        type: 'CASHBACK',
        title: `${store.rewardRules.baseCashbackPercent}% Cashback`,
        description: `Earn ${store.rewardRules.baseCashbackPercent}% cashback on your payment`,
        value: store.rewardRules.baseCashbackPercent,
        valueType: 'PERCENTAGE',
        minAmount: store.rewardRules.minimumAmountForReward || 0,
        isAutoApplied: true,
      });
    }

    // Extra reward threshold offer
    if (store.rewardRules?.extraRewardThreshold && store.rewardRules?.extraRewardCoins) {
      storeOffers.push({
        id: `bonus-${storeId}`,
        type: 'BONUS_COINS',
        title: `Spend ₹${store.rewardRules.extraRewardThreshold}, Get ${store.rewardRules.extraRewardCoins} Coins`,
        description: `Earn ${store.rewardRules.extraRewardCoins} bonus coins when you spend ₹${store.rewardRules.extraRewardThreshold} or more`,
        value: store.rewardRules.extraRewardCoins,
        valueType: 'FIXED_COINS',
        minAmount: store.rewardRules.extraRewardThreshold,
        isAutoApplied: true,
      });
    }

    // Fetch bank/card offers from Discount model
    const bankOffers: any[] = [];
    try {
      const cardDiscounts = await Discount.find({
        isActive: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() },
        applicableOn: { $in: ['card_payment', 'bill_payment', 'all'] },
        $or: [
          { scope: 'global' },
          { scope: 'store', storeId: storeId },
          { scope: 'merchant', merchantId: store.merchantId },
        ],
        minOrderValue: { $lte: billAmount || 0 },
      }).sort({ priority: -1 }).limit(5);

      for (const discount of cardDiscounts) {
        const calculatedDiscount = discount.calculateDiscount(billAmount || 0);
        bankOffers.push({
          id: discount._id.toString(),
          type: discount.type === 'percentage' ? 'PERCENTAGE' : 'FIXED',
          title: discount.name,
          description: discount.description || `Get ${discount.type === 'percentage' ? discount.value + '%' : '₹' + discount.value} off`,
          value: discount.value,
          valueType: discount.type === 'percentage' ? 'PERCENTAGE' : 'FIXED',
          minAmount: discount.minOrderValue,
          maxDiscount: discount.maxDiscountAmount,
          calculatedDiscount,
          bankNames: discount.bankNames || [],
          cardType: discount.cardType || 'all',
          paymentMethod: discount.paymentMethod || 'card',
          metadata: discount.metadata,
        });
      }
    } catch (discountError) {
      console.error('Failed to fetch bank offers:', discountError);
    }

    // Fetch ReZ platform offers (global discounts without store/merchant restriction)
    const rezOffers: any[] = [];
    try {
      const platformDiscounts = await Discount.find({
        isActive: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() },
        scope: 'global',
        applicableOn: { $in: ['bill_payment', 'all'] },
        minOrderValue: { $lte: billAmount || 0 },
      }).sort({ priority: -1 }).limit(3);

      for (const discount of platformDiscounts) {
        // Skip if already added to bank offers
        if (bankOffers.some(o => o.id === discount._id.toString())) continue;

        const calculatedDiscount = discount.calculateDiscount(billAmount || 0);
        rezOffers.push({
          id: discount._id.toString(),
          type: discount.type === 'percentage' ? 'PERCENTAGE' : 'FIXED',
          title: discount.name,
          description: discount.description || `ReZ Offer: ${discount.type === 'percentage' ? discount.value + '%' : '₹' + discount.value} off`,
          value: discount.value,
          valueType: discount.type === 'percentage' ? 'PERCENTAGE' : 'FIXED',
          minAmount: discount.minOrderValue,
          maxDiscount: discount.maxDiscountAmount,
          calculatedDiscount,
          isRezOffer: true,
          metadata: discount.metadata,
        });
      }
    } catch (discountError) {
      console.error('Failed to fetch ReZ offers:', discountError);
    }

    // Calculate best offer from all offer types
    let bestOffer = null;
    if (billAmount > 0) {
      // Combine all offers
      const allOffers = [
        ...storeOffers.map(o => ({ ...o, source: 'store' })),
        ...bankOffers.map(o => ({ ...o, source: 'bank' })),
        ...rezOffers.map(o => ({ ...o, source: 'rez' })),
      ].filter((offer) => billAmount >= (offer.minAmount || 0));

      if (allOffers.length > 0) {
        // Find offer with highest calculated discount value
        bestOffer = allOffers.reduce((best, current) => {
          const bestValue = best.calculatedDiscount ||
            (best.valueType === 'PERCENTAGE' ? (billAmount * best.value) / 100 : best.value);
          const currentValue = current.calculatedDiscount ||
            (current.valueType === 'PERCENTAGE' ? (billAmount * current.value) / 100 : current.value);
          return currentValue > bestValue ? current : best;
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        storeOffers,
        bankOffers,
        rezOffers,
        bestOffer,
      },
    });
  } catch (error: any) {
    console.error('Error getting store payment offers:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get offers',
    });
  }
};

// ==================== PAYMENT HANDLERS ====================

/**
 * Initiate store payment
 * POST /api/store-payment/initiate
 */
export const initiateStorePayment = async (req: Request, res: Response) => {
  try {
    const {
      storeId,
      amount,
      paymentMethod,
      coinsToRedeem,
      offersApplied,
    } = req.body;
    const userId = (req as any).user?.id;

    // Validate required fields
    if (!storeId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'storeId, amount, and paymentMethod are required',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    // Get store
    const store = await Store.findById(storeId).select('paymentSettings rewardRules name isActive');

    if (!store || !store.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or is inactive',
      });
    }

    // Validate payment method is accepted
    const settings = (store.paymentSettings || {}) as IStorePaymentSettings;
    if (paymentMethod === 'upi' && !settings.acceptUPI) {
      return res.status(400).json({
        success: false,
        message: 'This store does not accept UPI payments',
      });
    }
    if ((paymentMethod === 'card' || paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && !settings.acceptCards) {
      return res.status(400).json({
        success: false,
        message: 'This store does not accept card payments',
      });
    }

    // Calculate coin redemption
    let coinRedemptionAmount = 0;
    const coinRedemption = {
      rezCoins: coinsToRedeem?.rezCoins || 0,
      promoCoins: coinsToRedeem?.promoCoins || 0,
      brandedCoins: coinsToRedeem?.brandedCoins || 0,  // Merchant-specific coins
      payBill: coinsToRedeem?.payBill || 0,
      totalAmount: 0,
    };

    if (coinsToRedeem) {
      const maxCoins = (amount * (settings.maxCoinRedemptionPercent || 100)) / 100;

      // Validate coin types are accepted
      if (coinsToRedeem.rezCoins && !settings.acceptRezCoins) {
        return res.status(400).json({
          success: false,
          message: 'This store does not accept ReZ Coins',
        });
      }
      if (coinsToRedeem.promoCoins && !settings.acceptPromoCoins) {
        return res.status(400).json({
          success: false,
          message: 'This store does not accept Promo Coins',
        });
      }

      // Calculate total coin redemption (ReZ + Promo + Branded)
      coinRedemptionAmount =
        coinRedemption.rezCoins +
        coinRedemption.promoCoins +
        coinRedemption.brandedCoins;

      coinRedemption.totalAmount = coinRedemptionAmount;

      if (coinRedemptionAmount > maxCoins) {
        return res.status(400).json({
          success: false,
          message: `Maximum coin redemption is ₹${maxCoins} (${settings.maxCoinRedemptionPercent}% of bill)`,
        });
      }

      // Validate user has enough coins
      if (coinRedemptionAmount > 0) {
        const wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
          return res.status(400).json({
            success: false,
            message: 'Wallet not found. Cannot redeem coins.',
          });
        }

        // Check ReZ coins + Promo coins (from available balance)
        const universalCoinsNeeded = coinRedemption.rezCoins + coinRedemption.promoCoins;
        if (universalCoinsNeeded > wallet.balance.available) {
          return res.status(400).json({
            success: false,
            message: `Insufficient coin balance. You have ₹${wallet.balance.available} but trying to use ₹${universalCoinsNeeded}`,
          });
        }

        // Validate branded coins balance if being used
        if (coinRedemption.brandedCoins > 0) {
          // Find branded coins for this specific store/merchant
          const storeMerchantId = (store as any).merchantId?.toString() || storeId;
          const merchantBrandedCoin = wallet.brandedCoins?.find(
            (bc: any) => {
              const bcMerchantId = bc.merchantId?.toString();
              return bcMerchantId === storeId || bcMerchantId === storeMerchantId;
            }
          );

          const availableBrandedCoins = merchantBrandedCoin?.amount || 0;
          if (coinRedemption.brandedCoins > availableBrandedCoins) {
            return res.status(400).json({
              success: false,
              message: `Insufficient branded coins. You have ₹${availableBrandedCoins} but trying to use ₹${coinRedemption.brandedCoins}`,
            });
          }
        }
      }
    }

    // Calculate final amount
    const remainingAmount = Math.max(0, amount - coinRedemptionAmount);

    // Generate unique payment ID
    const paymentId = (StorePayment as any).generatePaymentId();

    // Determine effective payment method
    const effectivePaymentMethod = remainingAmount === 0 ? 'coins_only' : paymentMethod;

    // Calculate discount from applied offers
    let discountAmount = 0;
    if (offersApplied && offersApplied.length > 0) {
      for (const offer of offersApplied) {
        if (offer.type === 'PERCENTAGE' || offer.valueType === 'PERCENTAGE') {
          let offerDiscount = Math.floor((amount * (offer.value || 0)) / 100);
          // Apply max discount cap if specified
          if (offer.maxDiscount && offerDiscount > offer.maxDiscount) {
            offerDiscount = offer.maxDiscount;
          }
          discountAmount += offerDiscount;
        } else if (offer.type === 'FIXED' || offer.valueType === 'FIXED') {
          discountAmount += offer.value || 0;
        } else if (offer.calculatedDiscount) {
          discountAmount += offer.calculatedDiscount;
        }
      }
    }

    // Create store payment record
    const storePayment = new StorePayment({
      paymentId,
      userId: new Types.ObjectId(userId),
      storeId: new Types.ObjectId(storeId),
      storeName: store.name,
      billAmount: amount,
      discountAmount,
      coinRedemption,
      remainingAmount,
      paymentMethod: effectivePaymentMethod,
      offersApplied: offersApplied || [],
      status: 'initiated',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes expiry
    });

    // If there's an amount to pay, create Stripe PaymentIntent
    let clientSecret: string | undefined;

    if (remainingAmount > 0) {
      // Check if Stripe is configured
      if (!stripeService.isStripeConfigured()) {
        console.warn('⚠️ [STORE PAYMENT] Stripe not configured, proceeding without payment intent');
      } else {
        try {
          console.log('💳 [STORE PAYMENT] Creating Stripe PaymentIntent for ₹', remainingAmount);

          const paymentIntent = await stripeService.createPaymentIntent({
            amount: remainingAmount,
            currency: 'inr',
            metadata: {
              paymentId,
              storeId,
              userId,
              storeName: store.name,
              paymentType: 'store_payment',
              coinRedemption: coinRedemptionAmount.toString(),
            },
          });

          storePayment.stripePaymentIntentId = paymentIntent.id;
          storePayment.stripeClientSecret = paymentIntent.client_secret || undefined;
          clientSecret = paymentIntent.client_secret || undefined;

          console.log('✅ [STORE PAYMENT] PaymentIntent created:', paymentIntent.id);
        } catch (stripeError: any) {
          console.error('❌ [STORE PAYMENT] Failed to create PaymentIntent:', stripeError.message);
          // Continue without Stripe - can still process coin-only or manual verification
        }
      }
    }

    // Save the payment record
    await storePayment.save();
    console.log('✅ [STORE PAYMENT] Payment record created:', paymentId);

    res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        paymentId,
        storeId,
        storeName: store.name,
        billAmount: amount,
        coinRedemption: coinRedemptionAmount,
        remainingAmount,
        paymentMethod: effectivePaymentMethod,
        upiId: settings.upiId,
        offersApplied: offersApplied || [],
        status: 'INITIATED',
        expiresAt: storePayment.expiresAt,
        // Stripe client secret for frontend payment confirmation
        clientSecret,
      },
    });
  } catch (error: any) {
    console.error('Error initiating store payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate payment',
    });
  }
};

/**
 * Confirm store payment
 * POST /api/store-payment/confirm
 *
 * IMPORTANT: This function uses MongoDB sessions for atomic operations.
 * All coin deductions and payment updates happen within a single transaction.
 */
export const confirmStorePayment = async (req: Request, res: Response) => {
  // Start a MongoDB session for atomic operations
  const session = await mongoose.startSession();

  try {
    const { paymentId, transactionId } = req.body;
    const userId = (req as any).user?.id;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'paymentId is required',
      });
    }

    // Find the payment record
    const storePayment = await StorePayment.findOne({ paymentId });

    if (!storePayment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Verify the payment belongs to this user
    if (storePayment.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to confirm this payment',
      });
    }

    // Check if payment is expired
    if (storePayment.expiresAt < new Date()) {
      storePayment.status = 'expired';
      await storePayment.save();
      return res.status(400).json({
        success: false,
        message: 'Payment has expired',
      });
    }

    // Check if already completed
    if (storePayment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed',
      });
    }

    // Verify Stripe payment if applicable (only for card payments, not UPI)
    const isCardPayment = storePayment.paymentMethod.includes('card');

    if (storePayment.stripePaymentIntentId && storePayment.remainingAmount > 0 && isCardPayment) {
      console.log('🔐 [STORE PAYMENT] Verifying Stripe payment:', storePayment.stripePaymentIntentId);

      try {
        const verification = await stripeService.verifyPaymentIntent(storePayment.stripePaymentIntentId);

        if (!verification.verified) {
          console.error('❌ [STORE PAYMENT] Payment not verified. Status:', verification.status);
          return res.status(400).json({
            success: false,
            message: `Payment not completed. Status: ${verification.status}`,
          });
        }

        console.log('✅ [STORE PAYMENT] Stripe payment verified');
      } catch (stripeError: any) {
        console.error('❌ [STORE PAYMENT] Stripe verification failed:', stripeError.message);
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed',
        });
      }
    } else if (storePayment.paymentMethod === 'upi') {
      // For UPI payments, log the UPI transaction
      // In production, you would verify UPI payment through your payment gateway
      console.log('📱 [STORE PAYMENT] UPI payment confirmation - Transaction ID:', transactionId);
    }

    // Start the atomic transaction
    session.startTransaction();

    try {
      // Update payment status to processing
      storePayment.status = 'processing';
      await storePayment.save({ session });

      // Deduct coins from user's wallet (ATOMIC)
      if (storePayment.coinRedemption.totalAmount > 0) {
        console.log('💰 [STORE PAYMENT] Deducting coins:', storePayment.coinRedemption);

        const wallet = await Wallet.findOne({ user: storePayment.userId }).session(session);

        if (!wallet) {
          throw new Error('Wallet not found for coin deduction');
        }

        // Re-validate coin balances before deduction (prevent race conditions)
        const rezCoinsToDeduct = storePayment.coinRedemption.rezCoins || 0;
        const promoCoinsToDeduct = storePayment.coinRedemption.promoCoins || 0;
        const brandedCoinsToDeduct = storePayment.coinRedemption.brandedCoins || 0;
        const universalCoinsToDeduct = rezCoinsToDeduct + promoCoinsToDeduct;

        // Validate universal coins (ReZ + Promo) balance
        if (universalCoinsToDeduct > 0) {
          if (wallet.balance.available < universalCoinsToDeduct) {
            throw new Error(`Insufficient coin balance. Available: ${wallet.balance.available}, Required: ${universalCoinsToDeduct}`);
          }

          // Deduct ReZ + Promo coins from available balance
          wallet.balance.available -= universalCoinsToDeduct;
          wallet.balance.total -= universalCoinsToDeduct;
          wallet.statistics.totalSpent += universalCoinsToDeduct;
          wallet.limits.dailySpent += universalCoinsToDeduct;
          console.log('✅ Deducted universal coins (ReZ + Promo):', universalCoinsToDeduct);
        }

        // Deduct Branded Coins (merchant-specific) - CRITICAL FIX
        if (brandedCoinsToDeduct > 0) {
          // Find the merchant's branded coin entry
          const store = await Store.findById(storePayment.storeId).select('merchantId').session(session);
          const storeMerchantId = store?.merchantId?.toString() || storePayment.storeId.toString();

          const merchantCoinIndex = wallet.brandedCoins?.findIndex(
            (bc: any) => {
              const bcMerchantId = bc.merchantId?.toString();
              return bcMerchantId === storePayment.storeId.toString() || bcMerchantId === storeMerchantId;
            }
          );

          if (merchantCoinIndex === undefined || merchantCoinIndex === -1) {
            throw new Error('Branded coins not found for this merchant');
          }

          const merchantCoin = wallet.brandedCoins[merchantCoinIndex];
          if (merchantCoin.amount < brandedCoinsToDeduct) {
            throw new Error(`Insufficient branded coins. Available: ${merchantCoin.amount}, Required: ${brandedCoinsToDeduct}`);
          }

          // Deduct branded coins
          merchantCoin.amount -= brandedCoinsToDeduct;
          merchantCoin.lastUsed = new Date();

          // Remove entry if balance is zero
          if (merchantCoin.amount <= 0) {
            wallet.brandedCoins.splice(merchantCoinIndex, 1);
          }

          // Update total balance
          wallet.balance.total -= brandedCoinsToDeduct;
          wallet.statistics.totalSpent += brandedCoinsToDeduct;

          console.log('✅ Deducted branded coins:', brandedCoinsToDeduct);
        }

        wallet.lastTransactionAt = new Date();
        await wallet.save({ session });

        // Create transaction record for coin spending
        await Transaction.create([{
          user: storePayment.userId,
          type: 'debit',
          category: 'spending',
          amount: storePayment.coinRedemption.totalAmount,
          balanceBefore: wallet.balance.available + universalCoinsToDeduct,
          balanceAfter: wallet.balance.available,
          description: `Store payment at ${storePayment.storeName} (ReZ: ${rezCoinsToDeduct}, Promo: ${promoCoinsToDeduct}, Branded: ${brandedCoinsToDeduct})`,
          source: {
            type: 'paybill',
            reference: storePayment._id,
            description: `Coins used for store payment`,
            metadata: {
              storeInfo: {
                name: storePayment.storeName,
                id: storePayment.storeId,
              },
            },
          },
          status: {
            current: 'completed',
            history: [{
              status: 'completed',
              timestamp: new Date(),
            }],
          },
          isReversible: false,
          retryCount: 0,
          maxRetries: 0,
        }], { session });
      }

      // Calculate rewards
      const store = await Store.findById(storePayment.storeId).select('rewardRules merchantId').session(session);
      const rewardRules = store?.rewardRules;

      // Get user's actual visit count at this store
      const visitCount = await StorePayment.countDocuments({
        userId: storePayment.userId,
        storeId: storePayment.storeId,
        status: 'completed',
      }).session(session);

      // Calculate loyalty progress
      const currentVisits = visitCount + 1; // Including this payment
      let nextMilestone = 5;
      let milestoneReward = 'Bronze Member';

      // Use store's visit milestone rewards if configured
      if (rewardRules?.visitMilestoneRewards && rewardRules.visitMilestoneRewards.length > 0) {
        const milestones = rewardRules.visitMilestoneRewards.sort((a: any, b: any) => a.visits - b.visits);
        const nextMilestoneConfig = milestones.find((m: any) => m.visits > currentVisits);
        if (nextMilestoneConfig) {
          nextMilestone = nextMilestoneConfig.visits;
          milestoneReward = `${nextMilestoneConfig.coinsReward} Bonus Coins`;
        }
      } else {
        // Default milestones: 5, 10, 20
        if (currentVisits < 5) {
          nextMilestone = 5;
          milestoneReward = 'Bronze Member';
        } else if (currentVisits < 10) {
          nextMilestone = 10;
          milestoneReward = 'Silver Member';
        } else if (currentVisits < 20) {
          nextMilestone = 20;
          milestoneReward = 'Gold Member';
        } else {
          nextMilestone = currentVisits;
          milestoneReward = 'Gold Member (Max)';
        }
      }

      const rewards: IPaymentRewards = {
        cashbackEarned: 0,
        coinsEarned: 0,
        bonusCoins: 0,
        loyaltyProgress: {
          currentVisits,
          nextMilestone,
          milestoneReward,
        },
      };

      // Calculate cashback (percentage of bill)
      if (rewardRules?.baseCashbackPercent && storePayment.billAmount >= (rewardRules.minimumAmountForReward || 0)) {
        rewards.cashbackEarned = Math.floor((storePayment.billAmount * rewardRules.baseCashbackPercent) / 100);
      }

      // Calculate coins earned based on store's reward rules or default (1 coin per ₹10 spent)
      const coinsPerRupee = rewardRules?.coinsPerRupee || 0.1; // Default: 1 coin per ₹10
      const minAmountForCoins = rewardRules?.minimumAmountForReward || 0;

      if (storePayment.billAmount >= minAmountForCoins) {
        rewards.coinsEarned = Math.floor(storePayment.billAmount * coinsPerRupee);
      }

      // Extra reward for spending above threshold
      if (rewardRules?.extraRewardThreshold && storePayment.billAmount >= rewardRules.extraRewardThreshold) {
        rewards.bonusCoins = rewardRules.extraRewardCoins || 0;
      }

      // Credit reward coins to user's wallet (ATOMIC)
      const totalRewardCoins = rewards.coinsEarned + rewards.bonusCoins;
      if (totalRewardCoins > 0) {
        const wallet = await Wallet.findOne({ user: storePayment.userId }).session(session);
        if (wallet) {
          // Add to available balance
          wallet.balance.available += totalRewardCoins;
          wallet.balance.total += totalRewardCoins;
          wallet.statistics.totalEarned += totalRewardCoins;
          wallet.statistics.totalCashback += totalRewardCoins;
          wallet.lastTransactionAt = new Date();
          await wallet.save({ session });

          console.log('✅ [STORE PAYMENT] Credited reward coins:', totalRewardCoins);

          // Create transaction record for reward
          await Transaction.create([{
            user: storePayment.userId,
            type: 'credit',
            category: 'cashback',
            amount: totalRewardCoins,
            balanceBefore: wallet.balance.available - totalRewardCoins,
            balanceAfter: wallet.balance.available,
            description: `Rewards for payment at ${storePayment.storeName}`,
            source: {
              type: 'cashback',
              reference: storePayment._id,
              description: `Store payment rewards`,
              metadata: {
                storeInfo: {
                  name: storePayment.storeName,
                  id: storePayment.storeId,
                },
              },
            },
            status: {
              current: 'completed',
              history: [{
                status: 'completed',
                timestamp: new Date(),
              }],
            },
            isReversible: false,
            retryCount: 0,
            maxRetries: 0,
          }], { session });
        }
      }

      // Mark payment as completed
      const finalTransactionId = transactionId || storePayment.stripePaymentIntentId || `TXN-${Date.now()}`;
      storePayment.status = 'completed';
      storePayment.transactionId = finalTransactionId;
      storePayment.completedAt = new Date();
      storePayment.rewards = rewards;
      await storePayment.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      console.log('✅ [STORE PAYMENT] Payment completed (atomic):', paymentId);

      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          paymentId,
          status: 'COMPLETED',
          transactionId: finalTransactionId,
          completedAt: storePayment.completedAt,
          rewards,
        },
      });
    } catch (atomicError: any) {
      // Abort the transaction on any error
      await session.abortTransaction();
      console.error('❌ [STORE PAYMENT] Atomic transaction failed:', atomicError.message);

      // Revert payment status if it was changed
      if (storePayment.status === 'processing') {
        storePayment.status = 'initiated';
        await storePayment.save();
      }

      throw atomicError;
    }
  } catch (error: any) {
    console.error('Error confirming store payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to confirm payment',
    });
  } finally {
    // End the session
    session.endSession();
  }
};

/**
 * Cancel store payment
 * POST /api/store-payment/cancel
 */
export const cancelStorePayment = async (req: Request, res: Response) => {
  try {
    const { paymentId, reason } = req.body;
    const userId = (req as any).user?.id;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'paymentId is required',
      });
    }

    // Find the payment record
    const storePayment = await StorePayment.findOne({ paymentId });

    if (!storePayment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Verify the payment belongs to this user
    if (storePayment.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to cancel this payment',
      });
    }

    // Can only cancel payments that are initiated or processing
    if (!['initiated', 'processing'].includes(storePayment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel payment with status: ${storePayment.status}`,
      });
    }

    // Cancel Stripe PaymentIntent if exists
    if (storePayment.stripePaymentIntentId) {
      try {
        console.log('🚫 [STORE PAYMENT] Cancelling Stripe PaymentIntent:', storePayment.stripePaymentIntentId);
        await stripeService.cancelPaymentIntent(storePayment.stripePaymentIntentId);
        console.log('✅ [STORE PAYMENT] Stripe PaymentIntent cancelled');
      } catch (stripeError: any) {
        console.error('⚠️ [STORE PAYMENT] Failed to cancel Stripe PaymentIntent:', stripeError.message);
        // Continue with cancellation even if Stripe fails
      }
    }

    // Update payment status
    storePayment.status = 'cancelled';
    storePayment.cancelledAt = new Date();
    storePayment.cancellationReason = reason || 'user_cancelled';
    await storePayment.save();

    console.log('✅ [STORE PAYMENT] Payment cancelled:', paymentId);

    res.status(200).json({
      success: true,
      message: 'Payment cancelled successfully',
      data: {
        paymentId,
        status: 'CANCELLED',
        cancelledAt: storePayment.cancelledAt,
      },
    });
  } catch (error: any) {
    console.error('Error cancelling store payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel payment',
    });
  }
};

/**
 * Get store payment by ID
 * GET /api/store-payment/:paymentId
 */
export const getStorePaymentById = async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const userId = (req as any).user?.id;

    console.log('📜 [GET PAYMENT] Looking up payment:', paymentId, 'for user:', userId);

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'paymentId is required',
      });
    }

    // Find the payment record
    const storePayment = await StorePayment.findOne({ paymentId }).lean();

    console.log('📜 [GET PAYMENT] Found payment:', storePayment ? 'Yes' : 'No');

    if (!storePayment) {
      // Check if any payments exist at all
      const count = await StorePayment.countDocuments();
      console.log('📜 [GET PAYMENT] Total payments in DB:', count);

      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Verify the payment belongs to this user
    if (storePayment.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this payment',
      });
    }

    // Get store details
    const store = await Store.findById(storePayment.storeId).select('name logo category').lean();

    res.status(200).json({
      success: true,
      data: {
        id: storePayment._id,
        paymentId: storePayment.paymentId,
        storeId: storePayment.storeId,
        storeName: storePayment.storeName,
        storeLogo: store?.logo,
        storeCategory: store?.category,
        billAmount: storePayment.billAmount,
        discountAmount: storePayment.discountAmount,
        coinRedemption: storePayment.coinRedemption,
        coinsUsed: storePayment.coinRedemption?.totalAmount || 0,
        remainingAmount: storePayment.remainingAmount,
        paymentMethod: storePayment.paymentMethod,
        offersApplied: storePayment.offersApplied,
        status: storePayment.status.toUpperCase(),
        rewards: storePayment.rewards,
        transactionId: storePayment.transactionId,
        createdAt: storePayment.createdAt,
        completedAt: storePayment.completedAt,
        expiresAt: storePayment.expiresAt,
      },
    });
  } catch (error: any) {
    console.error('Error getting store payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payment details',
    });
  }
};

/**
 * Get store payment history
 * GET /api/store-payment/history (for users)
 * GET /api/store-payment/history/:storeId (for merchants)
 */
// ==================== NEW PREMIUM PAYMENT ENDPOINTS ====================

/**
 * Get all available coins for user at a specific store
 * GET /api/store-payment/coins/:storeId
 * 
 * Returns the 3 coin types per ReZ Wallet design:
 * 1. ReZ Coins (Universal) - Green, usable everywhere, 30-day expiry, no redemption cap
 * 2. Branded Coins (Merchant) - Store-specific, no expiry, only at that merchant
 * 3. Promo Coins (Limited-time) - Gold, expiry countdown, max 20% per bill cap
 * 
 * Usage Order: Promo > Branded > ReZ (auto-applied for max savings)
 */
export const getCoinsForStore = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Get store info first
    const store = await Store.findById(storeId).select('name merchantId paymentSettings').lean();
    
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      });
    }

    // Get user's wallet
    const wallet = await Wallet.findOne({ user: userId });
    
    if (!wallet) {
      return res.status(200).json({
        success: true,
        data: {
          rezCoins: { 
            available: 0, 
            using: 0, 
            enabled: true,
            color: '#00C06A',
            description: 'Universal rewards usable anywhere on ReZ',
            expiryDays: null,
            redemptionCap: null, // No cap for ReZ coins
          },
          promoCoins: { 
            available: 0, 
            using: 0, 
            enabled: true, 
            expiringToday: false,
            expiresIn: null,
            color: '#FFC857',
            description: 'Special coins from campaigns & events',
            redemptionCap: 20, // Max 20% per bill
          },
          brandedCoins: null,
          totalApplied: 0,
          usageOrder: ['promo', 'branded', 'rez'],
        },
      });
    }

    // ==================== 1. REZ COINS (Universal) ====================
    // Green coin, usable everywhere, 30-day expiry, no redemption cap
    const rezCoin = wallet.coins?.find((c: any) => c.type === 'rez' && c.isActive);
    const rezCoinsAvailable = rezCoin?.amount || wallet.balance?.available || 0;
    
    // Calculate expiry days for ReZ coins
    let rezExpiryDays = null;
    if (rezCoin?.expiryDate) {
      const now = new Date();
      const expiry = new Date(rezCoin.expiryDate);
      const diffTime = expiry.getTime() - now.getTime();
      rezExpiryDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (rezExpiryDays < 0) rezExpiryDays = 0;
    }

    // ==================== 2. PROMO COINS (Limited-time) ====================
    // Gold coin, expiry countdown, max 20% per bill redemption cap
    // Promo coins are global campaign coins stored in wallet.coins
    const promoCoin = wallet.coins?.find((c: any) => c.type === 'promo' && c.isActive && c.amount > 0);
    const promoCoinsAvailable = promoCoin?.amount || 0;
    
    // Check promo coin expiry
    let promoExpiringToday = false;
    let promoExpiresIn = null;
    const promoExpiryDate = promoCoin?.promoDetails?.expiryDate || promoCoin?.expiryDate;
    
    if (promoExpiryDate) {
      const now = new Date();
      const expiry = new Date(promoExpiryDate);
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      promoExpiringToday = diffDays <= 1;
      promoExpiresIn = diffDays > 0 ? diffDays : 0;
    }
    
    // Get redemption cap (default 20% per bill)
    const promoRedemptionCap = promoCoin?.promoDetails?.maxRedemptionPercentage || 20;

    // ==================== 3. BRANDED COINS (Merchant-specific) ====================
    // Merchant color/logo, no expiry, only at that merchant
    let brandedCoins = null;
    
    if (wallet.brandedCoins && Array.isArray(wallet.brandedCoins)) {
      // Find coins for this specific store/merchant
      const storeBrandedCoin = wallet.brandedCoins.find(
        (bc: any) => {
          // Match by storeId or merchantId
          const bcMerchantId = bc.merchantId?.toString();
          const storeMerchantId = (store as any).merchantId?.toString();
          return bcMerchantId === storeId || bcMerchantId === storeMerchantId;
        }
      );
      
      if (storeBrandedCoin && storeBrandedCoin.amount > 0) {
        brandedCoins = {
          available: storeBrandedCoin.amount,
          using: 0,
          enabled: true,
          storeName: storeBrandedCoin.merchantName || store.name,
          storeId: storeId,
          color: storeBrandedCoin.merchantColor || '#6366F1',
          logo: storeBrandedCoin.merchantLogo,
          description: `Earned from ${storeBrandedCoin.merchantName || store.name}. Use at this store only.`,
          expiryDays: null, // Branded coins never expire
          redemptionCap: null, // No cap for branded coins
        };
      }
    }

    // ==================== RESPONSE ====================
    res.status(200).json({
      success: true,
      data: {
        // ReZ Coins - Universal rewards
        rezCoins: {
          available: rezCoinsAvailable,
          using: 0,
          enabled: true,
          color: '#00C06A', // ReZ Green
          icon: 'diamond', // Ionicon name
          description: 'Universal rewards usable anywhere on ReZ',
          expiryDays: rezExpiryDays,
          redemptionCap: null, // No redemption cap for ReZ coins
        },
        // Promo Coins - Limited-time campaigns
        promoCoins: {
          available: promoCoinsAvailable,
          using: 0,
          enabled: promoCoinsAvailable > 0,
          expiringToday: promoExpiringToday,
          expiresIn: promoExpiresIn,
          color: '#FFC857', // ReZ Gold
          icon: 'flame', // Ionicon name
          description: 'Special coins from campaigns & events',
          redemptionCap: promoRedemptionCap, // Max 20% per bill default
        },
        // Branded Coins - Merchant-specific
        brandedCoins,
        // Total applied (starts at 0, updated by frontend)
        totalApplied: 0,
        // Usage order for transparency
        usageOrder: ['promo', 'branded', 'rez'],
        usageOrderDescription: 'Promo Coins → Branded Coins → ReZ Coins (automatically applied for maximum savings)',
      },
    });
  } catch (error: any) {
    console.error('Error getting coins for store:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get coins',
    });
  }
};

/**
 * Get enhanced payment methods with bank-specific offers
 * GET /api/store-payment/payment-methods/:storeId
 */
export const getEnhancedPaymentMethods = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { amount } = req.query;
    const billAmount = amount ? parseFloat(amount as string) : 0;

    // Get store payment settings, reward rules and offers
    const store = await Store.findById(storeId)
      .select('paymentSettings rewardRules name offers')
      .populate('offers.discounts')
      .lean();

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      });
    }

    const settings = (store.paymentSettings || {}) as any;
    const rewardRules = (store as any).rewardRules || {};
    const paymentMethods: any[] = [];

    // Helper function to get offers for a payment method type from store's active offers
    const getOffersForPaymentMethod = (methodType: string): any[] => {
      const offers: any[] = [];
      
      // Get store's base cashback if available
      if (rewardRules.baseCashbackPercent && rewardRules.baseCashbackPercent > 0) {
        const maxCashback = Math.min(50, Math.floor(billAmount * rewardRules.baseCashbackPercent / 100));
        if (maxCashback > 0) {
          offers.push({
            type: 'cashback',
            title: `Get ${rewardRules.baseCashbackPercent}% cashback`,
            description: `Up to ₹${maxCashback} cashback`,
            value: rewardRules.baseCashbackPercent,
          });
        }
      }
      
      return offers;
    };

    // UPI Payment Method
    if (settings.acceptUPI !== false) {
      const upiOffers = getOffersForPaymentMethod('upi');
      
      paymentMethods.push({
        id: 'upi',
        type: 'upi',
        name: 'UPI',
        icon: 'phone-portrait-outline',
        isAvailable: true,
        description: 'GPay, PhonePe, Paytm, etc.',
        badge: 'best',
        offers: upiOffers,
        providers: ['gpay', 'phonepe', 'paytm', 'bhim'],
      });
    }

    // Credit Card Payment Method
    if (settings.acceptCards !== false) {
      const cardOffers = getOffersForPaymentMethod('card');
      
      // Add EMI offer for higher amounts
      if (billAmount >= 3000) {
        cardOffers.push({
          type: 'emi',
          title: 'No Cost EMI Available',
          description: 'Split payment into easy EMIs',
          value: 0,
        });
      }
      
      paymentMethods.push({
        id: 'credit_card',
        type: 'credit_card',
        name: 'Credit Card',
        icon: 'card-outline',
        isAvailable: true,
        description: 'Visa, Mastercard, Rupay',
        badge: billAmount >= 3000 ? 'popular' : undefined,
        offers: cardOffers,
        providers: ['visa', 'mastercard', 'rupay', 'amex'],
      });

      // Debit Card Payment Method
      paymentMethods.push({
        id: 'debit_card',
        type: 'debit_card',
        name: 'Debit Card',
        icon: 'card',
        isAvailable: true,
        description: 'All bank debit cards',
        offers: getOffersForPaymentMethod('debit'),
        providers: ['visa', 'mastercard', 'rupay'],
      });
    }

    // Net Banking
    paymentMethods.push({
      id: 'netbanking',
      type: 'netbanking',
      name: 'Net Banking',
      icon: 'business-outline',
      isAvailable: true,
      description: 'All major banks',
      offers: [],
      providers: ['sbi', 'hdfc', 'icici', 'axis', 'kotak'],
    });

    // Pay Later / BNPL
    if (settings.acceptPayLater !== false) {
      paymentMethods.push({
        id: 'pay_later',
        type: 'pay_later',
        name: 'Pay Later',
        icon: 'calendar-outline',
        isAvailable: true,
        description: 'Buy now, pay later',
        badge: 'new',
        offers: billAmount >= 500 ? [
          {
            type: 'emi',
            title: 'Pay in 3 interest-free EMIs',
            description: 'Split your payment easily',
            value: 0,
          },
        ] : [],
        providers: ['simpl', 'lazypay', 'zestmoney'],
      });
    }

    res.status(200).json({
      success: true,
      data: paymentMethods,
    });
  } catch (error: any) {
    console.error('Error getting enhanced payment methods:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payment methods',
    });
  }
};

/**
 * Auto-optimize coin allocation for maximum savings
 * POST /api/store-payment/auto-optimize
 * 
 * Usage Order (as per ReZ Wallet design):
 * 1. Promo Coins (Limited-time, max 20% per bill cap)
 * 2. Branded Coins (Store-specific, no cap)
 * 3. ReZ Coins (Universal, no cap)
 * 
 * Automatically applied for maximum savings
 */
export const autoOptimizeCoins = async (req: Request, res: Response) => {
  try {
    const { storeId, billAmount } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!storeId || !billAmount || billAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'storeId and billAmount are required',
      });
    }

    // Get store settings
    const store = await Store.findById(storeId).select('paymentSettings merchantId name').lean();
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      });
    }

    // Store's max coin redemption percent (default 100%)
    const maxCoinPercent = store.paymentSettings?.maxCoinRedemptionPercent || 100;
    const maxCoinsAllowed = Math.floor((billAmount * maxCoinPercent) / 100);

    // Get user's wallet
    const wallet = await Wallet.findOne({ user: userId });
    
    if (!wallet) {
      return res.status(200).json({
        success: true,
        data: {
          rezCoins: { available: 0, using: 0, enabled: false, color: '#00C06A' },
          promoCoins: { available: 0, using: 0, enabled: false, expiringToday: false, color: '#FFC857' },
          brandedCoins: null,
          totalApplied: 0,
          maxAllowed: maxCoinsAllowed,
          optimizationStrategy: 'no_coins_available',
          savings: { coinsUsed: 0, percentOfBill: 0 },
        },
      });
    }

    // ==================== 1. REZ COINS ====================
    const rezCoin = wallet.coins?.find((c: any) => c.type === 'rez' && c.isActive);
    const rezCoinsAvailable = rezCoin?.amount || wallet.balance?.available || 0;

    // ==================== 2. PROMO COINS ====================
    // Promo coins are global campaign coins stored in wallet.coins
    const promoCoin = wallet.coins?.find((c: any) => c.type === 'promo' && c.isActive && c.amount > 0);
    const promoCoinsAvailable = promoCoin?.amount || 0;

    // Promo coin redemption cap (default 20% per bill)
    const promoRedemptionCap = promoCoin?.promoDetails?.maxRedemptionPercentage || 20;
    const maxPromoCoinsAllowed = Math.floor((billAmount * promoRedemptionCap) / 100);

    // Check promo coin expiry
    let promoExpiringToday = false;
    let promoExpiresIn = null;
    const promoExpiryDate = promoCoin?.promoDetails?.expiryDate || promoCoin?.expiryDate;
    
    if (promoExpiryDate) {
      const now = new Date();
      const expiry = new Date(promoExpiryDate);
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      promoExpiringToday = diffDays <= 1;
      promoExpiresIn = diffDays > 0 ? diffDays : 0;
    }

    // ==================== 3. BRANDED COINS ====================
    let brandedCoinsAvailable = 0;
    let brandedCoinInfo: any = null;
    
    if (wallet.brandedCoins && Array.isArray(wallet.brandedCoins)) {
      const storeBrandedCoin = wallet.brandedCoins.find(
        (bc: any) => {
          const bcMerchantId = bc.merchantId?.toString();
          const storeMerchantId = (store as any).merchantId?.toString();
          return bcMerchantId === storeId || bcMerchantId === storeMerchantId;
        }
      );
      
      if (storeBrandedCoin && storeBrandedCoin.amount > 0) {
        brandedCoinsAvailable = storeBrandedCoin.amount;
        brandedCoinInfo = {
          storeName: storeBrandedCoin.merchantName || store.name,
          storeId: storeId,
          color: storeBrandedCoin.merchantColor || '#6366F1',
          logo: storeBrandedCoin.merchantLogo,
        };
      }
    }

    // ==================== AUTO-OPTIMIZATION ====================
    // Priority: Promo (expiring first, capped) > Branded > ReZ
    let remainingAllowance = maxCoinsAllowed;
    let promoUsing = 0;
    let brandedUsing = 0;
    let rezUsing = 0;

    // Step 1: Use Promo Coins first (capped at 20% of bill)
    if (promoCoinsAvailable > 0 && remainingAllowance > 0) {
      // Promo coins have their own cap (default 20%)
      const promoCanUse = Math.min(promoCoinsAvailable, maxPromoCoinsAllowed);
      promoUsing = Math.min(promoCanUse, remainingAllowance);
      remainingAllowance -= promoUsing;
    }

    // Step 2: Use Branded Coins (store-specific, no cap)
    if (brandedCoinsAvailable > 0 && remainingAllowance > 0) {
      brandedUsing = Math.min(brandedCoinsAvailable, remainingAllowance);
      remainingAllowance -= brandedUsing;
    }

    // Step 3: Use ReZ Coins (universal, no cap)
    if (rezCoinsAvailable > 0 && remainingAllowance > 0) {
      rezUsing = Math.min(rezCoinsAvailable, remainingAllowance);
      remainingAllowance -= rezUsing;
    }

    const totalApplied = promoUsing + brandedUsing + rezUsing;
    const percentOfBill = billAmount > 0 ? Math.round((totalApplied / billAmount) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        // ReZ Coins - Universal rewards
        rezCoins: {
          available: rezCoinsAvailable,
          using: rezUsing,
          enabled: rezUsing > 0,
          color: '#00C06A',
          icon: 'diamond',
          description: 'Universal rewards usable anywhere on ReZ',
          redemptionCap: null, // No cap
        },
        // Promo Coins - Limited-time campaigns
        promoCoins: {
          available: promoCoinsAvailable,
          using: promoUsing,
          enabled: promoUsing > 0,
          expiringToday: promoExpiringToday,
          expiresIn: promoExpiresIn,
          color: '#FFC857',
          icon: 'flame',
          description: 'Special coins from campaigns & events',
          redemptionCap: promoRedemptionCap, // Max 20% per bill
          maxAllowedForBill: maxPromoCoinsAllowed,
        },
        // Branded Coins - Merchant-specific
        brandedCoins: brandedCoinsAvailable > 0 ? {
          available: brandedCoinsAvailable,
          using: brandedUsing,
          enabled: brandedUsing > 0,
          color: brandedCoinInfo?.color || '#6366F1',
          icon: 'storefront',
          description: `Use only at ${brandedCoinInfo?.storeName}`,
          redemptionCap: null, // No cap
          ...brandedCoinInfo,
        } : null,
        // Totals
        totalApplied,
        maxAllowed: maxCoinsAllowed,
        // Optimization details
        optimizationStrategy: 'promo_branded_rez_priority',
        usageOrder: ['promo', 'branded', 'rez'],
        usageOrderDescription: 'Promo → Branded → ReZ (for maximum savings)',
        // Savings summary
        savings: {
          coinsUsed: totalApplied,
          percentOfBill: percentOfBill,
          amountSaved: totalApplied,
        },
      },
    });
  } catch (error: any) {
    console.error('Error auto-optimizing coins:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to auto-optimize coins',
    });
  }
};

/**
 * Get user's membership tier for a store
 * GET /api/store-payment/membership/:storeId
 */
export const getStoreMembership = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Get user's visit count at this store
    const visitCount = await StorePayment.countDocuments({
      userId: new Types.ObjectId(userId),
      storeId: new Types.ObjectId(storeId),
      status: 'completed',
    });

    // Determine membership tier based on visits
    let tier = 'bronze';
    let tierName = 'Bronze Member';
    let nextTier: string | null = 'Silver Member';
    let visitsToNextTier = 5 - visitCount;

    if (visitCount >= 20) {
      tier = 'gold';
      tierName = 'Gold Member';
      nextTier = null;
      visitsToNextTier = 0;
    } else if (visitCount >= 10) {
      tier = 'silver';
      tierName = 'Silver Member';
      nextTier = 'Gold Member';
      visitsToNextTier = 20 - visitCount;
    } else if (visitCount >= 5) {
      tier = 'bronze';
      tierName = 'Bronze Member';
      nextTier = 'Silver Member';
      visitsToNextTier = 10 - visitCount;
    } else {
      tier = 'new';
      tierName = 'New Customer';
      nextTier = 'Bronze Member';
      visitsToNextTier = 5 - visitCount;
    }

    // Get tier benefits
    const tierBenefits: any = {
      new: { cashbackBonus: 0, prioritySupport: false, exclusiveOffers: false },
      bronze: { cashbackBonus: 1, prioritySupport: false, exclusiveOffers: false },
      silver: { cashbackBonus: 2, prioritySupport: true, exclusiveOffers: false },
      gold: { cashbackBonus: 5, prioritySupport: true, exclusiveOffers: true },
    };

    res.status(200).json({
      success: true,
      data: {
        tier,
        tierName,
        visitCount,
        nextTier,
        visitsToNextTier: Math.max(0, visitsToNextTier),
        benefits: tierBenefits[tier],
        isEarningRewards: true,
      },
    });
  } catch (error: any) {
    console.error('Error getting store membership:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get membership info',
    });
  }
};

export const getStorePaymentHistory = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = (req as any).user?.id;
    const merchantId = req.merchantId;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Build query based on user type
    const query: any = { status: 'completed' };

    if (storeId && merchantId) {
      // Merchant requesting store-specific history
      query.storeId = new Types.ObjectId(storeId);
    } else if (userId) {
      // User requesting their own history
      query.userId = new Types.ObjectId(userId);
    } else {
      return res.status(400).json({
        success: false,
        message: 'User ID or Store ID required',
      });
    }

    // Fetch transactions
    const [transactions, total] = await Promise.all([
      StorePayment.find(query)
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('paymentId storeId storeName billAmount coinRedemption remainingAmount paymentMethod status rewards completedAt')
        .lean(),
      StorePayment.countDocuments(query),
    ]);

    const hasMore = skip + transactions.length < total;

    res.status(200).json({
      success: true,
      data: {
        transactions: transactions.map((t) => ({
          id: t._id,
          paymentId: t.paymentId,
          storeId: t.storeId,
          storeName: t.storeName,
          amount: t.billAmount,
          coinsUsed: t.coinRedemption?.totalAmount || 0,
          paymentMethod: t.paymentMethod,
          status: t.status,
          rewards: t.rewards,
          createdAt: t.completedAt,
          completedAt: t.completedAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          hasNext: hasMore,
          hasPrev: pageNum > 1,
          hasMore,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting payment history:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get payment history',
    });
  }
};
