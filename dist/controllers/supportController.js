"use strict";
// Support Controller
// Handles customer support and FAQ API endpoints
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportProductIssue = exports.createOrderIssueTicket = exports.trackFAQView = exports.markFAQHelpful = exports.getPopularFAQs = exports.getFAQCategories = exports.searchFAQs = exports.getAllFAQs = exports.getTicketsSummary = exports.rateTicket = exports.reopenTicket = exports.closeTicket = exports.addMessageToTicket = exports.getTicketById = exports.getMyTickets = exports.createTicket = void 0;
const mongoose_1 = require("mongoose");
const supportService_1 = __importDefault(require("../services/supportService"));
/**
 * Create new support ticket
 * POST /api/support/tickets
 */
const createTicket = async (req, res) => {
    try {
        const userId = req.userId;
        const { subject, category, message, relatedEntity, attachments, priority } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        if (!subject || !category || !message) {
            res.status(400).json({
                success: false,
                message: 'Subject, category, and message are required',
            });
            return;
        }
        const ticket = await supportService_1.default.createTicket({
            userId: new mongoose_1.Types.ObjectId(userId),
            subject,
            category,
            initialMessage: message,
            relatedEntity,
            attachments,
            priority,
        });
        res.status(201).json({
            success: true,
            message: 'Support ticket created successfully',
            data: { ticket },
        });
    }
    catch (error) {
        console.error('❌ [SUPPORT CONTROLLER] Error creating ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create support ticket',
            error: error.message,
        });
    }
};
exports.createTicket = createTicket;
/**
 * Get user's tickets with filters
 * GET /api/support/tickets
 */
const getMyTickets = async (req, res) => {
    try {
        const userId = req.userId;
        const { status, category, priority, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const filters = {};
        if (status)
            filters.status = status;
        if (category)
            filters.category = category;
        if (priority)
            filters.priority = priority;
        if (dateFrom)
            filters.dateFrom = new Date(dateFrom);
        if (dateTo)
            filters.dateTo = new Date(dateTo);
        const result = await supportService_1.default.getUserTickets(new mongoose_1.Types.ObjectId(userId), filters, Number(page), Number(limit));
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('❌ [SUPPORT CONTROLLER] Error getting tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get tickets',
            error: error.message,
        });
    }
};
exports.getMyTickets = getMyTickets;
/**
 * Get ticket by ID
 * GET /api/support/tickets/:id
 */
const getTicketById = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const ticket = await supportService_1.default.getTicketById(new mongoose_1.Types.ObjectId(id), new mongoose_1.Types.ObjectId(userId));
        if (!ticket) {
            res.status(404).json({
                success: false,
                message: 'Ticket not found',
            });
            return;
        }
        // Mark messages as read
        await supportService_1.default.markMessagesAsRead(new mongoose_1.Types.ObjectId(id), new mongoose_1.Types.ObjectId(userId));
        res.status(200).json({
            success: true,
            data: { ticket },
        });
    }
    catch (error) {
        console.error('❌ [SUPPORT CONTROLLER] Error getting ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get ticket',
            error: error.message,
        });
    }
};
exports.getTicketById = getTicketById;
/**
 * Add message to ticket
 * POST /api/support/tickets/:id/messages
 */
const addMessageToTicket = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { message, attachments } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        if (!message) {
            res.status(400).json({
                success: false,
                message: 'Message is required',
            });
            return;
        }
        const ticket = await supportService_1.default.addMessageToTicket(new mongoose_1.Types.ObjectId(id), new mongoose_1.Types.ObjectId(userId), message, attachments);
        if (!ticket) {
            res.status(404).json({
                success: false,
                message: 'Ticket not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Message added successfully',
            data: { ticket },
        });
    }
    catch (error) {
        console.error('❌ [SUPPORT CONTROLLER] Error adding message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add message',
            error: error.message,
        });
    }
};
exports.addMessageToTicket = addMessageToTicket;
/**
 * Close ticket
 * POST /api/support/tickets/:id/close
 */
