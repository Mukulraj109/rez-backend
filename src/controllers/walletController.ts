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
import { logger } from '../config/logger';
import { ledgerService } from '../services/ledgerService';
import { runFinancialTxn } from '../utils/financialTransactionWrapper';

/**
 * @swagger
 * /api/wallet/balance:
 *   get:
 *     summary: Get wallet balance
 *     description: Returns comprehensive wallet balance with breakdown, branded coins, promo coins, limits, and status.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WalletBalance'
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Rate limit exceeded
 */
export const getWalletBalance = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Get or create wallet (no .lean() — need .save() and .syncWithUser() for auto-sync)
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
  // Distributed lock prevents concurrent syncs from causing drift.
  const syncLockKey = `lock:wallet:sync:${userId}`;
  const syncLockToken = await redisService.acquireLock(syncLockKey, 10);
  if (syncLockToken) {
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

      const currentBalance = wallet.balance?.available || 0;
      const delta = actualRezBalance - currentBalance;
      if (Math.abs(delta) > 0.01) {
        // Atomic findOneAndUpdate instead of .save() to avoid race conditions
        await Wallet.findOneAndUpdate(
          { user: userId, 'coins.type': 'rez' },
          {
            $set: {
              'balance.available': actualRezBalance,
              'coins.$.amount': actualRezBalance,
              'coins.$.lastUsed': new Date(),
            },
          }
        );

        // Also sync to User model so profile page shows correct balance
        await wallet.syncWithUser();

        // Fire-and-forget corrective ledger entry
        const userAccountId = new mongoose.Types.ObjectId(userId);
        const platformAccountId = ledgerService.getPlatformAccountId('platform_float');
        if (delta > 0) {
          ledgerService.recordEntry({
            debitAccount: { type: 'platform_float', id: platformAccountId },
            creditAccount: { type: 'user_wallet', id: userAccountId },
            amount: delta,
            operationType: 'correction',
            referenceId: `auto-sync:${userId}:${Date.now()}`,
            referenceModel: 'WalletAutoSync',
            metadata: { description: `Auto-sync correction in getBalance` },
          }).catch(err => logger.error('Auto-sync ledger entry failed', err));
        } else {
          ledgerService.recordEntry({
            debitAccount: { type: 'user_wallet', id: userAccountId },
            creditAccount: { type: 'platform_float', id: platformAccountId },
            amount: Math.abs(delta),
            operationType: 'correction',
            referenceId: `auto-sync:${userId}:${Date.now()}`,
            referenceModel: 'WalletAutoSync',
            metadata: { description: `Auto-sync correction in getBalance` },
          }).catch(err => logger.error('Auto-sync ledger entry failed', err));
        }
      }
    } catch (syncError) {
      logger.error('⚠️ [WALLET] Auto-sync failed:', syncError);
      // Continue with existing wallet data if sync fails
    } finally {
      await redisService.releaseLock(syncLockKey, syncLockToken);
    }
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
    logger.error('⚠️ [WALLET] Insights computation failed:', insightsError);
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
        Object.entries(wallet.categoryBalances as any || {}).forEach(([key, val]: [string, any]) => {
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
 * @swagger
 * /api/wallet/credit-loyalty-points:
 *   post:
 *     summary: Credit loyalty coins to wallet
 *     description: Admin-only endpoint to credit coins to a user's wallet.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount of coins to credit
 *               source:
 *                 type: string
 *                 description: Source of the credit
 *               idempotencyKey:
 *                 type: string
 *                 description: Unique key to prevent duplicate credits
 *     responses:
 *       200:
 *         description: Coins credited successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid amount or validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 *       429:
 *         description: Rate limit exceeded
 */
export const creditLoyaltyPoints = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { amount, source, idempotencyKey } = req.body;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const amountCheck = validateAmount(amount, { fieldName: 'Loyalty points' });
  if (!amountCheck.valid) return sendBadRequest(res, amountCheck.error);
  const validatedAmount = amountCheck.amount;

  // Idempotency check — prevent duplicate credits on admin retry
  if (idempotencyKey) {
    const existingTx = await CoinTransaction.findOne({
      user: userId,
      'metadata.idempotencyKey': idempotencyKey,
    }).lean();
    if (existingTx) {
      const wallet = await Wallet.findOne({ user: userId }).lean();
      return sendSuccess(res, {
        wallet: wallet ? { balance: wallet.balance, coins: wallet.coins } : null,
        duplicate: true,
      }, 'Loyalty points already credited (duplicate request)');
    }
  }

  // Get or create wallet
  let wallet = await Wallet.findOne({ user: userId }).lean();

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

    logger.info('✅ [WALLET] Transaction created for loyalty points credit');
  } catch (txError) {
    logger.error('❌ [WALLET] Failed to create transaction:', txError);
  }

  // Create CoinTransaction (source of truth for auto-sync)
  try {
    const coinTx = await CoinTransaction.createTransaction(
      userId,
      'earned',
      validatedAmount,
      source?.type === 'admin' ? 'admin' : 'bonus',
      source?.description || 'Loyalty points credited',
      { loyaltySource: source?.type || 'loyalty_sync', reference: source?.reference }
    );
    logger.info('[WALLET] CoinTransaction created for loyalty points');

    // Create ledger entry (fire-and-forget)
    const userAcctId = new mongoose.Types.ObjectId(userId);
    const platformFloatId = ledgerService.getPlatformAccountId('platform_float');
    ledgerService.recordEntry({
      debitAccount: { type: 'platform_float', id: platformFloatId },
      creditAccount: { type: 'user_wallet', id: userAcctId },
      amount: validatedAmount,
      coinType: 'nuqta',
      operationType: source?.type === 'admin' ? 'admin_adjustment' : 'loyalty_credit',
      referenceId: String(coinTx._id),
      referenceModel: 'CoinTransaction',
      metadata: { description: source?.description || 'Loyalty points credited' },
    }).catch((err: any) => logger.error('[WALLET] Ledger entry failed for loyalty points:', err));
  } catch (ctxError) {
    logger.error('[WALLET] Failed to create CoinTransaction:', ctxError);
  }

  // Log activity
  try {
    await activityService.wallet.onMoneyAdded(
      new mongoose.Types.ObjectId(userId),
      amount
    );
  } catch (activityError) {
    logger.error('❌ [WALLET] Failed to log activity:', activityError);
  }

  logger.info('✅ [WALLET] Loyalty points credited successfully:', {
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
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     summary: Get paginated transaction history
 *     description: Returns a paginated list of wallet transactions with filtering options.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by transaction type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *         description: Minimum amount filter
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *         description: Maximum amount filter
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TransactionItem'
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Rate limit exceeded
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
 * @swagger
 * /api/wallet/transaction/{id}:
 *   get:
 *     summary: Get single transaction details
 *     description: Returns details of a specific transaction by ID.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/TransactionItem'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Transaction not found
 *       429:
 *         description: Rate limit exceeded
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
  }).populate('source.reference').lean();

  if (!transaction) {
    return sendNotFound(res, 'Transaction not found');
  }

  sendSuccess(res, { transaction }, 'Transaction details retrieved successfully');
});

