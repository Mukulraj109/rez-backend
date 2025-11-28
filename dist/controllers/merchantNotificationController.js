"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsRead = exports.getUnreadCount = exports.unsubscribeFromSMS = exports.subscribeToSMS = exports.unsubscribeFromEmail = exports.subscribeToEmail = exports.getNotificationStats = exports.deleteNotification = exports.markNotificationAsRead = exports.getNotificationById = exports.updateNotificationPreferences = exports.getNotificationPreferences = exports.sendTestNotification = exports.getArchivedNotifications = exports.clearAllNotifications = exports.archiveNotification = exports.deleteMultipleNotifications = exports.markMultipleAsRead = exports.getUnreadNotifications = exports.getMerchantNotifications = void 0;
const Notification_1 = require("../models/Notification");
const UserSettings_1 = require("../models/UserSettings");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const socket_1 = require("../config/socket");
const socket_2 = require("../types/socket");
/**
 * Get all notifications for merchant with filters and pagination
 * Enhanced with type, status, sorting filters
 */
exports.getMerchantNotifications = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Merchant ID not found. Authentication required.', 401);
    }
    const { type, status, category, sortBy = 'createdAt', order = 'desc', page = 1, limit = 20 } = req.query;
    try {
        const query = {
            user: userId,
            isArchived: false,
            deletedAt: { $exists: false }
        };
        // Apply filters
        if (type) {
            query.type = type;
        }
        if (category) {
            query.category = category;
        }
        if (status === 'unread') {
            query.isRead = false;
        }
        else if (status === 'read') {
            query.isRead = true;
        }
        const skip = (Number(page) - 1) * Number(limit);
        // Build sort object
        const sortOrder = order === 'desc' ? -1 : 1;
        const sortObj = {};
        if (sortBy === 'priority') {
            // Custom priority sorting: urgent > high > medium > low
            sortObj.priority = sortOrder;
            sortObj.createdAt = -1; // Secondary sort by date
        }
        else {
            sortObj[sortBy] = sortOrder;
        }
        const notifications = await Notification_1.Notification.find(query)
            .sort(sortObj)
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await Notification_1.Notification.countDocuments(query);
        const unreadCount = await Notification_1.Notification.countDocuments({
            user: userId,
            isRead: false,
            isArchived: false,
            deletedAt: { $exists: false }
        });
        return (0, response_1.sendSuccess)(res, {
            notifications: notifications || [],
            unreadCount: unreadCount || 0,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: total || 0,
                totalPages: Math.ceil((total || 0) / Number(limit))
            }
        }, 'Notifications retrieved successfully');
    }
    catch (error) {
        console.error('Get merchant notifications error:', error);
        throw new errorHandler_1.AppError(error.message || 'Failed to fetch notifications', 500);
    }
});
/**
 * Get unread notifications only
 * Returns most recent 50 unread notifications
 */
exports.getUnreadNotifications = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    try {
        const notifications = await Notification_1.Notification.find({
            user: userId,
            isRead: false,
            isArchived: false,
            deletedAt: { $exists: false }
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        const unreadCount = notifications.length;
        // Set custom header with unread count
        res.setHeader('X-Unread-Count', unreadCount.toString());
        (0, response_1.sendSuccess)(res, {
            notifications,
            count: unreadCount
        }, 'Unread notifications retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch unread notifications', 500);
    }
});
/**
 * Mark multiple notifications as read
 * Bulk update operation
 */
exports.markMultipleAsRead = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    const { notificationIds } = req.body;
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
        throw new errorHandler_1.AppError('notificationIds array is required', 400);
    }
    try {
        const result = await Notification_1.Notification.updateMany({
            _id: { $in: notificationIds },
            user: userId,
            isRead: false,
            deletedAt: { $exists: false }
        }, {
            $set: {
                isRead: true,
                readAt: new Date(),
                'deliveryStatus.inApp.read': true,
                'deliveryStatus.inApp.readAt': new Date()
            }
        });
        const unreadCount = await Notification_1.Notification.countDocuments({
            user: userId,
            isRead: false,
            isArchived: false,
            deletedAt: { $exists: false }
        });
        // Emit socket event for real-time update
        try {
            const io = (0, socket_1.getIO)();
            io.to(socket_2.SocketRoom.user(userId)).emit('notifications:bulk-read', {
                notificationIds,
                updated: result.modifiedCount,
                unreadCount,
                timestamp: new Date()
            });
        }
        catch (socketError) {
            console.error('Socket emit error:', socketError);
        }
        (0, response_1.sendSuccess)(res, {
            updated: result.modifiedCount,
            unreadCount
        }, `${result.modifiedCount} notification(s) marked as read`);
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to mark notifications as read', 500);
    }
});
/**
 * Delete multiple notifications
 * Soft delete using deletedAt timestamp
 */
