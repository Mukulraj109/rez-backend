"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const storeController_1 = require("../controllers/storeController");
const reviewController_1 = require("../controllers/reviewController");
const storeVisitController_1 = require("../controllers/storeVisitController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
// import { generalLimiter, searchLimiter } from '../middleware/rateLimiter'; // Disabled for development
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Get all stores with filtering
router.get('/', 
// generalLimiter, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    category: validation_1.commonSchemas.objectId(),
    location: validation_2.Joi.string(), // "lng,lat" format
    radius: validation_2.Joi.number().min(0.1).max(50).default(10),
    rating: validation_2.Joi.number().min(1).max(5),
    isOpen: validation_2.Joi.boolean(),
    search: validation_2.Joi.string().trim().max(100),
    tags: validation_2.Joi.alternatives().try(validation_2.Joi.string().trim().max(100), validation_2.Joi.array().items(validation_2.Joi.string().trim().max(100))),
    isFeatured: validation_2.Joi.alternatives().try(validation_2.Joi.boolean(), validation_2.Joi.string().valid('true', 'false')),
    sortBy: validation_2.Joi.string().valid('rating', 'distance', 'name', 'newest').default('rating'),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), storeController_1.getStores);
// Search stores
router.get('/search', 
// searchLimiter, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    q: validation_2.Joi.string().trim().min(2).max(100).required(),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), storeController_1.searchStores);
// Advanced store search with filters
router.get('/search/advanced', 
// searchLimiter, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    search: validation_2.Joi.string().trim().max(100),
    category: validation_2.Joi.string().valid('fastDelivery', 'budgetFriendly', 'premium', 'organic', 'alliance', 'lowestPrice', 'mall', 'cashStore'),
    deliveryTime: validation_2.Joi.string().pattern(/^\d+-\d+$/), // "15-30" format
    priceRange: validation_2.Joi.string().pattern(/^\d+-\d+$/), // "0-100" format
    rating: validation_2.Joi.number().min(0).max(5),
    paymentMethods: validation_2.Joi.string(), // "cash,card,upi" format
    features: validation_2.Joi.string(), // "freeDelivery,walletPayment,verified,featured" format
    sortBy: validation_2.Joi.string().valid('rating', 'distance', 'name', 'newest', 'price').default('rating'),
    location: validation_2.Joi.string(), // "lng,lat" format
    radius: validation_2.Joi.number().min(0.1).max(50).default(10),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), storeController_1.advancedStoreSearch);
// Get nearby stores
router.get('/nearby', 
// generalLimiter, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    lng: validation_2.Joi.number().min(-180).max(180).required(),
    lat: validation_2.Joi.number().min(-90).max(90).required(),
    radius: validation_2.Joi.number().min(0.1).max(50).default(5),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10)
})), storeController_1.getNearbyStores);
// Get featured stores
router.get('/featured', 
// generalLimiter, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10)
})), storeController_1.getFeaturedStores);
// Get trending stores - FOR FRONTEND TRENDING SECTION
router.get('/trending', 
// generalLimiter, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    category: validation_2.Joi.string().trim().max(100),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
    page: validation_2.Joi.number().integer().min(1).default(1),
    days: validation_2.Joi.number().integer().min(1).max(30).default(7)
})), storeController_1.getTrendingStores);
// Get stores by category
router.get('/category/:categoryId', 
// generalLimiter, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    categoryId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
    sortBy: validation_2.Joi.string().valid('rating', 'name', 'newest').default('rating')
})), storeController_1.getStoresByCategory);
// Get single store by ID or slug
router.get('/:storeId', 
// generalLimiter, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_2.Joi.string().required()
})), storeController_1.getStoreById);
// Get store products
router.get('/:storeId/products', 
// generalLimiter, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    category: validation_1.commonSchemas.objectId(),
    search: validation_2.Joi.string().trim().max(100),
    sortBy: validation_2.Joi.string().valid('price_low', 'price_high', 'rating', 'newest', 'popular').default('newest'),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), storeController_1.getStoreProducts);
