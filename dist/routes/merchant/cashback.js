"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cashbackController_1 = require("../../controllers/merchant/cashbackController");
const merchantauth_1 = require("../../middleware/merchantauth");
const validation_1 = require("../../middleware/validation");
const validation_2 = require("../../middleware/validation");
const router = (0, express_1.Router)();
// All merchant cashback routes require authentication
router.use(merchantauth_1.authMiddleware);
/**
 * GET /api/merchant/cashback
 * List all cashback requests
 */
router.get('/', (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(100).default(20),
    status: validation_2.Joi.string().valid('pending', 'under_review', 'approved', 'rejected', 'paid', 'expired', 'cancelled').optional()
})), cashbackController_1.listCashbackRequests);
/**
 * GET /api/merchant/cashback/stats
 * Get cashback statistics
 */
router.get('/stats', (0, validation_1.validateQuery)(validation_2.Joi.object({
    startDate: validation_2.Joi.date().iso().optional(),
    endDate: validation_2.Joi.date().iso().min(validation_2.Joi.ref('startDate')).optional()
})), cashbackController_1.getCashbackStats);
/**
 * GET /api/merchant/cashback/pending-count
 * Get count of pending cashback approvals
 */
router.get('/pending-count', cashbackController_1.getPendingCashbackCount);
/**
 * GET /api/merchant/cashback/export
 * Export cashback data to CSV/Excel
 */
router.get('/export', (0, validation_1.validateQuery)(validation_2.Joi.object({
    startDate: validation_2.Joi.date().iso().optional(),
    endDate: validation_2.Joi.date().iso().min(validation_2.Joi.ref('startDate')).optional(),
    status: validation_2.Joi.string().valid('pending', 'under_review', 'approved', 'rejected', 'paid', 'expired', 'cancelled').optional(),
    format: validation_2.Joi.string().valid('csv', 'excel').default('csv')
})), cashbackController_1.exportCashbackData);
/**
 * GET /api/merchant/cashback/analytics
 * Get cashback analytics and trends
 */
router.get('/analytics', (0, validation_1.validateQuery)(validation_2.Joi.object({
    startDate: validation_2.Joi.date().iso().optional(),
    endDate: validation_2.Joi.date().iso().min(validation_2.Joi.ref('startDate')).optional(),
    storeId: validation_1.commonSchemas.objectId().optional()
})), cashbackController_1.getCashbackAnalytics);
/**
 * GET /api/merchant/cashback/metrics
 * Get enhanced cashback metrics with trends and comparisons
 */
router.get('/metrics', (0, validation_1.validateQuery)(validation_2.Joi.object({
    startDate: validation_2.Joi.date().iso().optional(),
    endDate: validation_2.Joi.date().iso().min(validation_2.Joi.ref('startDate')).optional()
})), cashbackController_1.getCashbackMetrics);
/**
 * GET /api/merchant/cashback/:id
 * Get single cashback request with complete details
 */
router.get('/:id', (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), cashbackController_1.getCashbackRequest);
/**
 * POST /api/merchant/cashback
 * Create new cashback request
 */
router.post('/', (0, validation_1.validate)(validation_2.Joi.object({
    orderId: validation_1.commonSchemas.objectId().required(),
    customerId: validation_1.commonSchemas.objectId().required(),
    amount: validation_2.Joi.number().min(0).required(),
    reason: validation_2.Joi.string().trim().max(500).optional()
})), cashbackController_1.createCashbackRequest);
/**
 * PUT /api/merchant/cashback/:id/mark-paid
 * Mark cashback request as paid
 */
router.put('/:id/mark-paid', (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_2.Joi.object({
    paymentMethod: validation_2.Joi.string().valid('wallet', 'bank_transfer', 'check').required(),
    paymentReference: validation_2.Joi.string().trim().required(),
    notes: validation_2.Joi.string().trim().max(500).optional()
})), cashbackController_1.markCashbackAsPaid);
/**
 * POST /api/merchant/cashback/bulk-action
 * Bulk approve/reject cashback requests
 */
router.post('/bulk-action', (0, validation_1.validate)(validation_2.Joi.object({
    action: validation_2.Joi.string().valid('approve', 'reject').required(),
    cashbackIds: validation_2.Joi.array().items(validation_1.commonSchemas.objectId()).min(1).max(50).required(),
    reason: validation_2.Joi.string().trim().max(500).when('action', {
        is: 'reject',
        then: validation_2.Joi.required(),
        otherwise: validation_2.Joi.optional()
    }),
    notes: validation_2.Joi.string().trim().max(500).optional()
})), cashbackController_1.bulkCashbackAction);
exports.default = router;
