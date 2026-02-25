import { Request, Response } from 'express';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { CoinTransaction } from '../models/CoinTransaction';
import { User } from '../models/User';
import { Payment } from '../models/Payment';
import { sendSuccess, sendError, sendBadRequest, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import mongoose from 'mongoose';
import activityService from '../services/activityService';
import paymentGatewayService from '../services/paymentGatewayService';
import redisService from '../services/redisService';
import Stripe from 'stripe';
import { validateAmount, sanitizeErrorMessage, validatePagination } from '../utils/walletValidation';

/**
 * @desc    Get user wallet balance
 * @route   GET /api/wallet/balance
 * @access  Private
 */
export const getWalletBalance = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Get or create wallet
  let wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
  }

  if (!wallet) {
    return sendError(res, 'Failed to create wallet', 500);
  }

  // AUTO-SYNC: Ensure wallet balance matches CoinTransaction (source of truth)
  // Uses aggregation (sum earned - spent) instead of running balance to avoid
  // data corruption from stale/wrong balance fields on individual transactions.
  try {
    const { CoinTransaction } = require('../models/CoinTransaction');
    const userObjId = new mongoose.Types.ObjectId(userId);

    // Cache the computed balance for 2 minutes to avoid heavy aggregation on every request
    const balanceCacheKey = `wallet:computed_balance:${userId}`;
    let actualRezBalance: number | null = null;
    const cachedBalance = await redisService.get<number>(balanceCacheKey);

    if (cachedBalance !== null && cachedBalance !== undefined) {
      actualRezBalance = cachedBalance;
    } else {
      // Aggregate: sum all earned/bonus/refunded minus spent/expired, excluding branded awards
      const result = await CoinTransaction.aggregate([
        { $match: { user: userObjId } },
        {
          $group: {
            _id: null,
            earned: {
              $sum: {
                $cond: [
                  { $and: [
                    { $in: ['$type', ['earned', 'refunded', 'bonus']] },
                    { $ne: ['$source', 'merchant_award'] }
                  ]},
                  '$amount',
                  0
                ]
              }
            },
            spent: {
              $sum: {
                $cond: [{ $in: ['$type', ['spent', 'expired']] }, '$amount', 0]
              }
            }
          }
        }
      ]);
      actualRezBalance = Math.max(0, (result[0]?.earned || 0) - (result[0]?.spent || 0));
      await redisService.set(balanceCacheKey, actualRezBalance, 120);
    }

    const currentBalance = wallet.balance.available || 0;
    if (Math.abs(actualRezBalance - currentBalance) > 0.01) {
      console.log(`🔄 [WALLET] Auto-syncing balance: ${currentBalance} → ${actualRezBalance}`);

      // Update wallet balance (ReZ coins only, branded tracked separately)
      // balance.total is recalculated by the pre-save hook
      wallet.balance.available = actualRezBalance;

      // Update ReZ coin amount
      const rezCoinToUpdate = wallet.coins.find((c: any) => c.type === 'rez');
      if (rezCoinToUpdate) {
        rezCoinToUpdate.amount = actualRezBalance;
        rezCoinToUpdate.lastUsed = new Date();
      }

      await wallet.save();
      // Also sync to User model so profile page shows correct balance
      await wallet.syncWithUser();
    }
  } catch (syncError) {
    console.error('⚠️ [WALLET] Auto-sync failed:', syncError);
    // Continue with existing wallet data if sync fails
  }


  // Compute savings insights from CoinTransaction (source of truth)
  let savingsInsights = { totalSaved: 0, thisMonth: 0, avgPerVisit: 0 };
  try {
    const { CoinTransaction } = require('../models/CoinTransaction');
    const userObjId = new mongoose.Types.ObjectId(userId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [insightsResult] = await CoinTransaction.aggregate([
      { $match: { user: userObjId, type: 'earned' } },
      {
        $facet: {
          allTime: [
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
          ],
          thisMonth: [
            { $match: { createdAt: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]
        }
      }
    ]);

    const allTime = insightsResult?.allTime?.[0];
    const thisMonthData = insightsResult?.thisMonth?.[0];
    savingsInsights = {
      totalSaved: Math.round(allTime?.total || 0),
      thisMonth: Math.round(thisMonthData?.total || 0),
      avgPerVisit: allTime?.count ? Math.round((allTime.total || 0) / allTime.count) : 0
    };
  } catch (insightsError) {
    console.error('⚠️ [WALLET] Insights computation failed:', insightsError);
  }

  // Get ReZ and Promo coins from coins array
  const rezCoin = wallet.coins?.find((c: any) => c.type === 'rez');
  const promoCoin = wallet.coins?.find((c: any) => c.type === 'promo');

  // Calculate promo coin expiry countdown
  let promoExpiryCountdown = '';
  const expiryDateValue = promoCoin?.promoDetails?.expiryDate || promoCoin?.expiryDate;
  if (expiryDateValue) {
    const expiryDate = new Date(expiryDateValue);
    const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 0) {
      promoExpiryCountdown = daysLeft === 1 ? '1 day left' : `${daysLeft} days left`;
    } else {
      promoExpiryCountdown = 'Expired';
    }
  }

  sendSuccess(res, {
    // Total value
    totalValue: wallet.balance.total,
    // Breakdown row
    breakdown: {
      rezCoins: {
        amount: rezCoin?.amount || 0,
        color: '#00C06A',
        expiryDate: rezCoin?.expiryDate
      },
      cashbackBalance: wallet.balance.cashback || 0,
      pendingRewards: wallet.balance.pending || 0
    },
    // Branded Coins (merchant-specific)
    brandedCoins: (wallet.brandedCoins || []).map((bc: any) => ({
      merchantId: bc.merchantId,
      merchantName: bc.merchantName,
      merchantLogo: bc.merchantLogo,
      merchantColor: bc.merchantColor || '#6366F1',
      amount: bc.amount
    })),
    brandedCoinsTotal: (wallet.brandedCoins || []).reduce((sum: number, bc: any) => sum + (bc.amount || 0), 0),
    // Per-MainCategory coin balances
    categoryBalances: (() => {
      const result: Record<string, { available: number; earned: number; spent: number }> = {};
      if (wallet.categoryBalances) {
        wallet.categoryBalances.forEach((val: any, key: string) => {
          result[key] = {
            available: val?.available || 0,
            earned: val?.earned || 0,
            spent: val?.spent || 0,
          };
        });
      }
      return result;
    })(),
    // Promo Coins (limited-time)
    promoCoins: {
      amount: promoCoin?.amount || 0,
      color: '#FFC857',
      expiryCountdown: promoExpiryCountdown,
      maxRedemptionPercentage: promoCoin?.promoDetails?.maxRedemptionPercentage || 20
    },
    // Coin usage order (for transparency)
    coinUsageOrder: ['promo', 'branded', 'rez'],
    // Savings insights (computed from CoinTransaction)
    savingsInsights,
    // Legacy format for compatibility
    balance: wallet.balance,
    coins: wallet.coins || [],
    currency: wallet.currency,
    statistics: wallet.statistics,
    limits: {
      maxBalance: wallet.limits.maxBalance,
      dailySpendLimit: wallet.limits.dailySpendLimit,
      dailySpentToday: wallet.limits.dailySpent,
      remainingToday: wallet.limits.dailySpendLimit - wallet.limits.dailySpent
    },
    settings: wallet.settings,
    status: {
      isActive: wallet.isActive,
      isFrozen: wallet.isFrozen,
      frozenReason: wallet.frozenReason
    },
    lastUpdated: wallet.updatedAt
  }, 'Wallet balance retrieved successfully');
});

