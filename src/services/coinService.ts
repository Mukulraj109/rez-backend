import { CoinTransaction, MainCategorySlug } from '../models/CoinTransaction';
import { Wallet } from '../models/Wallet';
import { UserLoyalty } from '../models/UserLoyalty';
import mongoose from 'mongoose';
import specialProgramService from './specialProgramService';

/**
 * Get user's current coin balance (global or category-specific)
 */
export async function getCoinBalance(userId: string, category?: MainCategorySlug): Promise<number> {
  if (category) {
    return getCategoryBalance(userId, category);
  }
  return await CoinTransaction.getUserBalance(userId);
}

/**
 * Get user's category-specific coin balance
 */
export async function getCategoryBalance(userId: string, category: MainCategorySlug): Promise<number> {
  const wallet = await Wallet.findOne({ user: userId }).lean();
  return wallet?.getCategoryBalance(category) || 0;
}

/**
 * Get all category balances for a user
 */
export async function getAllCategoryBalances(userId: string): Promise<Record<string, { available: number; earned: number; spent: number }>> {
  const wallet = await Wallet.findOne({ user: userId }).lean();
  const result: Record<string, { available: number; earned: number; spent: number }> = {};
  const categories: MainCategorySlug[] = ['food-dining', 'beauty-wellness', 'grocery-essentials', 'fitness-sports', 'healthcare', 'fashion', 'education-learning', 'home-services', 'travel-experiences', 'entertainment', 'financial-lifestyle', 'electronics'];

  for (const cat of categories) {
    const catBal = (wallet?.categoryBalances as any)?.[cat];
    result[cat] = {
      available: catBal?.available || 0,
      earned: catBal?.earned || 0,
      spent: catBal?.spent || 0
    };
  }

  return result;
}

/**
 * Get user's coin transaction history
 */
