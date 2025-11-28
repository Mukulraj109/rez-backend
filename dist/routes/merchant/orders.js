"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orderController_1 = require("../../controllers/merchant/orderController");
const merchantauth_1 = require("../../middleware/merchantauth");
const validation_1 = require("../../middleware/validation");
const validation_2 = require("../../middleware/validation");
const router = (0, express_1.Router)();
// All merchant order routes require authentication
router.use(merchantauth_1.authMiddleware);
// Enhanced GET /api/merchant/orders - List merchant orders with advanced filters
router.get('/', (0, validation_1.validateQuery)(validation_2.Joi.object({
    // Status filter
    status: validation_2.Joi.string().valid('placed', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled', 'returned', 'refunded'),
    // Payment status filter
    paymentStatus: validation_2.Joi.string().valid('pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded'),
    // Date range filter
    startDate: validation_2.Joi.date().iso(),
    endDate: validation_2.Joi.date().iso().min(validation_2.Joi.ref('startDate')),
    // Search filter (orderNumber, customer name, email)
    search: validation_2.Joi.string().trim().max(100),
    // Store filter (for multi-store merchants)
    storeId: validation_1.commonSchemas.objectId(),
    // Sorting
    sortBy: validation_2.Joi.string().valid('createdAt', 'total', 'status', 'orderNumber').default('createdAt'),
    order: validation_2.Joi.string().valid('asc', 'desc').default('desc'),
    // Pagination
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(100).default(20)
})), orderController_1.getMerchantOrders);
// GET /api/merchant/orders/analytics - Get order analytics
router.get('/analytics', (0, validation_1.validateQuery)(validation_2.Joi.object({
    startDate: validation_2.Joi.date().iso(),
    endDate: validation_2.Joi.date().iso().min(validation_2.Joi.ref('startDate')),
    storeId: validation_1.commonSchemas.objectId(),
    interval: validation_2.Joi.string().valid('day', 'week', 'month').default('day')
})), orderController_1.getMerchantOrderAnalytics);
// GET /api/merchant/orders/:id - Get single order by ID
router.get('/:id', (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), orderController_1.getMerchantOrderById);
// POST /api/merchant/orders/bulk-action - Bulk order operations
router.post('/bulk-action', (0, validation_1.validate)(validation_2.Joi.object({
    action: validation_2.Joi.string().valid('confirm', 'cancel', 'mark-shipped').required(),
    orderIds: validation_2.Joi.array().items(validation_1.commonSchemas.objectId()).min(1).max(50).required(),
    reason: validation_2.Joi.string().trim().max(500).when('action', {
        is: 'cancel',
        then: validation_2.Joi.required(),
        otherwise: validation_2.Joi.optional()
    }),
    trackingInfo: validation_2.Joi.object({
        trackingId: validation_2.Joi.string().trim(),
        deliveryPartner: validation_2.Joi.string().trim(),
        estimatedTime: validation_2.Joi.date().iso()
    }).when('action', {
        is: 'mark-shipped',
        then: validation_2.Joi.optional(),
        otherwise: validation_2.Joi.forbidden()
    })
})), orderController_1.bulkOrderAction);
// POST /api/merchant/orders/:id/refund - Process order refund
router.post('/:id/refund', (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_2.Joi.object({
    amount: validation_2.Joi.number().min(0).required(),
    reason: validation_2.Joi.string().trim().min(10).max(500).required(),
    refundItems: validation_2.Joi.array().items(validation_2.Joi.object({
        itemId: validation_1.commonSchemas.objectId().required(),
        quantity: validation_2.Joi.number().integer().min(1).required()
    })).optional(),
    notifyCustomer: validation_2.Joi.boolean().default(true)
})), orderController_1.refundOrder);
exports.default = router;
