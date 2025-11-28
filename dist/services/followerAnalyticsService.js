"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordDailySnapshot = recordDailySnapshot;
exports.recordNewFollow = recordNewFollow;
exports.recordUnfollow = recordUnfollow;
exports.recordFollowerClick = recordFollowerClick;
exports.recordFollowerOrder = recordFollowerOrder;
exports.recordExclusiveOfferView = recordExclusiveOfferView;
exports.recordExclusiveOfferRedemption = recordExclusiveOfferRedemption;
exports.getAnalytics = getAnalytics;
exports.getGrowthMetrics = getGrowthMetrics;
exports.getDetailedAnalytics = getDetailedAnalytics;
exports.getCurrentFollowerCount = getCurrentFollowerCount;
const mongoose_1 = __importDefault(require("mongoose"));
const FollowerAnalytics_1 = require("../models/FollowerAnalytics");
const Wishlist_1 = require("../models/Wishlist");
/**
 * Record daily analytics snapshot for a store
 * Should be called daily via cron job
 */
async function recordDailySnapshot(storeId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Count current followers
        const followersCount = await Wishlist_1.Wishlist.countDocuments({
            'items': {
                $elemMatch: {
                    itemType: 'Store',
                    itemId: new mongoose_1.default.Types.ObjectId(storeId.toString())
                }
            }
        });
        // Update or create analytics record
        await FollowerAnalytics_1.FollowerAnalytics.findOneAndUpdate({ store: storeId, date: today }, {
            $set: { followersCount }
        }, { upsert: true });
        console.log(`📊 Daily snapshot recorded for store ${storeId}: ${followersCount} followers`);
    }
    catch (error) {
        console.error('Error recording daily snapshot:', error);
        throw error;
    }
}
/**
 * Record a new follow event
 */
async function recordNewFollow(storeId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Increment new followers count and update total
        await FollowerAnalytics_1.FollowerAnalytics.findOneAndUpdate({ store: storeId, date: today }, {
            $inc: {
                newFollowers: 1,
                followersCount: 1
            }
        }, { upsert: true });
        console.log(`➕ New follow recorded for store ${storeId}`);
    }
    catch (error) {
        console.error('Error recording new follow:', error);
        // Don't throw - this is analytics, shouldn't break user flow
    }
}
/**
 * Record an unfollow event
 */
async function recordUnfollow(storeId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Increment unfollows and decrement total
        await FollowerAnalytics_1.FollowerAnalytics.findOneAndUpdate({ store: storeId, date: today }, {
            $inc: {
                unfollows: 1,
                followersCount: -1
            }
        }, { upsert: true });
        console.log(`➖ Unfollow recorded for store ${storeId}`);
    }
    catch (error) {
        console.error('Error recording unfollow:', error);
        // Don't throw - this is analytics, shouldn't break user flow
    }
}
/**
 * Record click from a follower
 */
async function recordFollowerClick(storeId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await FollowerAnalytics_1.FollowerAnalytics.findOneAndUpdate({ store: storeId, date: today }, { $inc: { clicksFromFollowers: 1 } }, { upsert: true });
    }
    catch (error) {
        console.error('Error recording follower click:', error);
    }
}
/**
 * Record order from follower
 */
async function recordFollowerOrder(storeId, orderAmount) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await FollowerAnalytics_1.FollowerAnalytics.findOneAndUpdate({ store: storeId, date: today }, {
            $inc: {
                ordersFromFollowers: 1,
                revenueFromFollowers: orderAmount
            }
        }, { upsert: true });
        console.log(`💰 Follower order recorded for store ${storeId}: ₹${orderAmount}`);
    }
    catch (error) {
        console.error('Error recording follower order:', error);
    }
}
/**
 * Record exclusive offer view by follower
 */
async function recordExclusiveOfferView(storeId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await FollowerAnalytics_1.FollowerAnalytics.findOneAndUpdate({ store: storeId, date: today }, { $inc: { exclusiveOffersViewed: 1 } }, { upsert: true });
    }
    catch (error) {
        console.error('Error recording exclusive offer view:', error);
    }
}
/**
 * Record exclusive offer redemption by follower
 */
async function recordExclusiveOfferRedemption(storeId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await FollowerAnalytics_1.FollowerAnalytics.findOneAndUpdate({ store: storeId, date: today }, { $inc: { exclusiveOffersRedeemed: 1 } }, { upsert: true });
        console.log(`🎟️ Exclusive offer redeemed for store ${storeId}`);
    }
    catch (error) {
        console.error('Error recording exclusive offer redemption:', error);
    }
}
/**
 * Get analytics for a date range
 */
async function getAnalytics(storeId, startDate, endDate) {
    try {
        return await FollowerAnalytics_1.FollowerAnalytics.find({
            store: storeId,
            date: { $gte: startDate, $lte: endDate }
        }).sort({ date: 1 }).lean();
    }
    catch (error) {
        console.error('Error getting analytics:', error);
        throw error;
    }
}
/**
 * Get growth metrics (weekly and monthly)
 */