export async function getCoinTransactions(
  userId: string,
  options: {
    type?: string;
    source?: string;
    category?: MainCategorySlug | null;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ transactions: any[]; total: number; balance: number }> {
  const { type, source, category, limit = 20, offset = 0 } = options;

  const query: any = { user: userId };

  if (category) {
    query.category = category;
  }

  if (type) {
    query.type = type;
  }

  if (source) {
    query.source = source;
  }

  const [transactions, total, balance] = await Promise.all([
    CoinTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    CoinTransaction.countDocuments(query),
    getCoinBalance(userId)
  ]);

  return {
    transactions: transactions.map(t => ({
      id: t._id,
      type: t.type,
      amount: t.amount,
      balance: t.balance,
      source: t.source,
      description: t.description,
      metadata: t.metadata,
      createdAt: t.createdAt,
      displayAmount: t.type === 'spent' || t.type === 'expired' ? -t.amount : t.amount
    })),
    total,
    balance
  };
}

/**
 * Award coins to user (optionally to a specific MainCategory balance)
 */
export async function awardCoins(
  userId: string,
  amount: number,
  source: string,
  description: string,
  metadata?: any,
  category?: MainCategorySlug | null
): Promise<any> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  // Program cap enforcement (fail-open: if service fails, award proceeds)
  let adjustedAmount = amount;
  try {
    const capCheck = await specialProgramService.checkEarningCap(userId, amount, source);
    if (!capCheck.allowed && capCheck.adjustedAmount === 0) {
      return {
        transactionId: null,
        amount: 0,
        newBalance: await getCoinBalance(userId),
        source,
        description,
        category: category || null,
        cappedReason: capCheck.reason,
      };
    }
    adjustedAmount = capCheck.adjustedAmount;
  } catch (capError) {
    console.error('[COIN SERVICE] Program cap check failed (proceeding with original amount):', capError);
  }

  const transaction = await CoinTransaction.createTransaction(
    userId,
    'earned',
    adjustedAmount,
    source,
    description,
    metadata,
    category || null
  );

  // Also update the Wallet model to keep balances in sync (with retry)
  const updateWallet = async (retryCount = 0): Promise<void> => {
    try {
      let wallet = await Wallet.findOne({ user: userId }).lean();

      if (!wallet) {
        wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
      }

      if (wallet) {
        if (category) {
          await Wallet.findByIdAndUpdate(wallet._id, {
            $inc: {
              [`categoryBalances.${category}.available`]: adjustedAmount,
              [`categoryBalances.${category}.earned`]: adjustedAmount,
              'statistics.totalEarned': adjustedAmount,
              'balance.total': adjustedAmount
            },
            $set: { lastTransactionAt: new Date() }
          });
        } else {
          await Wallet.findOneAndUpdate(
            { _id: wallet._id, 'coins.type': 'rez' },
            {
              $inc: {
                'balance.available': adjustedAmount,
                'balance.total': adjustedAmount,
                'statistics.totalEarned': adjustedAmount,
                'coins.$.amount': adjustedAmount
              },
              $set: {
                'coins.$.lastUsed': new Date(),
                lastTransactionAt: new Date()
              }
            }
          );
        }
        console.log(`✅ [COIN SERVICE] Wallet updated atomically: +${adjustedAmount} coins${category ? ` (${category})` : ''}`);
      }
    } catch (walletError) {
      if (retryCount < 1) {
        console.warn(`⚠️ [COIN SERVICE] Wallet update failed, retrying (attempt ${retryCount + 1}):`, walletError);
        await updateWallet(retryCount + 1);
      } else {
        // Log structured data for reconciliation service to pick up
        console.error('❌ [COIN SERVICE] Wallet update failed after retry — reconciliation needed:', {
          userId, amount: adjustedAmount, source, category,
          transactionId: transaction._id?.toString(),
          error: (walletError as Error).message,
        });
      }
    }
  };
  await updateWallet();

  // Also update UserLoyalty categoryCoins if category is provided
  if (category) {
    try {
      const loyalty = await UserLoyalty.findOne({ userId });
      if (loyalty) {
        const catCoins = loyalty.categoryCoins?.get(category) || { available: 0, expiring: 0 };
        catCoins.available += adjustedAmount;
        if (!loyalty.categoryCoins) {
          (loyalty as any).categoryCoins = new Map();
        }
        loyalty.categoryCoins!.set(category, catCoins);
        loyalty.markModified('categoryCoins');
        await loyalty.save();
      }
    } catch (loyaltyError) {
      console.error('❌ [COIN SERVICE] Failed to update UserLoyalty categoryCoins:', loyaltyError);
    }
  }

  // Program multiplier bonus (fail-open: if bonus fails, base award still succeeded)
  let multiplierBonus = 0;
  try {
    const { bonus, programSlug, programBonuses } = await specialProgramService.calculateMultiplierBonus(userId, adjustedAmount, source);
    if (bonus > 0) {
      const slugLabel = programBonuses.map(pb => pb.slug).join('+');
      // Create separate bonus transaction for auditability
      await CoinTransaction.createTransaction(
        userId,
        'bonus',
        bonus,
        'program_multiplier_bonus',
        `${slugLabel} multiplier bonus on ${source}`,
        { originalTransactionId: transaction._id, programSlug: slugLabel, programBonuses },
        category || null
      );

      // Update Wallet with bonus
      try {
        const bonusWallet = await Wallet.findOne({ user: userId }).lean();
        if (bonusWallet) {
          if (category) {
            await Wallet.findByIdAndUpdate(bonusWallet._id, {
              $inc: {
                [`categoryBalances.${category}.available`]: bonus,
                [`categoryBalances.${category}.earned`]: bonus,
                'statistics.totalEarned': bonus,
                'balance.total': bonus,
              },
              $set: { lastTransactionAt: new Date() },
            });
          } else {
            await Wallet.findOneAndUpdate(
              { _id: bonusWallet._id, 'coins.type': 'rez' },
              {
                $inc: {
                  'balance.available': bonus,
                  'balance.total': bonus,
                  'statistics.totalEarned': bonus,
                  'coins.$.amount': bonus,
                },
                $set: { 'coins.$.lastUsed': new Date(), lastTransactionAt: new Date() },
              }
            );
          }
        }
      } catch (bonusWalletErr) {
        console.error('[COIN SERVICE] Failed to update wallet with multiplier bonus:', bonusWalletErr);
      }

      multiplierBonus = bonus;
      console.log(`✅ [COIN SERVICE] Multiplier bonus: +${bonus} coins (${slugLabel})`);

      // Track bonus per program in each membership
      for (const pb of programBonuses) {
        await specialProgramService.incrementMultiplierBonus(userId, pb.slug, pb.bonus).catch(() => {});
      }
    }

    // Track monthly earnings for active memberships
    await specialProgramService.incrementMonthlyEarnings(userId, adjustedAmount + multiplierBonus).catch(() => {});
  } catch (multiplierError) {
    console.error('[COIN SERVICE] Program multiplier calculation failed:', multiplierError);
  }

  return {
    transactionId: transaction._id,
    amount: transaction.amount,
    newBalance: transaction.balance,
    source: transaction.source,
    description: transaction.description,
    category: category || null,
    ...(multiplierBonus > 0 && { multiplierBonus }),
  };
}

