import { Router } from 'express';
import {
  getCategories,
  getCategoryTree,
  getCategoryBySlug,
  getCategoriesWithCounts,
  getRootCategories,
  getFeaturedCategories,
  getBestDiscountCategories,
  getBestSellerCategories
} from '../controllers/categoryController';
import { optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams } from '../middleware/validation';
// import { generalLimiter } from '../middleware/rateLimiter'; // Disabled for development
import { Joi } from '../middleware/validation';

const router = Router();

// Get all categories
router.get('/', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    type: Joi.string().valid('going_out', 'home_delivery', 'earn', 'play', 'general'),
    featured: Joi.boolean(),
    parent: Joi.string(),
    isActive: Joi.alternatives().try(
      Joi.boolean(),
      Joi.string().valid('true', 'false')
    )
  })),
  getCategories
);

// Get category tree
router.get('/tree', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    type: Joi.string().valid('going_out', 'home_delivery', 'earn', 'play', 'general')
  })),
  getCategoryTree
);

// Get root categories
router.get('/root', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    type: Joi.string().valid('going_out', 'home_delivery', 'earn', 'play', 'general')
  })),
  getRootCategories
);

// Get featured categories
router.get('/featured', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    type: Joi.string().valid('going_out', 'home_delivery', 'earn', 'play', 'general'),
    limit: Joi.number().integer().min(1).max(20).default(6)
  })),
  getFeaturedCategories
);

// Get categories with counts
router.get('/with-counts',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    type: Joi.string().valid('going_out', 'home_delivery', 'earn', 'play', 'general').default('general')
  })),
  getCategoriesWithCounts
);

// Get best discount categories
router.get('/best-discount',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  getBestDiscountCategories
);

// Get best seller categories
router.get('/best-seller',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  getBestSellerCategories
);

// Get category by slug  
router.get('/:slug', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  getCategoryBySlug
);

export default router;