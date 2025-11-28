"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const favoriteController_1 = require("../controllers/favoriteController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
// // import { generalLimiter, favoriteLimiter } from '../middleware/rateLimiter'; // Disabled for development // Disabled for development
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Add store to favorites
router.post('/store/:storeId', 
// favoriteLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId()
})), favoriteController_1.addToFavorites);
// Remove store from favorites
router.delete('/store/:storeId', 
// favoriteLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId()
})), favoriteController_1.removeFromFavorites);
// Toggle favorite status
router.post('/store/:storeId/toggle', 
// favoriteLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId()
})), favoriteController_1.toggleFavorite);
// Check if store is favorited by user
router.get('/store/:storeId/status', 
// generalLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId()
})), favoriteController_1.isStoreFavorited);
// Get user's favorite stores
router.get('/user/my-favorites', 
// generalLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), favoriteController_1.getUserFavorites);
// Get favorite status for multiple stores
router.post('/statuses', 
// generalLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateBody)(validation_2.Joi.object({
    storeIds: validation_2.Joi.array().items(validation_1.commonSchemas.objectId()).min(1).max(100).required()
})), favoriteController_1.getFavoriteStatuses);
// Clear all favorites
router.delete('/clear-all', 
// favoriteLimiter,, // Disabled for development
auth_1.requireAuth, favoriteController_1.clearAllFavorites);
exports.default = router;