/**
 * @swagger
 * /api/wallet/topup:
 *   post:
 *     summary: Admin wallet topup
 *     description: Admin-only endpoint to top up a user's wallet.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to top up
 *               paymentMethod:
 *                 type: string
 *                 description: Payment method used
 *               paymentId:
 *                 type: string
 *                 description: External payment ID
 *     responses:
 *       200:
 *         description: Wallet topped up successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid amount
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 *       429:
 *         description: Rate limit exceeded
 */
export const topupWallet = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { amount, paymentMethod, paymentId } = req.body;

  logger.info('💰 [TOPUP] Starting wallet topup');
  logger.info('💰 [TOPUP] User ID:', userId);
  logger.info('💰 [TOPUP] Amount:', amount);
  logger.info('💰 [TOPUP] Payment Method:', paymentMethod);

  if (!userId) {
    logger.error('❌ [TOPUP] No user ID found');
    return sendError(res, 'User not authenticated', 401);
  }

  // Validate amount
  const topupAmountCheck = validateAmount(amount, { fieldName: 'Topup amount' });
  if (!topupAmountCheck.valid) {
    logger.error('❌ [TOPUP] Invalid amount:', amount);
    return sendBadRequest(res, topupAmountCheck.error);
  }
  const topupAmount = topupAmountCheck.amount;

  // Get wallet
  logger.info('🔍 [TOPUP] Finding wallet for user:', userId);
  let wallet = await Wallet.findOne({ user: userId }).lean();

  if (!wallet) {
    logger.info('🆕 [TOPUP] Wallet not found, creating new wallet');
    wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
  }

  if (!wallet) {
    logger.error('❌ [TOPUP] Failed to create wallet');
    return sendError(res, 'Failed to create wallet', 500);
  }

  logger.info('✅ [TOPUP] Wallet found/created:', wallet._id);
  logger.info('💵 [TOPUP] Current balance:', wallet.balance.total);

  // Check if wallet is frozen
  if (wallet.isFrozen) {
    logger.error('❌ [TOPUP] Wallet is frozen:', wallet.frozenReason);
    return sendError(res, `Wallet is frozen: ${wallet.frozenReason}`, 403);
  }

  // Check max balance limit
  if (wallet.balance.total + amount > wallet.limits.maxBalance) {
    logger.error('❌ [TOPUP] Max balance limit would be exceeded');
    return sendBadRequest(res, `Maximum wallet balance limit (${wallet.limits.maxBalance} RC) would be exceeded`);
  }

  // Get current balance for transaction record
  const balanceBefore = wallet.balance.total;

  logger.info('📝 [TOPUP] Creating transaction record');
  logger.info('📝 [TOPUP] Wallet ID for reference:', wallet._id);
  logger.info('📝 [TOPUP] Wallet ID type:', typeof wallet._id);

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

    logger.info('💾 [TOPUP] Saving transaction');
    await transaction.save();
    logger.info('✅ [TOPUP] Transaction saved:', transaction._id);

    // Add funds via walletService (atomic $inc + CoinTransaction + LedgerEntry)
    logger.info('💰 [TOPUP] Adding funds to wallet');
    const { walletService } = await import('../services/walletService');
    await walletService.credit({
      userId,
      amount: topupAmount,
      source: 'recharge',
      description: `Wallet topup via ${paymentMethod || 'Payment Gateway'}`,
      operationType: 'topup',
      referenceId: paymentId || `PAY_${Date.now()}`,
      referenceModel: 'Transaction',
      metadata: { paymentId: paymentId || `PAY_${Date.now()}`, paymentMethod: paymentMethod || 'gateway' },
    });
    // Refresh wallet for response
    wallet = await Wallet.findOne({ user: userId }).lean();
    logger.info('✅ [TOPUP] Funds added via walletService');

    // Create activity for wallet topup
    await activityService.wallet.onMoneyAdded(
      new mongoose.Types.ObjectId(userId),
      topupAmount
    );

    sendSuccess(res, {
      transaction,
      wallet: {
        balance: wallet?.balance || { total: 0, available: 0 },
        currency: wallet?.currency || 'RC',
      }
    }, 'Wallet topup successful', 201);
  } catch (error) {
    logger.error('❌ [TOPUP] Error creating transaction:', error);
    logger.error('❌ [TOPUP] Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
});