/**
 * Deduct coins from user (optionally from a specific MainCategory balance)
 * If category is provided, deducts from category balance first, then falls back to global.
 */
export async function deductCoins(
  userId: string,
  amount: number,
  source: string,
  description: string,
  metadata?: any,
  category?: MainCategorySlug | null
): Promise<any> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  if (category) {
    // Check category-specific balance first
    const catBalance = await getCategoryBalance(userId, category);
    if (catBalance < amount) {
      // Fall back to global balance check
      const globalBalance = await getCoinBalance(userId);
      if (globalBalance < amount) {
        throw new Error(`Insufficient coin balance. Required: ${amount}, Category (${category}): ${catBalance}, Global: ${globalBalance}`);
      }
      // Use global balance instead
      category = null;
    }
  } else {
    const currentBalance = await getCoinBalance(userId);
    if (currentBalance < amount) {
      throw new Error(`Insufficient coin balance. Required: ${amount}, Available: ${currentBalance}`);
    }
  }

  const transaction = await CoinTransaction.createTransaction(
    userId,
    'spent',
    amount,
    source,
    description,
    metadata,
    category || null
  );

  // Also update the Wallet model to keep balances in sync
  try {
    const wallet = await Wallet.findOne({ user: userId }).lean();

    if (wallet) {
      if (category) {
        // Category-specific: atomic $inc (negative) with balance guard
        await Wallet.findOneAndUpdate(
          {
            _id: wallet._id,
            [`categoryBalances.${category}.available`]: { $gte: amount }
          },
          {
            $inc: {
              [`categoryBalances.${category}.available`]: -amount,
              [`categoryBalances.${category}.spent`]: amount,
              'statistics.totalSpent': amount,
              'balance.total': -amount
            },
            $set: { lastTransactionAt: new Date() }
          }
        );
      } else {
        // Global ReZ coins: atomic deduction with balance guard
        const updated = await Wallet.findOneAndUpdate(
          {
            _id: wallet._id,
            'balance.available': { $gte: amount },
            'coins.type': 'rez'
          },
          {
            $inc: {
              'balance.available': -amount,
              'balance.total': -amount,
              'statistics.totalSpent': amount,
              'coins.$.amount': -amount
            },
            $set: {
              'coins.$.lastUsed': new Date(),
              lastTransactionAt: new Date()
            }
          }
        );
        if (!updated) {
          console.error(`❌ [COIN SERVICE] Atomic deduction failed - insufficient balance or concurrent update`);
        }
      }
      console.log(`✅ [COIN SERVICE] Wallet updated atomically: -${amount} coins${category ? ` (${category})` : ''}`);
    }
  } catch (walletError) {
    console.error('❌ [COIN SERVICE] Failed to update wallet:', walletError);
  }

  // Also update UserLoyalty categoryCoins if category is provided
  if (category) {
    try {
      const loyalty = await UserLoyalty.findOne({ userId });
      if (loyalty) {
        const catCoins = loyalty.categoryCoins?.get(category);
        if (catCoins) {
          catCoins.available = Math.max(0, catCoins.available - amount);
          loyalty.categoryCoins!.set(category, catCoins);
          loyalty.markModified('categoryCoins');
          await loyalty.save();
        }
      }
    } catch (loyaltyError) {
      console.error('❌ [COIN SERVICE] Failed to update UserLoyalty categoryCoins:', loyaltyError);
    }
  }

  return {
    transactionId: transaction._id,
    amount: transaction.amount,
    newBalance: transaction.balance,
    source: transaction.source,
    description: transaction.description,
    category: category || null
  };
}