/**
 * @desc    Credit loyalty points to wallet
 * @route   POST /api/wallet/credit-loyalty-points
 * @access  Private
 */
export const creditLoyaltyPoints = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { amount, source } = req.body;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const amountCheck = validateAmount(amount, { fieldName: 'Loyalty points' });
  if (!amountCheck.valid) return sendBadRequest(res, amountCheck.error);
  const validatedAmount = amountCheck.amount;

  console.log('💰 [WALLET] Crediting loyalty points:', { userId, amount: validatedAmount, source });

  // Get or create wallet
  let wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
  }

  if (!wallet) {
    return sendError(res, 'Failed to create wallet', 500);
  }

  // Atomic balance update — prevents race conditions from concurrent requests
  const updatedWallet = await Wallet.findOneAndUpdate(
    { _id: wallet._id },
    {
      $inc: {
        'balance.available': validatedAmount,
        'statistics.totalEarned': validatedAmount
      },
      $set: { lastTransactionAt: new Date() }
    },
    { new: true }
  );

  if (!updatedWallet) {
    return sendError(res, 'Failed to update wallet balance', 500);
  }

  // Update ReZ coin type tracking (non-critical, separate from balance)
  const rezCoin = updatedWallet.coins.find(c => c.type === 'rez');
  if (rezCoin) {
    await Wallet.updateOne(
      { _id: wallet._id, 'coins.type': 'rez' },
      { $inc: { 'coins.$.amount': validatedAmount }, $set: { 'coins.$.lastUsed': new Date() } }
    );
  } else {
    await Wallet.updateOne(
      { _id: wallet._id },
      { $push: { coins: {
        type: 'rez',
        amount: validatedAmount,
        isActive: true,
        color: '#00C06A',
        earnedDate: new Date(),
        lastUsed: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      } as any } }
    );
  }

  // Create transaction record
  try {
    await Transaction.create({
      user: userId,
      type: 'credit',
      category: 'earning',
      amount: validatedAmount,
      currency: 'RC',
      description: source?.description || 'Loyalty points credited',
      source: {
        type: source?.type || 'loyalty_sync',
        reference: source?.reference || 'system',
        description: source?.description || 'Loyalty points conversion',
        metadata: source?.metadata || {}
      },
      status: {
        current: 'completed',
        history: [{
          status: 'completed',
          timestamp: new Date(),
          reason: 'Loyalty points credited successfully'
        }]
      },
      balanceBefore: updatedWallet.balance.available - amount,
      balanceAfter: updatedWallet.balance.available,
      netAmount: amount,
      isReversible: false
    });

    console.log('✅ [WALLET] Transaction created for loyalty points credit');
  } catch (txError) {
    console.error('❌ [WALLET] Failed to create transaction:', txError);
  }

  // Create CoinTransaction (source of truth for auto-sync)
  try {
    await CoinTransaction.createTransaction(
      userId,
      'earned',
      validatedAmount,
      source?.type === 'admin' ? 'admin' : 'bonus',
      source?.description || 'Loyalty points credited',
      { loyaltySource: source?.type || 'loyalty_sync', reference: source?.reference }
    );
    console.log('✅ [WALLET] CoinTransaction created for loyalty points');
  } catch (ctxError) {
    console.error('❌ [WALLET] Failed to create CoinTransaction:', ctxError);
  }

  // Log activity
  try {
    await activityService.wallet.onMoneyAdded(
      new mongoose.Types.ObjectId(userId),
      amount
    );
  } catch (activityError) {
    console.error('❌ [WALLET] Failed to log activity:', activityError);
  }

  console.log('✅ [WALLET] Loyalty points credited successfully:', {
    amount,
    newBalance: updatedWallet.balance.available,
    rezCoins: rezCoin?.amount
  });

  sendSuccess(res, {
    balance: updatedWallet.balance,
    coins: updatedWallet.coins,
    credited: amount,
    message: `${amount} loyalty points credited to your wallet`
  }, 'Loyalty points credited successfully');
});

/**
 * @desc    Get transaction history
 * @route   GET /api/wallet/transactions
 * @access  Private
 */
export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const {
    page = 1,
    limit = 20,
    type,
    category,
    status,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount
  } = req.query;

  // Build filters
  const filters: any = {};

  if (type) filters.type = type;
  if (category) filters.category = category;
  if (status) filters.status = status;

  if (dateFrom || dateTo) {
    filters.dateRange = {
      start: dateFrom ? new Date(dateFrom as string) : new Date(0),
      end: dateTo ? new Date(dateTo as string) : new Date()
    };
  }

  if (minAmount || maxAmount) {
    filters.amountRange = {
      min: minAmount ? Number(minAmount) : 0,
      max: maxAmount ? Number(maxAmount) : Number.MAX_SAFE_INTEGER
    };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const transactions = await Transaction.getUserTransactions(
    userId,
    filters,
    Number(limit),
    skip
  );

  const total = await Transaction.countDocuments({ user: userId, ...filters });
  const totalPages = Math.ceil(total / Number(limit));

  sendSuccess(res, {
    transactions,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
      hasNext: Number(page) < totalPages,
      hasPrev: Number(page) > 1
    }
  }, 'Transactions retrieved successfully');
});

/**
 * @desc    Get single transaction details
 * @route   GET /api/wallet/transaction/:id
 * @access  Private
 */
export const getTransactionById = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const transaction = await Transaction.findOne({
    _id: id,
    user: userId
  }).populate('source.reference');

  if (!transaction) {
    return sendNotFound(res, 'Transaction not found');
  }

  sendSuccess(res, { transaction }, 'Transaction details retrieved successfully');
});

/**
 * @desc    Topup wallet
 * @route   POST /api/wallet/topup
 * @access  Private
 */