/**
 * @swagger
 * /api/wallet/withdraw:
 *   post:
 *     summary: Withdraw funds from wallet
 *     description: Withdraw funds from the wallet. Requires re-authentication and feature flag enabled.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - method
 *               - accountDetails
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to withdraw
 *               method:
 *                 type: string
 *                 description: Withdrawal method (e.g., bank_transfer)
 *               accountDetails:
 *                 type: object
 *                 description: Account details for the withdrawal
 *     responses:
 *       200:
 *         description: Withdrawal initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid amount or insufficient balance
 *       401:
 *         description: Not authenticated or re-auth required
 *       403:
 *         description: Wallet frozen or withdrawal feature disabled
 *       429:
 *         description: Rate limit exceeded
 */
export const withdrawFunds = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { amount, method, accountDetails } = req.body;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Validate amount using utility (prevents Infinity, NaN, excessive precision, etc.)
  const amtCheck = validateAmount(amount, { fieldName: 'Withdrawal amount' });
  if (!amtCheck.valid) {
    return sendBadRequest(res, amtCheck.error);
  }
  const validatedAmount = amtCheck.amount;

  // Validate method
  if (!method || !['bank', 'upi', 'paypal'].includes(method)) {
    return sendBadRequest(res, 'Invalid withdrawal method');
  }

  // Acquire per-user distributed lock to prevent double-spend race conditions
  const lockKey = `wallet:deduct:${userId}`;
  const lockToken = await redisService.acquireLock(lockKey, 10);
  if (!lockToken) {
    return sendError(res, 'Another transaction is in progress. Please try again.', 429);
  }

  try {
    // Get wallet
    const wallet = await Wallet.findOne({ user: userId }).lean();

    if (!wallet) {
      return sendNotFound(res, 'Wallet not found');
    }

    // Check if wallet is frozen
    if (wallet.isFrozen) {
      return sendError(res, `Wallet is frozen: ${wallet.frozenReason}`, 403);
    }

    // Check minimum withdrawal
    if (validatedAmount < wallet.limits.minWithdrawal) {
      return sendBadRequest(res, `Minimum withdrawal amount is ${wallet.limits.minWithdrawal} RC`);
    }

    // Check if sufficient balance
    if (wallet.balance.available < validatedAmount) {
      return sendBadRequest(res, 'Insufficient wallet balance');
    }

    // Calculate fees (2% withdrawal fee)
    const fees = Math.round(validatedAmount * 0.02);
    const netAmount = validatedAmount - fees;

    const balanceBefore = wallet.balance.total;

    // Wrap transaction save + wallet deduction in a MongoDB session for atomicity
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create withdrawal transaction
      const withdrawalId = `WD${Date.now()}`;
      const transaction = new Transaction({
        user: userId,
        type: 'debit',
        category: 'withdrawal',
        amount: validatedAmount,
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
        balanceAfter: balanceBefore - validatedAmount,
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

      await transaction.save({ session });

      // Deduct from wallet via walletService (atomic $inc + CoinTransaction + LedgerEntry)
      const { walletService } = await import('../services/walletService');
      await walletService.debit({
        userId,
        amount: validatedAmount,
        source: 'withdrawal',
        description: `Withdrawal via ${method}`,
        operationType: 'withdrawal',
        referenceId: withdrawalId,
        referenceModel: 'Transaction',
        metadata: { withdrawalId, method, fees, netAmount },
        session,
      });

      // Also update withdrawal statistics
      await Wallet.findOneAndUpdate(
        { _id: wallet._id },
        { $inc: { 'statistics.totalWithdrawn': validatedAmount } },
        { session },
      );

      await session.commitTransaction();
      session.endSession();

      sendSuccess(res, {
        transaction,
        withdrawalId,
        netAmount,
        fees,
        wallet: {
          balance: { ...wallet.balance, available: wallet.balance.available - validatedAmount, total: wallet.balance.total - validatedAmount },
          currency: wallet.currency
        },
        estimatedProcessingTime: '2-3 business days'
      }, 'Withdrawal request submitted successfully', 201);
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } finally {
    await redisService.releaseLock(lockKey, lockToken);
  }
});

