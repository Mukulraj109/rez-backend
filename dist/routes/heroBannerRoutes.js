"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const heroBannerController_1 = require("../controllers/heroBannerController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Get active hero banners
router.get('/', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.string().valid('offers', 'home', 'category', 'product', 'all').default('offers'),
    position: validation_2.Joi.string().valid('top', 'middle', 'bottom').default('top'),
    limit: validation_2.Joi.number().integer().min(1).max(10).default(5)
})), heroBannerController_1.getActiveBanners);
// Get banners for specific user (with targeting)
router.get('/user', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.string().valid('offers', 'home', 'category', 'product', 'all').default('offers'),
    limit: validation_2.Joi.number().integer().min(1).max(10).default(5)
})), heroBannerController_1.getBannersForUser);
// Get single banner by ID
router.get('/:id', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), heroBannerController_1.getHeroBannerById);
// Track banner view (analytics)
router.post('/:id/view', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_2.Joi.object({
    source: validation_2.Joi.string().optional(),
    device: validation_2.Joi.string().valid('mobile', 'desktop', 'tablet').optional(),
    location: validation_2.Joi.object({
        type: validation_2.Joi.string().valid('Point').default('Point'),
        coordinates: validation_2.Joi.array().items(validation_2.Joi.number()).length(2)
    }).optional()
})), heroBannerController_1.trackBannerView);
// Track banner click (analytics)
router.post('/:id/click', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_2.Joi.object({
    source: validation_2.Joi.string().optional(),
    device: validation_2.Joi.string().valid('mobile', 'desktop', 'tablet').optional(),
    location: validation_2.Joi.object({
        type: validation_2.Joi.string().valid('Point').default('Point'),
        coordinates: validation_2.Joi.array().items(validation_2.Joi.number()).length(2)
    }).optional()
})), heroBannerController_1.trackBannerClick);
// Track banner conversion (analytics)
router.post('/:id/conversion', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_2.Joi.object({
    conversionType: validation_2.Joi.string().valid('purchase', 'signup', 'download', 'share', 'other').required(),
    value: validation_2.Joi.number().min(0).optional(),
    source: validation_2.Joi.string().optional(),
    device: validation_2.Joi.string().valid('mobile', 'desktop', 'tablet').optional()
})), heroBannerController_1.trackBannerConversion);
exports.default = router;
