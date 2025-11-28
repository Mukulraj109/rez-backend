"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFollowerAnalyticsSummary = exports.triggerDailySnapshot = exports.getFollowerCount = exports.getFollowerGrowthMetrics = exports.getDetailedFollowerAnalytics = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const followerAnalyticsService_1 = require("../services/followerAnalyticsService");
const response_1 = require("../utils/response");
/**
 * GET /api/stores/:storeId/followers/analytics/detailed
 * Get detailed follower analytics for a store
 */
const getDetailedFollowerAnalytics = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { startDate, endDate } = req.query;
        // Validate storeId
        if (!mongoose_1.default.Types.ObjectId.isValid(storeId)) {
            (0, response_1.sendError)(res, 'Invalid store ID', 400);
            return;
        }
        // Default to last 30 days
        const start = startDate
            ? new Date(startDate)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        // Validate dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            (0, response_1.sendError)(res, 'Invalid date format', 400);
            return;
        }
        if (start > end) {
            (0, response_1.sendError)(res, 'Start date cannot be after end date', 400);
            return;
        }
        const analytics = await (0, followerAnalyticsService_1.getDetailedAnalytics)(storeId, start, end);
        (0, response_1.sendSuccess)(res, analytics, 'Detailed analytics fetched successfully');
    }
    catch (error) {
        console.error('Error fetching detailed analytics:', error);
        (0, response_1.sendError)(res, 'Failed to fetch detailed analytics', 500);
    }
};
exports.getDetailedFollowerAnalytics = getDetailedFollowerAnalytics;
/**
 * GET /api/stores/:storeId/followers/analytics/growth
 * Get growth metrics for a store
 */
const getFollowerGrowthMetrics = async (req, res) => {
    try {
        const { storeId } = req.params;
        // Validate storeId
        if (!mongoose_1.default.Types.ObjectId.isValid(storeId)) {
            (0, response_1.sendError)(res, 'Invalid store ID', 400);
            return;
        }
        const metrics = await (0, followerAnalyticsService_1.getGrowthMetrics)(storeId);
        (0, response_1.sendSuccess)(res, metrics, 'Growth metrics fetched successfully');
    }
    catch (error) {
        console.error('Error fetching growth metrics:', error);
        (0, response_1.sendError)(res, 'Failed to fetch growth metrics', 500);
    }
};
exports.getFollowerGrowthMetrics = getFollowerGrowthMetrics;
/**
 * GET /api/stores/:storeId/followers/count
 * Get current follower count for a store
 */
const getFollowerCount = async (req, res) => {
    try {
        const { storeId } = req.params;
        // Validate storeId
        if (!mongoose_1.default.Types.ObjectId.isValid(storeId)) {
            (0, response_1.sendError)(res, 'Invalid store ID', 400);
            return;
        }
        const count = await (0, followerAnalyticsService_1.getCurrentFollowerCount)(storeId);
        (0, response_1.sendSuccess)(res, { count, storeId }, 'Follower count fetched successfully');
    }
    catch (error) {
        console.error('Error fetching follower count:', error);
        (0, response_1.sendError)(res, 'Failed to fetch follower count', 500);
    }
};
exports.getFollowerCount = getFollowerCount;
/**
 * POST /api/stores/:storeId/followers/analytics/snapshot
 * Manually trigger daily snapshot (admin only)
 */
const triggerDailySnapshot = async (req, res) => {
    try {
        const { storeId } = req.params;
        // Validate storeId
        if (!mongoose_1.default.Types.ObjectId.isValid(storeId)) {
            (0, response_1.sendError)(res, 'Invalid store ID', 400);
            return;
        }
        await (0, followerAnalyticsService_1.recordDailySnapshot)(storeId);
        (0, response_1.sendSuccess)(res, { success: true }, 'Daily snapshot recorded successfully');
    }
    catch (error) {
        console.error('Error recording daily snapshot:', error);
        (0, response_1.sendError)(res, 'Failed to record daily snapshot', 500);
    }
};
exports.triggerDailySnapshot = triggerDailySnapshot;
/**
 * GET /api/stores/:storeId/followers/analytics/summary
 * Get a quick summary of follower analytics
 */
const getFollowerAnalyticsSummary = async (req, res) => {
    try {
        const { storeId } = req.params;
        // Validate storeId
        if (!mongoose_1.default.Types.ObjectId.isValid(storeId)) {
            (0, response_1.sendError)(res, 'Invalid store ID', 400);
            return;
        }
        const [currentCount, growthMetrics] = await Promise.all([
            (0, followerAnalyticsService_1.getCurrentFollowerCount)(storeId),
            (0, followerAnalyticsService_1.getGrowthMetrics)(storeId)
        ]);
        const summary = {
            currentFollowers: currentCount,
            weeklyGrowth: {
                new: growthMetrics.weekly.newFollowers,
                lost: growthMetrics.weekly.unfollows,
                net: growthMetrics.weekly.netGrowth,
                rate: growthMetrics.weekly.growthRate
            },
            monthlyGrowth: {
                new: growthMetrics.monthly.newFollowers,
                lost: growthMetrics.monthly.unfollows,
                net: growthMetrics.monthly.netGrowth,
                rate: growthMetrics.monthly.growthRate
            },
            engagement: {
                weeklyOrders: growthMetrics.weekly.totalOrders,
                weeklyRevenue: growthMetrics.weekly.totalRevenue,
                weeklyClicks: growthMetrics.weekly.totalClicks
            },
            exclusiveOffers: {
                weeklyViews: growthMetrics.weekly.exclusiveViews,
                weeklyRedemptions: growthMetrics.weekly.exclusiveRedemptions,
                conversionRate: growthMetrics.weekly.exclusiveViews > 0
                    ? ((growthMetrics.weekly.exclusiveRedemptions /
                        growthMetrics.weekly.exclusiveViews) *
                        100).toFixed(2)
                    : '0.00'
            }
        };
        (0, response_1.sendSuccess)(res, summary, 'Analytics summary fetched successfully');
    }
    catch (error) {
        console.error('Error fetching analytics summary:', error);
        (0, response_1.sendError)(res, 'Failed to fetch analytics summary', 500);
    }
};
exports.getFollowerAnalyticsSummary = getFollowerAnalyticsSummary;
