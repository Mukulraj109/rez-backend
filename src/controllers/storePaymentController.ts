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
      acceptPayBill: true,
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
      if (coinsToRedeem.payBill && !settings.acceptPayBill) {
        return res.status(400).json({
          success: false,
          message: 'This store does not accept PayBill balance',
        });
      }

      coinRedemptionAmount =
        coinRedemption.rezCoins +
        coinRedemption.promoCoins +
        coinRedemption.payBill;

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

        // Check PayBill balance
        if (coinRedemption.payBill > (wallet.balance.paybill || 0)) {
          return res.status(400).json({
            success: false,
            message: `Insufficient PayBill balance. You have ₹${wallet.balance.paybill || 0} but trying to use ₹${coinRedemption.payBill}`,
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
          // Deduct PayBill balance if used
          if (storePayment.coinRedemption.payBill > 0) {
            await wallet.usePayBillBalance(storePayment.coinRedemption.payBill);
            console.log('✅ Deducted PayBill:', storePayment.coinRedemption.payBill);
          }

          // Deduct ReZ coins (from available balance)
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
 * Get store payment history
 * GET /api/store-payment/history (for users)
 * GET /api/store-payment/history/:storeId (for merchants)
 */
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
