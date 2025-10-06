"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoryAnalytics = exports.getSearchAnalytics = exports.getAnalyticsDashboard = exports.getUserAnalytics = exports.getPopularStores = exports.getStoreAnalytics = exports.trackEvent = void 0;
const StoreAnalytics_1 = require("../models/StoreAnalytics");
const Store_1 = require("../models/Store");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../middleware/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
// Track an analytics event
exports.trackEvent = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId, eventType, eventData } = req.body;
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    if (!storeId || !eventType) {
        throw new errorHandler_1.AppError('Store ID and event type are required', 400);
    }
    try {
        // Verify store exists
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            throw new errorHandler_1.AppError('Store not found', 404);
        }
        // Track the event
        const analytics = await StoreAnalytics_1.StoreAnalytics.trackEvent({
            storeId,
            userId,
            eventType,
            eventData: {
                ...eventData,
                userAgent: req.headers['user-agent'],
                referrer: req.headers.referer
            },
            sessionId,
            ipAddress
        });
        (0, response_1.sendCreated)(res, {
            analyticsId: analytics._id
        }, 'Event tracked successfully');
    }
    catch (error) {
        console.error('Track event error:', error);
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to track event', 500);
    }
});
// Get store analytics
exports.getStoreAnalytics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    const { startDate, endDate, eventType, groupBy = 'day' } = req.query;
    try {
        // Verify store exists
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            throw new errorHandler_1.AppError('Store not found', 404);
        }
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        const analytics = await StoreAnalytics_1.StoreAnalytics.getStoreAnalytics(storeId, {
            startDate: start,
            endDate: end,
            eventType: eventType,
            groupBy: groupBy
        });
        (0, response_1.sendSuccess)(res, {
            storeId,
            analytics,
            period: {
                startDate: start,
                endDate: end,
                groupBy
            }
        });
    }
    catch (error) {
        console.error('Get store analytics error:', error);
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to fetch store analytics', 500);
    }
});
// Get popular stores
exports.getPopularStores = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate, eventType, limit = 10 } = req.query;
    try {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        const popularStores = await StoreAnalytics_1.StoreAnalytics.getPopularStores({
            startDate: start,
            endDate: end,
            eventType: eventType,
            limit: Number(limit)
        });
        (0, response_1.sendSuccess)(res, {
            popularStores,
            period: {
                startDate: start,
                endDate: end,
                eventType
            }
        });
    }
    catch (error) {
        console.error('Get popular stores error:', error);
        throw new errorHandler_1.AppError('Failed to fetch popular stores', 500);
    }
});
// Get user analytics
exports.getUserAnalytics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { startDate, endDate, eventType } = req.query;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        const userAnalytics = await StoreAnalytics_1.StoreAnalytics.getUserAnalytics(userId, {
            startDate: start,
            endDate: end,
            eventType: eventType
        });
        (0, response_1.sendSuccess)(res, {
            userId,
            analytics: userAnalytics,
            period: {
                startDate: start,
                endDate: end,
                eventType
            }
        });
    }
    catch (error) {
        console.error('Get user analytics error:', error);
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to fetch user analytics', 500);
    }
});
// Get analytics dashboard data
exports.getAnalyticsDashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const end = endDate ? new Date(endDate) : new Date();
        // Get various analytics in parallel
        const [popularStores, totalEvents, uniqueUsers, eventTypeStats] = await Promise.all([
            StoreAnalytics_1.StoreAnalytics.getPopularStores({ startDate: start, endDate: end, limit: 10 }),
            StoreAnalytics_1.StoreAnalytics.countDocuments({
                timestamp: { $gte: start, $lte: end }
            }),
            StoreAnalytics_1.StoreAnalytics.distinct('user', {
                timestamp: { $gte: start, $lte: end },
                user: { $exists: true }
            }),
            StoreAnalytics_1.StoreAnalytics.aggregate([
                {
                    $match: {
                        timestamp: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: '$eventType',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ])
        ]);
        (0, response_1.sendSuccess)(res, {
            dashboard: {
                period: {
                    startDate: start,
                    endDate: end
                },
                overview: {
                    totalEvents,
                    uniqueUsers: uniqueUsers.length,
                    popularStores,
                    eventTypeStats
                }
            }
        });
    }
    catch (error) {
        console.error('Get analytics dashboard error:', error);
        throw new errorHandler_1.AppError('Failed to fetch analytics dashboard', 500);
    }
});
// Get search analytics
exports.getSearchAnalytics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate, limit = 20 } = req.query;
    try {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        const end = endDate ? new Date(endDate) : new Date();
        const searchAnalytics = await StoreAnalytics_1.StoreAnalytics.aggregate([
            {
                $match: {
                    eventType: 'search',
                    timestamp: { $gte: start, $lte: end },
                    'eventData.searchQuery': { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: '$eventData.searchQuery',
                    count: { $sum: 1 },
                    uniqueUsers: { $addToSet: '$user' }
                }
            },
            {
                $project: {
                    searchQuery: '$_id',
                    count: 1,
                    uniqueUsers: { $size: '$uniqueUsers' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: Number(limit) }
        ]);
        (0, response_1.sendSuccess)(res, {
            searchAnalytics,
            period: {
                startDate: start,
                endDate: end
            }
        });
    }
    catch (error) {
        console.error('Get search analytics error:', error);
        throw new errorHandler_1.AppError('Failed to fetch search analytics', 500);
    }
});
// Get category analytics
exports.getCategoryAnalytics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const end = endDate ? new Date(endDate) : new Date();
        const categoryAnalytics = await StoreAnalytics_1.StoreAnalytics.aggregate([
            {
                $match: {
                    timestamp: { $gte: start, $lte: end },
                    'eventData.category': { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: '$eventData.category',
                    count: { $sum: 1 },
                    uniqueUsers: { $addToSet: '$user' },
                    eventTypes: { $addToSet: '$eventType' }
                }
            },
            {
                $project: {
                    category: '$_id',
                    count: 1,
                    uniqueUsers: { $size: '$uniqueUsers' },
                    eventTypes: 1
                }
            },
            { $sort: { count: -1 } }
        ]);
        (0, response_1.sendSuccess)(res, {
            categoryAnalytics,
            period: {
                startDate: start,
                endDate: end
            }
        });
    }
    catch (error) {
        console.error('Get category analytics error:', error);
        throw new errorHandler_1.AppError('Failed to fetch category analytics', 500);
    }
});
