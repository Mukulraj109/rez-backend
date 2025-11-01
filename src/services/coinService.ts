import { CoinTransaction } from '../models/CoinTransaction';
import mongoose from 'mongoose';

/**
 * Get user's current coin balance
 */
export async function getCoinBalance(userId: string): Promise<number> {
  return await CoinTransaction.getUserBalance(userId);
}

/**
 * Get user's coin transaction history
 */
export async function getCoinTransactions(
  userId: string,
  options: {
    type?: string;
    source?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ transactions: any[]; total: number; balance: number }> {
  const { type, source, limit = 20, offset = 0 } = options;

  const query: any = { user: userId };

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
 * Award coins to user
 */
export async function awardCoins(
  userId: string,
  amount: number,
  source: string,
  description: string,
  metadata?: any
): Promise<any> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const transaction = await CoinTransaction.createTransaction(
    userId,
    'earned',
    amount,
    source,
    description,
    metadata
  );

  return {
    transactionId: transaction._id,
    amount: transaction.amount,
    newBalance: transaction.balance,
    source: transaction.source,
    description: transaction.description
  };
}

/**
 * Deduct coins from user
 */
export async function deductCoins(
  userId: string,
  amount: number,
  source: string,
  description: string,
  metadata?: any
): Promise<any> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const currentBalance = await getCoinBalance(userId);

  if (currentBalance < amount) {
    throw new Error(`Insufficient coin balance. Required: ${amount}, Available: ${currentBalance}`);
  }

  const transaction = await CoinTransaction.createTransaction(
    userId,
    'spent',
    amount,
    source,
    description,
    metadata
  );

  return {
    transactionId: transaction._id,
    amount: transaction.amount,
    newBalance: transaction.balance,
    source: transaction.source,
    description: transaction.description
  };
}

/**
 * Transfer coins between users (e.g., for gifting)
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
  getCoinTransactions,
  awardCoins,
  deductCoins,
  transferCoins,
  getCoinStats,
  getCoinLeaderboard,
  getUserCoinRank,
  expireOldCoins
};
