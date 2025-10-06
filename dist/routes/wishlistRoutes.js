"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wishlistController_1 = require("../controllers/wishlistController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
// import { generalLimiter } from '../middleware/rateLimiter'; // Disabled for development
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Get public wishlists
router.get('/public', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    category: validation_2.Joi.string().valid('personal', 'gift', 'business', 'event', 'custom'),
    search: validation_2.Joi.string().trim().max(100),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), wishlistController_1.getPublicWishlists);
// All other wishlist routes require authentication
router.use(auth_1.authenticate);
// Get user's wishlists
router.get('/', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateQuery)(validation_2.Joi.object({
    category: validation_2.Joi.string().valid('personal', 'gift', 'business', 'event', 'custom'),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), wishlistController_1.getUserWishlists);
// Create new wishlist
router.post('/', 
// generalLimiter,, // Disabled for development
(0, validation_1.validate)(validation_1.wishlistSchemas.createWishlist), wishlistController_1.createWishlist);
// Get single wishlist by ID
router.get('/:wishlistId', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    wishlistId: validation_1.commonSchemas.objectId().required()
})), wishlistController_1.getWishlistById);
// Delete wishlist
router.delete('/:wishlistId', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    wishlistId: validation_1.commonSchemas.objectId().required()
})), wishlistController_1.deleteWishlist);
// Add item to wishlist
router.post('/:wishlistId/items', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    wishlistId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_1.wishlistSchemas.addToWishlist), wishlistController_1.addToWishlist);
// Update wishlist item
router.patch('/:wishlistId/items/:itemId', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    wishlistId: validation_1.commonSchemas.objectId().required(),
    itemId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_2.Joi.object({
    priority: validation_2.Joi.string().valid('low', 'medium', 'high'),
    notes: validation_2.Joi.string().trim().max(300).allow(''),
    targetPrice: validation_2.Joi.number().min(0),
    notifyOnPriceChange: validation_2.Joi.boolean(),
    notifyOnAvailability: validation_2.Joi.boolean(),
    tags: validation_2.Joi.array().items(validation_2.Joi.string().trim().lowercase())
})), wishlistController_1.updateWishlistItem);
// Remove item from wishlist
router.delete('/:wishlistId/items/:itemId', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    wishlistId: validation_1.commonSchemas.objectId().required(),
    itemId: validation_1.commonSchemas.objectId().required()
})), wishlistController_1.removeFromWishlist);
exports.default = router;