export const topupWallet = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { amount, paymentMethod, paymentId } = req.body;

  console.log('💰 [TOPUP] Starting wallet topup');
  console.log('💰 [TOPUP] User ID:', userId);
  console.log('💰 [TOPUP] Amount:', amount);
  console.log('💰 [TOPUP] Payment Method:', paymentMethod);

  if (!userId) {
    console.error('❌ [TOPUP] No user ID found');
    return sendError(res, 'User not authenticated', 401);
  }

  // Validate amount
  const topupAmountCheck = validateAmount(amount, { fieldName: 'Topup amount' });
  if (!topupAmountCheck.valid) {
    console.error('❌ [TOPUP] Invalid amount:', amount);
    return sendBadRequest(res, topupAmountCheck.error);
  }
  const topupAmount = topupAmountCheck.amount;

  // Get wallet
  console.log('🔍 [TOPUP] Finding wallet for user:', userId);
  let wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    console.log('🆕 [TOPUP] Wallet not found, creating new wallet');
    wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
  }

  if (!wallet) {
    console.error('❌ [TOPUP] Failed to create wallet');
    return sendError(res, 'Failed to create wallet', 500);
  }

  console.log('✅ [TOPUP] Wallet found/created:', wallet._id);
  console.log('💵 [TOPUP] Current balance:', wallet.balance.total);

  // Check if wallet is frozen
  if (wallet.isFrozen) {
    console.error('❌ [TOPUP] Wallet is frozen:', wallet.frozenReason);
    return sendError(res, `Wallet is frozen: ${wallet.frozenReason}`, 403);
  }

  // Check max balance limit
  if (wallet.balance.total + amount > wallet.limits.maxBalance) {
    console.error('❌ [TOPUP] Max balance limit would be exceeded');
    return sendBadRequest(res, `Maximum wallet balance limit (${wallet.limits.maxBalance} RC) would be exceeded`);
  }

  // Get current balance for transaction record
  const balanceBefore = wallet.balance.total;

  console.log('📝 [TOPUP] Creating transaction record');
  console.log('📝 [TOPUP] Wallet ID for reference:', wallet._id);
  console.log('📝 [TOPUP] Wallet ID type:', typeof wallet._id);

  // Create transaction record
  try {
    const transaction = new Transaction({
      user: new mongoose.Types.ObjectId(userId),
      type: 'credit',
      category: 'topup',
      amount: topupAmount,
      currency: wallet.currency,
      description: `Wallet topup - ${paymentMethod || 'Payment Gateway'}`,
      source: {
        type: 'topup',
        reference: new mongoose.Types.ObjectId(String(wallet._id)),
        description: `Wallet topup via ${paymentMethod || 'Payment Gateway'}`,
        metadata: {
          paymentId: paymentId || `PAY_${Date.now()}`,
          paymentMethod: paymentMethod || 'gateway'
        }
      },
      balanceBefore: Number(balanceBefore),
      balanceAfter: Number(balanceBefore) + topupAmount,
      status: {
        current: 'completed',
        history: [{
          status: 'completed',
          timestamp: new Date()
        }]
      }
    });

    console.log('💾 [TOPUP] Saving transaction');
    await transaction.save();
    console.log('✅ [TOPUP] Transaction saved:', transaction._id);

    // Add funds to wallet
    console.log('💰 [TOPUP] Adding funds to wallet');
    await wallet.addFunds(topupAmount, 'topup');
    console.log('✅ [TOPUP] Funds added, new balance:', wallet.balance.total);

    // Create CoinTransaction (source of truth for auto-sync)
    try {
      await CoinTransaction.createTransaction(
        userId,
        'earned',
        topupAmount,
        'recharge',
        `Wallet topup via ${paymentMethod || 'Payment Gateway'}`,
        { paymentId: paymentId || `PAY_${Date.now()}`, paymentMethod: paymentMethod || 'gateway' }
      );
    } catch (ctxError) {
      console.error('❌ [TOPUP] Failed to create CoinTransaction:', ctxError);
    }

    // Create activity for wallet topup
    await activityService.wallet.onMoneyAdded(
      new mongoose.Types.ObjectId(userId),
      topupAmount
    );

    sendSuccess(res, {
      transaction,
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency
      }
    }, 'Wallet topup successful', 201);
  } catch (error) {
    console.error('❌ [TOPUP] Error creating transaction:', error);
    console.error('❌ [TOPUP] Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
});

/**
 * @desc    Withdraw from wallet
 * @route   POST /api/wallet/withdraw
 * @access  Private
 */
export const withdrawFunds = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { amount, method, accountDetails } = req.body;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Validate amount
  if (!amount || amount <= 0) {
    return sendBadRequest(res, 'Invalid withdrawal amount');
  }

  // Validate method
  if (!method || !['bank', 'upi', 'paypal'].includes(method)) {
    return sendBadRequest(res, 'Invalid withdrawal method');
  }

  // Get wallet
  const wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    return sendNotFound(res, 'Wallet not found');
  }

  // Check if wallet is frozen
  if (wallet.isFrozen) {
    return sendError(res, `Wallet is frozen: ${wallet.frozenReason}`, 403);
  }

  // Check minimum withdrawal
  if (amount < wallet.limits.minWithdrawal) {
    return sendBadRequest(res, `Minimum withdrawal amount is ${wallet.limits.minWithdrawal} RC`);
  }

  // Check if sufficient balance
  if (wallet.balance.available < amount) {
    return sendBadRequest(res, 'Insufficient wallet balance');
  }

  // Calculate fees (2% withdrawal fee)
  const fees = Math.round(amount * 0.02);
  const netAmount = amount - fees;

  const balanceBefore = wallet.balance.total;

  // Create withdrawal transaction
  const withdrawalId = `WD${Date.now()}`;
  const transaction = new Transaction({
    user: userId,
    type: 'debit',
    category: 'withdrawal',
    amount,
    currency: wallet.currency,
    description: `Wallet withdrawal via ${method}`,
    source: {
      type: 'withdrawal',
      reference: wallet._id,
      description: `Withdrawal to ${method}`,
      metadata: {
        withdrawalInfo: {
          method,
          accountDetails: accountDetails || 'Not provided',
          withdrawalId
        }
      }
    },
    balanceBefore,
    balanceAfter: balanceBefore - amount,
    fees,
    netAmount,
    status: {
      current: 'processing',
      history: [{
        status: 'processing',
        timestamp: new Date()
      }]
    }
  });

  await transaction.save();

  // Deduct from wallet
  await wallet.deductFunds(amount);

  // Update statistics
  wallet.statistics.totalWithdrawals += amount;
  await wallet.save();

  // Create CoinTransaction (source of truth for auto-sync)
  try {
    await CoinTransaction.createTransaction(
      userId,
      'spent',
      amount,
      'withdrawal',
      `Withdrawal via ${method}`,
      { withdrawalId, method, fees, netAmount }
    );
  } catch (ctxError) {
    console.error('❌ [WITHDRAW] Failed to create CoinTransaction:', ctxError);
  }

  sendSuccess(res, {
    transaction,
    withdrawalId,
    netAmount,
    fees,
    wallet: {
      balance: wallet.balance,
      currency: wallet.currency
    },
    estimatedProcessingTime: '2-3 business days'
  }, 'Withdrawal request submitted successfully', 201);
});

/**
 * @desc    Process payment (deduct from wallet)
 * @route   POST /api/wallet/payment
 * @access  Private
 */