exports.deleteMultipleNotifications = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    const { notificationIds } = req.body;
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
        throw new errorHandler_1.AppError('notificationIds array is required', 400);
    }
    try {
        // Soft delete by adding deletedAt timestamp
        const result = await Notification_1.Notification.updateMany({
            _id: { $in: notificationIds },
            user: userId
        }, {
            $set: {
                deletedAt: new Date()
            }
        });
        // Emit socket event for real-time update
        try {
            const io = (0, socket_1.getIO)();
            io.to(socket_2.SocketRoom.user(userId)).emit('notifications:bulk-deleted', {
                notificationIds,
                deleted: result.modifiedCount,
                timestamp: new Date()
            });
        }
        catch (socketError) {
            console.error('Socket emit error:', socketError);
        }
        (0, response_1.sendSuccess)(res, {
            deleted: result.modifiedCount
        }, `${result.modifiedCount} notification(s) deleted`);
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to delete notifications', 500);
    }
});
/**
 * Archive a single notification
 * Sets archived flag to true
 */
exports.archiveNotification = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    const { id } = req.params;
    try {
        const notification = await Notification_1.Notification.findOneAndUpdate({
            _id: id,
            user: userId
        }, {
            $set: {
                isArchived: true,
                archivedAt: new Date()
            }
        }, { new: true });
        if (!notification) {
            return (0, response_1.sendNotFound)(res, 'Notification not found');
        }
        // Emit socket event for real-time update
        try {
            const io = (0, socket_1.getIO)();
            io.to(socket_2.SocketRoom.user(userId)).emit('notification:archived', {
                notificationId: id,
                timestamp: new Date()
            });
        }
        catch (socketError) {
            console.error('Socket emit error:', socketError);
        }
        (0, response_1.sendSuccess)(res, {
            notification
        }, 'Notification archived successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to archive notification', 500);
    }
});
/**
 * Clear all notifications (soft delete)
 * Optionally filter by read status
 */
exports.clearAllNotifications = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Merchant ID not found. Authentication required.', 401);
    }
    const { onlyRead } = req.query;
    try {
        const query = {
            user: userId,
            isArchived: false,
            deletedAt: { $exists: false } // Only clear notifications that aren't already deleted
        };
        // If onlyRead=true, only clear read notifications
        if (onlyRead === 'true') {
            query.isRead = true;
        }
        const result = await Notification_1.Notification.updateMany(query, {
            $set: {
                deletedAt: new Date()
            }
        });
        // Emit socket event for real-time update
        try {
            const io = (0, socket_1.getIO)();
            io.to(socket_2.SocketRoom.user(userId)).emit('notifications:cleared', {
                cleared: result.modifiedCount,
                onlyRead: onlyRead === 'true',
                timestamp: new Date()
            });
        }
        catch (socketError) {
            console.error('Socket emit error:', socketError);
            // Don't fail the request if socket fails
        }
        return (0, response_1.sendSuccess)(res, {
            cleared: result.modifiedCount || 0
        }, `${result.modifiedCount || 0} notification(s) cleared`);
    }
    catch (error) {
        console.error('Clear all notifications error:', error);
        throw new errorHandler_1.AppError(error.message || 'Failed to clear notifications', 500);
    }
});
/**
 * Get archived notifications
 * With pagination support
 */
exports.getArchivedNotifications = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    const { page = 1, limit = 20 } = req.query;
    try {
        const skip = (Number(page) - 1) * Number(limit);
        const notifications = await Notification_1.Notification.find({
            user: userId,
            isArchived: true
        })
            .sort({ archivedAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await Notification_1.Notification.countDocuments({
            user: userId,
            isArchived: true
        });
        (0, response_1.sendSuccess)(res, {
            notifications,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit))
            }
        }, 'Archived notifications retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch archived notifications', 500);
    }
});
/**
 * Send test notification
 * For testing notification preferences and delivery
 */
