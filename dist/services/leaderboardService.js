"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const UserStreak_1 = __importDefault(require("../models/UserStreak"));
class LeaderboardService {
    // Get spending leaderboard
    async getSpendingLeaderboard(period = 'month', limit = 10) {
        const dateFilter = this.getDateFilter(period);
        const Order = mongoose_1.default.model('Order');
        const leaderboard = await Order.aggregate([
            {
                $match: {
                    status: 'delivered',
                    ...dateFilter
                }
            },
            {
                $group: {
                    _id: '$user',
                    totalSpent: { $sum: '$totalPrice' },
                    orderCount: { $sum: 1 }
                }
            },
            {
                $sort: { totalSpent: -1 }
            },
            {
                $limit: limit
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userData'
                }
            },
            {
                $unwind: '$userData'
            },
            {
                $project: {
                    user: {
                        id: '$userData._id',
                        name: '$userData.name',
                        avatar: '$userData.profilePicture'
                    },
                    value: '$totalSpent',
                    orderCount: 1
                }
            }
        ]);
        return this.addRanks(leaderboard);
    }
    // Get review leaderboard
    async getReviewLeaderboard(period = 'month', limit = 10) {
        const dateFilter = this.getDateFilter(period);
        const Review = mongoose_1.default.model('Review');
        const leaderboard = await Review.aggregate([
            {
                $match: dateFilter
            },
            {
                $group: {
                    _id: '$user',
                    totalReviews: { $sum: 1 },
                    totalHelpful: { $sum: '$helpfulCount' },
                    averageRating: { $avg: '$rating' }
                }
            },
            {
                $addFields: {
                    score: {
                        $add: [
                            { $multiply: ['$totalReviews', 10] },
                            '$totalHelpful'
                        ]
                    }
                }
            },
            {
                $sort: { score: -1, totalReviews: -1 }
            },
            {
                $limit: limit
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userData'
                }
            },
            {
                $unwind: '$userData'
            },
            {
                $project: {
                    user: {
                        id: '$userData._id',
                        name: '$userData.name',
                        avatar: '$userData.profilePicture'
                    },
                    value: '$totalReviews',
                    score: 1,
                    totalHelpful: 1,
                    averageRating: 1
                }
            }
        ]);
        return this.addRanks(leaderboard);
    }
    // Get referral leaderboard
    async getReferralLeaderboard(period = 'month', limit = 10) {
        const dateFilter = this.getDateFilter(period, 'referral.referrals.joinedAt');
        const User = mongoose_1.default.model('User');
        const leaderboard = await User.aggregate([
            {
                $match: {
                    'referral.totalReferrals': { $gt: 0 }
                }
            },
            {
                $unwind: { path: '$referral.referrals', preserveNullAndEmptyArrays: false }
            },
            {
                $match: dateFilter
            },
            {
                $group: {
                    _id: '$_id',
                    userData: { $first: '$$ROOT' },
                    totalReferrals: { $sum: 1 }
                }
            },
            {
                $sort: { totalReferrals: -1 }
            },
            {
                $limit: limit
            },
            {
                $project: {
                    user: {
                        id: '$userData._id',
                        name: '$userData.name',
                        avatar: '$userData.profilePicture'
                    },
                    value: '$totalReferrals'
                }
            }
        ]);
        return this.addRanks(leaderboard);
    }
    // Get cashback leaderboard
    async getCashbackLeaderboard(period = 'month', limit = 10) {
        const dateFilter = this.getDateFilter(period);
        const Order = mongoose_1.default.model('Order');
        const leaderboard = await Order.aggregate([
            {
                $match: {
                    status: 'delivered',
                    'cashback.amount': { $gt: 0 },
                    ...dateFilter
                }
            },
            {
                $group: {
                    _id: '$user',
                    totalCashback: { $sum: '$cashback.amount' },
                    orderCount: { $sum: 1 }
                }
            },
            {
                $sort: { totalCashback: -1 }
            },
            {
                $limit: limit
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userData'
                }
            },
            {
                $unwind: '$userData'
            },
            {
                $project: {
                    user: {
                        id: '$userData._id',
                        name: '$userData.name',
                        avatar: '$userData.profilePicture'
                    },
                    value: '$totalCashback',
                    orderCount: 1
                }
            }
        ]);
        return this.addRanks(leaderboard);
    }
    // Get streak leaderboard
    async getStreakLeaderboard(type = 'login', limit = 10) {
        const leaderboard = await UserStreak_1.default.aggregate([
            {
                $match: { type }
            },
            {
                $sort: { currentStreak: -1, longestStreak: -1 }
            },
            {
                $limit: limit
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userData'
                }
            },
            {
                $unwind: '$userData'
            },
            {
                $project: {
                    user: {
                        id: '$userData._id',
                        name: '$userData.name',
                        avatar: '$userData.profilePicture'
                    },
                    value: '$currentStreak',
                    longestStreak: 1
                }
            }
        ]);
        return this.addRanks(leaderboard);
    }
    // Get user's rank in leaderboard
    async getUserRank(userId, leaderboardType, period = 'month') {
        let allUsers = [];
        switch (leaderboardType) {
            case 'spending':
                allUsers = await this.getSpendingLeaderboard(period, 1000);
                break;
            case 'reviews':
                allUsers = await this.getReviewLeaderboard(period, 1000);
                break;
            case 'referrals':
                allUsers = await this.getReferralLeaderboard(period, 1000);
                break;
            case 'cashback':
                allUsers = await this.getCashbackLeaderboard(period, 1000);
                break;
            case 'streak':
                allUsers = await this.getStreakLeaderboard('login', 1000);
                break;
        }
        const userEntry = allUsers.find(entry => entry.user.id.toString() === userId);
        if (!userEntry) {
            return null;
        }
        return {
            rank: userEntry.rank,
            total: allUsers.length,
            value: userEntry.value
        };
    }
    // Get all leaderboards for user
    async getAllUserRanks(userId, period = 'month') {
        const [spending, reviews, referrals, cashback, streak] = await Promise.all([
            this.getUserRank(userId, 'spending', period),
            this.getUserRank(userId, 'reviews', period),
            this.getUserRank(userId, 'referrals', period),
            this.getUserRank(userId, 'cashback', period),
            this.getUserRank(userId, 'streak', period)
        ]);
        return {
            spending,
            reviews,
            referrals,
            cashback,
            streak
        };
    }
    // Helper: Get date filter based on period
    getDateFilter(period, dateField = 'createdAt') {
        if (period === 'all') {
            return {};
        }
        const now = new Date();
        const startDate = new Date();
        if (period === 'week') {
            startDate.setDate(now.getDate() - 7);
        }
        else if (period === 'month') {
            startDate.setMonth(now.getMonth() - 1);
        }
        return {
            [dateField]: { $gte: startDate }
        };
    }
    // Helper: Add ranks to leaderboard entries
    addRanks(entries) {
        return entries.map((entry, index) => ({
            ...entry,
            rank: index + 1
        }));
    }
    // Get combined leaderboard stats
    async getLeaderboardStats() {
        const [spending, reviews, referrals, cashback, streak] = await Promise.all([
            this.getSpendingLeaderboard('month', 3),
            this.getReviewLeaderboard('month', 3),
            this.getReferralLeaderboard('month', 3),
            this.getCashbackLeaderboard('month', 3),
            this.getStreakLeaderboard('login', 3)
        ]);
        return {
            spending: spending.slice(0, 3),
            reviews: reviews.slice(0, 3),
            referrals: referrals.slice(0, 3),
            cashback: cashback.slice(0, 3),
            streak: streak.slice(0, 3)
        };
    }
}
exports.default = new LeaderboardService();
