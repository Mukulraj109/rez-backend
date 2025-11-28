"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCoinBalance = getCoinBalance;
exports.getCoinTransactions = getCoinTransactions;
exports.awardCoins = awardCoins;
exports.deductCoins = deductCoins;
exports.transferCoins = transferCoins;
exports.getCoinStats = getCoinStats;
exports.getCoinLeaderboard = getCoinLeaderboard;
exports.expireOldCoins = expireOldCoins;
exports.getUserCoinRank = getUserCoinRank;
const CoinTransaction_1 = require("../models/CoinTransaction");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Get user's current coin balance
 */
async function getCoinBalance(userId) {
    return await CoinTransaction_1.CoinTransaction.getUserBalance(userId);
}
/**
 * Get user's coin transaction history
 */
async function getCoinTransactions(userId, options = {}) {
    const { type, source, limit = 20, offset = 0 } = options;
    const query = { user: userId };
    if (type) {
        query.type = type;
    }
    if (source) {
        query.source = source;
    }
    const [transactions, total, balance] = await Promise.all([
        CoinTransaction_1.CoinTransaction.find(query)
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .lean(),
        CoinTransaction_1.CoinTransaction.countDocuments(query),
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
async function awardCoins(userId, amount, source, description, metadata) {
    if (amount <= 0) {
        throw new Error('Amount must be positive');
    }
    const transaction = await CoinTransaction_1.CoinTransaction.createTransaction(userId, 'earned', amount, source, description, metadata);
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
async function deductCoins(userId, amount, source, description, metadata) {
    if (amount <= 0) {
        throw new Error('Amount must be positive');
    }
    const currentBalance = await getCoinBalance(userId);
    if (currentBalance < amount) {
        throw new Error(`Insufficient coin balance. Required: ${amount}, Available: ${currentBalance}`);
    }
    const transaction = await CoinTransaction_1.CoinTransaction.createTransaction(userId, 'spent', amount, source, description, metadata);
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
async function transferCoins(fromUserId, toUserId, amount, description) {
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
    const fromTransaction = await CoinTransaction_1.CoinTransaction.createTransaction(fromUserId, 'spent', amount, 'purchase', description || `Transferred ${amount} coins`, { recipientUserId: toUserId });
    // Add to recipient
    const toTransaction = await CoinTransaction_1.CoinTransaction.createTransaction(toUserId, 'earned', amount, 'admin', description || `Received ${amount} coins`, { senderUserId: fromUserId });
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
async function getCoinStats(userId) {
    const transactions = await CoinTransaction_1.CoinTransaction.find({ user: userId });
    const stats = {
        totalEarned: 0,
        totalSpent: 0,
        totalExpired: 0,
        totalRefunded: 0,
        totalBonus: 0,
        currentBalance: 0,
        transactionCount: transactions.length,
        sourceBreakdown: {},
        monthlyEarnings: {}
    };
    transactions.forEach(t => {
        // Update totals
        if (t.type === 'earned')
            stats.totalEarned += t.amount;
        if (t.type === 'spent')
            stats.totalSpent += t.amount;
        if (t.type === 'expired')
            stats.totalExpired += t.amount;
        if (t.type === 'refunded')
            stats.totalRefunded += t.amount;
        if (t.type === 'bonus')
            stats.totalBonus += t.amount;
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
async function getCoinLeaderboard(period = 'all-time', limit = 10) {
    const now = new Date();
    let startDate;
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
    const leaderboard = await CoinTransaction_1.CoinTransaction.aggregate([
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
async function expireOldCoins(userId, daysToExpire = 365) {
    return await CoinTransaction_1.CoinTransaction.expireOldCoins(userId, daysToExpire);
}
/**
 * Get user's rank in coin leaderboard
 */
async function getUserCoinRank(userId, period = 'all-time') {
    const now = new Date();
    let startDate;
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
    const userStats = await CoinTransaction_1.CoinTransaction.aggregate([
        {
            $match: {
                user: new mongoose_1.default.Types.ObjectId(userId),
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
    const higherRankedCount = await CoinTransaction_1.CoinTransaction.aggregate([
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
exports.default = {
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
