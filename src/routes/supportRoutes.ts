import { Router } from 'express';
import {
  createTicket,
  getMyTickets,
  getTicketById,
  addMessageToTicket,
  closeTicket,
  reopenTicket,
  rateTicket,
  getTicketsSummary,
  getAllFAQs,
  searchFAQs,
  getFAQCategories,
  getPopularFAQs,
  markFAQHelpful,
  trackFAQView,
  createOrderIssueTicket,
  reportProductIssue,
} from '../controllers/supportController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, validate, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// ==================== TICKET ROUTES ====================

// Get tickets summary
router.get('/tickets/summary',
  authenticate,
  getTicketsSummary
);

// Create ticket
router.post('/tickets',
  authenticate,
  validate(Joi.object({
    subject: Joi.string().trim().min(5).max(200).required(),
    category: Joi.string().valid('order', 'payment', 'product', 'account', 'technical', 'delivery', 'refund', 'other').required(),
    message: Joi.string().trim().min(10).max(5000).required(),
    relatedEntity: Joi.object({
      type: Joi.string().valid('order', 'product', 'transaction', 'none').required(),
      id: commonSchemas.objectId(),
    }),
    attachments: Joi.array().items(Joi.string().uri()),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  })),
  createTicket
);

// Get user's tickets
router.get('/tickets',
  authenticate,
  validateQuery(Joi.object({
    status: Joi.string().valid('open', 'in_progress', 'waiting_customer', 'resolved', 'closed'),
    category: Joi.string().valid('order', 'payment', 'product', 'account', 'technical', 'delivery', 'refund', 'other'),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  })),
  getMyTickets
);

// Get ticket by ID
router.get('/tickets/:id',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  getTicketById
);

// Add message to ticket
router.post('/tickets/:id/messages',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  validate(Joi.object({
    message: Joi.string().trim().min(1).max(5000).required(),
    attachments: Joi.array().items(Joi.string().uri()),
  })),
  addMessageToTicket
);

// Close ticket
router.post('/tickets/:id/close',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  closeTicket
);

// Reopen ticket
router.post('/tickets/:id/reopen',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  validate(Joi.object({
    reason: Joi.string().trim().min(5).max(500).required(),
  })),
  reopenTicket
);

// Rate ticket
router.post('/tickets/:id/rate',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  validate(Joi.object({
    score: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().trim().max(1000),
  })),
  rateTicket
);

// ==================== FAQ ROUTES ====================

// Search FAQs
router.get('/faq/search',
  optionalAuth,
  validateQuery(Joi.object({
    q: Joi.string().trim().min(2).max(100).required(),
    limit: Joi.number().integer().min(1).max(50).default(10),
  })),
  searchFAQs
);

// Get FAQ categories
router.get('/faq/categories',
  optionalAuth,
  getFAQCategories
);

// Get popular FAQs
router.get('/faq/popular',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
  })),
  getPopularFAQs
);

// Get all FAQs
router.get('/faq',
  optionalAuth,
  validateQuery(Joi.object({
    category: Joi.string().trim(),
    subcategory: Joi.string().trim(),
    limit: Joi.number().integer().min(1).max(100).default(100),
  })),
  getAllFAQs
);

// Mark FAQ as helpful/not helpful
router.post('/faq/:id/helpful',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  validate(Joi.object({
    helpful: Joi.boolean().required(),
  })),
  markFAQHelpful
);

// Track FAQ view
router.post('/faq/:id/view',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required(),
  })),
  trackFAQView
);

// ==================== QUICK ACTIONS ====================

// Create order issue ticket
router.post('/quick-actions/order-issue',
  authenticate,
  validate(Joi.object({
    orderId: commonSchemas.objectId().required(),
    issueType: Joi.string().trim().min(3).max(100).required(),
    description: Joi.string().trim().min(10).max(5000).required(),
  })),
  createOrderIssueTicket
);

// Report product issue
router.post('/quick-actions/report-product',
  authenticate,
  validate(Joi.object({
    productId: commonSchemas.objectId().required(),
    issueType: Joi.string().trim().min(3).max(100).required(),
    description: Joi.string().trim().min(10).max(5000).required(),
    images: Joi.array().items(Joi.string().uri()),
  })),
  reportProductIssue
);

export default router;
