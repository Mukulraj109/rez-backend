"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const stockNotificationController_1 = require("../controllers/stockNotificationController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// All stock notification routes require authentication
router.use(auth_1.authenticate);
/**
 * Subscribe to product stock notifications
 * POST /api/stock-notifications/subscribe
 */
router.post('/subscribe', (0, validation_1.validate)(validation_2.Joi.object({
    productId: validation_1.commonSchemas.objectId().required(),
    method: validation_2.Joi.string().valid('email', 'sms', 'both', 'push').default('push')
})), stockNotificationController_1.subscribeToStockNotification);
/**
 * Unsubscribe from product stock notifications
 * POST /api/stock-notifications/unsubscribe
 */
router.post('/unsubscribe', (0, validation_1.validate)(validation_2.Joi.object({
    productId: validation_1.commonSchemas.objectId().required()
})), stockNotificationController_1.unsubscribeFromStockNotification);
/**
 * Get user's stock notification subscriptions
 * GET /api/stock-notifications/my-subscriptions
 */
router.get('/my-subscriptions', (0, validation_1.validateQuery)(validation_2.Joi.object({
    status: validation_2.Joi.string().valid('pending', 'sent', 'cancelled')
})), stockNotificationController_1.getMyStockSubscriptions);
/**
 * Check if user is subscribed to a product
 * GET /api/stock-notifications/check/:productId
 */
router.get('/check/:productId', (0, validation_1.validateParams)(validation_2.Joi.object({
    productId: validation_1.commonSchemas.objectId().required()
})), stockNotificationController_1.checkStockSubscription);
/**
 * Delete a stock notification subscription
 * DELETE /api/stock-notifications/:notificationId
 */
router.delete('/:notificationId', (0, validation_1.validateParams)(validation_2.Joi.object({
    notificationId: validation_1.commonSchemas.objectId().required()
})), stockNotificationController_1.deleteStockSubscription);
exports.default = router;
