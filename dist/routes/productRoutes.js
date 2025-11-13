"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productController_1 = require("../controllers/productController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
// // import { searchLimiter, generalLimiter } from '../middleware/rateLimiter'; // Disabled for development // Disabled for development
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Get all products with filtering
router.get('/', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_1.productSchemas.getProducts), productController_1.getProducts);
// Get featured products - FOR FRONTEND "Just for You" SECTION
router.get('/featured', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(20).default(10)
})), productController_1.getFeaturedProducts);
// Get new arrival products - FOR FRONTEND "New Arrivals" SECTION
router.get('/new-arrivals', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(20).default(10)
})), productController_1.getNewArrivals);
// Search products
router.get('/search', 
// searchLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    q: validation_2.Joi.string().required().trim().min(1).max(100),
    category: validation_1.commonSchemas.objectId(),
    store: validation_1.commonSchemas.objectId(),
    brand: validation_2.Joi.string().max(50),
    minPrice: validation_2.Joi.number().min(0),
    maxPrice: validation_2.Joi.number().min(0),
    rating: validation_2.Joi.number().min(1).max(5),
    inStock: validation_2.Joi.boolean(),
    ...validation_1.commonSchemas.pagination()
})), productController_1.searchProducts);
// Get search suggestions - FOR FRONTEND SEARCH AUTOCOMPLETE
router.get('/suggestions', 
// searchLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    q: validation_2.Joi.string().required().trim().min(1).max(100)
})), productController_1.getSearchSuggestions);
// Get popular searches - FOR FRONTEND SEARCH
router.get('/popular-searches', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(20).default(10)
})), productController_1.getPopularSearches);
// Get single product by ID
router.get('/:id', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), productController_1.getProductById);
// Get product recommendations
router.get('/:productId/recommendations', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    productId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(20).default(6)
})), productController_1.getRecommendations);
// Get products by category
router.get('/category/:categorySlug', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    categorySlug: validation_2.Joi.string().required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    minPrice: validation_2.Joi.number().min(0),
    maxPrice: validation_2.Joi.number().min(0),
    rating: validation_2.Joi.number().min(1).max(5),
    sortBy: validation_2.Joi.string().valid('price_low', 'price_high', 'rating', 'newest'),
    ...validation_1.commonSchemas.pagination
})), productController_1.getProductsByCategory);
// Get products by store
router.get('/store/:storeId', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    // Accept both ObjectId format and string IDs (for mock data compatibility)
    storeId: validation_2.Joi.string().trim().min(1).required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    category: validation_1.commonSchemas.objectId,
    minPrice: validation_2.Joi.number().min(0),
    maxPrice: validation_2.Joi.number().min(0),
    sortBy: validation_2.Joi.string().valid('price_low', 'price_high', 'rating', 'newest'),
    ...validation_1.commonSchemas.pagination
})), productController_1.getProductsByStore);
// Track product view
router.post('/:id/track-view', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), productController_1.trackProductView);
// Get product analytics
router.get('/:id/analytics', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    location: validation_2.Joi.string() // JSON stringified location object
})), productController_1.getProductAnalytics);
// Get frequently bought together products
router.get('/:id/frequently-bought', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(10).default(4)
})), productController_1.getFrequentlyBoughtTogether);
// Get bundle products
router.get('/:id/bundles', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), productController_1.getBundleProducts);
// Get related products - FOR FRONTEND PRODUCT DETAILS PAGE
router.get('/:id/related', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(20).default(5)
})), productController_1.getRelatedProducts);
// Check product availability - FOR FRONTEND CART/CHECKOUT
router.get('/:id/availability', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    variantId: validation_2.Joi.string(),
    quantity: validation_2.Joi.number().integer().min(1).default(1)
})), productController_1.checkAvailability);
exports.default = router;