async function getGrowthMetrics(storeId) {
    try {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [weeklyData, monthlyData] = await Promise.all([
            FollowerAnalytics_1.FollowerAnalytics.aggregate([
                {
                    $match: {
                        store: new mongoose_1.default.Types.ObjectId(storeId.toString()),
                        date: { $gte: weekAgo }
                    }
                },
                {
                    $group: {
                        _id: null,
                        newFollowers: { $sum: '$newFollowers' },
                        unfollows: { $sum: '$unfollows' },
                        totalOrders: { $sum: '$ordersFromFollowers' },
                        totalRevenue: { $sum: '$revenueFromFollowers' },
                        totalClicks: { $sum: '$clicksFromFollowers' },
                        exclusiveViews: { $sum: '$exclusiveOffersViewed' },
                        exclusiveRedemptions: { $sum: '$exclusiveOffersRedeemed' }
                    }
                }
            ]),
            FollowerAnalytics_1.FollowerAnalytics.aggregate([
                {
                    $match: {
                        store: new mongoose_1.default.Types.ObjectId(storeId.toString()),
                        date: { $gte: monthAgo }
                    }
                },
                {
                    $group: {
                        _id: null,
                        newFollowers: { $sum: '$newFollowers' },
                        unfollows: { $sum: '$unfollows' },
                        totalOrders: { $sum: '$ordersFromFollowers' },
                        totalRevenue: { $sum: '$revenueFromFollowers' },
                        totalClicks: { $sum: '$clicksFromFollowers' },
                        exclusiveViews: { $sum: '$exclusiveOffersViewed' },
                        exclusiveRedemptions: { $sum: '$exclusiveOffersRedeemed' }
                    }
                }
            ])
        ]);
        const weekly = weeklyData[0] || {
            newFollowers: 0,
            unfollows: 0,
            totalOrders: 0,
            totalRevenue: 0,
            totalClicks: 0,
            exclusiveViews: 0,
            exclusiveRedemptions: 0
        };
        const monthly = monthlyData[0] || {
            newFollowers: 0,
            unfollows: 0,
            totalOrders: 0,
            totalRevenue: 0,
            totalClicks: 0,
            exclusiveViews: 0,
            exclusiveRedemptions: 0
        };
        // Calculate growth rates
        const weeklyGrowth = weekly.newFollowers - weekly.unfollows;
        const monthlyGrowth = monthly.newFollowers - monthly.unfollows;
        return {
            weekly: {
                ...weekly,
                netGrowth: weeklyGrowth,
                growthRate: weeklyGrowth > 0 ? ((weeklyGrowth / Math.max(weekly.newFollowers, 1)) * 100).toFixed(2) : '0.00'
            },
            monthly: {
                ...monthly,
                netGrowth: monthlyGrowth,
                growthRate: monthlyGrowth > 0 ? ((monthlyGrowth / Math.max(monthly.newFollowers, 1)) * 100).toFixed(2) : '0.00'
            }
        };
    }
    catch (error) {
        console.error('Error getting growth metrics:', error);
        throw error;
    }
}
/**
 * Get detailed analytics summary
 */
async function getDetailedAnalytics(storeId, startDate, endDate) {
    try {
        const [timeSeriesData, growthMetrics, summary] = await Promise.all([
            getAnalytics(storeId, startDate, endDate),
            getGrowthMetrics(storeId),
            FollowerAnalytics_1.FollowerAnalytics.aggregate([
                {
                    $match: {
                        store: new mongoose_1.default.Types.ObjectId(storeId.toString()),
                        date: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalFollowers: { $last: '$followersCount' },
                        totalNewFollowers: { $sum: '$newFollowers' },
                        totalUnfollows: { $sum: '$unfollows' },
                        totalOrders: { $sum: '$ordersFromFollowers' },
                        totalRevenue: { $sum: '$revenueFromFollowers' },
                        totalClicks: { $sum: '$clicksFromFollowers' },
                        avgEngagement: { $avg: '$avgEngagementRate' },
                        totalExclusiveViews: { $sum: '$exclusiveOffersViewed' },
                        totalExclusiveRedemptions: { $sum: '$exclusiveOffersRedeemed' }
                    }
                }
            ])
        ]);
        const summaryData = summary[0] || {
            totalFollowers: 0,
            totalNewFollowers: 0,
            totalUnfollows: 0,
            totalOrders: 0,
            totalRevenue: 0,
            totalClicks: 0,
            avgEngagement: 0,
            totalExclusiveViews: 0,
            totalExclusiveRedemptions: 0
        };
        return {
            timeSeries: timeSeriesData,
            growth: growthMetrics,
            summary: {
                ...summaryData,
                avgOrderValue: summaryData.totalOrders > 0
                    ? (summaryData.totalRevenue / summaryData.totalOrders).toFixed(2)
                    : '0.00',
                exclusiveConversionRate: summaryData.totalExclusiveViews > 0
                    ? ((summaryData.totalExclusiveRedemptions / summaryData.totalExclusiveViews) * 100).toFixed(2)
                    : '0.00'
            }
        };
    }
    catch (error) {
        console.error('Error getting detailed analytics:', error);
        throw error;
    }
}
/**
 * Get current follower count for a store
 */
async function getCurrentFollowerCount(storeId) {
    try {
        return await Wishlist_1.Wishlist.countDocuments({
            'items': {
                $elemMatch: {
                    itemType: 'Store',
                    itemId: new mongoose_1.default.Types.ObjectId(storeId.toString())
                }
            }
        });
    }
    catch (error) {
        console.error('Error getting current follower count:', error);
        return 0;
    }
}