export const processPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const {
    amount,
    orderId,
    storeId,
    storeName,
    description,
    items
  } = req.body;

  console.log('💳 [PAYMENT] Starting payment processing');
  console.log('💳 [PAYMENT] User ID:', userId);
  console.log('💳 [PAYMENT] Amount:', amount);
  console.log('💳 [PAYMENT] Store:', storeName);

  if (!userId) {
    console.error('❌ [PAYMENT] No user ID found');
    return sendError(res, 'User not authenticated', 401);
  }

  // Validate amount
  const payAmountCheck = validateAmount(amount, { fieldName: 'Payment amount' });
  if (!payAmountCheck.valid) {
    console.error('❌ [PAYMENT] Invalid amount:', amount);
    return sendBadRequest(res, payAmountCheck.error);
  }
  const payAmount = payAmountCheck.amount;

  // Get wallet
  console.log('🔍 [PAYMENT] Finding wallet for user:', userId);
  const wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    console.error('❌ [PAYMENT] Wallet not found');
    return sendNotFound(res, 'Wallet not found');
  }

  console.log('✅ [PAYMENT] Wallet found:', wallet._id);
  console.log('💵 [PAYMENT] Available balance:', wallet.balance.available);

  // Check if wallet is frozen
  if (wallet.isFrozen) {
    console.error('❌ [PAYMENT] Wallet is frozen:', wallet.frozenReason);
    return sendError(res, `Wallet is frozen: ${wallet.frozenReason}`, 403);
  }

  // Check if can spend
  if (!wallet.canSpend(payAmount)) {
    if (wallet.balance.available < payAmount) {
      console.error('❌ [PAYMENT] Insufficient balance');
      return sendBadRequest(res, 'Insufficient wallet balance');
    } else {
      console.error('❌ [PAYMENT] Daily limit exceeded');
      return sendBadRequest(res, 'Daily spending limit exceeded');
    }
  }

  const balanceBefore = wallet.balance.total;

  console.log('📝 [PAYMENT] Creating transaction record');

  try {
    // Create payment transaction
    const transaction = new Transaction({
      user: new mongoose.Types.ObjectId(userId),
      type: 'debit',
      category: 'spending',
      amount: payAmount,
      currency: wallet.currency,
      description: description || `Payment for order ${orderId || 'N/A'}`,
      source: {
        type: 'order',
        reference: orderId ? new mongoose.Types.ObjectId(orderId) : new mongoose.Types.ObjectId(String(wallet._id)),
        description: `Purchase from ${storeName || 'Store'}`,
        metadata: {
          orderNumber: orderId || `ORD_${Date.now()}`,
          storeInfo: {
            name: storeName || 'Unknown Store',
            id: storeId ? new mongoose.Types.ObjectId(storeId) : undefined
          },
          items: items || []
        }
      },
      balanceBefore: Number(balanceBefore),
      balanceAfter: Number(balanceBefore) - payAmount,
      status: {
        current: 'completed',
        history: [{
          status: 'completed',
          timestamp: new Date()
        }]
      }
    });

    console.log('💾 [PAYMENT] Saving transaction');
    await transaction.save();
    console.log('✅ [PAYMENT] Transaction saved:', transaction._id);

    // Deduct funds
    console.log('💰 [PAYMENT] Deducting funds from wallet');
    await wallet.deductFunds(payAmount);
    console.log('✅ [PAYMENT] Funds deducted, new balance:', wallet.balance.total);

    // Create CoinTransaction (source of truth for auto-sync)
    try {
      await CoinTransaction.createTransaction(
        userId,
        'spent',
        payAmount,
        'order',
        description || `Payment for order ${orderId || 'N/A'}`,
        { orderId, storeId, storeName }
      );
    } catch (ctxError) {
      console.error('❌ [PAYMENT] Failed to create CoinTransaction:', ctxError);
    }

    // Create activity for wallet spending
    await activityService.wallet.onMoneySpent(
      new mongoose.Types.ObjectId(userId),
      payAmount,
      storeName || 'order'
    );

    sendSuccess(res, {
      transaction,
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency
      },
      paymentStatus: 'success'
    }, 'Payment processed successfully', 201);
  } catch (error) {
    console.error('❌ [PAYMENT] Error processing payment:', error);
    console.error('❌ [PAYMENT] Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
});

/**
 * @desc    Get transaction summary/statistics
 * @route   GET /api/wallet/summary
 * @access  Private
 */
export const getTransactionSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { period = 'month' } = req.query;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const validPeriods = ['day', 'week', 'month', 'year'];
  if (!validPeriods.includes(period as string)) {
    return sendBadRequest(res, 'Invalid period. Must be day, week, month, or year');
  }

  const summary = await Transaction.getUserTransactionSummary(
    userId,
    period as 'day' | 'week' | 'month' | 'year'
  );

  const wallet = await Wallet.findOne({ user: userId });

  sendSuccess(res, {
    summary: summary[0] || { summary: [], totalTransactions: 0 },
    period,
    wallet: wallet ? {
      balance: wallet.balance,
      statistics: wallet.statistics
    } : null
  }, 'Transaction summary retrieved successfully');
});

/**
 * @desc    Update wallet settings
 * @route   PUT /api/wallet/settings
 * @access  Private
 */
export const updateWalletSettings = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const {
    autoTopup,
    autoTopupThreshold,
    autoTopupAmount,
    lowBalanceAlert,
    lowBalanceThreshold
  } = req.body;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    return sendNotFound(res, 'Wallet not found');
  }

  // Update settings
  if (autoTopup !== undefined) wallet.settings.autoTopup = autoTopup;
  if (autoTopupThreshold !== undefined) wallet.settings.autoTopupThreshold = autoTopupThreshold;
  if (autoTopupAmount !== undefined) wallet.settings.autoTopupAmount = autoTopupAmount;
  if (lowBalanceAlert !== undefined) wallet.settings.lowBalanceAlert = lowBalanceAlert;
  if (lowBalanceThreshold !== undefined) wallet.settings.lowBalanceThreshold = lowBalanceThreshold;

  await wallet.save();

  sendSuccess(res, {
    settings: wallet.settings
  }, 'Wallet settings updated successfully');
});

/**
 * @desc    Get wallet transaction categories breakdown
 * @route   GET /api/wallet/categories
 * @access  Private
 */
export const getCategoriesBreakdown = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const breakdown = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        'status.current': 'completed'
      }
    },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);

  sendSuccess(res, {
    categories: breakdown,
    totalCategories: breakdown.length
  }, 'Categories breakdown retrieved successfully');
});

/**
 * @desc    Initiate payment gateway transaction
 * @route   POST /api/wallet/initiate-payment
 * @access  Private
 */
