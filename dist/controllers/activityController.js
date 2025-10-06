"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchCreateActivities = exports.getActivitySummary = exports.clearAllActivities = exports.deleteActivity = exports.createActivity = exports.getActivityById = exports.getUserActivities = void 0;
const Activity_1 = require("../models/Activity");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const errorHandler_1 = require("../middleware/errorHandler");
// Get user activities (recent activity feed)
exports.getUserActivities = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const type = req.query.type;
    const query = { user: req.user._id };
    if (type) {
        query.type = type;
    }
    const [activities, total] = await Promise.all([
        Activity_1.Activity.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Activity_1.Activity.countDocuments(query)
    ]);
    const pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
    };
    (0, response_1.sendSuccess)(res, { activities, pagination }, 'Activities retrieved successfully');
});
// Get activity by ID
exports.getActivityById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { id } = req.params;
    const activity = await Activity_1.Activity.findOne({ _id: id, user: req.user._id });
    if (!activity) {
        return (0, response_1.sendNotFound)(res, 'Activity not found');
    }
    (0, response_1.sendSuccess)(res, activity, 'Activity retrieved successfully');
});
// Create activity (typically called by system)
exports.createActivity = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { type, title, description, amount, icon, color, relatedEntity, metadata } = req.body;
    // Get default icon and color if not provided
    const defaults = (0, Activity_1.getActivityTypeDefaults)(type);
    const activityData = {
        user: req.user._id,
        type,
        title,
        description,
        amount,
        icon: icon || defaults.icon,
        color: color || defaults.color,
        relatedEntity,
        metadata
    };
    const activity = await Activity_1.Activity.create(activityData);
    (0, response_1.sendSuccess)(res, activity, 'Activity created successfully', 201);
});
// Delete activity
exports.deleteActivity = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { id } = req.params;
    const activity = await Activity_1.Activity.findOneAndDelete({ _id: id, user: req.user._id });
    if (!activity) {
        return (0, response_1.sendNotFound)(res, 'Activity not found');
    }
    (0, response_1.sendSuccess)(res, { deletedId: id }, 'Activity deleted successfully');
});
// Clear all activities
exports.clearAllActivities = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const result = await Activity_1.Activity.deleteMany({ user: req.user._id });
    (0, response_1.sendSuccess)(res, { deletedCount: result.deletedCount }, 'All activities cleared successfully');
});
// Get activity summary by type
exports.getActivitySummary = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const summary = await Activity_1.Activity.aggregate([
        { $match: { user: req.user._id } },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalAmount: { $sum: { $ifNull: ['$amount', 0] } }
            }
        },
        {
            $project: {
                type: '$_id',
                count: 1,
                totalAmount: 1,
                _id: 0
            }
        },
        { $sort: { count: -1 } }
    ]);
    const totalActivities = summary.reduce((sum, item) => sum + item.count, 0);
    (0, response_1.sendSuccess)(res, { summary, totalActivities }, 'Activity summary retrieved successfully');
});
// Batch create activities (for system use - importing historical data)
exports.batchCreateActivities = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { activities } = req.body;
    if (!Array.isArray(activities) || activities.length === 0) {
        return (0, response_1.sendBadRequest)(res, 'Activities array is required');
    }
    // Add user ID to all activities and set defaults
    const activitiesWithDefaults = activities.map(activity => {
        const defaults = (0, Activity_1.getActivityTypeDefaults)(activity.type);
        return {
            ...activity,
            user: req.user._id,
            icon: activity.icon || defaults.icon,
            color: activity.color || defaults.color
        };
    });
    const created = await Activity_1.Activity.insertMany(activitiesWithDefaults);
    (0, response_1.sendSuccess)(res, created, `${created.length} activities created successfully`, 201);
});
