"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const outletController_1 = require("../controllers/outletController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Public Routes (no authentication required)
// Get all outlets with filters
router.get('/', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    store: validation_1.commonSchemas.objectId(),
    isActive: validation_2.Joi.boolean(),
    sortBy: validation_2.Joi.string().valid('name', 'createdAt').default('name'),
    order: validation_2.Joi.string().valid('asc', 'desc').default('asc'),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
})), outletController_1.getOutlets);
// Get nearby outlets based on location
router.get('/nearby', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    lng: validation_2.Joi.number().required().min(-180).max(180),
    lat: validation_2.Joi.number().required().min(-90).max(90),
    radius: validation_2.Joi.number().min(0).max(100).default(10), // km
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
    store: validation_1.commonSchemas.objectId(),
})), outletController_1.getNearbyOutlets);
// Search outlets by name or address
router.post('/search', auth_1.optionalAuth, (0, validation_1.validate)(validation_2.Joi.object({
    query: validation_2.Joi.string().required().trim().min(1).max(100),
    store: validation_1.commonSchemas.objectId(),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
})), outletController_1.searchOutlets);
// Get outlets for a specific store
router.get('/store/:storeId', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required(),
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    isActive: validation_2.Joi.boolean(),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
})), outletController_1.getOutletsByStore);
// Get outlet count for a store
router.get('/store/:storeId/count', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required(),
})), outletController_1.getStoreOutletCount);
// Get single outlet by ID
router.get('/:id', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), outletController_1.getOutletById);
// Get opening hours for a specific outlet
router.get('/:id/opening-hours', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), outletController_1.getOutletOpeningHours);
// Get offers available at a specific outlet
router.get('/:id/offers', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required(),
})), outletController_1.getOutletOffers);
exports.default = router;
