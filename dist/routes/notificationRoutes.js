"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationController_1 = require("../controllers/notificationController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
// import { generalLimiter } from '../middleware/rateLimiter'; // Disabled for development
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// All notification routes require authentication
router.use(auth_1.authenticate);
// Get user notifications
router.get('/', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateQuery)(validation_2.Joi.object({
    type: validation_2.Joi.string().valid('order', 'promotion', 'social', 'system'),
    isRead: validation_2.Joi.boolean(),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), notificationController_1.getUserNotifications);
// Mark notifications as read
router.patch('/read', 
// generalLimiter,, // Disabled for development
(0, validation_1.validate)(validation_1.notificationSchemas.markAsRead), notificationController_1.markAsRead);
// Delete notification
router.delete('/:notificationId', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    notificationId: validation_1.commonSchemas.objectId().required()
})), notificationController_1.deleteNotification);
exports.default = router;