export const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const {
    amount,
    currency,
    paymentMethod,
    paymentMethodType,
    purpose,
    userDetails,
    metadata,
    returnUrl,
    cancelUrl
  } = req.body;

  console.log('💳 [PAYMENT] Initiating payment:', {
    userId,
    amount,
    currency,
    paymentMethod,
    paymentMethodType
  });

  // Validate required fields
  if (!amount || amount <= 0) {
    return sendBadRequest(res, 'Valid amount is required');
  }

  if (!paymentMethod) {
    return sendBadRequest(res, 'Payment method is required');
  }

  if (!paymentMethodType) {
    return sendBadRequest(res, 'Payment method type is required');
  }

  // Get user wallet
  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    return sendNotFound(res, 'Wallet not found');
  }

  // Check if wallet is active
  if (!wallet.isActive) {
    return sendBadRequest(res, 'Wallet is not active');
  }

  try {
    // NC/RC are internal coin currencies — map to region's fiat currency (1 NC = 1 fiat unit)
    // Frontend sends fiatCurrency in metadata from its RegionContext
    const regionCurrency = metadata?.fiatCurrency || process.env.PLATFORM_CURRENCY || 'AED';
    const fiatCurrency = (currency === 'NC' || currency === 'RC') ? regionCurrency : (currency || regionCurrency);

    // Reject if the requested gateway isn't configured
    if (!paymentGatewayService.isGatewayConfigured(paymentMethod)) {
      return sendBadRequest(res, `Payment gateway '${paymentMethod}' is not configured. Please choose a different payment method.`);
    }

    // For wallet topup, apply recharge discount (pay less, get full NC)
    let chargeAmount = Number(amount);
    let creditAmount = Number(amount); // NC to credit to wallet
    if (purpose === 'wallet_topup') {
      try {
        const { WalletConfig } = require('../models/WalletConfig');
        const config = await WalletConfig.getOrCreate();
        if (config.rechargeConfig.isEnabled) {
          const sortedTiers = [...config.rechargeConfig.tiers].sort((a: any, b: any) => b.minAmount - a.minAmount);
          const applicableTier = sortedTiers.find((t: any) => creditAmount >= t.minAmount);
          if (applicableTier) {
            const rawDiscount = Math.floor(creditAmount * applicableTier.cashbackPercentage / 100);
            const discount = Math.min(rawDiscount, config.rechargeConfig.maxCashback);
            chargeAmount = creditAmount - discount;
            console.log('💰 [PAYMENT] Recharge discount applied:', { creditAmount, discount, chargeAmount });
          }
        }
      } catch (e) {
        console.warn('⚠️ [PAYMENT] Failed to calculate discount, charging full amount');
      }
    }

    // Use payment gateway service
    const paymentData = {
      amount: chargeAmount,
      currency: fiatCurrency,
      paymentMethod: paymentMethod as 'stripe' | 'razorpay' | 'paypal',
      paymentMethodType: paymentMethodType as 'card' | 'upi' | 'wallet' | 'netbanking',
      userDetails: userDetails || {},
      metadata: { ...(metadata || {}), purpose: purpose || 'other', creditAmount },
      returnUrl,
      cancelUrl
    };

    const gatewayResponse = await paymentGatewayService.initiatePayment(paymentData, userId);

    console.log('✅ [PAYMENT] Payment initiated successfully:', gatewayResponse.paymentId);

    sendSuccess(res, gatewayResponse, 'Payment initiated successfully');
  } catch (error: any) {
    console.error('❌ [PAYMENT] Payment initiation failed:', error);
    sendError(res, sanitizeErrorMessage(error, 'Payment initiation failed'), 500);
  }
});

/**
 * @desc    Confirm payment after frontend Stripe.js confirmCardPayment succeeds
 *          Verifies with Stripe API, then credits wallet if purpose is wallet_topup
 * @route   POST /api/wallet/confirm-payment
 * @access  Private
 */
export const confirmPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { paymentIntentId } = req.body;

  if (!paymentIntentId) {
    return sendBadRequest(res, 'Payment intent ID is required');
  }

  console.log('💳 [PAYMENT] Confirming payment:', { userId, paymentIntentId });

  try {
    // Find the Payment record FIRST (before status check updates it)
    const { Payment } = require('../models/Payment');
    const payment = await Payment.findOne({
      $or: [
        { paymentId: paymentIntentId },
        { 'gatewayResponse.paymentIntentId': paymentIntentId }
      ]
    });

    if (!payment) {
      return sendError(res, 'Payment record not found', 404);
    }

    // Prevent double wallet credit — check if already processed
    if (payment.walletCredited) {
      console.log('ℹ️ [PAYMENT] Already credited, skipping:', paymentIntentId);
      return sendSuccess(res, { status: 'completed', alreadyProcessed: true }, 'Payment already confirmed');
    }

    // Verify with Stripe that the payment actually succeeded (don't trust frontend alone)
    const stripeStatus = await paymentGatewayService.checkPaymentStatus(
      paymentIntentId,
      'stripe',
      userId
    );

    if (stripeStatus.status !== 'completed') {
      return sendError(res, `Payment not completed. Status: ${stripeStatus.status}`, 400);
    }

    // Re-fetch payment (checkPaymentStatus may have updated it)
    const freshPayment = await Payment.findById(payment._id);

    // Credit wallet if this is a wallet topup
    const purpose = freshPayment.purpose || freshPayment.metadata?.purpose;
    if (purpose === 'wallet_topup') {
      await paymentGatewayService.creditWalletFromPayment(freshPayment);
      // Mark as credited to prevent double processing
      freshPayment.walletCredited = true;
      await freshPayment.save();
      console.log('✅ [PAYMENT] Wallet credited for confirmed payment:', paymentIntentId);
    }

    sendSuccess(res, { status: 'completed' }, 'Payment confirmed and processed');
  } catch (error: any) {
    console.error('❌ [PAYMENT] Confirm payment failed:', error);
    sendError(res, sanitizeErrorMessage(error, 'Failed to confirm payment'), 500);
  }
});

/**
 * @desc    Check payment status
 * @route   GET /api/wallet/payment-status/:paymentId
 * @access  Private
 */
export const checkPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { paymentId } = req.params;
  const { gateway } = req.query;

  console.log('💳 [PAYMENT] Checking payment status:', { userId, paymentId, gateway });

  if (!paymentId) {
    return sendBadRequest(res, 'Payment ID is required');
  }

  if (!gateway) {
    return sendBadRequest(res, 'Payment gateway is required');
  }

  try {
    // Use payment gateway service to check status
    const paymentStatus = await paymentGatewayService.checkPaymentStatus(
      paymentId,
      gateway as string,
      userId
    );

    console.log('✅ [PAYMENT] Payment status retrieved:', paymentStatus);

    sendSuccess(res, paymentStatus, 'Payment status retrieved successfully');
  } catch (error: any) {
    console.error('❌ [PAYMENT] Status check failed:', error);
    sendError(res, sanitizeErrorMessage(error, 'Failed to check payment status'), 500);
  }
});

/**
 * @desc    Get available payment methods
 * @route   GET /api/wallet/payment-methods
 * @access  Private
 */
