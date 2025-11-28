import { Router } from 'express';
import {
  updateUserLocation,
  getCurrentLocation,
  getLocationHistory,
  reverseGeocode,
  searchAddresses,
  validateAddress,
  getTimezone,
  getNearbyStores,
  getLocationStats,
} from '../controllers/locationController';
import { authenticate } from '../middleware/auth';
import { validateQuery, validate, validateParams, commonSchemas } from '../middleware/validation';
// // import { generalLimiter, searchLimiter } from '../middleware/rateLimiter'; // Disabled for development // Disabled for development
import { Joi } from '../middleware/validation';

const router = Router();

// Update user location
router.post('/update',  // generalLimiter,, // Disabled for development
  authenticate,
  validate(Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    address: Joi.string().trim().max(500).optional(),
    source: Joi.string().valid('manual', 'gps', 'ip').default('manual'),
  })),
  updateUserLocation
);

// Get current user location
router.get('/current',  // generalLimiter,, // Disabled for development
  authenticate,
  getCurrentLocation
);

// Get location history
router.get('/history',  // generalLimiter,, // Disabled for development
  authenticate,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
  })),
  getLocationHistory
);

// Reverse geocoding - Convert coordinates to address
router.post('/geocode',  // generalLimiter,, // Disabled for development
  validate(Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  })),
  reverseGeocode
);

// Search addresses
router.post('/search',  // searchLimiter,, // Disabled for development
  validate(Joi.object({
    query: Joi.string().trim().min(2).max(100).required(),
    limit: Joi.number().integer().min(1).max(10).default(5),
  })),
  searchAddresses
);

// Validate address
router.post('/validate',  // generalLimiter,, // Disabled for development
  validate(Joi.object({
    address: Joi.string().trim().max(500).optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
  }).or('address', 'latitude', 'longitude')),
  validateAddress
);

// Get timezone for coordinates
router.get('/timezone',  // generalLimiter,, // Disabled for development
  validateQuery(Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  })),
  getTimezone
);

// Get nearby stores
router.get('/nearby-stores',  // generalLimiter,, // Disabled for development
  validateQuery(Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().min(0.1).max(50).default(5),
    limit: Joi.number().integer().min(1).max(50).default(20),
  })),
  getNearbyStores
);

// Get location statistics
router.get('/stats',  // generalLimiter,, // Disabled for development
  authenticate,
  getLocationStats
);

export default router;