/**
 * @swagger
 * /api/wallet/payment:
 *   post:
 *     summary: Process wallet payment
 *     description: Deducts coins from the wallet to process an order payment.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payment amount in coins
 *               orderId:
 *                 type: string
 *                 description: Associated order ID
 *               storeId:
 *                 type: string
 *                 description: Store ID
 *               storeName:
 *                 type: string
 *                 description: Store display name
 *               description:
 *                 type: string
 *                 description: Payment description
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: List of items in the order
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid amount or insufficient balance
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Wallet frozen
 *       429:
 *         description: Rate limit exceeded
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

  logger.info('💳 [PAYMENT] Starting payment processing');

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Idempotency check — prevent double-debit on retries
  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body.idempotencyKey;
  if (idempotencyKey) {
    const idemCacheKey = `wallet:payment:idem:${idempotencyKey}`;
    const cachedResult = await redisService.get<string>(idemCacheKey);
    if (cachedResult) {
      logger.info(`💳 [PAYMENT] Idempotency hit for key ${idempotencyKey}`);
      const parsed = JSON.parse(cachedResult);
      return sendSuccess(res, parsed.data, parsed.message, parsed.statusCode);
    }
  }

  // Validate amount
  const payAmountCheck = validateAmount(amount, { fieldName: 'Payment amount' });
  if (!payAmountCheck.valid) {
    return sendBadRequest(res, payAmountCheck.error);
  }
  const payAmount = payAmountCheck.amount;

  // Validate orderId ownership — prevent paying for someone else's order
  if (orderId) {
    const { Order } = await import('../models/Order');
    const order = await Order.findOne({ _id: orderId, user: userId }).lean();
    if (!order) {
      return sendBadRequest(res, 'Order not found or does not belong to you');
    }
  }

  // Acquire per-user distributed lock to prevent double-spend race conditions
  const lockKey = `wallet:deduct:${userId}`;
  const lockToken = await redisService.acquireLock(lockKey, 10);
  if (!lockToken) {
    return sendError(res, 'Another transaction is in progress. Please try again.', 429);
  }

  try {
    // Get wallet
    const wallet = await Wallet.findOne({ user: userId }).lean();

    if (!wallet) {
      return sendNotFound(res, 'Wallet not found');
    }

    // Check if wallet is frozen
    if (wallet.isFrozen) {
      return sendError(res, `Wallet is frozen: ${wallet.frozenReason}`, 403);
    }

    // Check if can spend
    if (!wallet.canSpend(payAmount)) {
      if (wallet.balance.available < payAmount) {
        return sendBadRequest(res, 'Insufficient wallet balance');
      } else {
        return sendBadRequest(res, 'Daily spending limit exceeded');
      }
    }

    const balanceBefore = wallet.balance.total;

    // Wrap transaction save + wallet deduction in a MongoDB session for atomicity
    const session = await mongoose.startSession();
    session.startTransaction();

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

      await transaction.save({ session });

      // Deduct via walletService (atomic $inc + CoinTransaction + LedgerEntry)
      const { walletService: ws } = await import('../services/walletService');
      await ws.debit({
        userId,
        amount: payAmount,
        source: 'order',
        description: description || `Payment for order ${orderId || 'N/A'}`,
        operationType: 'payment',
        referenceId: orderId || `PAY_${Date.now()}`,
        referenceModel: 'Transaction',
        metadata: { orderId, storeId, storeName },
        session,
      });

      const deductResult = await Wallet.findOne({ user: userId }).session(session).lean();

      if (!deductResult) {
        throw new Error('Wallet not found after deduction');
      }

      await session.commitTransaction();
      session.endSession();

      // Create activity for wallet spending
      await activityService.wallet.onMoneySpent(
        new mongoose.Types.ObjectId(userId),
        payAmount,
        storeName || 'order'
      );

      const responseData = {
        transaction,
        wallet: {
          balance: deductResult.balance,
          currency: deductResult.currency
        },
        paymentStatus: 'success'
      };

      // Cache idempotency result (24h TTL)
      if (idempotencyKey) {
        const idemCacheKey = `wallet:payment:idem:${idempotencyKey}`;
        await redisService.set(idemCacheKey, JSON.stringify({
          data: responseData,
          message: 'Payment processed successfully',
          statusCode: 201
        }), 24 * 60 * 60);
      }

      sendSuccess(res, responseData, 'Payment processed successfully', 201);
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } finally {
    await redisService.releaseLock(lockKey, lockToken);
  }
});

/**
 * @swagger
 * /api/wallet/summary:
 *   get:
 *     summary: Get transaction summary
 *     description: Returns aggregated transaction summary statistics for the given period.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *         description: Time period for the summary
 *     responses:
 *       200:
 *         description: Transaction summary retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Rate limit exceeded
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

  const wallet = await Wallet.findOne({ user: userId }).lean();

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
 * @swagger
 * /api/wallet/transaction-counts:
 *   get:
 *     summary: Get transaction counts by category
 *     description: Returns lightweight transaction counts grouped by category (no full data transfer).
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transaction counts retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Rate limit exceeded
 */