exports.sendTestNotification = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    try {
        const testNotification = await Notification_1.Notification.create({
            user: userId,
            title: 'Test Notification',
            message: 'This is a test notification to verify your notification settings are working correctly.',
            type: 'info',
            category: 'system',
            priority: 'medium',
            deliveryChannels: ['in_app'],
            source: 'system',
            data: {
                metadata: {
                    isTest: true,
                    createdVia: 'test-endpoint'
                }
            }
        });
        // Emit socket event for real-time notification
        try {
            const io = (0, socket_1.getIO)();
            io.to(socket_2.SocketRoom.user(userId)).emit('notification:new', {
                notification: testNotification,
                timestamp: new Date()
            });
        }
        catch (socketError) {
            console.error('Socket emit error:', socketError);
        }
        (0, response_1.sendSuccess)(res, {
            notification: testNotification
        }, 'Test notification sent successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to send test notification', 500);
    }
});
/**
 * Get notification preferences
 * Returns user's notification preferences
 */
exports.getNotificationPreferences = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    try {
        // This would typically come from a UserSettings or NotificationPreferences model
        // For now, returning a mock structure
        const preferences = {
            userId,
            channels: {
                email: true,
                push: true,
                sms: false,
                inApp: true
            },
            categories: {
                order: { email: true, push: true, sms: false, inApp: true },
                earning: { email: true, push: true, sms: false, inApp: true },
                general: { email: false, push: true, sms: false, inApp: true },
                promotional: { email: false, push: false, sms: false, inApp: true },
                social: { email: false, push: true, sms: false, inApp: true },
                security: { email: true, push: true, sms: true, inApp: true },
                system: { email: false, push: true, sms: false, inApp: true },
                reminder: { email: true, push: true, sms: false, inApp: true }
            },
            quietHours: {
                enabled: false,
                start: '22:00',
                end: '08:00',
                timezone: 'Asia/Kolkata'
            },
            frequency: {
                digest: 'daily', // 'immediate', 'daily', 'weekly'
                maxPerDay: 50
            }
        };
        (0, response_1.sendSuccess)(res, preferences, 'Notification preferences retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch notification preferences', 500);
    }
});
/**
 * Update notification preferences
 * Updates user's notification preferences
 */
exports.updateNotificationPreferences = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    const preferences = req.body;
    try {
        // Update UserSettings with new notification preferences
        const userSettings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: userId }, {
            $set: {
                'notifications': preferences.categories || preferences,
                lastUpdated: new Date()
            }
        }, { new: true, upsert: true });
        (0, response_1.sendSuccess)(res, userSettings?.notifications || preferences, 'Notification preferences updated successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to update notification preferences', 500);
    }
});
/**
 * Get single notification by ID
 * Returns detailed notification information
 */
exports.getNotificationById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    const { id } = req.params;
    try {
        const notification = await Notification_1.Notification.findOne({
            _id: id,
            user: userId,
            deletedAt: { $exists: false }
        }).lean();
        if (!notification) {
            return (0, response_1.sendNotFound)(res, 'Notification not found');
        }
        (0, response_1.sendSuccess)(res, { notification }, 'Notification retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch notification', 500);
    }
});
/**
 * Mark single notification as read
 * Updates read status for a specific notification
 */
exports.markNotificationAsRead = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    const { id } = req.params;
    try {
        const notification = await Notification_1.Notification.findOneAndUpdate({
            _id: id,
            user: userId,
            isRead: false,
            deletedAt: { $exists: false }
        }, {
            $set: {
                isRead: true,
                readAt: new Date(),
                'deliveryStatus.inApp.read': true,
                'deliveryStatus.inApp.readAt': new Date()
            }
        }, { new: true });
        if (!notification) {
            return (0, response_1.sendNotFound)(res, 'Notification not found or already read');
        }
        const unreadCount = await Notification_1.Notification.countDocuments({
            user: userId,
            isRead: false,
            isArchived: false,
            deletedAt: { $exists: false }
        });
        // Emit socket event for real-time update
        try {
            const io = (0, socket_1.getIO)();
            io.to(socket_2.SocketRoom.user(userId)).emit('notification:read', {
                notificationId: id,
                unreadCount,
                timestamp: new Date()
            });
        }
        catch (socketError) {
            console.error('Socket emit error:', socketError);
        }
        (0, response_1.sendSuccess)(res, {
            notification,
            unreadCount
        }, 'Notification marked as read');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to mark notification as read', 500);
    }
});
/**
 * Delete single notification
 * Soft delete using deletedAt timestamp
 */
