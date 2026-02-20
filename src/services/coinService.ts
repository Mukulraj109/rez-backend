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
  const wallet = await Wallet.findOne({ user: userId });
  return wallet?.getCategoryBalance(category) || 0;
}

/**
 * Get all category balances for a user
 */
export async function getAllCategoryBalances(userId: string): Promise<Record<string, { available: number; earned: number; spent: number }>> {
  const wallet = await Wallet.findOne({ user: userId });
  const result: Record<string, { available: number; earned: number; spent: number }> = {};
  const categories: MainCategorySlug[] = ['food-dining', 'beauty-wellness', 'grocery-essentials', 'fitness-sports', 'healthcare', 'fashion', 'education-learning', 'home-services', 'travel-experiences', 'entertainment', 'financial-lifestyle', 'electronics'];

  for (const cat of categories) {
    const catBal = wallet?.categoryBalances?.get(cat);
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

  // Also update the Wallet model to keep balances in sync
  try {
    let wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
    }

    if (wallet) {
      if (category) {
        // Category-specific: atomic $inc on categoryBalances
        await Wallet.findByIdAndUpdate(wallet._id, {
          $inc: {
            [`categoryBalances.${category}.available`]: amount,
            [`categoryBalances.${category}.earned`]: amount,
            'statistics.totalEarned': amount,
            'balance.total': amount
          },
          $set: { lastTransactionAt: new Date() }
        });
      } else {
        // Global ReZ coins: atomic $inc on balance + coins array
        await Wallet.findOneAndUpdate(
          { _id: wallet._id, 'coins.type': 'rez' },
          {
            $inc: {
              'balance.available': amount,
              'balance.total': amount,
              'statistics.totalEarned': amount,
              'coins.$.amount': amount
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
    console.error('❌ [COIN SERVICE] Failed to update wallet:', walletError);
  }

  // Also update UserLoyalty categoryCoins if category is provided
  if (category) {
    try {
      let loyalty = await UserLoyalty.findOne({ userId });
      if (loyalty) {
        const catCoins = loyalty.categoryCoins?.get(category) || { available: 0, expiring: 0 };
        catCoins.available += adjustedAmount;
        if (!loyalty.categoryCoins) {
          loyalty.categoryCoins = new Map();
        }
        loyalty.categoryCoins.set(category, catCoins);
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
        const bonusWallet = await Wallet.findOne({ user: userId });
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
    const wallet = await Wallet.findOne({ user: userId });

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
          loyalty.categoryCoins.set(category, catCoins);
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
 * TODO (Phase 0.6): This function has a race condition — it reads the sender's balance,
 * checks sufficiency, then creates two separate transactions without atomicity.
 * A concurrent deduction could cause the sender's balance to go negative.
 * This needs to be wrapped in a MongoDB multi-document transaction (session) to ensure
 * the balance check + deduct + credit are all-or-nothing.
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

  const fromBalance = await getCoinBalance(fromUserId);

  if (fromBalance < amount) {
    throw new Error(`Insufficient coin balance. Required: ${amount}, Available: ${fromBalance}`);
  }

  // Deduct from sender
  const fromTransaction = await CoinTransaction.createTransaction(
    fromUserId,
    'spent',
    amount,
    'purchase',
    description || `Transferred ${amount} coins`,
    { recipientUserId: toUserId }
  );

  // Add to recipient
  const toTransaction = await CoinTransaction.createTransaction(
    toUserId,
    'earned',
    amount,
    'admin',
    description || `Received ${amount} coins`,
    { senderUserId: fromUserId }
  );

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
}

/**
 * Get coin statistics for user
 */
export async function getCoinStats(userId: string): Promise<any> {
  const transactions = await CoinTransaction.find({ user: userId });

  const stats = {
    totalEarned: 0,
    totalSpent: 0,
    totalExpired: 0,
    totalRefunded: 0,
    totalBonus: 0,
    currentBalance: 0,
    transactionCount: transactions.length,
    sourceBreakdown: {} as Record<string, number>,
    monthlyEarnings: {} as Record<string, number>
  };

  transactions.forEach(t => {
    // Update totals
    if (t.type === 'earned') stats.totalEarned += t.amount;
    if (t.type === 'spent') stats.totalSpent += t.amount;
    if (t.type === 'expired') stats.totalExpired += t.amount;
    if (t.type === 'refunded') stats.totalRefunded += t.amount;
    if (t.type === 'bonus') stats.totalBonus += t.amount;

    // Source breakdown
    if (t.type === 'earned' || t.type === 'bonus' || t.type === 'refunded') {
      stats.sourceBreakdown[t.source] = (stats.sourceBreakdown[t.source] || 0) + t.amount;
    }

    // Monthly earnings
    if (t.type === 'earned' || t.type === 'bonus') {
      const month = t.createdAt.toISOString().substring(0, 7); // YYYY-MM
      stats.monthlyEarnings[month] = (stats.monthlyEarnings[month] || 0) + t.amount;
    }
  });

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
