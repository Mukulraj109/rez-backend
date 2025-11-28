"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const categoryController_1 = require("../controllers/categoryController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
// import { generalLimiter } from '../middleware/rateLimiter'; // Disabled for development
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Get all categories
router.get('/', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    type: validation_2.Joi.string().valid('going_out', 'home_delivery', 'earn', 'play', 'general'),
    featured: validation_2.Joi.boolean(),
    parent: validation_2.Joi.string()
})), categoryController_1.getCategories);
// Get category tree
router.get('/tree', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    type: validation_2.Joi.string().valid('going_out', 'home_delivery', 'earn', 'play', 'general')
})), categoryController_1.getCategoryTree);
// Get root categories
router.get('/root', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    type: validation_2.Joi.string().valid('going_out', 'home_delivery', 'earn', 'play', 'general')
})), categoryController_1.getRootCategories);
// Get featured categories
router.get('/featured', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    type: validation_2.Joi.string().valid('going_out', 'home_delivery', 'earn', 'play', 'general'),
    limit: validation_2.Joi.number().integer().min(1).max(20).default(6)
})), categoryController_1.getFeaturedCategories);
// Get categories with counts
router.get('/with-counts', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    type: validation_2.Joi.string().valid('going_out', 'home_delivery', 'earn', 'play', 'general').default('general')
})), categoryController_1.getCategoriesWithCounts);
// Get category by slug  
router.get('/:slug', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    slug: validation_2.Joi.string().required()
})), categoryController_1.getCategoryBySlug);
exports.default = router;
