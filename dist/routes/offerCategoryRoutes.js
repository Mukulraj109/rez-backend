"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const offerCategoryController_1 = require("../controllers/offerCategoryController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Get all active offer categories
router.get('/', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    featured: validation_2.Joi.boolean(),
    parent: validation_2.Joi.boolean()
})), offerCategoryController_1.getOfferCategories);
// Get featured categories
router.get('/featured', auth_1.optionalAuth, offerCategoryController_1.getFeaturedCategories);
// Get parent categories only
router.get('/parents', auth_1.optionalAuth, offerCategoryController_1.getParentCategories);
// Get category by slug
router.get('/:slug', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    slug: validation_2.Joi.string().required()
})), offerCategoryController_1.getOfferCategoryBySlug);
// Get subcategories of a parent category
router.get('/:parentId/subcategories', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    parentId: validation_1.commonSchemas.objectId().required()
})), offerCategoryController_1.getSubcategories);
// Get offers by category slug
router.get('/:slug/offers', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    slug: validation_2.Joi.string().required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
    sortBy: validation_2.Joi.string().valid('cashback', 'createdAt', 'distance').default('createdAt'),
    order: validation_2.Joi.string().valid('asc', 'desc').default('desc'),
    lat: validation_2.Joi.number().min(-90).max(90),
    lng: validation_2.Joi.number().min(-180).max(180)
})), offerCategoryController_1.getOffersByCategorySlug);
exports.default = router;