exports.deleteNotification = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    const { id } = req.params;
    try {
        const notification = await Notification_1.Notification.findOneAndUpdate({
            _id: id,
            user: userId
        }, {
            $set: {
                deletedAt: new Date()
            }
        }, { new: true });
        if (!notification) {
            return (0, response_1.sendNotFound)(res, 'Notification not found');
        }
        // Emit socket event for real-time update
        try {
            const io = (0, socket_1.getIO)();
            io.to(socket_2.SocketRoom.user(userId)).emit('notification:deleted', {
                notificationId: id,
                timestamp: new Date()
            });
        }
        catch (socketError) {
            console.error('Socket emit error:', socketError);
        }
        (0, response_1.sendSuccess)(res, {
            notification
        }, 'Notification deleted successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to delete notification', 500);
    }
});
/**
 * Get notification statistics
 * Returns aggregated stats for notifications
 */
exports.getNotificationStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Merchant ID not found. Authentication required.', 401);
    }
    try {
        const [totalStats, categoryStats, priorityStats, recentActivity] = await Promise.all([
            // Total counts
            Notification_1.Notification.aggregate([
                {
                    $match: {
                        user: userId,
                        deletedAt: { $exists: false }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        unread: {
                            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
                        },
                        read: {
                            $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] }
                        },
                        archived: {
                            $sum: { $cond: [{ $eq: ['$isArchived', true] }, 1, 0] }
                        }
                    }
                }
            ]),
            // By category
            Notification_1.Notification.aggregate([
                {
                    $match: {
                        user: userId,
                        deletedAt: { $exists: false }
                    }
                },
                {
                    $group: {
                        _id: '$category',
                        count: { $sum: 1 },
                        unread: {
                            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
                        }
                    }
                },
                {
                    $sort: { count: -1 }
                }
            ]),
            // By priority
            Notification_1.Notification.aggregate([
                {
                    $match: {
                        user: userId,
                        isRead: false,
                        deletedAt: { $exists: false }
                    }
                },
                {
                    $group: {
                        _id: '$priority',
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { count: -1 }
                }
            ]),
            // Recent activity (last 7 days)
            Notification_1.Notification.aggregate([
                {
                    $match: {
                        user: userId,
                        createdAt: {
                            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        },
                        deletedAt: { $exists: false }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { _id: 1 }
                }
            ])
        ]);
        const stats = {
            overview: totalStats[0] || {
                total: 0,
                unread: 0,
                read: 0,
                archived: 0
            },
            byCategory: categoryStats || [],
            byPriority: priorityStats || [],
            recentActivity: recentActivity || [],
            generatedAt: new Date()
        };
        return (0, response_1.sendSuccess)(res, stats, 'Notification statistics retrieved successfully');
    }
    catch (error) {
        console.error('Get notification stats error:', error);
        throw new errorHandler_1.AppError(error.message || 'Failed to fetch notification statistics', 500);
    }
});
/**
 * Subscribe to email notifications
 * Enable email notifications in user preferences
 */
exports.subscribeToEmail = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    try {
        const userSettings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: userId }, {
            $set: {
                'notifications.email.enabled': true,
                lastUpdated: new Date()
            }
        }, { new: true, upsert: true });
        // Emit socket event
        try {
            const io = (0, socket_1.getIO)();
            io.to(socket_2.SocketRoom.user(userId)).emit('preferences:updated', {
                type: 'email_subscribed',
                timestamp: new Date()
            });
        }
        catch (socketError) {
            console.error('Socket emit error:', socketError);
        }
        (0, response_1.sendSuccess)(res, {
            emailEnabled: userSettings?.notifications?.email?.enabled || true,
            preferences: userSettings?.notifications
        }, 'Successfully subscribed to email notifications');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to subscribe to email notifications', 500);
    }
});
/**
 * Unsubscribe from email notifications
 * Disable email notifications in user preferences
 */
exports.unsubscribeFromEmail = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    try {
        const userSettings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: userId }, {
            $set: {
                'notifications.email.enabled': false,
                lastUpdated: new Date()
            }
        }, { new: true, upsert: true });
        // Emit socket event
        try {
            const io = (0, socket_1.getIO)();
            io.to(socket_2.SocketRoom.user(userId)).emit('preferences:updated', {
                type: 'email_unsubscribed',
                timestamp: new Date()
            });
        }
        catch (socketError) {
            console.error('Socket emit error:', socketError);
        }
        (0, response_1.sendSuccess)(res, {
            emailEnabled: userSettings?.notifications?.email?.enabled || false,
            preferences: userSettings?.notifications
        }, 'Successfully unsubscribed from email notifications');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to unsubscribe from email notifications', 500);
    }
});
/**
 * Subscribe to SMS notifications
 * Enable SMS notifications in user preferences
 */