export const getTransactionCounts = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const userObjId = new mongoose.Types.ObjectId(userId);

  const counts = await Transaction.aggregate([
    { $match: { user: userObjId } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);

  const total = counts.reduce((sum: number, c: any) => sum + c.count, 0);
  const byCategory: Record<string, number> = { ALL: total };
  for (const c of counts) {
    if (c._id) byCategory[c._id] = c.count;
  }

  sendSuccess(res, { counts: byCategory, total }, 'Transaction counts retrieved');
});

/**
 * @swagger
 * /api/wallet/settings:
 *   put:
 *     summary: Update wallet settings
 *     description: Update user's wallet preferences such as auto-topup and low balance alerts.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               autoTopup:
 *                 type: boolean
 *                 description: Enable auto topup
 *               autoTopupThreshold:
 *                 type: number
 *                 description: Balance threshold to trigger auto topup
 *               autoTopupAmount:
 *                 type: number
 *                 description: Amount to auto topup
 *               lowBalanceAlert:
 *                 type: boolean
 *                 description: Enable low balance alerts
 *               lowBalanceThreshold:
 *                 type: number
 *                 description: Threshold for low balance alert
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
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

  const lockKey = `lock:wallet:settings:${userId}`;
  const lockToken = await redisService.acquireLock(lockKey, 5);

  try {
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
  } finally {
    if (lockToken) await redisService.releaseLock(lockKey, lockToken);
  }
});

/**
 * @swagger
 * /api/wallet/categories:
 *   get:
 *     summary: Get spending breakdown by category
 *     description: Returns wallet spending aggregated by transaction category.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories breakdown retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Rate limit exceeded
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
 * @swagger
 * /api/wallet/initiate-payment:
 *   post:
 *     summary: Initiate payment via gateway
 *     description: Initiates a payment through an external payment gateway (e.g., Stripe).
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - currency
 *               - paymentMethod
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               currency:
 *                 type: string
 *                 description: Currency code (e.g., AED, INR)
 *               paymentMethod:
 *                 type: string
 *                 description: Payment method identifier
 *               paymentMethodType:
 *                 type: string
 *                 description: Type of payment method (card, upi, etc.)
 *               purpose:
 *                 type: string
 *                 description: Purpose of payment (e.g., wallet_topup)
 *               userDetails:
 *                 type: object
 *                 description: User details for the payment gateway
 *               metadata:
 *                 type: object
 *                 description: Additional metadata for the payment (e.g., fiatCurrency)
 *               returnUrl:
 *                 type: string
 *                 description: URL to redirect after success
 *               cancelUrl:
 *                 type: string
 *                 description: URL to redirect on cancel
 *     responses:
 *       200:
 *         description: Payment initiated, returns client secret or redirect URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid payment parameters
 *       401:
 *         description: Not authenticated
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

  logger.info('💳 [PAYMENT] Initiating payment:', {
    userId,
    amount,
    currency,
    paymentMethod,
    paymentMethodType
  });

  // Validate amount using utility (prevents Infinity, NaN, excessive precision, etc.)
  const amtCheck = validateAmount(amount, { fieldName: 'Payment amount', min: 1 });
  if (!amtCheck.valid) {
    return sendBadRequest(res, amtCheck.error);
  }

  if (!paymentMethod) {
    return sendBadRequest(res, 'Payment method is required');
  }

  if (!paymentMethodType) {
    return sendBadRequest(res, 'Payment method type is required');
  }

  // Get user wallet
  const wallet = await Wallet.findOne({ user: userId }).lean();
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
    let chargeAmount = amtCheck.amount;
    let creditAmount = amtCheck.amount; // NC to credit to wallet
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
            logger.info('💰 [PAYMENT] Recharge discount applied:', { creditAmount, discount, chargeAmount });
          }
        }
      } catch (e) {
        logger.warn('⚠️ [PAYMENT] Failed to calculate discount, charging full amount');
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

    logger.info('✅ [PAYMENT] Payment initiated successfully:', gatewayResponse.paymentId);

    sendSuccess(res, gatewayResponse, 'Payment initiated successfully');
  } catch (error: any) {
    logger.error('❌ [PAYMENT] Payment initiation failed:', error);
    sendError(res, sanitizeErrorMessage(error, 'Payment initiation failed'), 500);
  }
});

/**
 * @swagger
 * /api/wallet/confirm-payment:
 *   post:
 *     summary: Confirm Stripe payment
 *     description: Confirms a Stripe payment after frontend confirmCardPayment succeeds. Verifies with Stripe API and credits wallet if purpose is wallet_topup.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *                 description: Stripe PaymentIntent ID
 *     responses:
 *       200:
 *         description: Payment confirmed and wallet credited
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid or failed payment intent
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Payment not found
 */
