"use strict";
// Activity Timeline Service
// Generates timeline views of merchant activities
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityTimelineService = void 0;
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const mongoose_1 = require("mongoose");
class ActivityTimelineService {
    /**
     * Get timeline grouped by date
     */
    static async getTimeline(filters) {
        const query = { merchantId: filters.merchantId };
        if (filters.merchantUserId) {
            query.merchantUserId = filters.merchantUserId;
        }
        if (filters.resourceType) {
            query.resourceType = filters.resourceType;
        }
        if (filters.action) {
            query.action = filters.action;
        }
        if (filters.severity) {
            query.severity = filters.severity;
        }
        if (filters.startDate || filters.endDate) {
            query.timestamp = {};
            if (filters.startDate) {
                query.timestamp.$gte = filters.startDate;
            }
            if (filters.endDate) {
                query.timestamp.$lte = filters.endDate;
            }
        }
        const activities = await AuditLog_1.default.find(query)
            .sort({ timestamp: -1 })
            .limit(filters.limit || 100)
            .populate('merchantUserId', 'name email')
            .lean();
        // Group by date
        const grouped = this.groupByDate(activities);
        return grouped;
    }
    /**
     * Get today's activities
     */
    static async getTodayActivities(merchantId) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        return await AuditLog_1.default.find({
            merchantId,
            timestamp: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        })
            .sort({ timestamp: -1 })
            .populate('merchantUserId', 'name email')
            .lean();
    }
    /**
     * Get recent activities
     */
    static async getRecentActivities(merchantId, limit = 20) {
        return await AuditLog_1.default.find({ merchantId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .populate('merchantUserId', 'name email')
            .lean();
    }
    /**
     * Get activity summary for a period
     */
    static async getActivitySummary(merchantId, startDate, endDate) {
        const query = {
            merchantId,
            timestamp: {
                $gte: startDate,
                $lte: endDate
            }
        };
        const [totalActivities, byAction, byResourceType, bySeverity, byUser, dailyBreakdown] = await Promise.all([
            AuditLog_1.default.countDocuments(query),
            AuditLog_1.default.aggregate([
                { $match: query },
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            AuditLog_1.default.aggregate([
                { $match: query },
                { $group: { _id: '$resourceType', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            AuditLog_1.default.aggregate([
                { $match: query },
                { $group: { _id: '$severity', count: { $sum: 1 } } }
            ]),
            AuditLog_1.default.aggregate([
                { $match: query },
                { $match: { merchantUserId: { $exists: true } } },
                { $group: { _id: '$merchantUserId', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
            ]),
            AuditLog_1.default.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);
        return {
            totalActivities,
            byAction: byAction.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byResourceType: byResourceType.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            bySeverity: bySeverity.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byUser: byUser.map(item => ({
                userId: item._id.toString(),
                userName: item.user?.name || 'Unknown',
                count: item.count
            })),
            dailyBreakdown: dailyBreakdown.map(item => ({
                date: item._id,
                count: item.count
            }))
        };
    }
    /**
     * Get critical activities
     */
    static async getCriticalActivities(merchantId, limit = 50) {
        return await AuditLog_1.default.find({
            merchantId,
            severity: { $in: ['critical', 'error'] }
        })
            .sort({ timestamp: -1 })
            .limit(limit)
            .populate('merchantUserId', 'name email')
            .lean();
    }
    /**
     * Get activity feed (real-time compatible)
     */
    static async getActivityFeed(merchantId, since, limit = 50) {
        const query = { merchantId };
        if (since) {
            query.timestamp = { $gt: since };
        }
        return await AuditLog_1.default.find(query)
            .sort({ timestamp: -1 })
            .limit(limit)
            .populate('merchantUserId', 'name email')
            .lean();
    }
    /**
     * Search activities
     */
    static async searchActivities(merchantId, searchTerm, filters) {
        const query = {
            merchantId,
            $or: [
                { action: { $regex: searchTerm, $options: 'i' } },
                { resourceType: { $regex: searchTerm, $options: 'i' } }
            ]
        };
        if (filters?.resourceType) {
            query.resourceType = filters.resourceType;
        }
        if (filters?.startDate || filters?.endDate) {
            query.timestamp = {};
            if (filters.startDate) {
                query.timestamp.$gte = filters.startDate;
            }
            if (filters.endDate) {
                query.timestamp.$lte = filters.endDate;
            }
        }
        return await AuditLog_1.default.find(query)
            .sort({ timestamp: -1 })
            .limit(100)
            .populate('merchantUserId', 'name email')
            .lean();
    }
    /**
     * Helper: Group activities by date
     */
    static groupByDate(activities) {
        const groups = new Map();
        for (const activity of activities) {
            const date = new Date(activity.timestamp).toISOString().split('T')[0];
            if (!groups.has(date)) {
                groups.set(date, []);
            }
            groups.get(date).push(activity);
        }
        return Array.from(groups.entries()).map(([date, activities]) => ({
            date,
            activities,
            count: activities.length
        }));
    }
    /**
     * Get activity heatmap data
     */
    static async getActivityHeatmap(merchantId, startDate, endDate) {
        const result = await AuditLog_1.default.aggregate([
            {
                $match: {
                    merchantId: new mongoose_1.Types.ObjectId(merchantId.toString()),
                    timestamp: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                        hour: { $hour: '$timestamp' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.date': 1, '_id.hour': 1 }
            }
        ]);
        return result.map(item => ({
            date: item._id.date,
            hour: item._id.hour,
            count: item.count
        }));
    }
    /**
     * Format activity for display
     */
    static formatActivity(activity) {
        const user = activity.merchantUserId?.name || 'System';
        const action = activity.action.replace(/\./g, ' ').replace(/_/g, ' ');
        const timestamp = new Date(activity.timestamp).toLocaleString();
        return `[${timestamp}] ${user} ${action} ${activity.resourceType}${activity.resourceId ? ` #${activity.resourceId}` : ''}`;
    }
}
exports.ActivityTimelineService = ActivityTimelineService;
exports.default = ActivityTimelineService;