const closeTicket = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const ticket = await supportService_1.default.closeTicket(new mongoose_1.Types.ObjectId(id), new mongoose_1.Types.ObjectId(userId));
        if (!ticket) {
            res.status(404).json({
                success: false,
                message: 'Ticket not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Ticket closed successfully',
            data: { ticket },
        });
    }
    catch (error) {
        console.error('❌ [SUPPORT CONTROLLER] Error closing ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to close ticket',
            error: error.message,
        });
    }
};
exports.closeTicket = closeTicket;
/**
 * Reopen ticket
 * POST /api/support/tickets/:id/reopen
 */
const reopenTicket = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { reason } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        if (!reason) {
            res.status(400).json({
                success: false,
                message: 'Reason for reopening is required',
            });
            return;
        }
        const ticket = await supportService_1.default.reopenTicket(new mongoose_1.Types.ObjectId(id), new mongoose_1.Types.ObjectId(userId), reason);
        if (!ticket) {
            res.status(404).json({
                success: false,
                message: 'Ticket not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Ticket reopened successfully',
            data: { ticket },
        });
    }
    catch (error) {
        console.error('❌ [SUPPORT CONTROLLER] Error reopening ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reopen ticket',
            error: error.message,
        });
    }
};
exports.reopenTicket = reopenTicket;
/**
 * Rate ticket
 * POST /api/support/tickets/:id/rate
 */
const rateTicket = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { score, comment } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        if (!score || score < 1 || score > 5) {
            res.status(400).json({
                success: false,
                message: 'Valid rating score (1-5) is required',
            });
            return;
        }
        const ticket = await supportService_1.default.rateTicket(new mongoose_1.Types.ObjectId(id), new mongoose_1.Types.ObjectId(userId), score, comment || '');
        if (!ticket) {
            res.status(404).json({
                success: false,
                message: 'Ticket not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: 'Ticket rated successfully',
            data: { ticket },
        });
    }
    catch (error) {
        console.error('❌ [SUPPORT CONTROLLER] Error rating ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to rate ticket',
            error: error.message,
        });
    }
};
exports.rateTicket = rateTicket;
/**
 * Get active tickets summary
 * GET /api/support/tickets/summary
 */
const getTicketsSummary = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const summary = await supportService_1.default.getActiveTicketsSummary(new mongoose_1.Types.ObjectId(userId));
        res.status(200).json({
            success: true,
            data: summary,
        });
    }
    catch (error) {
        console.error('❌ [SUPPORT CONTROLLER] Error getting summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get tickets summary',
            error: error.message,
        });
    }
};
exports.getTicketsSummary = getTicketsSummary;
// ==================== FAQ ENDPOINTS ====================
/**
 * Get all FAQs
 * GET /api/support/faq
 */
const getAllFAQs = async (req, res) => {
    try {
        const { category, subcategory, limit = 100 } = req.query;
        let faqs;
        if (category) {
            faqs = await supportService_1.default.getFAQsByCategory(category, subcategory);
        }
        else {
            faqs = await supportService_1.default.getPopularFAQs(Number(limit));
        }
        res.status(200).json({
            success: true,
            data: { faqs, total: faqs.length },
        });
    }
    catch (error) {
        console.error('❌ [SUPPORT CONTROLLER] Error getting FAQs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get FAQs',
            error: error.message,
        });
    }
};
exports.getAllFAQs = getAllFAQs;
/**
 * Search FAQs
 * GET /api/support/faq/search
 */
const searchFAQs = async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;
        if (!q) {
            res.status(400).json({
                success: false,
                message: 'Search query is required',
            });
            return;
        }
        const faqs = await supportService_1.default.searchFAQs(q, Number(limit));
        res.status(200).json({
            success: true,
            data: { faqs, total: faqs.length },
        });
    }
    catch (error) {
        console.error('❌ [SUPPORT CONTROLLER] Error searching FAQs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search FAQs',
            error: error.message,
        });
    }
};
exports.searchFAQs = searchFAQs;
/**
 * Get FAQ categories
 * GET /api/support/faq/categories
 */
const getFAQCategories = async (req, res) => {
    try {
        const categories = await supportService_1.default.getFAQCategories();
        res.status(200).json({
            success: true,
            data: { categories },
        });
    }
    catch (error) {
        console.error('❌ [SUPPORT CONTROLLER] Error getting categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get FAQ categories',
            error: error.message,
        });
    }
};
exports.getFAQCategories = getFAQCategories;
/**
 * Get popular FAQs
 * GET /api/support/faq/popular
 */
