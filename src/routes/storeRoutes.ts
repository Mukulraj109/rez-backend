import { Router } from 'express';
import {
  getStores,
  getStoreById,
  getStoreProducts,
  getNearbyStores,
  getFeaturedStores,
  searchStores,
  getStoresByCategory,
  getStoreOperatingStatus,
  searchStoresByCategory,
  searchStoresByDeliveryTime,
  getStoreCategories,
  advancedStoreSearch
} from '../controllers/storeController';
import { optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, commonSchemas } from '../middleware/validation';
// import { generalLimiter, searchLimiter } from '../middleware/rateLimiter'; // Disabled for development
import { Joi } from '../middleware/validation';

const router = Router();

// Get all stores with filtering
router.get('/', 
  // generalLimiter, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    category: commonSchemas.objectId(),
    location: Joi.string(), // "lng,lat" format
    radius: Joi.number().min(0.1).max(50).default(10),
    rating: Joi.number().min(1).max(5),
    isOpen: Joi.boolean(),
    search: Joi.string().trim().max(100),
    sortBy: Joi.string().valid('rating', 'distance', 'name', 'newest').default('rating'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getStores
);

// Search stores
router.get('/search', 
  // searchLimiter, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    q: Joi.string().trim().min(2).max(100).required(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  searchStores
);

// Advanced store search with filters
router.get('/search/advanced', 
  // searchLimiter, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    search: Joi.string().trim().max(100),
    category: Joi.string().valid('fastDelivery', 'budgetFriendly', 'premium', 'organic', 'alliance', 'lowestPrice', 'mall', 'cashStore'),
    deliveryTime: Joi.string().pattern(/^\d+-\d+$/), // "15-30" format
    priceRange: Joi.string().pattern(/^\d+-\d+$/), // "0-100" format
    rating: Joi.number().min(0).max(5),
    paymentMethods: Joi.string(), // "cash,card,upi" format
    features: Joi.string(), // "freeDelivery,walletPayment,verified,featured" format
    sortBy: Joi.string().valid('rating', 'distance', 'name', 'newest', 'price').default('rating'),
    location: Joi.string(), // "lng,lat" format
    radius: Joi.number().min(0.1).max(50).default(10),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  advancedStoreSearch
);

// Get nearby stores
router.get('/nearby', 
  // generalLimiter, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    lng: Joi.number().min(-180).max(180).required(),
    lat: Joi.number().min(-90).max(90).required(),
    radius: Joi.number().min(0.1).max(50).default(5),
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getNearbyStores
);

// Get featured stores
router.get('/featured', 
  // generalLimiter, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getFeaturedStores
);

// Get stores by category
router.get('/category/:categoryId', 
  // generalLimiter, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    categoryId: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    sortBy: Joi.string().valid('rating', 'name', 'newest').default('rating')
  })),
  getStoresByCategory
);

// Get single store by ID or slug
router.get('/:storeId',
  // generalLimiter, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    storeId: Joi.string().required()
  })),
  getStoreById
);

// Get store products
router.get('/:storeId/products', 
  // generalLimiter, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    category: commonSchemas.objectId(),
    search: Joi.string().trim().max(100),
    sortBy: Joi.string().valid('price_low', 'price_high', 'rating', 'newest', 'popular').default('newest'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getStoreProducts
);

// Get store operating status
router.get('/:storeId/status', 
  // generalLimiter, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required()
  })),
  getStoreOperatingStatus
);

// Get available store categories
router.get('/categories/list', 
  // generalLimiter, // Disabled for development
  optionalAuth,
  getStoreCategories
);

// Search stores by delivery category
router.get('/search-by-category/:category', 
  // generalLimiter, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    category: Joi.string().valid('fastDelivery', 'budgetFriendly', 'oneRupeeStore', 'ninetyNineStore', 'premium', 'organic', 'alliance', 'lowestPrice', 'mall', 'cashStore').required()
  })),
  validateQuery(Joi.object({
    location: Joi.string(), // "lng,lat" format
    radius: Joi.number().min(0.1).max(50).default(10),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    sortBy: Joi.string().valid('rating', 'distance', 'name', 'newest').default('rating')
  })),
  searchStoresByCategory
);

// Search stores by delivery time range
router.get('/search-by-delivery-time', 
  // generalLimiter, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    minTime: Joi.number().integer().min(5).max(120).default(15),
    maxTime: Joi.number().integer().min(5).max(120).default(60),
    location: Joi.string(), // "lng,lat" format
    radius: Joi.number().min(0.1).max(50).default(10),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  searchStoresByDeliveryTime
);

export default router;