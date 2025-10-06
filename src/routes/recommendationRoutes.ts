import { Router } from 'express';
import {
  getPersonalizedRecommendations,
  getStoreRecommendations,
  getTrendingStores,
  getCategoryRecommendations,
  getUserRecommendationPreferences,
  updateUserRecommendationPreferences,
  getSimilarProducts,
  getFrequentlyBoughtTogether,
  getBundleDeals,
  getPersonalizedProductRecommendations,
  trackProductView
} from '../controllers/recommendationController';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { validateQuery, validateParams, validateBody } from '../middleware/validation';
// // import { generalLimiter, recommendationLimiter } from '../middleware/rateLimiter'; // Disabled for development // Disabled for development
import { Joi } from '../middleware/validation';

const router = Router();

// Get personalized store recommendations
router.get('/personalized',   // recommendationLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    location: Joi.string().pattern(/^-?\d+\.?\d*,-?\d+\.?\d*$/), // "lng,lat" format
    radius: Joi.number().min(0.1).max(50).default(10),
    limit: Joi.number().integer().min(1).max(50).default(10),
    excludeStores: Joi.string(), // Comma-separated store IDs
    category: Joi.string().valid('fastDelivery', 'budgetFriendly', 'premium', 'organic', 'alliance', 'lowestPrice', 'mall', 'cashStore'),
    minRating: Joi.number().min(1).max(5),
    maxDeliveryTime: Joi.number().min(5).max(120),
    priceRange: Joi.string().pattern(/^\d+-\d+$/), // "0-100" format
    features: Joi.string() // Comma-separated features
  })),
  getPersonalizedRecommendations
);

// Get recommendations for a specific store
router.get('/store/:storeId',   // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    storeId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(5)
  })),
  getStoreRecommendations
);

// Get trending stores
router.get('/trending',   // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    location: Joi.string().pattern(/^-?\d+\.?\d*,-?\d+\.?\d*$/), // "lng,lat" format
    radius: Joi.number().min(0.1).max(50).default(10),
    limit: Joi.number().integer().min(1).max(50).default(10),
    category: Joi.string().valid('fastDelivery', 'budgetFriendly', 'premium', 'organic', 'alliance', 'lowestPrice', 'mall', 'cashStore'),
    timeRange: Joi.string().valid('1d', '7d', '30d').default('7d')
  })),
  getTrendingStores
);

// Get category-based recommendations
router.get('/category/:category',   // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    category: Joi.string().valid('fastDelivery', 'budgetFriendly', 'premium', 'organic', 'alliance', 'lowestPrice', 'mall', 'cashStore')
  })),
  validateQuery(Joi.object({
    location: Joi.string().pattern(/^-?\d+\.?\d*,-?\d+\.?\d*$/), // "lng,lat" format
    radius: Joi.number().min(0.1).max(50).default(10),
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getCategoryRecommendations
);

// Get user's recommendation preferences
router.get('/preferences',   // generalLimiter,, // Disabled for development
  requireAuth,
  getUserRecommendationPreferences
);

// Update user's recommendation preferences
router.put('/preferences',   // recommendationLimiter,, // Disabled for development
  requireAuth,
  validateBody(Joi.object({
    preferences: Joi.object({
      categories: Joi.array().items(Joi.string()),
      priceRange: Joi.object({
        min: Joi.number().min(0),
        max: Joi.number().min(0)
      }),
      maxDeliveryTime: Joi.number().min(5).max(120),
      minRating: Joi.number().min(1).max(5),
      features: Joi.array().items(Joi.string())
    })
  })),
  updateUserRecommendationPreferences
);

// ============================================
// PRODUCT RECOMMENDATION ROUTES
// ============================================

// Get similar products for a specific product
router.get('/products/similar/:productId',   // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    productId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(6)
  })),
  getSimilarProducts
);

// Get frequently bought together for a product
router.get('/products/frequently-bought/:productId',   // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    productId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(10).default(4)
  })),
  getFrequentlyBoughtTogether
);

// Get bundle deals for a product
router.get('/products/bundle/:productId',   // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    productId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(10).default(3)
  })),
  getBundleDeals
);

// Get personalized product recommendations for user
router.get('/products/personalized',   // recommendationLimiter,, // Disabled for development
  requireAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    excludeProducts: Joi.string() // Comma-separated product IDs
  })),
  getPersonalizedProductRecommendations
);

// Track product view
router.post('/products/:productId/view',   // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    productId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
  })),
  trackProductView
);

export default router;
