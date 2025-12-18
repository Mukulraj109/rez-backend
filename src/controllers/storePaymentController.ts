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
import { Types } from 'mongoose';
import { StorePayment, IPaymentRewards } from '../models/StorePayment';
import stripeService from '../services/stripeService';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
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

    // TODO: Fetch bank offers from offers/discounts system
    const bankOffers: any[] = [];

    // TODO: Fetch ReZ platform offers
    const rezOffers: any[] = [];

    // Calculate best offer for the amount
    let bestOffer = null;
    if (billAmount > 0 && storeOffers.length > 0) {
      const eligibleOffers = storeOffers.filter((offer) => billAmount >= (offer.minAmount || 0));

      if (eligibleOffers.length > 0) {
        // Find offer with highest value
        bestOffer = eligibleOffers.reduce((best, current) => {
          const bestValue =
            best.valueType === 'PERCENTAGE' ? (billAmount * best.value) / 100 : best.value;
          const currentValue =
            current.valueType === 'PERCENTAGE'
              ? (billAmount * current.value) / 100
              : current.value;
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
      coinRedemptionAmount =
        coinRedemption.rezCoins +
        coinRedemption.promoCoins;

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
        const coinsNeeded = coinRedemption.rezCoins + coinRedemption.promoCoins;
        if (coinsNeeded > wallet.balance.available) {
          return res.status(400).json({
            success: false,
            message: `Insufficient coin balance. You have ₹${wallet.balance.available} but trying to use ₹${coinsNeeded}`,
          });
        }
      }
    }

    // Calculate final amount
    const remainingAmount = Math.max(0, amount - coinRedemptionAmount);

    // Generate unique payment ID
    const paymentId = (StorePayment as any).generatePaymentId();

    // Determine effective payment method
    const effectivePaymentMethod = remainingAmount === 0 ? 'coins_only' : paymentMethod;

    // Create store payment record
    const storePayment = new StorePayment({
      paymentId,
      userId: new Types.ObjectId(userId),
      storeId: new Types.ObjectId(storeId),
      storeName: store.name,
      billAmount: amount,
      discountAmount: 0, // Could be calculated from offers
      coinRedemption,
      remainingAmount,
      paymentMethod: effectivePaymentMethod,
      offersApplied: offersApplied || [],
      status: 'initiated',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
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
 */
export const confirmStorePayment = async (req: Request, res: Response) => {
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

    // Update payment status to processing
    storePayment.status = 'processing';
    await storePayment.save();

    // Deduct coins from user's wallet
    if (storePayment.coinRedemption.totalAmount > 0) {
      console.log('💰 [STORE PAYMENT] Deducting coins:', storePayment.coinRedemption);

      try {
        const wallet = await Wallet.findOne({ user: storePayment.userId });

        if (wallet) {
          // Deduct ReZ coins + Promo coins (from available balance)
          const coinsToDeduce = storePayment.coinRedemption.rezCoins + storePayment.coinRedemption.promoCoins;
          if (coinsToDeduce > 0) {
            await wallet.deductFunds(coinsToDeduce);
            console.log('✅ Deducted coins:', coinsToDeduce);
          }

          // Create transaction record for coin spending
          await Transaction.create({
            user: storePayment.userId,
            type: 'debit',
            category: 'spending',
            amount: storePayment.coinRedemption.totalAmount,
            balance: wallet.balance.available,
            description: `Store payment at ${storePayment.storeName}`,
            reference: {
              type: 'store_payment',
              id: storePayment._id,
            },
            status: 'completed',
            source: {
              type: 'store_payment',
              store: storePayment.storeId,
            },
          });
        }
      } catch (walletError: any) {
        console.error('❌ [STORE PAYMENT] Wallet deduction failed:', walletError.message);
        // Continue - payment was successful, coin deduction is secondary
      }
    }

    // Calculate rewards
    const store = await Store.findById(storePayment.storeId).select('rewardRules');
    const rewardRules = store?.rewardRules;

    const rewards: IPaymentRewards = {
      cashbackEarned: 0,
      coinsEarned: 0,
      bonusCoins: 0,
      loyaltyProgress: {
        currentVisits: 1,
        nextMilestone: 5,
        milestoneReward: 'Loyalty Reward',
      },
    };

    // Calculate cashback (percentage of bill)
    if (rewardRules?.baseCashbackPercent && storePayment.billAmount >= (rewardRules.minimumAmountForReward || 0)) {
      rewards.cashbackEarned = Math.floor((storePayment.billAmount * rewardRules.baseCashbackPercent) / 100);
    }

    // Calculate coins earned (1 coin per ₹10 spent, for example)
    rewards.coinsEarned = Math.floor(storePayment.billAmount / 10);

    // Extra reward for spending above threshold
    if (rewardRules?.extraRewardThreshold && storePayment.billAmount >= rewardRules.extraRewardThreshold) {
      rewards.bonusCoins = rewardRules.extraRewardCoins || 0;
    }

    // Credit reward coins to user's wallet
    const totalRewardCoins = rewards.coinsEarned + rewards.bonusCoins;
    if (totalRewardCoins > 0) {
      try {
        const wallet = await Wallet.findOne({ user: storePayment.userId });
        if (wallet) {
          await wallet.addFunds(totalRewardCoins, 'cashback');
          console.log('✅ [STORE PAYMENT] Credited reward coins:', totalRewardCoins);

          // Create transaction record for reward
          await Transaction.create({
            user: storePayment.userId,
            type: 'credit',
            category: 'cashback',
            amount: totalRewardCoins,
            balance: wallet.balance.available,
            description: `Rewards for payment at ${storePayment.storeName}`,
            reference: {
              type: 'store_payment',
              id: storePayment._id,
            },
            status: 'completed',
            source: {
              type: 'store_payment',
              store: storePayment.storeId,
            },
          });
        }
      } catch (rewardError: any) {
        console.error('❌ [STORE PAYMENT] Failed to credit rewards:', rewardError.message);
        // Continue - payment was successful
      }
    }

    // Mark payment as completed
    const finalTransactionId = transactionId || storePayment.stripePaymentIntentId || `TXN-${Date.now()}`;
    await storePayment.markCompleted(finalTransactionId, rewards);

    console.log('✅ [STORE PAYMENT] Payment completed:', paymentId);

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
  } catch (error: any) {
    console.error('Error confirming store payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to confirm payment',
    });
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