export const getPaymentMethods = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const defaultCurrency = process.env.PLATFORM_CURRENCY || 'AED';
  const { currency: rawCurrency = defaultCurrency, fiatCurrency: regionFiat } = req.query;

  // NC/RC are internal coin currencies — use region's fiat currency from frontend, or env default
  const resolvedCurrency = (regionFiat as string) || defaultCurrency;
  const fiatCurrency = (rawCurrency === 'NC' || rawCurrency === 'RC') ? resolvedCurrency : rawCurrency as string;

  console.log('💳 [PAYMENT] Fetching payment methods for user:', userId, 'currency:', fiatCurrency);

  try {
    // Method display config
    const methodInfo: Record<string, { name: string; icon: string; processingTime: string }> = {
      upi: { name: 'UPI', icon: '📱', processingTime: 'Instant' },
      card: { name: 'Debit/Credit Card', icon: '💳', processingTime: '2-3 minutes' },
      wallet: { name: 'Digital Wallet', icon: '👛', processingTime: 'Instant' },
      netbanking: { name: 'Net Banking', icon: '🏦', processingTime: '5-10 minutes' },
      paypal: { name: 'PayPal', icon: '🅿️', processingTime: '2-5 minutes' },
    };

    // Gateway priority: prefer Razorpay for INR, Stripe for international, PayPal as fallback
    const gatewayPriority = fiatCurrency === 'INR'
      ? ['razorpay', 'stripe', 'paypal']
      : ['stripe', 'paypal', 'razorpay'];

    // Collect all available methods per gateway (only if credentials are configured)
    const gatewayMethods: Record<string, { gateway: string; methods: string[]; fee: Record<string, number> }> = {};

    if (paymentGatewayService.isGatewayConfigured('stripe') &&
        paymentGatewayService.getSupportedCurrencies('stripe').includes(fiatCurrency)) {
      gatewayMethods['stripe'] = {
        gateway: 'stripe',
        methods: paymentGatewayService.getAvailablePaymentMethods('stripe', fiatCurrency),
        fee: { card: 2.9 }
      };
    }

    if (fiatCurrency === 'INR' && paymentGatewayService.isGatewayConfigured('razorpay')) {
      gatewayMethods['razorpay'] = {
        gateway: 'razorpay',
        methods: paymentGatewayService.getAvailablePaymentMethods('razorpay', fiatCurrency),
        fee: { card: 2.0 }
      };
    }

    if (paymentGatewayService.isGatewayConfigured('paypal') &&
        paymentGatewayService.getSupportedCurrencies('paypal').includes(fiatCurrency)) {
      gatewayMethods['paypal'] = {
        gateway: 'paypal',
        methods: paymentGatewayService.getAvailablePaymentMethods('paypal', fiatCurrency),
        fee: { card: 3.4, paypal: 2.9 }
      };
    }

    // Deduplicate: one entry per method type, pick the highest-priority gateway
    const seen = new Set<string>();
    const paymentMethods: any[] = [];

    for (const gw of gatewayPriority) {
      const entry = gatewayMethods[gw];
      if (!entry) continue;

      for (const method of entry.methods) {
        if (seen.has(method)) continue;
        seen.add(method);

        const info = methodInfo[method] || { name: method, icon: '💰', processingTime: 'Varies' };
        paymentMethods.push({
          id: `${gw}_${method}`,
          name: info.name,
          type: method,
          gateway: gw,
          icon: info.icon,
          isAvailable: true,
          processingFee: entry.fee[method] ?? 0,
          processingTime: info.processingTime,
          description: `Pay using ${info.name}`,
        });
      }
    }

    console.log('✅ [PAYMENT] Payment methods retrieved:', paymentMethods.length);

    sendSuccess(res, paymentMethods, 'Payment methods retrieved successfully');
  } catch (error: any) {
    console.error('❌ [PAYMENT] Failed to fetch payment methods:', error);
    sendError(res, 'Failed to fetch payment methods', 500);
  }
});

/**
 * @desc    Handle payment gateway webhooks
 * @route   POST /api/wallet/webhook/:gateway
 * @access  Public
 */
export const handlePaymentWebhook = asyncHandler(async (req: Request, res: Response) => {
  const { gateway } = req.params;
  const signature = req.headers['stripe-signature'] || req.headers['x-razorpay-signature'] || req.headers['paypal-signature'] || '';

  console.log('🔔 [PAYMENT WEBHOOK] Received webhook:', { gateway, signature });

  try {
    const result = await paymentGatewayService.handleWebhook(gateway, req.body, signature as string);

    if (result.success) {
      res.status(200).json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('❌ [PAYMENT WEBHOOK] Webhook processing failed:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

/**
 * @desc    Add test funds to wallet (DEVELOPMENT ONLY)
 * @route   POST /api/wallet/dev-topup
 * @access  Private
 */
export const devTopup = asyncHandler(async (req: Request, res: Response) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
    return sendError(res, 'This endpoint is only available in development', 403);
  }

  const userId = (req as any).userId;
  const { amount = 1000, type = 'rez' } = req.body;

  // Validate dev topup inputs
  const devAmount = Number(amount);
  if (!Number.isFinite(devAmount) || devAmount <= 0 || devAmount > 100000) {
    return sendBadRequest(res, 'Dev topup amount must be between 1 and 100,000');
  }
  if (!['rez', 'promo', 'cashback'].includes(type)) {
    return sendBadRequest(res, 'Invalid coin type. Must be rez, promo, or cashback');
  }

  console.log('🧪 [DEV TOPUP] Adding test funds:', { userId, amount: devAmount, type });

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  try {
    let wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
    }

    if (!wallet) {
      return sendError(res, 'Failed to create wallet', 500);
    }

    // Add to appropriate coin type
    if (type === 'promo') {
      const promoCoin = wallet.coins.find((c: any) => c.type === 'promo');
      if (promoCoin) {
        promoCoin.amount += devAmount;
      }
    } else if (type === 'cashback') {
      wallet.balance.cashback = (wallet.balance.cashback || 0) + devAmount;
    } else {
      // Default to ReZ Coins
      const rezCoin = wallet.coins.find((c: any) => c.type === 'rez');
      if (rezCoin) {
        rezCoin.amount += devAmount;
      }
      wallet.balance.available = (wallet.balance.available || 0) + devAmount;
    }

    wallet.balance.total = (wallet.balance.total || 0) + devAmount;
    await wallet.save();

    console.log('✅ [DEV TOPUP] Test funds added:', wallet.balance);

    sendSuccess(res, {
      wallet: {
        balance: wallet.balance,
        coins: wallet.coins,
        currency: wallet.currency
      },
      addedAmount: devAmount,
      type: type
    }, `Test ${type} funds added successfully`);
  } catch (error: any) {
    console.error('❌ [DEV TOPUP] Error:', error);
    sendError(res, sanitizeErrorMessage(error, 'Failed to add test funds'), 500);
  }
});

/**
 * @desc    Sync wallet balance from CoinTransaction (fixes discrepancies)
 * @route   POST /api/wallet/sync-balance
 * @access  Private
 */
export const syncWalletBalance = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  console.log('🔄 [WALLET SYNC] Syncing wallet balance from CoinTransaction');

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  try {
    // Import CoinTransaction to get the true balance
    const { CoinTransaction } = require('../models/CoinTransaction');
    const userObjId = new mongoose.Types.ObjectId(userId);

    // Use aggregation (sum earned - spent) for accurate balance, excluding branded awards
    const result = await CoinTransaction.aggregate([
      { $match: { user: userObjId } },
      {
        $group: {
          _id: null,
          earned: {
            $sum: {
              $cond: [
                { $and: [
                  { $in: ['$type', ['earned', 'refunded', 'bonus']] },
                  { $ne: ['$source', 'merchant_award'] }
                ]},
                '$amount',
                0
              ]
            }
          },
          spent: {
            $sum: {
              $cond: [{ $in: ['$type', ['spent', 'expired']] }, '$amount', 0]
            }
          }
        }
      }
    ]);
    const actualRezBalance = Math.max(0, (result[0]?.earned || 0) - (result[0]?.spent || 0));

    // Update computed balance cache
    await redisService.set(`wallet:computed_balance:${userId}`, actualRezBalance, 120);

    console.log('📊 [WALLET SYNC] Aggregated balance — earned:', result[0]?.earned || 0, 'spent:', result[0]?.spent || 0, 'actual ReZ:', actualRezBalance);

    // Get or create wallet
    let wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
    }

    if (!wallet) {
      return sendError(res, 'Failed to create wallet', 500);
    }

    const oldBalance = wallet.balance.available;

    // Update ReZ coins in the coins array (branded coins tracked separately)
    const rezCoin = wallet.coins.find((c: any) => c.type === 'rez');
    if (rezCoin) {
      rezCoin.amount = actualRezBalance;
      rezCoin.lastUsed = new Date();
    }

    // Update wallet balance to match (ReZ only, branded tracked separately)
    wallet.balance.available = actualRezBalance;
    wallet.balance.total = actualRezBalance + (wallet.balance.pending || 0) + (wallet.balance.cashback || 0);

    await wallet.save();

    console.log(`✅ [WALLET SYNC] Balance synced: ${oldBalance} → ${actualRezBalance}`);

    sendSuccess(res, {
      previousBalance: oldBalance,
      newBalance: actualRezBalance,
      wallet: {
        balance: wallet.balance,
        coins: wallet.coins,
        currency: wallet.currency
      },
      synced: true
    }, 'Wallet balance synced successfully');
  } catch (error: any) {
    console.error('❌ [WALLET SYNC] Error:', error);
    sendError(res, sanitizeErrorMessage(error, 'Failed to sync wallet balance'), 500);
  }
});

