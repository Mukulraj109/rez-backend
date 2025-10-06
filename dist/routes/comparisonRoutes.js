"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const comparisonController_1 = require("../controllers/comparisonController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
// // import { generalLimiter, comparisonLimiter } from '../middleware/rateLimiter'; // Disabled for development // Disabled for development
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Create a new store comparison
router.post('/', 
// comparisonLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateBody)(validation_2.Joi.object({
    storeIds: validation_2.Joi.array().items(validation_1.commonSchemas.objectId()).min(2).max(5).required(),
    name: validation_2.Joi.string().trim().max(100)
})), comparisonController_1.createComparison);
// Get user's store comparisons
router.get('/user/my-comparisons', 
// generalLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), comparisonController_1.getUserComparisons);
// Get specific comparison by ID
router.get('/:comparisonId', 
// generalLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    comparisonId: validation_1.commonSchemas.objectId()
})), comparisonController_1.getComparisonById);
// Update comparison
router.put('/:comparisonId', 
// comparisonLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    comparisonId: validation_1.commonSchemas.objectId()
})), (0, validation_1.validateBody)(validation_2.Joi.object({
    storeIds: validation_2.Joi.array().items(validation_1.commonSchemas.objectId()).min(2).max(5),
    name: validation_2.Joi.string().trim().max(100)
})), comparisonController_1.updateComparison);
// Delete comparison
router.delete('/:comparisonId', 
// comparisonLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    comparisonId: validation_1.commonSchemas.objectId()
})), comparisonController_1.deleteComparison);
// Add store to comparison
router.post('/:comparisonId/stores', 
// comparisonLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    comparisonId: validation_1.commonSchemas.objectId()
})), (0, validation_1.validateBody)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required()
})), comparisonController_1.addStoreToComparison);
// Remove store from comparison
router.delete('/:comparisonId/stores/:storeId', 
// comparisonLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    comparisonId: validation_1.commonSchemas.objectId(),
    storeId: validation_1.commonSchemas.objectId()
})), comparisonController_1.removeStoreFromComparison);
// Get comparison statistics
router.get('/user/stats', 
// generalLimiter,, // Disabled for development
auth_1.requireAuth, comparisonController_1.getComparisonStats);
// Clear all comparisons
router.delete('/user/clear-all', 
// comparisonLimiter,, // Disabled for development
auth_1.requireAuth, comparisonController_1.clearAllComparisons);
exports.default = router;
