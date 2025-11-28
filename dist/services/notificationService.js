"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const Notification_1 = require("../models/Notification");
const UserSettings_1 = require("../models/UserSettings");
const socket_1 = require("../config/socket");
const socket_2 = require("../types/socket");
class NotificationService {
    /**
     * Create a new notification
     * Automatically emits Socket.IO event for real-time delivery
     */
    static async createNotification(options) {
        const { userId, title, message, type = 'info', category, priority = 'medium', data = {}, deliveryChannels = ['in_app'], scheduledAt, expiresAt, source = 'system', template, variables } = options;
        // Check user preferences to determine delivery channels
        const userSettings = await UserSettings_1.UserSettings.findOne({ user: userId });
        const finalDeliveryChannels = this.determineDeliveryChannels(deliveryChannels, category, userSettings);
        // Create notification
        const notification = await Notification_1.Notification.create({
            user: userId,
            title,
            message,
            type,
            category,
            priority,
            data,
            deliveryChannels: finalDeliveryChannels,
            scheduledAt,
            expiresAt,
            source,
            template,
            variables
        });
        // Emit real-time notification via Socket.IO
        if (!scheduledAt || scheduledAt <= new Date()) {
            this.emitNotificationToUser(userId.toString(), notification);
        }
        return notification;
    }
    /**
     * Create bulk notifications
     * Efficient batch creation for multiple users
     */
    static async createBulkNotifications(userIds, options) {
        const batchId = `BATCH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const notifications = await Promise.all(userIds.map(userId => this.createNotification({
            ...options,
            userId
        })));
        return notifications;
    }
    /**
     * Determine delivery channels based on user preferences
     */
    static determineDeliveryChannels(requestedChannels, category, userSettings) {
        if (!userSettings || !userSettings.notifications) {
            return requestedChannels;
        }
        const { push, email, sms, inApp } = userSettings.notifications;
        const allowedChannels = [];
        // Check each requested channel against user preferences
        if (requestedChannels.includes('push') && push?.enabled) {
            allowedChannels.push('push');
        }
        if (requestedChannels.includes('email') && email?.enabled) {
            allowedChannels.push('email');
        }
        if (requestedChannels.includes('sms') && sms?.enabled) {
            allowedChannels.push('sms');
        }
        if (requestedChannels.includes('in_app') && inApp?.enabled !== false) {
            allowedChannels.push('in_app');
        }
        // Always include in_app as fallback
        if (allowedChannels.length === 0) {
            allowedChannels.push('in_app');
        }
        return allowedChannels;
    }
    /**
     * Emit notification to user via Socket.IO
     */
    static emitNotificationToUser(userId, notification) {
        try {
            const io = (0, socket_1.getIO)();
            const room = socket_2.SocketRoom.user(userId);
            io.to(room).emit('notification:new', {
                notification: notification.toObject(),
                timestamp: new Date()
            });
            // Also emit unread count update
            this.emitUnreadCount(userId);
        }
        catch (error) {
            console.error('Failed to emit notification via Socket.IO:', error);
        }
    }
    /**
     * Emit updated unread count to user
     */
    static async emitUnreadCount(userId) {
        try {
            const unreadCount = await Notification_1.Notification.countDocuments({
                user: userId,
                isRead: false,
                isArchived: false,
                deletedAt: { $exists: false }
            });
            const io = (0, socket_1.getIO)();
            io.to(socket_2.SocketRoom.user(userId)).emit('notification:count', {
                count: unreadCount,
                timestamp: new Date()
            });
        }
        catch (error) {
            console.error('Failed to emit unread count:', error);
        }
    }
    /**
     * Helper: Create order notification
     */
    static async notifyOrderUpdate(userId, orderId, status, orderNumber) {
        const statusMessages = {
            placed: {
                title: 'Order Placed Successfully',
                message: `Your order ${orderNumber || orderId} has been placed successfully.`,
                type: 'success',
                priority: 'medium'
            },
            confirmed: {
                title: 'Order Confirmed',
                message: `Your order ${orderNumber || orderId} has been confirmed and is being prepared.`,
                type: 'success',
                priority: 'medium'
            },
            shipped: {
                title: 'Order Shipped',
                message: `Your order ${orderNumber || orderId} has been shipped and is on its way!`,
                type: 'info',
                priority: 'high'
            },
            delivered: {
                title: 'Order Delivered',
                message: `Your order ${orderNumber || orderId} has been delivered. Enjoy your purchase!`,
                type: 'success',
                priority: 'high'
            },
            cancelled: {
                title: 'Order Cancelled',
                message: `Your order ${orderNumber || orderId} has been cancelled.`,
                type: 'warning',
                priority: 'high'
            }
        };
        const statusInfo = statusMessages[status] || {
            title: 'Order Update',
            message: `Your order ${orderNumber || orderId} status has been updated to ${status}.`,
            type: 'info',
            priority: 'medium'
        };
        return this.createNotification({
            userId,
            title: statusInfo.title,
            message: statusInfo.message,
            type: statusInfo.type,
            category: 'order',
            priority: statusInfo.priority,
            data: {
                orderId,
                deepLink: `/orders/${orderId}`,
                actionButton: {
                    text: 'View Order',
                    action: 'navigate',
                    target: `/orders/${orderId}`
                }
            },
            deliveryChannels: ['push', 'email', 'sms', 'in_app']
        });
    }
    /**
     * Helper: Create earning notification
     */
    static async notifyEarning(userId, amount, source, transactionId) {
        return this.createNotification({
            userId,
            title: 'Coins Earned!',
            message: `You've earned ${amount} coins from ${source}!`,
            type: 'success',
            category: 'earning',
            priority: 'medium',
            data: {
                amount,
                transactionId,
                deepLink: '/wallet',
                actionButton: {
                    text: 'View Wallet',
                    action: 'navigate',
                    target: '/wallet'
                }
            },
            deliveryChannels: ['push', 'in_app']
        });
    }
    /**
     * Helper: Create promotional notification
     */
    static async notifyPromotion(userId, title, message, imageUrl, deepLink) {
        return this.createNotification({
            userId,
            title,
            message,
            type: 'promotional',
            category: 'promotional',
            priority: 'low',
            data: {
                imageUrl,
                deepLink,
                actionButton: deepLink ? {
                    text: 'View Offer',
                    action: 'navigate',
                    target: deepLink
                } : undefined
            },
            deliveryChannels: ['push', 'in_app']
        });
    }
    /**
     * Helper: Create security alert
     */
    static async notifySecurityAlert(userId, title, message, actionRequired) {
        return this.createNotification({
            userId,
            title,
            message,
            type: 'warning',
            category: 'security',
            priority: actionRequired ? 'urgent' : 'high',
            deliveryChannels: ['push', 'email', 'sms', 'in_app']
        });
    }
    /**
     * Helper: Create system notification
     */
    static async notifySystem(userId, title, message, priority = 'medium') {
        return this.createNotification({
            userId,
            title,
            message,
            type: 'info',
            category: 'system',
            priority,
            deliveryChannels: ['in_app']
        });
    }
    /**
     * Helper: Create reminder notification
     */
    static async notifyReminder(userId, title, message, scheduledAt) {
        return this.createNotification({
            userId,
            title,
            message,
            type: 'info',
            category: 'reminder',
            priority: 'medium',
            scheduledAt,
            deliveryChannels: ['push', 'in_app']
        });
    }
    /**
     * Get user notification preferences
     */
    static async getUserPreferences(userId) {
        const userSettings = await UserSettings_1.UserSettings.findOne({ user: userId });
        if (!userSettings) {
            // Return default preferences
            return {
                push: { enabled: true },
                email: { enabled: true },
                sms: { enabled: false },
                inApp: { enabled: true }
            };
        }
        return userSettings.notifications;
    }
    /**
     * Update user notification preferences
     */
    static async updateUserPreferences(userId, preferences) {
        const userSettings = await UserSettings_1.UserSettings.findOneAndUpdate({ user: userId }, {
            $set: {
                notifications: preferences,
                lastUpdated: new Date()
            }
        }, { new: true, upsert: true });
        return userSettings?.notifications;
    }
    /**
     * Mark notification as read
     */
    static async markAsRead(notificationId, userId) {
        const notification = await Notification_1.Notification.findOne({
            _id: notificationId,
            user: userId
        });
        if (!notification) {
            return null;
        }
        await notification.markAsRead();
        this.emitUnreadCount(userId);
        return notification;
    }
    /**
     * Delete notification (soft delete)
     */
    static async deleteNotification(notificationId, userId) {
        const result = await Notification_1.Notification.updateOne({
            _id: notificationId,
            user: userId
        }, {
            $set: { deletedAt: new Date() }
        });
        if (result.modifiedCount > 0) {
            try {
                const io = (0, socket_1.getIO)();
                io.to(socket_2.SocketRoom.user(userId)).emit('notification:deleted', {
                    notificationId,
                    timestamp: new Date()
                });
            }
            catch (error) {
                console.error('Socket emit error:', error);
            }
            return true;
        }
        return false;
    }
    /**
     * Get scheduled notifications ready for delivery
     */
    static async processScheduledNotifications() {
        const scheduledNotifications = await Notification_1.Notification.find({
            scheduledAt: { $lte: new Date() },
            sentAt: { $exists: false },
            expiresAt: { $gt: new Date() }
        }).limit(100);
        for (const notification of scheduledNotifications) {
            this.emitNotificationToUser(notification.user.toString(), notification);
            // Mark as sent
            notification.sentAt = new Date();
            await notification.save();
        }
        return scheduledNotifications.length;
    }
    /**
     * Cleanup old notifications
     */
    static async cleanupOldNotifications(daysOld = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        const result = await Notification_1.Notification.deleteMany({
            createdAt: { $lt: cutoffDate },
            isRead: true,
            isArchived: true
        });
        return result.deletedCount || 0;
    }
}
exports.NotificationService = NotificationService;
exports.default = NotificationService;
