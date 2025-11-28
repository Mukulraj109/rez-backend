"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orderController_1 = require("../controllers/orderController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
// import { generalLimiter } from '../middleware/rateLimiter'; // Disabled for development
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// All order routes require authentication
router.use(auth_1.authenticate);
// Get user's order statistics
router.get('/stats', 
// generalLimiter,, // Disabled for development
orderController_1.getOrderStats);
// Get reorder suggestions
router.get('/reorder/suggestions', 
// generalLimiter,, // Disabled for development
orderController_1.getReorderSuggestions);
// Get frequently ordered items
router.get('/reorder/frequently-ordered', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10)
})), orderController_1.getFrequentlyOrdered);
// Get user's orders
router.get('/', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateQuery)(validation_2.Joi.object({
    status: validation_2.Joi.string().valid('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), orderController_1.getUserOrders);
// Create new order
router.post('/', 
// generalLimiter,, // Disabled for development
(0, validation_1.validate)(validation_1.orderSchemas.createOrder), orderController_1.createOrder);
// Get single order by ID
router.get('/:orderId', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    orderId: validation_1.commonSchemas.objectId().required()
})), orderController_1.getOrderById);
// Cancel order
router.patch('/:orderId/cancel', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    orderId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_2.Joi.object({
    reason: validation_2.Joi.string().trim().max(500)
})), orderController_1.cancelOrder);
// Get order tracking
router.get('/:orderId/tracking', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    orderId: validation_1.commonSchemas.objectId().required()
})), orderController_1.getOrderTracking);
// Rate and review order
router.post('/:orderId/rate', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    orderId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_2.Joi.object({
    rating: validation_2.Joi.number().integer().min(1).max(5).required(),
    review: validation_2.Joi.string().trim().max(1000)
})), orderController_1.rateOrder);
// Validate reorder (check availability and prices)
router.get('/:orderId/reorder/validate', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    orderId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    itemIds: validation_2.Joi.alternatives().try(validation_2.Joi.array().items(validation_1.commonSchemas.objectId()), validation_1.commonSchemas.objectId())
})), orderController_1.validateReorder);
// Re-order full order
router.post('/:orderId/reorder', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    orderId: validation_1.commonSchemas.objectId().required()
})), orderController_1.reorderFullOrder);
// Re-order selected items
router.post('/:orderId/reorder/items', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    orderId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_2.Joi.object({
    itemIds: validation_2.Joi.array().items(validation_1.commonSchemas.objectId()).min(1).required()
})), orderController_1.reorderItems);
// Refund routes
// Request refund for an order
router.post('/:orderId/refund-request', (0, validation_1.validateParams)(validation_2.Joi.object({
    orderId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_2.Joi.object({
    reason: validation_2.Joi.string().trim().min(10).max(500).required(),
    refundItems: validation_2.Joi.array().items(validation_2.Joi.object({
        itemId: validation_1.commonSchemas.objectId().required(),
        quantity: validation_2.Joi.number().integer().min(1).required()
    })).optional()
})), orderController_1.requestRefund);
// Get user's refund history
router.get('/refunds', (0, validation_1.validateQuery)(validation_2.Joi.object({
    status: validation_2.Joi.string().valid('pending', 'processing', 'completed', 'failed', 'cancelled'),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), orderController_1.getUserRefunds);
// Get refund details
router.get('/refunds/:refundId', (0, validation_1.validateParams)(validation_2.Joi.object({
    refundId: validation_1.commonSchemas.objectId().required()
})), orderController_1.getRefundDetails);
// Admin/Store Owner Routes
// Update order status
router.patch('/:orderId/status', 
// generalLimiter,, // Disabled for development
auth_1.requireAdmin, (0, validation_1.validateParams)(validation_2.Joi.object({
    orderId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_2.Joi.object({
    status: validation_2.Joi.string().valid('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled').required(),
    estimatedDeliveryTime: validation_2.Joi.date().iso(),
    trackingInfo: validation_2.Joi.object({
        trackingNumber: validation_2.Joi.string().trim(),
        carrier: validation_2.Joi.string().trim(),
        estimatedDelivery: validation_2.Joi.date().iso(),
        location: validation_2.Joi.string().trim(),
        notes: validation_2.Joi.string().trim().max(500)
    })
})), orderController_1.updateOrderStatus);
exports.default = router;
