import { Router } from 'express';
import {
  getDiscounts,
  getDiscountById,
  getDiscountsForProduct,
  validateDiscount,
  applyDiscount,
  getUserDiscountHistory,
  getDiscountAnalytics,
  getBillPaymentDiscounts,
} from '../controllers/discountController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, validate, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// Public Routes (no authentication required)

// Get all discounts with filters
router.get(
  '/',
  optionalAuth,
  validateQuery(
    Joi.object({
      applicableOn: Joi.string().valid('bill_payment', 'all', 'specific_products', 'specific_categories'),
      type: Joi.string().valid('percentage', 'fixed'),
      minValue: Joi.number().min(0),
      maxValue: Joi.number().min(0),
      sortBy: Joi.string().valid('priority', 'value', 'createdAt').default('priority'),
      order: Joi.string().valid('asc', 'desc').default('desc'),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(20),
    })
  ),
  getDiscounts
);

// Get bill payment discounts
router.get(
  '/bill-payment',
  optionalAuth,
  validateQuery(
    Joi.object({
      orderValue: Joi.number().min(0).default(0),
    })
  ),
  getBillPaymentDiscounts
);

// Get single discount by ID
router.get(
  '/:id',
  optionalAuth,
  validateParams(
    Joi.object({
      id: commonSchemas.objectId().required(),
    })
  ),
  getDiscountById
);

// Get discounts for a specific product
router.get(
  '/product/:productId',
  optionalAuth,
  validateParams(
    Joi.object({
      productId: commonSchemas.objectId().required(),
    })
  ),
  validateQuery(
    Joi.object({
      orderValue: Joi.number().min(0).default(0),
    })
  ),
  getDiscountsForProduct
);

// Validate discount code
router.post(
  '/validate',
  optionalAuth,
  validate(
    Joi.object({
      code: Joi.string().required().trim().uppercase(),
      orderValue: Joi.number().required().min(0),
      productIds: Joi.array().items(commonSchemas.objectId()),
      categoryIds: Joi.array().items(commonSchemas.objectId()),
    })
  ),
  validateDiscount
);

// Authenticated Routes (require user login)

// Apply discount to order
router.post(
  '/apply',
  authenticate,
  validate(
    Joi.object({
      discountId: commonSchemas.objectId().required(),
      orderId: commonSchemas.objectId().required(),
      orderValue: Joi.number().required().min(0),
    })
  ),
  applyDiscount
);

// Get user's discount usage history
router.get(
  '/my-history',
  authenticate,
  validateQuery(
    Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(20),
    })
  ),
  getUserDiscountHistory
);

// Get analytics for a discount (admin only)
router.get(
  '/:id/analytics',
  authenticate,
  validateParams(
    Joi.object({
      id: commonSchemas.objectId().required(),
    })
  ),
  getDiscountAnalytics
);

export default router;
