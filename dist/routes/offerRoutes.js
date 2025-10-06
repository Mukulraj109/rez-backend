"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const offerController_1 = require("../controllers/offerController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Public Routes (no authentication required, but can use optionalAuth for personalization)
// Get all offers with filters
router.get('/', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    category: validation_1.commonSchemas.objectId,
    store: validation_1.commonSchemas.objectId,
    featured: validation_2.Joi.boolean(),
    trending: validation_2.Joi.boolean(),
    bestSeller: validation_2.Joi.boolean(),
    special: validation_2.Joi.boolean(),
    isNew: validation_2.Joi.boolean(),
    minCashback: validation_2.Joi.number().min(0).max(100),
    maxCashback: validation_2.Joi.number().min(0).max(100),
    sortBy: validation_2.Joi.string().valid('cashback', 'createdAt', 'redemptionCount', 'endDate'),
    order: validation_2.Joi.string().valid('asc', 'desc').default('desc'),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), offerController_1.getOffers);
// Get featured offers
router.get('/featured', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10)
})), offerController_1.getFeaturedOffers);
// Get trending offers
router.get('/trending', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10)
})), offerController_1.getTrendingOffers);
// Search offers
router.get('/search', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    q: validation_2.Joi.string().required().trim().min(1).max(100),
    category: validation_1.commonSchemas.objectId,
    store: validation_1.commonSchemas.objectId,
    minCashback: validation_2.Joi.number().min(0).max(100),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), offerController_1.searchOffers);
// Get offers by category
router.get('/category/:categoryId', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    categoryId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    featured: validation_2.Joi.boolean(),
    trending: validation_2.Joi.boolean(),
    sortBy: validation_2.Joi.string().valid('cashback', 'createdAt', 'redemptionCount'),
    order: validation_2.Joi.string().valid('asc', 'desc').default('desc'),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), offerController_1.getOffersByCategory);
// Get offers by store
router.get('/store/:storeId', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    category: validation_1.commonSchemas.objectId,
    active: validation_2.Joi.boolean().default(true),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), offerController_1.getOffersByStore);
// Get single offer by ID
router.get('/:id', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), offerController_1.getOfferById);
// Get recommended offers based on user preferences
router.get('/user/recommendations', auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10)
})), offerController_1.getRecommendedOffers);
// Authenticated Routes (require user login)
// Redeem an offer
router.post('/:id/redeem', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_2.Joi.object({
    redemptionType: validation_2.Joi.string().valid('online', 'instore').required(),
    location: validation_2.Joi.object({
        type: validation_2.Joi.string().valid('Point').default('Point'),
        coordinates: validation_2.Joi.array().items(validation_2.Joi.number()).length(2)
    })
})), offerController_1.redeemOffer);
// Get user's redemptions
router.get('/user/redemptions', auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    status: validation_2.Joi.string().valid('pending', 'active', 'used', 'expired', 'cancelled'),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), offerController_1.getUserRedemptions);
// Get user's favorite offers
router.get('/user/favorites', auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), offerController_1.getUserFavoriteOffers);
// Add offer to favorites
router.post('/:id/favorite', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), offerController_1.addOfferToFavorites);
// Remove offer from favorites
router.delete('/:id/favorite', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), offerController_1.removeOfferFromFavorites);
// Analytics Routes (can be anonymous)
// Track offer view (analytics)
router.post('/:id/view', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), offerController_1.trackOfferView);
// Track offer click (analytics)
router.post('/:id/click', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), offerController_1.trackOfferClick);
exports.default = router;
