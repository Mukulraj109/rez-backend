"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const messagingController_1 = require("../controllers/messagingController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// ==================== CONVERSATION ROUTES ====================
/**
 * GET /api/messages/conversations
 * Get all conversations with pagination and filters
 */
router.get('/conversations', auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    status: validation_2.Joi.string().valid('all', 'active', 'archived'),
    search: validation_2.Joi.string().trim().min(1).max(100),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
})), messagingController_1.getConversations);
/**
 * POST /api/messages/conversations
 * Create or get existing conversation with a store
 */
router.post('/conversations', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required(),
    storeName: validation_2.Joi.string().trim().min(1).max(200).required(),
    storeImage: validation_2.Joi.string().uri(),
    customerName: validation_2.Joi.string().trim().max(200),
    customerImage: validation_2.Joi.string().uri(),
})), messagingController_1.getOrCreateConversation);
/**
 * GET /api/messages/conversations/:id
 * Get a specific conversation
 */
router.get('/conversations/:id', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), messagingController_1.getConversation);
/**
 * GET /api/messages/conversations/:id/messages
 * Get messages in a conversation
 */
router.get('/conversations/:id/messages', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(100).default(50),
    before: validation_2.Joi.date().iso(),
})), messagingController_1.getMessages);
/**
 * POST /api/messages/conversations/:id/messages
 * Send a message in a conversation
 */
router.post('/conversations/:id/messages', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), (0, validation_1.validate)(validation_2.Joi.object({
    content: validation_2.Joi.string().trim().min(1).max(5000).required(),
    type: validation_2.Joi.string().valid('TEXT', 'IMAGE', 'VIDEO', 'FILE', 'LOCATION', 'PRODUCT', 'ORDER', 'SYSTEM').default('TEXT'),
    attachments: validation_2.Joi.array().items(validation_2.Joi.object({
        url: validation_2.Joi.string().uri().required(),
        type: validation_2.Joi.string().required(),
        name: validation_2.Joi.string(),
        size: validation_2.Joi.number(),
        thumbnail: validation_2.Joi.string().uri(),
    })),
    location: validation_2.Joi.object({
        latitude: validation_2.Joi.number().min(-90).max(90).required(),
        longitude: validation_2.Joi.number().min(-180).max(180).required(),
        address: validation_2.Joi.string(),
    }),
    product: validation_2.Joi.object({
        id: validation_1.commonSchemas.objectId().required(),
        name: validation_2.Joi.string().required(),
        price: validation_2.Joi.number().required(),
        image: validation_2.Joi.string().uri(),
    }),
    order: validation_2.Joi.object({
        id: validation_1.commonSchemas.objectId().required(),
        orderNumber: validation_2.Joi.string().required(),
    }),
})), messagingController_1.sendMessage);
/**
 * PATCH /api/messages/conversations/:id/read
 * Mark conversation as read
 */
router.patch('/conversations/:id/read', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), messagingController_1.markConversationAsRead);
/**
 * PATCH /api/messages/conversations/:id/archive
 * Archive a conversation
 */
router.patch('/conversations/:id/archive', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), messagingController_1.archiveConversation);
/**
 * PATCH /api/messages/conversations/:id/unarchive
 * Unarchive a conversation
 */
router.patch('/conversations/:id/unarchive', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), messagingController_1.unarchiveConversation);
/**
 * DELETE /api/messages/conversations/:id
 * Delete a conversation
 */
router.delete('/conversations/:id', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), messagingController_1.deleteConversation);
// ==================== MESSAGE ROUTES ====================
/**
 * GET /api/messages/search
 * Search messages across conversations
 */
router.get('/search', auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    query: validation_2.Joi.string().trim().min(1).max(100).required(),
    conversationId: validation_1.commonSchemas.objectId(),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
})), messagingController_1.searchMessages);
/**
 * POST /api/messages/:id/report
 * Report a message
 */
router.post('/:id/report', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), (0, validation_1.validate)(validation_2.Joi.object({
    reason: validation_2.Joi.string().valid('spam', 'harassment', 'inappropriate', 'scam', 'other').required(),
    details: validation_2.Joi.string().trim().max(1000),
})), messagingController_1.reportMessage);
/**
 * GET /api/messages/unread/count
 * Get total unread messages count
 */
router.get('/unread/count', auth_1.authenticate, messagingController_1.getUnreadCount);
// ==================== STORE ROUTES ====================
/**
 * GET /api/stores/:id/availability
 * Get store availability and business hours
 */
router.get('/stores/:id/availability', (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), messagingController_1.getStoreAvailability);
/**
 * POST /api/stores/:id/block
 * Block a store from messaging
 */
router.post('/stores/:id/block', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), messagingController_1.blockStore);
/**
 * POST /api/stores/:id/unblock
 * Unblock a store
 */
router.post('/stores/:id/unblock', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), messagingController_1.unblockStore);
exports.default = router;