export const confirmPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { paymentIntentId } = req.body;

  if (!paymentIntentId) {
    return sendBadRequest(res, 'Payment intent ID is required');
  }

  logger.info('💳 [PAYMENT] Confirming payment:', { userId, paymentIntentId });

  try {
    // Find the Payment record FIRST (before status check updates it)
    // Include user ownership filter to prevent cross-user payment crediting
    const payment = await Payment.findOne({
      $or: [
        { paymentId: paymentIntentId },
        { 'gatewayResponse.paymentIntentId': paymentIntentId }
      ],
      user: new mongoose.Types.ObjectId(userId)
    }).lean();

    if (!payment) {
      return sendError(res, 'Payment record not found', 404);
    }

    // Prevent double wallet credit — check if already processed
    if (payment.walletCredited) {
      logger.info('ℹ️ [PAYMENT] Already credited, skipping:', paymentIntentId);
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
    const freshPayment = await Payment.findById(payment._id).lean();
    if (!freshPayment) {
      return sendError(res, 'Payment record not found after status check', 404);
    }

    // Credit wallet if this is a wallet topup
    const purpose = freshPayment.purpose || freshPayment.metadata?.purpose;
    if (purpose === 'wallet_topup') {
      await paymentGatewayService.creditWalletFromPayment(freshPayment);
      // Mark as credited to prevent double processing
      freshPayment.walletCredited = true;
      await freshPayment.save();
      logger.info('✅ [PAYMENT] Wallet credited for confirmed payment:', paymentIntentId);
    }

    sendSuccess(res, { status: 'completed' }, 'Payment confirmed and processed');
  } catch (error: any) {
    logger.error('❌ [PAYMENT] Confirm payment failed:', error);
    sendError(res, sanitizeErrorMessage(error, 'Failed to confirm payment'), 500);
  }
});

/**
 * @swagger
 * /api/wallet/payment-status/{paymentId}:
 *   get:
 *     summary: Check payment status
 *     description: Checks the current status of a payment by its ID.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID to check
 *       - in: query
 *         name: gateway
 *         schema:
 *           type: string
 *         description: Payment gateway name
 *     responses:
 *       200:
 *         description: Payment status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Payment not found
 *       429:
 *         description: Rate limit exceeded
 */
export const checkPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { paymentId } = req.params;
  const { gateway } = req.query;

  logger.info('💳 [PAYMENT] Checking payment status:', { userId, paymentId, gateway });

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

    logger.info('✅ [PAYMENT] Payment status retrieved:', paymentStatus);

    sendSuccess(res, paymentStatus, 'Payment status retrieved successfully');
  } catch (error: any) {
    logger.error('❌ [PAYMENT] Status check failed:', error);
    sendError(res, sanitizeErrorMessage(error, 'Failed to check payment status'), 500);
  }
});

/**
 * @swagger
 * /api/wallet/payment-methods:
 *   get:
 *     summary: List available payment methods
 *     description: Returns available payment methods based on currency and region.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *         description: Coin currency filter
 *       - in: query
 *         name: fiatCurrency
 *         schema:
 *           type: string
 *         description: Fiat currency filter (e.g., AED, INR)
 *     responses:
 *       200:
 *         description: Payment methods retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 */
