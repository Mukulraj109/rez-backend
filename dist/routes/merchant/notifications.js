"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const merchantNotificationController_1 = require("../../controllers/merchantNotificationController");
const merchantauth_1 = require("../../middleware/merchantauth");
const validation_1 = require("../../middleware/validation");
const validation_2 = require("../../middleware/validation");
const router = (0, express_1.Router)();
// Middleware to handle empty/null request bodies (for POST/DELETE with no body)
const allowEmptyBody = (req, res, next) => {
    // If body is null, undefined, or empty, set it to an empty object
    if (!req.body || req.body === null || (typeof req.body === 'object' && Object.keys(req.body).length === 0)) {
        req.body = {};
    }
    next();
};
// All notification routes require authentication
router.use(merchantauth_1.authMiddleware);
/**
 * @route   GET /api/merchant/notifications
 * @desc    Get all notifications for merchant with filters and pagination
 * @access  Private (Merchant)
 * @query   type - Filter by notification type (order|product|team)
 * @query   status - Filter by read status (unread|read)
 * @query   category - Filter by category
 * @query   sortBy - Sort field (createdAt|priority)
 * @query   order - Sort order (desc|asc)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20)
 */
router.get('/', (0, validation_1.validateQuery)(validation_2.Joi.object({
    type: validation_2.Joi.string().valid('order', 'product', 'team', 'info', 'success', 'warning', 'error', 'promotional'),
    status: validation_2.Joi.string().valid('unread', 'read'),
    category: validation_2.Joi.string().valid('order', 'earning', 'general', 'promotional', 'social', 'security', 'system', 'reminder'),
    sortBy: validation_2.Joi.string().valid('createdAt', 'priority').default('createdAt'),
    order: validation_2.Joi.string().valid('desc', 'asc').default('desc'),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(100).default(20)
})), merchantNotificationController_1.getMerchantNotifications);
/**
 * @route   GET /api/merchant/notifications/unread
 * @desc    Get unread notifications only (max 50 most recent)
 * @access  Private (Merchant)
 * @returns Unread notifications with X-Unread-Count header
 */
router.get('/unread', merchantNotificationController_1.getUnreadNotifications);
/**
 * @route   GET /api/merchant/notifications/unread-count
 * @desc    Get unread notifications count only (fast endpoint for badges)
 * @access  Private (Merchant)
 * @returns { count: number, timestamp: Date }
 */
router.get('/unread-count', merchantNotificationController_1.getUnreadCount);
/**
 * @route   GET /api/merchant/notifications/archived
 * @desc    Get archived notifications
 * @access  Private (Merchant)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20)
 */
router.get('/archived', (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(100).default(20)
})), merchantNotificationController_1.getArchivedNotifications);
/**
 * @route   GET /api/merchant/notifications/preferences
 * @desc    Get notification preferences
 * @access  Private (Merchant)
 */
router.get('/preferences', merchantNotificationController_1.getNotificationPreferences);
/**
 * @route   PUT /api/merchant/notifications/preferences
 * @desc    Update notification preferences
 * @access  Private (Merchant)
 * @body    Notification preferences object
 */
router.put('/preferences', (0, validation_1.validate)(validation_2.Joi.object({
    channels: validation_2.Joi.object({
        email: validation_2.Joi.boolean(),
        push: validation_2.Joi.boolean(),
        sms: validation_2.Joi.boolean(),
        inApp: validation_2.Joi.boolean()
    }),
    categories: validation_2.Joi.object().pattern(validation_2.Joi.string(), validation_2.Joi.object({
        email: validation_2.Joi.boolean(),
        push: validation_2.Joi.boolean(),
        sms: validation_2.Joi.boolean(),
        inApp: validation_2.Joi.boolean()
    })),
    quietHours: validation_2.Joi.object({
        enabled: validation_2.Joi.boolean(),
        start: validation_2.Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
        end: validation_2.Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
        timezone: validation_2.Joi.string()
    }),
    frequency: validation_2.Joi.object({
        digest: validation_2.Joi.string().valid('immediate', 'daily', 'weekly'),
        maxPerDay: validation_2.Joi.number().integer().min(1).max(200)
    })
})), merchantNotificationController_1.updateNotificationPreferences);
/**
 * @route   POST /api/merchant/notifications/mark-multiple-read
 * @desc    Mark multiple notifications as read
 * @access  Private (Merchant)
 * @body    { notificationIds: string[] }
 * @returns { updated: number, unreadCount: number }
 */
router.post('/mark-multiple-read', (0, validation_1.validate)(validation_2.Joi.object({
    notificationIds: validation_2.Joi.array()
        .items(validation_1.commonSchemas.objectId())
        .min(1)
        .max(100)
        .required()
})), merchantNotificationController_1.markMultipleAsRead);
/**
 * @route   POST /api/merchant/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private (Merchant)
 * @returns { updated: number, unreadCount: number }
 */
