"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralAnalyticsService = void 0;
const Referral_1 = __importStar(require("../models/Referral"));
const User_1 = require("../models/User");
const Order_1 = require("../models/Order");
class ReferralAnalyticsService {
    /**
     * Get comprehensive referral metrics
     */
    async getMetrics(startDate, endDate) {
        const dateFilter = this.getDateFilter(startDate, endDate);
        const [totalReferrals, qualifiedReferrals, topReferrers, sourceBreakdown, avgTimeToQualification] = await Promise.all([
            this.getTotalReferrals(dateFilter),
            this.getQualifiedReferrals(dateFilter),
            this.getTopReferrers(dateFilter),
            this.getSourceBreakdown(dateFilter),
            this.getAverageTimeToQualification(dateFilter)
        ]);
        const conversionRate = totalReferrals > 0
            ? (qualifiedReferrals / totalReferrals) * 100
            : 0;
        const viralCoefficient = await this.calculateViralCoefficient(dateFilter);
        const cac = await this.calculateCAC(dateFilter);
        const ltv = await this.calculateLTV(dateFilter);
        return {
            totalReferrals,
            qualifiedReferrals,
            conversionRate,
            averageTimeToQualification: avgTimeToQualification,
            topReferrers,
            sourceBreakdown,
            viralCoefficient,
            customerAcquisitionCost: cac,
            lifetimeValuePerReferral: ltv
        };
    }
    /**
     * Get leaderboard of top referrers
     */
    async getLeaderboard(limit = 100) {
        const referralCounts = await Referral_1.default.aggregate([
            {
                $match: {
                    status: { $in: [Referral_1.ReferralStatus.QUALIFIED, Referral_1.ReferralStatus.COMPLETED] }
                }
            },
            {
                $group: {
                    _id: '$referrer',
                    totalReferrals: { $sum: 1 },
                    lifetimeEarnings: {
                        $sum: {
                            $reduce: {
                                input: '$rewards',
                                initialValue: 0,
                                in: {
                                    $cond: [
                                        { $and: [{ $eq: ['$$this.type', 'coins'] }, { $eq: ['$$this.claimed', true] }] },
                                        { $add: ['$$value', { $ifNull: ['$$this.amount', 0] }] },
                                        '$$value'
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            {
                $sort: { totalReferrals: -1 }
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
                    username: '$user.username',
                    fullName: '$user.fullName',
                    avatar: '$user.avatar',
                    totalReferrals: 1,
                    lifetimeEarnings: 1,
                    tier: '$user.referralTier'
                }
            }
        ]);
        return referralCounts.map((entry, index) => ({
            rank: index + 1,
            ...entry
        }));
    }
    /**
     * Get user's rank in leaderboard
     */
    async getUserRank(userId) {
        const userReferrals = await Referral_1.default.countDocuments({
            referrer: userId,
            status: { $in: [Referral_1.ReferralStatus.QUALIFIED, Referral_1.ReferralStatus.COMPLETED] }
        });
        const usersWithMore = await Referral_1.default.aggregate([
            {
                $match: {
                    status: { $in: [Referral_1.ReferralStatus.QUALIFIED, Referral_1.ReferralStatus.COMPLETED] }
                }
            },
            {
                $group: {
                    _id: '$referrer',
                    totalReferrals: { $sum: 1 }
                }
            },
            {
                $match: {
                    totalReferrals: { $gt: userReferrals }
                }
            },
            {
                $count: 'count'
            }
        ]);
        const rank = usersWithMore.length > 0 ? usersWithMore[0].count + 1 : 1;
        return {
            rank,
            totalReferrals: userReferrals
        };
    }
    /**
     * Track referral attribution
     */
    async trackAttribution(referralId, event, metadata) {
        const referral = await Referral_1.default.findById(referralId);
        if (!referral) {
            throw new Error('Referral not found');
        }
        // Track events in metadata
        const events = referral.metadata.attributionEvents || [];
        events.push({
            event,
            timestamp: new Date(),
            ...metadata
        });
        referral.metadata.attributionEvents = events;
        await referral.save();
        return referral;
    }
    /**
     * Get referral conversion funnel
     */
    async getConversionFunnel(dateFilter = {}) {
        const [linkClicked, registered, firstOrder, qualified, completed] = await Promise.all([
            Referral_1.default.countDocuments({ ...dateFilter }),
            Referral_1.default.countDocuments({ ...dateFilter, status: { $ne: Referral_1.ReferralStatus.PENDING } }),
            Referral_1.default.countDocuments({ ...dateFilter, 'metadata.refereeFirstOrder': { $exists: true } }),
            Referral_1.default.countDocuments({ ...dateFilter, status: Referral_1.ReferralStatus.QUALIFIED }),
            Referral_1.default.countDocuments({ ...dateFilter, status: Referral_1.ReferralStatus.COMPLETED })
        ]);
        return {
            stages: [
                { name: 'Link Shared/Clicked', count: linkClicked, percentage: 100 },
                { name: 'Registered', count: registered, percentage: (registered / linkClicked) * 100 },
                { name: 'First Order', count: firstOrder, percentage: (firstOrder / linkClicked) * 100 },
                { name: 'Qualified', count: qualified, percentage: (qualified / linkClicked) * 100 },
                { name: 'Completed', count: completed, percentage: (completed / linkClicked) * 100 }
            ],
            overallConversion: linkClicked > 0 ? (qualified / linkClicked) * 100 : 0
        };
    }
    /**
     * Get referral source performance
     */
    async getSourcePerformance(dateFilter = {}) {
        const performance = await Referral_1.default.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$metadata.shareMethod',
                    total: { $sum: 1 },
                    qualified: {
                        $sum: {
                            $cond: [
                                { $in: ['$status', [Referral_1.ReferralStatus.QUALIFIED, Referral_1.ReferralStatus.COMPLETED]] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    source: '$_id',
                    total: 1,
                    qualified: 1,
                    conversionRate: {
                        $cond: [
                            { $gt: ['$total', 0] },
                            { $multiply: [{ $divide: ['$qualified', '$total'] }, 100] },
                            0
                        ]
                    }
                }
            },
            {
                $sort: { total: -1 }
            }
        ]);
        return performance;
    }
    /**
     * Calculate viral coefficient (K-factor)
     */
    async calculateViralCoefficient(dateFilter = {}) {
        const users = await User_1.User.countDocuments(dateFilter);
        const referrals = await Referral_1.default.countDocuments({
            ...dateFilter,
            status: { $in: [Referral_1.ReferralStatus.QUALIFIED, Referral_1.ReferralStatus.COMPLETED] }
        });
        // K = (invites sent per user) × (conversion rate)
        // Simplified: qualified referrals / total users
        return users > 0 ? referrals / users : 0;
    }
    /**
     * Calculate Customer Acquisition Cost
     */
    async calculateCAC(dateFilter = {}) {
        const referrals = await Referral_1.default.find({
            ...dateFilter,
            status: { $in: [Referral_1.ReferralStatus.QUALIFIED, Referral_1.ReferralStatus.COMPLETED] }
        });
        // Calculate total rewards paid out
        const totalRewardsCost = referrals.reduce((sum, ref) => {
            // rewards is an object with referrerAmount, refereeDiscount, milestoneBonus
            const rewardSum = (ref.rewards.referrerAmount || 0) +
                (ref.rewards.refereeDiscount || 0) +
                (ref.rewards.milestoneBonus || 0);
            return sum + rewardSum;
        }, 0);
        const qualifiedReferrals = referrals.length;
        return qualifiedReferrals > 0 ? totalRewardsCost / qualifiedReferrals : 0;
    }
    /**
     * Calculate Lifetime Value per referred customer
     */
    async calculateLTV(dateFilter = {}) {
        const referrals = await Referral_1.default.find({
            ...dateFilter,
            status: { $in: [Referral_1.ReferralStatus.QUALIFIED, Referral_1.ReferralStatus.COMPLETED] }
        }).populate('referee');
        let totalValue = 0;
        for (const ref of referrals) {
            if (ref.referee) {
                const orders = await Order_1.Order.find({
                    userId: ref.referee,
                    status: { $in: ['delivered', 'completed'] }
                });
                const customerValue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
                totalValue += customerValue;
            }
        }
        return referrals.length > 0 ? totalValue / referrals.length : 0;
    }
    /**
     * Helper: Get total referrals
     */
    async getTotalReferrals(dateFilter) {
        return await Referral_1.default.countDocuments(dateFilter);
    }
    /**
     * Helper: Get qualified referrals
     */
    async getQualifiedReferrals(dateFilter) {
        return await Referral_1.default.countDocuments({
            ...dateFilter,
            status: { $in: [Referral_1.ReferralStatus.QUALIFIED, Referral_1.ReferralStatus.COMPLETED] }
        });
    }
    /**
     * Helper: Get top referrers
     */
    async getTopReferrers(dateFilter, limit = 10) {
        return await this.getLeaderboard(limit);
    }
    /**
     * Helper: Get source breakdown
     */
    async getSourceBreakdown(dateFilter) {
        const breakdown = await Referral_1.default.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$metadata.shareMethod',
                    count: { $sum: 1 }
                }
            }
        ]);
        const result = {};
        breakdown.forEach((item) => {
            result[item._id || 'unknown'] = item.count;
        });
        return result;
    }
    /**
     * Helper: Get average time to qualification
     */
    async getAverageTimeToQualification(dateFilter) {
        const qualifiedReferrals = await Referral_1.default.find({
            ...dateFilter,
            status: { $in: [Referral_1.ReferralStatus.QUALIFIED, Referral_1.ReferralStatus.COMPLETED] },
            qualifiedAt: { $exists: true },
            registeredAt: { $exists: true }
        });
        if (qualifiedReferrals.length === 0)
            return 0;
        const totalDays = qualifiedReferrals.reduce((sum, ref) => {
            const days = (ref.qualifiedAt.getTime() - ref.registeredAt.getTime()) / (1000 * 60 * 60 * 24);
            return sum + days;
        }, 0);
        return totalDays / qualifiedReferrals.length;
    }
    /**
     * Helper: Get date filter
     */
    getDateFilter(startDate, endDate) {
        const filter = {};
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate)
                filter.createdAt.$gte = startDate;
            if (endDate)
                filter.createdAt.$lte = endDate;
        }
        return filter;
    }
}
exports.ReferralAnalyticsService = ReferralAnalyticsService;
exports.default = new ReferralAnalyticsService();