const getPopularFAQs = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const faqs = await supportService_1.default.getPopularFAQs(Number(limit));
        res.status(200).json({
            success: true,
            data: { faqs, total: faqs.length },
        });
    }
    catch (error) {
        console.error('❌ [SUPPORT CONTROLLER] Error getting popular FAQs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get popular FAQs',
            error: error.message,
        });
    }
};
exports.getPopularFAQs = getPopularFAQs;
/**
 * Mark FAQ as helpful
 * POST /api/support/faq/:id/helpful
 */
const markFAQHelpful = async (req, res) => {
    try {
        const { id } = req.params;
        const { helpful } = req.body;
        if (helpful) {
            await supportService_1.default.markFAQAsHelpful(new mongoose_1.Types.ObjectId(id));
        }
        else {
            await supportService_1.default.markFAQAsNotHelpful(new mongoose_1.Types.ObjectId(id));
        }
        res.status(200).json({
            success: true,
            message: 'Feedback recorded successfully',
        });
    }
    catch (error) {
        console.error('❌ [SUPPORT CONTROLLER] Error marking FAQ helpful:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record feedback',
            error: error.message,
        });
    }
};
exports.markFAQHelpful = markFAQHelpful;
/**
 * Track FAQ view
 * POST /api/support/faq/:id/view
 */
const trackFAQView = async (req, res) => {
    try {
        const { id } = req.params;
        await supportService_1.default.incrementFAQView(new mongoose_1.Types.ObjectId(id));
        res.status(200).json({
            success: true,
            message: 'View tracked',
        });
    }
    catch (error) {
        console.error('❌ [SUPPORT CONTROLLER] Error tracking view:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track view',
            error: error.message,
        });
    }
};
exports.trackFAQView = trackFAQView;
// ==================== QUICK ACTIONS ====================
/**
 * Create ticket from order issue
 * POST /api/support/quick-actions/order-issue
 */
const createOrderIssueTicket = async (req, res) => {
    try {
        const userId = req.userId;
        const { orderId, issueType, description } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        if (!orderId || !issueType || !description) {
            res.status(400).json({
                success: false,
                message: 'Order ID, issue type, and description are required',
            });
            return;
        }
        const ticket = await supportService_1.default.createTicket({
            userId: new mongoose_1.Types.ObjectId(userId),
            subject: `Order Issue: ${issueType}`,
            category: 'order',
            initialMessage: description,
            relatedEntity: {
                type: 'order',
                id: new mongoose_1.Types.ObjectId(orderId),
            },
            priority: 'high',
        });
        res.status(201).json({
            success: true,
            message: 'Order issue ticket created successfully',
            data: { ticket },
        });
    }
    catch (error) {
        console.error('❌ [SUPPORT CONTROLLER] Error creating order issue:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order issue ticket',
            error: error.message,
        });
    }
};
exports.createOrderIssueTicket = createOrderIssueTicket;
/**
 * Report product issue
 * POST /api/support/quick-actions/report-product
 */
const reportProductIssue = async (req, res) => {
    try {
        const userId = req.userId;
        const { productId, issueType, description, images } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        if (!productId || !issueType || !description) {
            res.status(400).json({
                success: false,
                message: 'Product ID, issue type, and description are required',
            });
            return;
        }
        const ticket = await supportService_1.default.createTicket({
            userId: new mongoose_1.Types.ObjectId(userId),
            subject: `Product Issue: ${issueType}`,
            category: 'product',
            initialMessage: description,
            relatedEntity: {
                type: 'product',
                id: new mongoose_1.Types.ObjectId(productId),
            },
            attachments: images,
            priority: 'medium',
        });
        res.status(201).json({
            success: true,
            message: 'Product issue reported successfully',
            data: { ticket },
        });
    }
    catch (error) {
        console.error('❌ [SUPPORT CONTROLLER] Error reporting product:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to report product issue',
            error: error.message,
        });
    }
};
exports.reportProductIssue = reportProductIssue;
