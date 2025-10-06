import { Router } from 'express';
import {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getOrderTracking,
  rateOrder,
  getOrderStats,
  reorderFullOrder,
  reorderItems,
  validateReorder,
  getFrequentlyOrdered,
  getReorderSuggestions
} from '../controllers/orderController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate, validateParams, validateQuery, orderSchemas, commonSchemas } from '../middleware/validation';
// import { generalLimiter } from '../middleware/rateLimiter'; // Disabled for development
import { Joi } from '../middleware/validation';

const router = Router();

// All order routes require authentication
router.use(authenticate);

// Get user's order statistics
router.get('/stats',
  // generalLimiter,, // Disabled for development
  getOrderStats
);

// Get reorder suggestions
router.get('/reorder/suggestions',
  // generalLimiter,, // Disabled for development
  getReorderSuggestions
);

// Get frequently ordered items
router.get('/reorder/frequently-ordered',
  // generalLimiter,, // Disabled for development
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getFrequentlyOrdered
);

// Get user's orders
router.get('/', 
  // generalLimiter,, // Disabled for development
  validateQuery(Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getUserOrders
);

// Create new order
router.post('/', 
  // generalLimiter,, // Disabled for development
  validate(orderSchemas.createOrder),
  createOrder
);

// Get single order by ID
router.get('/:orderId', 
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  getOrderById
);

// Cancel order
router.patch('/:orderId/cancel', 
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    reason: Joi.string().trim().max(500)
  })),
  cancelOrder
);

// Get order tracking
router.get('/:orderId/tracking', 
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  getOrderTracking
);

// Rate and review order
router.post('/:orderId/rate',
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    review: Joi.string().trim().max(1000)
  })),
  rateOrder
);

// Validate reorder (check availability and prices)
router.get('/:orderId/reorder/validate',
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    itemIds: Joi.alternatives().try(
      Joi.array().items(commonSchemas.objectId()),
      commonSchemas.objectId()
    )
  })),
  validateReorder
);

// Re-order full order
router.post('/:orderId/reorder',
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  reorderFullOrder
);

// Re-order selected items
router.post('/:orderId/reorder/items',
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    itemIds: Joi.array().items(commonSchemas.objectId()).min(1).required()
  })),
  reorderItems
);

// Admin/Store Owner Routes
// Update order status
router.patch('/:orderId/status', 
  // generalLimiter,, // Disabled for development
  requireAdmin,
  validateParams(Joi.object({
    orderId: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled').required(),
    estimatedDeliveryTime: Joi.date().iso(),
    trackingInfo: Joi.object({
      trackingNumber: Joi.string().trim(),
      carrier: Joi.string().trim(),
      estimatedDelivery: Joi.date().iso(),
      location: Joi.string().trim(),
      notes: Joi.string().trim().max(500)
    })
  })),
  updateOrderStatus
);

export default router;