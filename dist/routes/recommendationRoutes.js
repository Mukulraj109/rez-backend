"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const recommendationController_1 = require("../controllers/recommendationController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
// // import { generalLimiter, recommendationLimiter } from '../middleware/rateLimiter'; // Disabled for development // Disabled for development
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Get personalized store recommendations
router.get('/personalized', 
// recommendationLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    location: validation_2.Joi.string().pattern(/^-?\d+\.?\d*,-?\d+\.?\d*$/), // "lng,lat" format
    radius: validation_2.Joi.number().min(0.1).max(50).default(10),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10),
    excludeStores: validation_2.Joi.string(), // Comma-separated store IDs
    category: validation_2.Joi.string().valid('fastDelivery', 'budgetFriendly', 'premium', 'organic', 'alliance', 'lowestPrice', 'mall', 'cashStore'),
    minRating: validation_2.Joi.number().min(1).max(5),
    maxDeliveryTime: validation_2.Joi.number().min(5).max(120),
    priceRange: validation_2.Joi.string().pattern(/^\d+-\d+$/), // "0-100" format
    features: validation_2.Joi.string() // Comma-separated features
})), recommendationController_1.getPersonalizedRecommendations);
// Get recommendations for a specific store
router.get('/store/:storeId', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_2.Joi.string().pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(20).default(5)
})), recommendationController_1.getStoreRecommendations);
// Get trending stores
router.get('/trending', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    location: validation_2.Joi.string().pattern(/^-?\d+\.?\d*,-?\d+\.?\d*$/), // "lng,lat" format
    radius: validation_2.Joi.number().min(0.1).max(50).default(10),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10),
    category: validation_2.Joi.string().valid('fastDelivery', 'budgetFriendly', 'premium', 'organic', 'alliance', 'lowestPrice', 'mall', 'cashStore'),
    timeRange: validation_2.Joi.string().valid('1d', '7d', '30d').default('7d')
})), recommendationController_1.getTrendingStores);
// Get category-based recommendations
router.get('/category/:category', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    category: validation_2.Joi.string().valid('fastDelivery', 'budgetFriendly', 'premium', 'organic', 'alliance', 'lowestPrice', 'mall', 'cashStore')
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    location: validation_2.Joi.string().pattern(/^-?\d+\.?\d*,-?\d+\.?\d*$/), // "lng,lat" format
    radius: validation_2.Joi.number().min(0.1).max(50).default(10),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10)
})), recommendationController_1.getCategoryRecommendations);
// Get user's recommendation preferences
router.get('/preferences', 
// generalLimiter,, // Disabled for development
auth_1.requireAuth, recommendationController_1.getUserRecommendationPreferences);
// Update user's recommendation preferences
router.put('/preferences', 
// recommendationLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateBody)(validation_2.Joi.object({
    preferences: validation_2.Joi.object({
        categories: validation_2.Joi.array().items(validation_2.Joi.string()),
        priceRange: validation_2.Joi.object({
            min: validation_2.Joi.number().min(0),
            max: validation_2.Joi.number().min(0)
        }),
        maxDeliveryTime: validation_2.Joi.number().min(5).max(120),
        minRating: validation_2.Joi.number().min(1).max(5),
        features: validation_2.Joi.array().items(validation_2.Joi.string())
    })
})), recommendationController_1.updateUserRecommendationPreferences);
// ============================================
// PRODUCT RECOMMENDATION ROUTES
// ============================================
// Get similar products for a specific product
router.get('/products/similar/:productId', // generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    productId: validation_2.Joi.string().pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(20).default(6)
})), recommendationController_1.getSimilarProducts);
// Get frequently bought together for a product
router.get('/products/frequently-bought/:productId', // generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    productId: validation_2.Joi.string().pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(10).default(4)
})), recommendationController_1.getFrequentlyBoughtTogether);
// Get bundle deals for a product
router.get('/products/bundle/:productId', // generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    productId: validation_2.Joi.string().pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(10).default(3)
})), recommendationController_1.getBundleDeals);
// Get personalized product recommendations for user
router.get('/products/personalized', // recommendationLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10),
    excludeProducts: validation_2.Joi.string() // Comma-separated product IDs
})), recommendationController_1.getPersonalizedProductRecommendations);
// Track product view
router.post('/products/:productId/view', // generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    productId: validation_2.Joi.string().pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
})), recommendationController_1.trackProductView);
exports.default = router;