/**
 * Transfer coins between users (e.g., for gifting)
 *
 * Uses MongoDB session + atomic $inc with $gte guard to prevent race conditions.
 * The balance check + debit + credit are all-or-nothing within a transaction.
 */
export async function transferCoins(
  fromUserId: string,
  toUserId: string,
  amount: number,
  description?: string
): Promise<{ fromTransaction: any; toTransaction: any }> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  if (fromUserId === toUserId) {
    throw new Error('Cannot transfer coins to yourself');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Atomic debit: $inc with $gte guard ensures balance can't go negative
    const debitResult = await Wallet.findOneAndUpdate(
      {
        user: new mongoose.Types.ObjectId(fromUserId),
        'balance.available': { $gte: amount },
        isFrozen: false,
      },
      {
        $inc: { 'balance.available': -amount },
        $set: { lastTransactionAt: new Date() },
      },
      { new: true, session }
    );

    if (!debitResult) {
      await session.abortTransaction();
      throw new Error(`Insufficient coin balance or wallet is frozen`);
    }

    // Credit recipient
    const creditResult = await Wallet.findOneAndUpdate(
      { user: new mongoose.Types.ObjectId(toUserId) },
      {
        $inc: { 'balance.available': amount },
        $set: { lastTransactionAt: new Date() },
      },
      { new: true, session }
    );

    if (!creditResult) {
      await session.abortTransaction();
      throw new Error('Recipient wallet not found');
    }

    // Create CoinTransaction records within the session
    const fromTransaction = await CoinTransaction.createTransaction(
      fromUserId,
      'spent',
      amount,
      'purchase',
      description || `Transferred ${amount} coins`,
      { recipientUserId: toUserId }
    );

    const toTransaction = await CoinTransaction.createTransaction(
      toUserId,
      'earned',
      amount,
      'admin',
      description || `Received ${amount} coins`,
      { senderUserId: fromUserId }
    );

    await session.commitTransaction();

    return {
      fromTransaction: {
        id: fromTransaction._id,
        newBalance: fromTransaction.balance
      },
      toTransaction: {
        id: toTransaction._id,
        newBalance: toTransaction.balance
      }
    };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Get coin statistics for user
 */
export async function getCoinStats(userId: string): Promise<any> {
  const userObjId = new mongoose.Types.ObjectId(userId);

  // Use aggregation pipeline instead of loading all transactions into memory
  const [totalsResult, sourceBreakdown, monthlyEarnings, txCount] = await Promise.all([
    // 1. Totals by type
    CoinTransaction.aggregate([
      { $match: { user: userObjId } },
      { $group: {
        _id: '$type',
        total: { $sum: '$amount' },
      }},
    ]),
    // 2. Source breakdown (earned/bonus/refunded only)
    CoinTransaction.aggregate([
      { $match: { user: userObjId, type: { $in: ['earned', 'bonus', 'refunded'] } } },
      { $group: { _id: '$source', total: { $sum: '$amount' } } },
    ]),
    // 3. Monthly earnings (last 12 months)
    CoinTransaction.aggregate([
      { $match: {
        user: userObjId,
        type: { $in: ['earned', 'bonus'] },
        createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      }},
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        total: { $sum: '$amount' },
      }},
      { $sort: { _id: 1 } },
    ]),
    // 4. Transaction count
    CoinTransaction.countDocuments({ user: userObjId }),
  ]);

  const stats: any = {
    totalEarned: 0, totalSpent: 0, totalExpired: 0, totalRefunded: 0, totalBonus: 0,
    currentBalance: 0, transactionCount: txCount,
    sourceBreakdown: {} as Record<string, number>,
    monthlyEarnings: {} as Record<string, number>,
  };

  for (const row of totalsResult) {
    if (row._id === 'earned') stats.totalEarned = row.total;
    else if (row._id === 'spent') stats.totalSpent = row.total;
    else if (row._id === 'expired') stats.totalExpired = row.total;
    else if (row._id === 'refunded') stats.totalRefunded = row.total;
    else if (row._id === 'bonus') stats.totalBonus = row.total;
  }
  for (const row of sourceBreakdown) {
    stats.sourceBreakdown[row._id] = row.total;
  }
  for (const row of monthlyEarnings) {
    stats.monthlyEarnings[row._id] = row.total;
  }

  stats.currentBalance = await getCoinBalance(userId);
  return stats;
}

