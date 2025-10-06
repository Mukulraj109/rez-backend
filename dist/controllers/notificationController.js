"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.markAsRead = exports.getUserNotifications = void 0;
const Notification_1 = require("../models/Notification");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
// Get user notifications
exports.getUserNotifications = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { type, isRead, page = 1, limit = 20 } = req.query;
    try {
        const query = { user: userId };
        if (type)
            query.type = type;
        if (isRead !== undefined)
            query.isRead = isRead === 'true';
        const skip = (Number(page) - 1) * Number(limit);
        const notifications = await Notification_1.Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await Notification_1.Notification.countDocuments(query);
        const unreadCount = await Notification_1.Notification.countDocuments({ user: userId, isRead: false });
        (0, response_1.sendSuccess)(res, {
            notifications,
            unreadCount,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit))
            }
        }, 'Notifications retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch notifications', 500);
    }
});
// Mark notifications as read
exports.markAsRead = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { notificationIds } = req.body;
    try {
        const query = notificationIds && notificationIds.length > 0
            ? { _id: { $in: notificationIds }, user: userId }
            : { user: userId, isRead: false };
        await Notification_1.Notification.updateMany(query, {
            isRead: true,
            readAt: new Date()
        });
        const unreadCount = await Notification_1.Notification.countDocuments({ user: userId, isRead: false });
        (0, response_1.sendSuccess)(res, { unreadCount }, 'Notifications marked as read');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to mark notifications as read', 500);
    }
});
// Delete notification
exports.deleteNotification = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.userId;
    try {
        const notification = await Notification_1.Notification.findOneAndDelete({
            _id: notificationId,
            user: userId
        });
        if (!notification) {
            return (0, response_1.sendNotFound)(res, 'Notification not found');
        }
        (0, response_1.sendSuccess)(res, null, 'Notification deleted successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to delete notification', 500);
    }
});
