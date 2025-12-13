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
        (coinsToRedeem.rezCoins || 0) +
        (coinsToRedeem.promoCoins || 0) +
        (coinsToRedeem.payBill || 0);

      if (coinRedemptionAmount > maxCoins) {
        return res.status(400).json({
          success: false,
          message: `Maximum coin redemption is ₹${maxCoins} (${settings.maxCoinRedemptionPercent}% of bill)`,
        });
      }
    }

    // Calculate final amount
    const remainingAmount = amount - coinRedemptionAmount;

    // TODO: Create payment intent based on payment method
    // For now, return a mock response
    const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

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
        paymentMethod,
        upiId: settings.upiId,
        offersApplied: offersApplied || [],
        status: 'INITIATED',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
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
    const { paymentId, transactionId, paymentProof } = req.body;
    const userId = (req as any).user?.id;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'paymentId is required',
      });
    }

    // TODO: Implement actual payment verification
    // - Verify payment with gateway
    // - Update payment record
    // - Credit cashback/coins
    // - Update loyalty progress

    res.status(200).json({
      success: true,
      message: 'Payment confirmed successfully',
      data: {
        paymentId,
        status: 'COMPLETED',
        transactionId: transactionId || `TXN-${Date.now()}`,
        completedAt: new Date(),
        // Rewards earned
        rewards: {
          cashbackEarned: 0, // TODO: Calculate
          coinsEarned: 0, // TODO: Calculate
          loyaltyProgress: {
            currentVisits: 1,
            nextMilestone: 5,
            milestoneReward: 'Gold Tier Unlock',
          },
        },
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

    // TODO: Implement actual payment history from database
    // For now, return empty array

    res.status(200).json({
      success: true,
      data: {
        transactions: [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: 0,
          hasMore: false,
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