// Get store operating status
router.get('/:storeId/status', 
// generalLimiter, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required()
})), storeController_1.getStoreOperatingStatus);
// Get store reviews
router.get('/:storeId/reviews', 
// generalLimiter, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
    rating: validation_2.Joi.number().integer().min(1).max(5),
    sort: validation_2.Joi.string().valid('newest', 'oldest', 'rating_high', 'rating_low').default('newest')
})), reviewController_1.getStoreReviews);
// Get available store categories
router.get('/categories/list', 
// generalLimiter, // Disabled for development
auth_1.optionalAuth, storeController_1.getStoreCategories);
// Search stores by delivery category
router.get('/search-by-category/:category', 
// generalLimiter, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    category: validation_2.Joi.string().valid('all', 'fastDelivery', 'budgetFriendly', 'oneRupeeStore', 'ninetyNineStore', 'premium', 'organic', 'alliance', 'lowestPrice', 'mall', 'cashStore').required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    location: validation_2.Joi.string(), // "lng,lat" format
    radius: validation_2.Joi.number().min(0.1).max(50).default(10),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
    sortBy: validation_2.Joi.string().valid('rating', 'distance', 'name', 'newest').default('rating')
})), storeController_1.searchStoresByCategory);
// Search stores by delivery time range
router.get('/search-by-delivery-time', 
// generalLimiter, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    minTime: validation_2.Joi.number().integer().min(5).max(120).default(15),
    maxTime: validation_2.Joi.number().integer().min(5).max(120).default(60),
    location: validation_2.Joi.string(), // "lng,lat" format
    radius: validation_2.Joi.number().min(0.1).max(50).default(10),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), storeController_1.searchStoresByDeliveryTime);
// ============================================
// Store Visit Routes (nested under /stores/:storeId)
// ============================================
// Schedule a store visit
router.post('/:storeId/visits/schedule', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required()
})), (req, res, next) => {
    // Inject storeId from URL params into request body
    req.body.storeId = req.params.storeId;
    next();
}, storeVisitController_1.scheduleStoreVisit);
// Get queue number for walk-in
router.post('/:storeId/queue', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required()
})), (req, res, next) => {
    // Inject storeId from URL params into request body
    req.body.storeId = req.params.storeId;
    next();
}, storeVisitController_1.getQueueNumber);
// Get current queue status (public)
router.get('/:storeId/queue/status', (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required()
})), storeVisitController_1.getCurrentQueueStatus);
// Check store availability / crowd status (public)
router.get('/:storeId/availability', (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required()
})), storeVisitController_1.checkStoreAvailability);
// ============================================
// Follower Notification Routes
// ============================================
// Get follower count for a store (public)
router.get('/:storeId/followers/count', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required()
})), storeController_1.getStoreFollowerCount);
// Get all followers of a store (merchant/admin only)
router.get('/:storeId/followers', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required()
})), storeController_1.getStoreFollowers);
// Send custom notification to all followers (merchant/admin only)
router.post('/:storeId/notify-followers', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required()
})), (req, res, next) => {
    const schema = validation_2.Joi.object({
        title: validation_2.Joi.string().trim().min(3).max(100).required(),
        message: validation_2.Joi.string().trim().min(10).max(500).required(),
        imageUrl: validation_2.Joi.string().uri().optional(),
        deepLink: validation_2.Joi.string().trim().optional()
    });
    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }
    next();
}, storeController_1.sendFollowerNotification);
// Notify followers about a new offer (merchant/admin only)
router.post('/:storeId/notify-offer', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required()
})), (req, res, next) => {
    const schema = validation_2.Joi.object({
        offerId: validation_1.commonSchemas.objectId().required(),
        title: validation_2.Joi.string().trim().min(3).max(100).required(),
        description: validation_2.Joi.string().trim().max(500).optional(),
        discount: validation_2.Joi.number().min(0).max(100).optional(),
        imageUrl: validation_2.Joi.string().uri().optional()
    });
    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }
    next();
}, storeController_1.notifyNewOffer);
// Notify followers about a new product (merchant/admin only)
router.post('/:storeId/notify-product', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required()
})), (req, res, next) => {
    const schema = validation_2.Joi.object({
        productId: validation_1.commonSchemas.objectId().required()
    });
    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }
    next();
}, storeController_1.notifyNewProduct);
exports.default = router;
