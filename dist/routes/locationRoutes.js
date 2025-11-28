"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const locationController_1 = require("../controllers/locationController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
// // import { generalLimiter, searchLimiter } from '../middleware/rateLimiter'; // Disabled for development // Disabled for development
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Update user location
router.post('/update', 
// generalLimiter,, // Disabled for development
auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    latitude: validation_2.Joi.number().min(-90).max(90).required(),
    longitude: validation_2.Joi.number().min(-180).max(180).required(),
    address: validation_2.Joi.string().trim().max(500).optional(),
    source: validation_2.Joi.string().valid('manual', 'gps', 'ip').default('manual'),
})), locationController_1.updateUserLocation);
// Get current user location
router.get('/current', 
// generalLimiter,, // Disabled for development
auth_1.authenticate, locationController_1.getCurrentLocation);
// Get location history
router.get('/history', 
// generalLimiter,, // Disabled for development
auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10),
})), locationController_1.getLocationHistory);
// Reverse geocoding - Convert coordinates to address
router.post('/geocode', 
// generalLimiter,, // Disabled for development
(0, validation_1.validate)(validation_2.Joi.object({
    latitude: validation_2.Joi.number().min(-90).max(90).required(),
    longitude: validation_2.Joi.number().min(-180).max(180).required(),
})), locationController_1.reverseGeocode);
// Search addresses
router.post('/search', 
// searchLimiter,, // Disabled for development
(0, validation_1.validate)(validation_2.Joi.object({
    query: validation_2.Joi.string().trim().min(2).max(100).required(),
    limit: validation_2.Joi.number().integer().min(1).max(10).default(5),
})), locationController_1.searchAddresses);
// Validate address
router.post('/validate', 
// generalLimiter,, // Disabled for development
(0, validation_1.validate)(validation_2.Joi.object({
    address: validation_2.Joi.string().trim().max(500).optional(),
    latitude: validation_2.Joi.number().min(-90).max(90).optional(),
    longitude: validation_2.Joi.number().min(-180).max(180).optional(),
}).or('address', 'latitude', 'longitude')), locationController_1.validateAddress);
// Get timezone for coordinates
router.get('/timezone', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateQuery)(validation_2.Joi.object({
    latitude: validation_2.Joi.number().min(-90).max(90).required(),
    longitude: validation_2.Joi.number().min(-180).max(180).required(),
})), locationController_1.getTimezone);
// Get nearby stores
router.get('/nearby-stores', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateQuery)(validation_2.Joi.object({
    latitude: validation_2.Joi.number().min(-90).max(90).required(),
    longitude: validation_2.Joi.number().min(-180).max(180).required(),
    radius: validation_2.Joi.number().min(0.1).max(50).default(5),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
})), locationController_1.getNearbyStores);
// Get location statistics
router.get('/stats', 
// generalLimiter,, // Disabled for development
auth_1.authenticate, locationController_1.getLocationStats);
exports.default = router;