/**
 * @desc    Refund a wallet payment (used when order creation fails after payment)
 * @route   POST /api/wallet/refund
 * @access  Private
 */
export const refundPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { transactionId, amount, reason } = req.body;

  console.log('💸 [WALLET REFUND] Processing refund:', { transactionId, amount, reason });

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  if (!transactionId) {
    return sendBadRequest(res, 'Transaction ID is required');
  }
  const refundAmountCheck = validateAmount(amount, { fieldName: 'Refund amount' });
  if (!refundAmountCheck.valid) return sendBadRequest(res, refundAmountCheck.error);
  const refundAmount = refundAmountCheck.amount;

  // Start a MongoDB session for atomic operation
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the original transaction
    const originalTransaction = await Transaction.findOne({
      transactionId,
      user: userId,
      type: 'debit',
    }).session(session);

    if (!originalTransaction) {
      await session.abortTransaction();
      session.endSession();
      return sendNotFound(res, 'Original transaction not found');
    }

    // Validate amount doesn't exceed original transaction
    if (refundAmount > originalTransaction.amount) {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, `Refund amount cannot exceed original transaction amount of ${originalTransaction.amount} NC`);
    }

    // Check if already refunded
    if (originalTransaction.status.current === 'reversed') {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, 'Transaction has already been refunded');
    }

    // Get user's wallet
    const wallet = await Wallet.findOne({ user: userId }).session(session);

    if (!wallet) {
      await session.abortTransaction();
      session.endSession();
      return sendNotFound(res, 'Wallet not found');
    }

    // Credit the refund amount back to wallet
    const rezCoin = wallet.coins.find((c: any) => c.type === 'rez');
    if (rezCoin) {
      rezCoin.amount += refundAmount;
    }

    wallet.balance.available += refundAmount;
    wallet.balance.total += refundAmount;
    wallet.statistics.totalRefunds += refundAmount;
    wallet.lastTransactionAt = new Date();

    await wallet.save({ session });

    // Create refund transaction record
    const refundTransaction = await Transaction.create([{
      user: userId,
      type: 'credit',
      category: 'refund',
      amount: refundAmount,
      balanceBefore: wallet.balance.available - refundAmount,
      balanceAfter: wallet.balance.available,
      description: `Refund for transaction ${transactionId}: ${reason || 'Order creation failed'}`,
      source: {
        type: 'refund',
        reference: originalTransaction._id,
        description: reason || 'Order creation failed',
        metadata: {
          originalTransactionId: transactionId,
          refundReason: reason,
        },
      },
      status: {
        current: 'completed',
        history: [{
          status: 'completed',
          timestamp: new Date(),
          reason: 'Automatic refund',
        }],
      },
      isReversible: false,
      retryCount: 0,
      maxRetries: 0,
    }], { session });

    // Mark original transaction as reversed
    originalTransaction.status.current = 'reversed';
    originalTransaction.status.history.push({
      status: 'reversed',
      timestamp: new Date(),
      reason: reason || 'Refund processed',
    });
    originalTransaction.reversedAt = new Date();
    originalTransaction.reversalReason = reason || 'Order creation failed';
    originalTransaction.reversalTransactionId = (refundTransaction[0] as any)._id.toString();

    await originalTransaction.save({ session });

    // Create CoinTransaction (source of truth for auto-sync)
    await CoinTransaction.create([{
      user: userId,
      type: 'refunded',
      amount: refundAmount,
      balance: wallet.balance.available,
      source: 'order',
      description: `Refund for transaction ${transactionId}: ${reason || 'Order creation failed'}`,
      metadata: { originalTransactionId: transactionId, refundReason: reason }
    }], { session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ [WALLET REFUND] Refund processed successfully:', {
      refundId: (refundTransaction[0] as any)._id,
      amount: refundAmount,
    });

    // Structured monitoring log for order-creation-failed refunds
    if (reason === 'order_creation_failed') {
      console.warn(`⚠️ [WALLET_REFUND_ORDER_FAILED] userId=${userId} txnId=${transactionId} amount=${refundAmount} refundId=${(refundTransaction[0] as any)._id}`);
    }

    sendSuccess(res, {
      refundId: (refundTransaction[0] as any)._id.toString(),
      refundedAmount: refundAmount,
      wallet: {
        balance: {
          total: wallet.balance.total,
          available: wallet.balance.available,
          pending: wallet.balance.pending,
        },
      },
      status: 'success',
    }, 'Refund processed successfully');

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ [WALLET REFUND] Error:', error);
    sendError(res, sanitizeErrorMessage(error, 'Failed to process refund'), 500);
  }
});

/**
 * @desc    Get expiring coins grouped by time period
 * @route   GET /api/wallet/expiring-coins
 * @access  Private
 */