/**
 * Get leaderboard of top coin earners
 */
export async function getCoinLeaderboard(
  period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time',
  limit: number = 10
): Promise<any[]> {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'weekly':
      const weekStart = now.getDate() - now.getDay();
      startDate = new Date(now.getFullYear(), now.getMonth(), weekStart);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      startDate = new Date(0); // Beginning of time
  }

  const leaderboard = await CoinTransaction.aggregate([
    {
      $match: {
        type: { $in: ['earned', 'bonus', 'refunded'] },
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$user',
        totalCoins: { $sum: '$amount' },
        transactionCount: { $sum: 1 }
      }
    },
    {
      $sort: { totalCoins: -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $project: {
        userId: '$_id',
        userName: '$user.name',
        userAvatar: '$user.avatar',
        totalCoins: 1,
        transactionCount: 1
      }
    }
  ]);

  return leaderboard.map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId,
    userName: entry.userName,
    userAvatar: entry.userAvatar,
    totalCoins: entry.totalCoins,
    transactionCount: entry.transactionCount
  }));
}

/**
 * Expire old coins (FIFO basis)
 */
export async function expireOldCoins(userId: string, daysToExpire: number = 365): Promise<number> {
  return await CoinTransaction.expireOldCoins(userId, daysToExpire);
}

/**
 * Get user's rank in coin leaderboard
 */
export async function getUserCoinRank(userId: string, period: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time'): Promise<any> {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'weekly':
      const weekStart = now.getDate() - now.getDay();
      startDate = new Date(now.getFullYear(), now.getMonth(), weekStart);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      startDate = new Date(0);
  }

  const userStats = await CoinTransaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        type: { $in: ['earned', 'bonus', 'refunded'] },
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$user',
        totalCoins: { $sum: '$amount' }
      }
    }
  ]);

  const userTotalCoins = userStats[0]?.totalCoins || 0;

  const higherRankedCount = await CoinTransaction.aggregate([
    {
      $match: {
        type: { $in: ['earned', 'bonus', 'refunded'] },
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$user',
        totalCoins: { $sum: '$amount' }
      }
    },
    {
      $match: {
        totalCoins: { $gt: userTotalCoins }
      }
    },
    {
      $count: 'count'
    }
  ]);

  const rank = (higherRankedCount[0]?.count || 0) + 1;

  return {
    userId,
    rank,
    totalCoins: userTotalCoins,
    period
  };
}

export default {
  getCoinBalance,
  getCategoryBalance,
  getAllCategoryBalances,
  getCoinTransactions,
  awardCoins,
  deductCoins,
  transferCoins,
  getCoinStats,
  getCoinLeaderboard,
  getUserCoinRank,
  expireOldCoins
};