export const getPaymentMethods = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const defaultCurrency = process.env.PLATFORM_CURRENCY || 'AED';
  const { currency: rawCurrency = defaultCurrency, fiatCurrency: regionFiat } = req.query;

  // NC/RC are internal coin currencies — use region's fiat currency from frontend, or env default
  const resolvedCurrency = (regionFiat as string) || defaultCurrency;
  const fiatCurrency = (rawCurrency === 'NC' || rawCurrency === 'RC') ? resolvedCurrency : rawCurrency as string;

  logger.info('💳 [PAYMENT] Fetching payment methods for user:', userId, 'currency:', fiatCurrency);

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

    logger.info('✅ [PAYMENT] Payment methods retrieved:', paymentMethods.length);

    sendSuccess(res, paymentMethods, 'Payment methods retrieved successfully');
  } catch (error: any) {
    logger.error('❌ [PAYMENT] Failed to fetch payment methods:', error);
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

  logger.info('🔔 [PAYMENT WEBHOOK] Received webhook:', { gateway, signature });

  try {
    const result = await paymentGatewayService.handleWebhook(gateway, req.body, signature as string);

    if (result.success) {
      res.status(200).json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error('❌ [PAYMENT WEBHOOK] Webhook processing failed:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

/**
 * @swagger
 * /api/wallet/dev-topup:
 *   post:
 *     summary: Dev-only wallet topup
 *     description: Adds test funds to the wallet. Only available in development environment.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - type
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to add
 *               type:
 *                 type: string
 *                 enum: [rez, promo, cashback]
 *                 description: Type of coins to add
 *     responses:
 *       200:
 *         description: Dev topup successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid amount or type
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not available in production
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

  logger.info('🧪 [DEV TOPUP] Adding test funds:', { userId, amount: devAmount, type });

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const lockKey = `lock:wallet:topup:${userId}`;
  const lockToken = await redisService.acquireLock(lockKey, 10);

  try {
    let wallet = await Wallet.findOne({ user: userId }).lean();

    if (!wallet) {
      wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
    }

    if (!wallet) {
      return sendError(res, 'Failed to create wallet', 500);
    }

    // Add to appropriate coin type via walletService (atomic $inc + CoinTransaction + LedgerEntry)
    const { walletService: devWalletService } = await import('../services/walletService');
    if (type === 'promo') {
      // Promo coins: direct wallet update (no CoinTransaction for promo type)
      await Wallet.findOneAndUpdate(
        { user: userId, 'coins.type': 'promo' },
        { $inc: { 'coins.$.amount': devAmount, 'balance.total': devAmount } }
      );
    } else if (type === 'cashback') {
      // Cashback: direct wallet update
      await Wallet.findOneAndUpdate(
        { user: userId },
        { $inc: { 'balance.cashback': devAmount, 'balance.total': devAmount } }
      );
    } else {
      // Default to ReZ Coins — use walletService.credit for proper ledger tracking
      await devWalletService.credit({
        userId: String(wallet.user),
        amount: devAmount,
        source: 'admin',
        description: 'Dev topup',
        operationType: 'topup',
        referenceId: `dev-topup:${wallet.user}:${Date.now()}`,
        referenceModel: 'DevTopup',
        metadata: { devTopup: true },
      });
    }

    // Re-fetch wallet for response
    wallet = await Wallet.findOne({ user: userId }).lean();

    logger.info('[DEV TOPUP] Test funds added:', wallet?.balance);

    sendSuccess(res, {
      wallet: {
        balance: wallet?.balance ?? { total: 0, available: 0 },
        coins: wallet?.coins ?? [],
        currency: wallet?.currency ?? 'RC'
      },
      addedAmount: devAmount,
      type: type
    }, `Test ${type} funds added successfully`);
  } catch (error: any) {
    logger.error('[DEV TOPUP] Error:', error);
    sendError(res, sanitizeErrorMessage(error, 'Failed to add test funds'), 500);
  } finally {
    if (lockToken) await redisService.releaseLock(lockKey, lockToken);
  }
});

/**
 * @swagger
 * /api/wallet/sync-balance:
 *   post:
 *     summary: Sync wallet balance
 *     description: Recalculates wallet balance from CoinTransaction records to fix any discrepancies. Rate limited to 1 request per hour.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Balance synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Rate limit exceeded (1 per hour)
 */
export const syncWalletBalance = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const lockKey = `lock:wallet:sync:${userId}`;
  const lockToken = await redisService.acquireLock(lockKey, 15);

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

    logger.info('📊 [WALLET SYNC] Aggregated balance — earned:', result[0]?.earned || 0, 'spent:', result[0]?.spent || 0, 'actual ReZ:', actualRezBalance);

    // Get or create wallet
    let wallet = await Wallet.findOne({ user: userId }).lean();

    if (!wallet) {
      wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
    }

    if (!wallet) {
      return sendError(res, 'Failed to create wallet', 500);
    }

    const oldBalance = wallet.balance.available || 0;
    const delta = actualRezBalance - oldBalance;

    if (Math.abs(delta) > 0.01) {
      await runFinancialTxn(async ({ session, recordLedger }) => {
        await Wallet.findOneAndUpdate(
          { user: userId },
          {
            $set: {
              'balance.available': actualRezBalance,
              'balance.total': actualRezBalance + (wallet!.balance.pending || 0) + (wallet!.balance.cashback || 0),
            },
          },
          { session }
        );

        // Also update ReZ coin amount in coins array
        await Wallet.findOneAndUpdate(
          { user: userId, 'coins.type': 'rez' },
          {
            $set: {
              'coins.$.amount': actualRezBalance,
              'coins.$.lastUsed': new Date(),
            },
          },
          { session }
        );

        const userAccountId = new mongoose.Types.ObjectId(userId);
        const platformAccountId = ledgerService.getPlatformAccountId('platform_float');

        if (delta > 0) {
          await recordLedger({
            debitAccount: { type: 'platform_float', id: platformAccountId },
            creditAccount: { type: 'user_wallet', id: userAccountId },
            amount: delta,
            operationType: 'correction',
            referenceId: `sync:${userId}:${Date.now()}`,
            referenceModel: 'WalletSync',
            metadata: { description: `Sync correction: ${oldBalance} -> ${actualRezBalance}` },
          });
        } else {
          await recordLedger({
            debitAccount: { type: 'user_wallet', id: userAccountId },
            creditAccount: { type: 'platform_float', id: platformAccountId },
            amount: Math.abs(delta),
            operationType: 'correction',
            referenceId: `sync:${userId}:${Date.now()}`,
            referenceModel: 'WalletSync',
            metadata: { description: `Sync correction: ${oldBalance} -> ${actualRezBalance}` },
          });
        }
      });
    }

    logger.info(`✅ [WALLET SYNC] Balance synced: ${oldBalance} → ${actualRezBalance}`);

    // Re-fetch wallet for accurate response
    const updatedSyncWallet = await Wallet.findOne({ user: userId }).lean();

    sendSuccess(res, {
      previousBalance: oldBalance,
      newBalance: actualRezBalance,
      wallet: {
        balance: updatedSyncWallet?.balance || wallet.balance,
        coins: updatedSyncWallet?.coins || wallet.coins,
        currency: updatedSyncWallet?.currency || wallet.currency
      },
      synced: true
    }, 'Wallet balance synced successfully');
  } catch (error: any) {
    logger.error('[WALLET SYNC] Error:', error);
    sendError(res, sanitizeErrorMessage(error, 'Failed to sync wallet balance'), 500);
  } finally {
    if (lockToken) await redisService.releaseLock(lockKey, lockToken);
  }
});

/**
 * @swagger
 * /api/wallet/refund:
 *   post:
 *     summary: Refund a wallet payment
 *     description: Admin-only endpoint to refund a wallet payment, typically when order creation fails after payment.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *               - amount
 *               - reason
 *             properties:
 *               transactionId:
 *                 type: string
 *                 description: Original transaction ID to refund
 *               amount:
 *                 type: number
 *                 description: Refund amount
 *               reason:
 *                 type: string
 *                 description: Reason for the refund
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid refund parameters
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Original transaction not found
 *       429:
 *         description: Rate limit exceeded
 */
export const refundPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { transactionId, amount, reason } = req.body;

  logger.info('💸 [WALLET REFUND] Processing refund:', { transactionId, amount, reason });

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
    }).session(session).lean();

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

    // Get user's wallet (check existence)
    const wallet = await Wallet.findOne({ user: userId }).session(session).lean();

    if (!wallet) {
      await session.abortTransaction();
      session.endSession();
      return sendNotFound(res, 'Wallet not found');
    }

    // Credit refund via walletService (atomic $inc + CoinTransaction + LedgerEntry)
    const { walletService } = await import('../services/walletService');
    await walletService.credit({
      userId,
      amount: refundAmount,
      source: 'order',
      description: `Refund for transaction ${transactionId}: ${reason || 'Order creation failed'}`,
      operationType: 'refund',
      referenceId: `refund:${transactionId}`,
      referenceModel: 'Transaction',
      metadata: { originalTransactionId: transactionId, refundReason: reason },
      session,
    });

    // Also update refund statistics atomically
    await Wallet.findOneAndUpdate(
      { _id: wallet._id },
      { $inc: { 'statistics.totalRefunds': refundAmount } },
      { session },
    );

    // Create refund Transaction display record
    const refundTransaction = await Transaction.create([{
      user: userId,
      type: 'credit',
      category: 'refund',
      amount: refundAmount,
      balanceBefore: wallet.balance.available,
      balanceAfter: wallet.balance.available + refundAmount,
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

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    logger.info('✅ [WALLET REFUND] Refund processed successfully:', {
      refundId: (refundTransaction[0] as any)._id,
      amount: refundAmount,
    });

    // Structured monitoring log for order-creation-failed refunds
    if (reason === 'order_creation_failed') {
      logger.warn(`⚠️ [WALLET_REFUND_ORDER_FAILED] userId=${userId} txnId=${transactionId} amount=${refundAmount} refundId=${(refundTransaction[0] as any)._id}`);
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
    logger.error('❌ [WALLET REFUND] Error:', error);
    sendError(res, sanitizeErrorMessage(error, 'Failed to process refund'), 500);
  }
});

/**
 * @swagger
 * /api/wallet/expiring-coins:
 *   get:
 *     summary: Get expiring coins
 *     description: Returns coins grouped by expiry time period (e.g., expiring this week, this month).
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expiring coins retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
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
  const wallet = await Wallet.findOne({ user: userId }).lean();
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
 * @swagger
 * /api/wallet/recharge/preview:
 *   get:
 *     summary: Preview recharge cashback
 *     description: Returns a preview of the cashback amount for a given recharge amount.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: amount
 *         required: true
 *         schema:
 *           type: number
 *         description: Recharge amount to preview cashback for
 *     responses:
 *       200:
 *         description: Cashback preview retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid amount
 *       401:
 *         description: Not authenticated
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
 * @swagger
 * /api/wallet/scheduled-drops:
 *   get:
 *     summary: Get scheduled coin drops
 *     description: Returns upcoming coin drops for the user, including CoinDrops, SurpriseCoinDrops, and daily login rewards.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduled drops retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
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
 * @swagger
 * /api/wallet/coin-rules:
 *   get:
 *     summary: Get coin usage and earning rules
 *     description: Returns dynamic, admin-configurable rules for coin usage and earning.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coin rules retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 */
export const getCoinRules = asyncHandler(async (req: Request, res: Response) => {
  const { WalletConfig } = require('../models/WalletConfig');
  const config = await WalletConfig.getOrCreate();
  sendSuccess(res, {
    coinRules: config.coinRules || {},
    coinExpiryConfig: config.coinExpiryConfig || {
      rez: { expiryDays: 0, maxUsagePct: 100 },
      prive: { expiryDays: 365, maxUsagePct: 100 },
      promo: { expiryDays: 90, maxUsagePct: 20 },
      branded: { expiryDays: 180, maxUsagePct: 100 },
    },
  }, 'Coin rules retrieved');
});