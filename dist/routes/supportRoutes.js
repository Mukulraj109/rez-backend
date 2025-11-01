"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supportController_1 = require("../controllers/supportController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// ==================== TICKET ROUTES ====================
// Get tickets summary
router.get('/tickets/summary', auth_1.authenticate, supportController_1.getTicketsSummary);
// Create ticket
router.post('/tickets', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    subject: validation_2.Joi.string().trim().min(5).max(200).required(),
    category: validation_2.Joi.string().valid('order', 'payment', 'product', 'account', 'technical', 'delivery', 'refund', 'other').required(),
    message: validation_2.Joi.string().trim().min(10).max(5000).required(),
    relatedEntity: validation_2.Joi.object({
        type: validation_2.Joi.string().valid('order', 'product', 'transaction', 'none').required(),
        id: validation_1.commonSchemas.objectId(),
    }),
    attachments: validation_2.Joi.array().items(validation_2.Joi.string().uri()),
    priority: validation_2.Joi.string().valid('low', 'medium', 'high', 'urgent'),
})), supportController_1.createTicket);
// Get user's tickets
router.get('/tickets', auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    status: validation_2.Joi.string().valid('open', 'in_progress', 'waiting_customer', 'resolved', 'closed'),
    category: validation_2.Joi.string().valid('order', 'payment', 'product', 'account', 'technical', 'delivery', 'refund', 'other'),
    priority: validation_2.Joi.string().valid('low', 'medium', 'high', 'urgent'),
    dateFrom: validation_2.Joi.date().iso(),
    dateTo: validation_2.Joi.date().iso(),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
})), supportController_1.getMyTickets);
// Get ticket by ID
router.get('/tickets/:id', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), supportController_1.getTicketById);
// Add message to ticket
router.post('/tickets/:id/messages', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), (0, validation_1.validate)(validation_2.Joi.object({
    message: validation_2.Joi.string().trim().min(1).max(5000).required(),
    attachments: validation_2.Joi.array().items(validation_2.Joi.string().uri()),
})), supportController_1.addMessageToTicket);
// Close ticket
router.post('/tickets/:id/close', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), supportController_1.closeTicket);
// Reopen ticket
router.post('/tickets/:id/reopen', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), (0, validation_1.validate)(validation_2.Joi.object({
    reason: validation_2.Joi.string().trim().min(5).max(500).required(),
})), supportController_1.reopenTicket);
// Rate ticket
router.post('/tickets/:id/rate', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), (0, validation_1.validate)(validation_2.Joi.object({
    score: validation_2.Joi.number().integer().min(1).max(5).required(),
    comment: validation_2.Joi.string().trim().max(1000),
})), supportController_1.rateTicket);
// ==================== FAQ ROUTES ====================
// Search FAQs
router.get('/faq/search', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    q: validation_2.Joi.string().trim().min(2).max(100).required(),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10),
})), supportController_1.searchFAQs);
// Get FAQ categories
router.get('/faq/categories', auth_1.optionalAuth, supportController_1.getFAQCategories);
// Get popular FAQs
router.get('/faq/popular', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10),
})), supportController_1.getPopularFAQs);
// Get all FAQs
router.get('/faq', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    category: validation_2.Joi.string().trim(),
    subcategory: validation_2.Joi.string().trim(),
    limit: validation_2.Joi.number().integer().min(1).max(100).default(100),
})), supportController_1.getAllFAQs);
// Mark FAQ as helpful/not helpful
router.post('/faq/:id/helpful', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), (0, validation_1.validate)(validation_2.Joi.object({
    helpful: validation_2.Joi.boolean().required(),
})), supportController_1.markFAQHelpful);
// Track FAQ view
router.post('/faq/:id/view', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), supportController_1.trackFAQView);
// ==================== QUICK ACTIONS ====================
// Create order issue ticket
router.post('/quick-actions/order-issue', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    orderId: validation_1.commonSchemas.objectId().required(),
    issueType: validation_2.Joi.string().trim().min(3).max(100).required(),
    description: validation_2.Joi.string().trim().min(10).max(5000).required(),
})), supportController_1.createOrderIssueTicket);
// Report product issue
router.post('/quick-actions/report-product', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    productId: validation_1.commonSchemas.objectId().required(),
    issueType: validation_2.Joi.string().trim().min(3).max(100).required(),
    description: validation_2.Joi.string().trim().min(10).max(5000).required(),
    images: validation_2.Joi.array().items(validation_2.Joi.string().uri()),
})), supportController_1.reportProductIssue);
exports.default = router;
