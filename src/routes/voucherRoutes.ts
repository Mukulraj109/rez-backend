import { Router } from 'express';
import {
  getVoucherBrands,
  getVoucherBrandById,
  getFeaturedBrands,
  getNewlyAddedBrands,
  getVoucherCategories,
  purchaseVoucher,
  getUserVouchers,
  getUserVoucherById,
  useVoucher,
  trackBrandView
} from '../controllers/voucherController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, validate, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// Public Routes - Voucher Brands

// Get all voucher brands with filters
router.get('/brands',
  optionalAuth,
  validateQuery(Joi.object({
    category: Joi.string().trim().lowercase(),
    featured: Joi.boolean(),
    newlyAdded: Joi.boolean(),
    search: Joi.string().trim().min(1).max(100),
    sortBy: Joi.string().valid('name', 'cashbackRate', 'purchaseCount', 'rating', 'createdAt').default('name'),
    order: Joi.string().valid('asc', 'desc').default('asc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getVoucherBrands
);

// Get featured voucher brands
router.get('/brands/featured',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getFeaturedBrands
);

// Get newly added voucher brands
router.get('/brands/newly-added',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getNewlyAddedBrands
);

// Get voucher categories
router.get('/categories',
  optionalAuth,
  getVoucherCategories
);

// Get single voucher brand by ID
router.get('/brands/:id',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  getVoucherBrandById
);

// Track brand view (analytics)
router.post('/brands/:id/track-view',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  trackBrandView
);

// Authenticated Routes - User Voucher Management

// Purchase a voucher
router.post('/purchase',
  authenticate,
  validate(Joi.object({
    brandId: commonSchemas.objectId().required(),
    denomination: Joi.number().integer().min(1).required(),
    paymentMethod: Joi.string().valid('wallet', 'card', 'upi', 'netbanking').default('wallet')
  })),
  purchaseVoucher
);

// Get user's purchased vouchers
router.get('/my-vouchers',
  authenticate,
  validateQuery(Joi.object({
    status: Joi.string().valid('active', 'used', 'expired', 'cancelled'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getUserVouchers
);

// Get single user voucher by ID
router.get('/my-vouchers/:id',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  getUserVoucherById
);

// Use a voucher (mark as used)
router.post('/:id/use',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    usageLocation: Joi.string().trim().max(200)
  })),
  useVoucher
);

export default router;