exports.subscribeToSMS = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    try {
        const userSettings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: userId }, {
            $set: {
                'notifications.sms.enabled': true,
                lastUpdated: new Date()
            }
        }, { new: true, upsert: true });
        // Emit socket event
        try {
            const io = (0, socket_1.getIO)();
            io.to(socket_2.SocketRoom.user(userId)).emit('preferences:updated', {
                type: 'sms_subscribed',
                timestamp: new Date()
            });
        }
        catch (socketError) {
            console.error('Socket emit error:', socketError);
        }
        (0, response_1.sendSuccess)(res, {
            smsEnabled: userSettings?.notifications?.sms?.enabled || true,
            preferences: userSettings?.notifications
        }, 'Successfully subscribed to SMS notifications');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to subscribe to SMS notifications', 500);
    }
});
/**
 * Unsubscribe from SMS notifications
 * Disable SMS notifications in user preferences
 */
exports.unsubscribeFromSMS = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    try {
        const userSettings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: userId }, {
            $set: {
                'notifications.sms.enabled': false,
                lastUpdated: new Date()
            }
        }, { new: true, upsert: true });
        // Emit socket event
        try {
            const io = (0, socket_1.getIO)();
            io.to(socket_2.SocketRoom.user(userId)).emit('preferences:updated', {
                type: 'sms_unsubscribed',
                timestamp: new Date()
            });
        }
        catch (socketError) {
            console.error('Socket emit error:', socketError);
        }
        (0, response_1.sendSuccess)(res, {
            smsEnabled: userSettings?.notifications?.sms?.enabled || false,
            preferences: userSettings?.notifications
        }, 'Successfully unsubscribed from SMS notifications');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to unsubscribe from SMS notifications', 500);
    }
});
/**
 * Get unread notifications count only
 * Fast endpoint for badge counts
 */
exports.getUnreadCount = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Merchant ID not found. Authentication required.', 401);
    }
    try {
        const unreadCount = await Notification_1.Notification.countDocuments({
            user: userId,
            isRead: false,
            isArchived: false,
            deletedAt: { $exists: false }
        });
        return (0, response_1.sendSuccess)(res, {
            count: unreadCount || 0,
            timestamp: new Date()
        }, 'Unread count retrieved successfully');
    }
    catch (error) {
        console.error('Get unread count error:', error);
        throw new errorHandler_1.AppError(error.message || 'Failed to fetch unread count', 500);
    }
});
/**
 * Mark all notifications as read
 * Bulk operation to mark all unread notifications as read
 */
exports.markAllAsRead = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.merchantId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Merchant ID not found. Authentication required.', 401);
    }
    try {
        const result = await Notification_1.Notification.updateMany({
            user: userId,
            isRead: false,
            isArchived: false,
            deletedAt: { $exists: false }
        }, {
            $set: {
                isRead: true,
                readAt: new Date(),
                'deliveryStatus.inApp.read': true,
                'deliveryStatus.inApp.readAt': new Date()
            }
        });
        // Get updated unread count
        const unreadCount = await Notification_1.Notification.countDocuments({
            user: userId,
            isRead: false,
            isArchived: false,
            deletedAt: { $exists: false }
        });
        // Emit socket event for real-time update
        try {
            const io = (0, socket_1.getIO)();
            io.to(socket_2.SocketRoom.user(userId)).emit('notifications:bulk-read', {
                updated: result.modifiedCount,
                unreadCount,
                timestamp: new Date()
            });
        }
        catch (socketError) {
            console.error('Socket emit error:', socketError);
            // Don't fail the request if socket fails
        }
        return (0, response_1.sendSuccess)(res, {
            updated: result.modifiedCount || 0,
            unreadCount: unreadCount || 0
        }, `All notifications marked as read (${result.modifiedCount || 0} updated)`);
    }
    catch (error) {
        console.error('Mark all as read error:', error);
        throw new errorHandler_1.AppError(error.message || 'Failed to mark all notifications as read', 500);
    }
});
