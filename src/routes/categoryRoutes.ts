import { Router } from 'express';
import {
  getCategories,
  getCategoryTree,
  getCategoryBySlug,
  getCategoriesWithCounts,
  getRootCategories,
  getFeaturedCategories,
  getBestDiscountCategories,
  getBestSellerCategories,
  getCategoryVibes,
  getCategoryOccasions,
  getCategoryHashtags,
  getCategoryAISuggestions,
  getCategoryLoyaltyStats,
  getRecentOrders
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

// Get category vibes
router.get('/:slug/vibes',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  getCategoryVibes
);

// Get category occasions
router.get('/:slug/occasions',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  getCategoryOccasions
);

// Get category hashtags
router.get('/:slug/hashtags',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(6)
  })),
  getCategoryHashtags
);

// Get category AI suggestions
router.get('/:slug/ai-suggestions',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  getCategoryAISuggestions
);

// Get category loyalty stats
router.get('/:slug/loyalty-stats',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  getCategoryLoyaltyStats
);

// Get recent orders for social proof ticker
router.get('/:slug/recent-orders',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(10).default(5)
  })),
  getRecentOrders
);

export default router;