router.post('/mark-all-read', allowEmptyBody, merchantNotificationController_1.markAllAsRead);
/**
 * @route   POST /api/merchant/notifications/delete-multiple
 * @desc    Delete multiple notifications (soft delete)
 * @access  Private (Merchant)
 * @body    { notificationIds: string[] }
 * @returns { deleted: number }
 */
router.post('/delete-multiple', (0, validation_1.validate)(validation_2.Joi.object({
    notificationIds: validation_2.Joi.array()
        .items(validation_1.commonSchemas.objectId())
        .min(1)
        .max(100)
        .required()
})), merchantNotificationController_1.deleteMultipleNotifications);
/**
 * @route   POST /api/merchant/notifications/clear-all
 * @desc    Clear all notifications (soft delete all)
 * @access  Private (Merchant)
 * @query   onlyRead - Only clear read notifications (optional)
 * @returns { cleared: number }
 */
router.post('/clear-all', allowEmptyBody, (0, validation_1.validateQuery)(validation_2.Joi.object({
    onlyRead: validation_2.Joi.boolean()
})), merchantNotificationController_1.clearAllNotifications);
/**
 * @route   DELETE /api/merchant/notifications/clear-all
 * @desc    Clear all notifications (soft delete all) - DELETE method
 * @access  Private (Merchant)
 * @query   onlyRead - Only clear read notifications (optional)
 * @returns { cleared: number }
 */
router.delete('/clear-all', allowEmptyBody, (0, validation_1.validateQuery)(validation_2.Joi.object({
    onlyRead: validation_2.Joi.boolean()
})), merchantNotificationController_1.clearAllNotifications);
/**
 * @route   POST /api/merchant/notifications/test
 * @desc    Send test notification to merchant
 * @access  Private (Merchant)
 * @returns Created test notification
 */
router.post('/test', merchantNotificationController_1.sendTestNotification);
/**
 * @route   PUT /api/merchant/notifications/:id/archive
 * @desc    Archive a single notification
 * @access  Private (Merchant)
 * @params  id - Notification ID
 * @returns Updated notification
 */
router.put('/:id/archive', (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), merchantNotificationController_1.archiveNotification);
/**
 * @route   GET /api/merchant/notifications/stats
 * @desc    Get notification statistics
 * @access  Private (Merchant)
 * @returns Aggregated notification stats
 */
router.get('/stats', merchantNotificationController_1.getNotificationStats);
/**
 * @route   POST /api/merchant/notifications/subscribe-email
 * @desc    Subscribe to email notifications
 * @access  Private (Merchant)
 * @returns Updated email subscription status
 */
router.post('/subscribe-email', merchantNotificationController_1.subscribeToEmail);
/**
 * @route   POST /api/merchant/notifications/unsubscribe-email
 * @desc    Unsubscribe from email notifications
 * @access  Private (Merchant)
 * @returns Updated email subscription status
 */
router.post('/unsubscribe-email', merchantNotificationController_1.unsubscribeFromEmail);
/**
 * @route   POST /api/merchant/notifications/subscribe-sms
 * @desc    Subscribe to SMS notifications
 * @access  Private (Merchant)
 * @returns Updated SMS subscription status
 */
router.post('/subscribe-sms', merchantNotificationController_1.subscribeToSMS);
/**
 * @route   POST /api/merchant/notifications/unsubscribe-sms
 * @desc    Unsubscribe from SMS notifications
 * @access  Private (Merchant)
 * @returns Updated SMS subscription status
 */
router.post('/unsubscribe-sms', merchantNotificationController_1.unsubscribeFromSMS);
/**
 * @route   GET /api/merchant/notifications/:id
 * @desc    Get single notification by ID
 * @access  Private (Merchant)
 * @params  id - Notification ID
 * @returns Single notification object
 */
router.get('/:id', (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), merchantNotificationController_1.getNotificationById);
/**
 * @route   POST /api/merchant/notifications/:id/mark-read
 * @desc    Mark single notification as read
 * @access  Private (Merchant)
 * @params  id - Notification ID
 * @returns Updated notification with unread count
 */
router.post('/:id/mark-read', (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), merchantNotificationController_1.markNotificationAsRead);
/**
 * @route   DELETE /api/merchant/notifications/:id
 * @desc    Delete single notification (soft delete)
 * @access  Private (Merchant)
 * @params  id - Notification ID
 * @returns Deleted notification
 */
router.delete('/:id', (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), merchantNotificationController_1.deleteNotification);
exports.default = router;