export const getExpiringCoins = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);

  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  const endOfMonth = new Date(now);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  const endOfNextMonth = new Date(now);
  endOfNextMonth.setMonth(endOfNextMonth.getMonth() + 2);

  const { CoinTransaction } = require('../models/CoinTransaction');

  // Query earned coins that have expiry dates and haven't been spent/expired yet
  const expiringCoins = await CoinTransaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        type: 'earned',
        expiresAt: { $exists: true, $gt: now }
      }
    },
    {
      $addFields: {
        period: {
          $cond: [
            { $lte: ['$expiresAt', endOfWeek] },
            'this_week',
            {
              $cond: [
                { $lte: ['$expiresAt', endOfMonth] },
                'this_month',
                'next_month'
              ]
            }
          ]
        },
        daysLeft: {
          $ceil: {
            $divide: [
              { $subtract: ['$expiresAt', now] },
              86400000 // ms per day
            ]
          }
        }
      }
    },
    {
      $group: {
        _id: '$period',
        totalAmount: { $sum: '$amount' },
        coins: {
          $push: {
            id: '$_id',
            amount: '$amount',
            source: '$source',
            description: '$description',
            expiresAt: '$expiresAt',
            daysLeft: '$daysLeft',
            category: '$category'
          }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Also check promo coins from wallet
  const wallet = await Wallet.findOne({ user: userId });
  const promoCoin = wallet?.coins.find((c: any) => c.type === 'promo' && c.amount > 0);
  let promoExpiry = null;
  if (promoCoin?.promoDetails?.expiryDate || promoCoin?.expiryDate) {
    const expDate = new Date(promoCoin.promoDetails?.expiryDate || promoCoin.expiryDate!);
    if (expDate > now) {
      const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / 86400000);
      promoExpiry = {
        type: 'promo',
        amount: promoCoin.amount,
        expiresAt: expDate,
        daysLeft,
        period: daysLeft <= 7 ? 'this_week' : daysLeft <= 30 ? 'this_month' : 'next_month'
      };
    }
  }

  const result: Record<string, any> = {
    this_week: { totalAmount: 0, coins: [], count: 0 },
    this_month: { totalAmount: 0, coins: [], count: 0 },
    next_month: { totalAmount: 0, coins: [], count: 0 },
  };

  for (const group of expiringCoins) {
    if (result[group._id]) {
      result[group._id] = {
        totalAmount: group.totalAmount,
        coins: group.coins.slice(0, 20), // Limit to 20 per group
        count: group.count
      };
    }
  }

  // Add promo coin to appropriate group
  if (promoExpiry) {
    result[promoExpiry.period].coins.unshift(promoExpiry);
    result[promoExpiry.period].totalAmount += promoExpiry.amount;
    result[promoExpiry.period].count += 1;
  }

  sendSuccess(res, {
    expiringCoins: result,
    totalExpiring: Object.values(result).reduce((sum: number, g: any) => sum + g.totalAmount, 0)
  }, 'Expiring coins retrieved');
});

/**
 * @desc    Preview recharge cashback
 * @route   GET /api/wallet/recharge/preview
 * @access  Private
 */
export const previewRechargeCashback = asyncHandler(async (req: Request, res: Response) => {
  const { amount } = req.query;
  const rechargeAmount = Number(amount);

  if (!rechargeAmount || rechargeAmount <= 0) {
    return sendBadRequest(res, 'Valid recharge amount required');
  }

  const { WalletConfig } = require('../models/WalletConfig');
  const config = await WalletConfig.getOrCreate();

  if (!config.rechargeConfig.isEnabled) {
    return sendSuccess(res, {
      rechargeAmount, discountPercentage: 0, discountAmount: 0, payableAmount: rechargeAmount,
      cashback: 0, cashbackPercentage: 0, message: 'Recharge discount currently disabled'
    });
  }

  if (rechargeAmount < config.rechargeConfig.minRecharge) {
    return sendBadRequest(res, `Minimum recharge amount is ${config.rechargeConfig.minRecharge} NC`);
  }

  // Find applicable tier (highest tier that rechargeAmount qualifies for)
  const sortedTiers = [...config.rechargeConfig.tiers].sort((a: any, b: any) => b.minAmount - a.minAmount);
  const applicableTier = sortedTiers.find((t: any) => rechargeAmount >= t.minAmount);

  if (!applicableTier) {
    return sendSuccess(res, {
      rechargeAmount, discountPercentage: 0, discountAmount: 0, payableAmount: rechargeAmount,
      cashback: 0, cashbackPercentage: 0, message: 'Amount below minimum tier'
    });
  }

  const percentage = applicableTier.cashbackPercentage;
  const rawDiscount = Math.floor(rechargeAmount * percentage / 100);
  const discountAmount = Math.min(rawDiscount, config.rechargeConfig.maxCashback);
  const payableAmount = rechargeAmount - discountAmount;

  sendSuccess(res, {
    rechargeAmount,
    discountPercentage: percentage,
    discountAmount,
    payableAmount,
    // Keep legacy fields for backward compatibility
    cashbackPercentage: percentage,
    cashback: discountAmount,
    maxCashback: config.rechargeConfig.maxCashback,
    cappedAt: rawDiscount > config.rechargeConfig.maxCashback ? config.rechargeConfig.maxCashback : null,
  }, 'Recharge preview calculated');
});

/**
 * @desc    Get scheduled drops for user (CoinDrops + SurpriseCoinDrops + daily login)
 * @route   GET /api/wallet/scheduled-drops
 * @access  Private
 */
export const getScheduledDrops = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);

  const CoinDrop = require('../models/CoinDrop').default;
  const { SurpriseCoinDrop } = require('../models/SurpriseCoinDrop');
  const { CoinTransaction } = require('../models/CoinTransaction');

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // 1. Active CoinDrops (boosted cashback at stores)
  const coinDrops = await CoinDrop.find({
    isActive: true,
    endTime: { $gte: now },
  })
    .sort({ priority: -1, multiplier: -1 })
    .limit(20)
    .lean();

  // 2. Unclaimed SurpriseCoinDrops for this user
  const surpriseDrops = await SurpriseCoinDrop.find({
    userId: new mongoose.Types.ObjectId(userId),
    status: 'available',
    expiresAt: { $gte: now },
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // 3. Check daily login eligibility
  const dailyLoginToday = await CoinTransaction.findOne({
    user: new mongoose.Types.ObjectId(userId),
    source: 'daily_login',
    createdAt: { $gte: todayStart },
  }).lean();

  const drops = [];

  // Map CoinDrops
  for (const cd of coinDrops) {
    drops.push({
      id: String(cd._id),
      title: `${cd.storeName} Boost`,
      amount: cd.boostedCashback || Math.round(cd.normalCashback * cd.multiplier),
      type: 'cashback' as const,
      scheduledDate: cd.endTime,
      description: `${cd.multiplier}x cashback at ${cd.storeName}`,
      icon: 'flash-outline',
      source: 'coin_drop',
      claimable: false,
      storeLogo: cd.storeLogo,
    });
  }

  // Map SurpriseCoinDrops
  for (const sd of surpriseDrops) {
    drops.push({
      id: String(sd._id),
      title: sd.message || 'Surprise Coins!',
      amount: sd.coins,
      type: 'special' as const,
      scheduledDate: sd.expiresAt,
      description: sd.reason === 'daily_login' ? 'Daily reward' : `Surprise ${sd.reason} reward`,
      icon: 'gift-outline',
      source: 'surprise_drop',
      claimable: true,
    });
  }

  // Daily login entry
  drops.push({
    id: 'daily_login',
    title: 'Daily Login Bonus',
    amount: 5,
    type: 'daily' as const,
    scheduledDate: dailyLoginToday ? todayStart : now,
    description: dailyLoginToday ? 'Already claimed today' : 'Log in to claim',
    icon: 'calendar-outline',
    source: 'daily_login',
    claimable: !dailyLoginToday,
  });

  const totalUpcoming = drops.reduce((sum, d) => sum + (d.claimable ? d.amount : 0), 0);

  sendSuccess(res, { drops, totalUpcoming }, 'Scheduled drops retrieved');
});

/**
 * @desc    Get coin rules (dynamic, admin-configurable)
 * @route   GET /api/wallet/coin-rules
 * @access  Private
 */
export const getCoinRules = asyncHandler(async (req: Request, res: Response) => {
  const { WalletConfig } = require('../models/WalletConfig');
  const config = await WalletConfig.getOrCreate();
  sendSuccess(res, { coinRules: config.coinRules || {} }, 'Coin rules retrieved');
});