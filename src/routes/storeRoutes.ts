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
  advancedStoreSearch,
  getTrendingStores,
  getStoreFollowerCount,
  getStoreFollowers,
  sendFollowerNotification,
  notifyNewOffer,
  notifyNewProduct,
  getStoresByCategorySlug,
  getUserStoreVisits,
  getRecentEarnings,
  getTopCashbackStores,
  getBNPLStores,
  getNearbyStoresForHomepage,
  getNewStores
} from '../controllers/storeController';
import { getStoreReviews } from '../controllers/reviewController';
import {
  scheduleStoreVisit,
  getQueueNumber,
  getCurrentQueueStatus,
  checkStoreAvailability
} from '../controllers/storeVisitController';
import { authenticate, optionalAuth } from '../middleware/auth';
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
    tags: Joi.alternatives().try(
      Joi.string().trim().max(100),
      Joi.array().items(Joi.string().trim().max(100))
    ),
    isFeatured: Joi.alternatives().try(
      Joi.boolean(),
      Joi.string().valid('true', 'false')
    ),
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
    // Accept both naming conventions: lat/lng and latitude/longitude
    lng: Joi.number().min(-180).max(180),
    lat: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
    latitude: Joi.number().min(-90).max(90),
    radius: Joi.number().min(0.1).max(50).default(5),
    limit: Joi.number().integer().min(1).max(50).default(10)
  }).or('lat', 'latitude').or('lng', 'longitude')),
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

// Get trending stores - FOR FRONTEND TRENDING SECTION
router.get('/trending',
  // generalLimiter, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    category: Joi.string().trim().max(100),
    limit: Joi.number().integer().min(1).max(50).default(20),
    page: Joi.number().integer().min(1).default(1),
    days: Joi.number().integer().min(1).max(30).default(7)
  })),
  getTrendingStores
);

// Get new stores - FOR FRONTEND NEW ON REZ SECTION
router.get('/new',
  // generalLimiter, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(10).default(4),
    days: Joi.number().integer().min(1).max(90).default(30),
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180)
  })),
  getNewStores
);

// Get top cashback stores - FOR FRONTEND DISCOVERY UI
router.get('/top-cashback',
  // generalLimiter, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
    limit: Joi.number().integer().min(1).max(50).default(10),
    minCashback: Joi.number().min(0).max(100).default(10)
  })),
  getTopCashbackStores
);

// Get BNPL stores - FOR FRONTEND DISCOVERY UI
router.get('/bnpl',
  // generalLimiter, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getBNPLStores
);

// Get nearby stores for homepage - optimized endpoint with all computed fields
router.get('/nearby-homepage',
  // generalLimiter, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().min(0.1).max(10).default(2),
    limit: Joi.number().integer().min(1).max(10).default(5)
  })),
  getNearbyStoresForHomepage
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

// Get stores by category slug (for frontend categories page)
router.get('/by-category-slug/:slug',
  // generalLimiter, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    sortBy: Joi.string().valid('rating', 'distance', 'name', 'newest').default('rating')
  })),
  getStoresByCategorySlug
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

// Get store reviews
router.get('/:storeId/reviews',
  // generalLimiter, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    rating: Joi.number().integer().min(1).max(5),
    sort: Joi.string().valid('newest', 'oldest', 'rating_high', 'rating_low').default('newest')
  })),
  getStoreReviews
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
    category: Joi.string().valid('all', 'fastDelivery', 'budgetFriendly', 'oneRupeeStore', 'ninetyNineStore', 'premium', 'organic', 'alliance', 'lowestPrice', 'mall', 'cashStore').required()
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

// ============================================
// Store Visit Routes (nested under /stores/:storeId)
// ============================================

// Schedule a store visit
router.post('/:storeId/visits/schedule',
  authenticate,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required()
  })),
  (req, res, next) => {
    // Inject storeId from URL params into request body
    req.body.storeId = req.params.storeId;
    next();
  },
  scheduleStoreVisit
);

// Get queue number for walk-in
router.post('/:storeId/queue',
  optionalAuth,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required()
  })),
  (req, res, next) => {
    // Inject storeId from URL params into request body
    req.body.storeId = req.params.storeId;
    next();
  },
  getQueueNumber
);

// Get current queue status (public)
router.get('/:storeId/queue/status',
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required()
  })),
  getCurrentQueueStatus
);

// Check store availability / crowd status (public)
router.get('/:storeId/availability',
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required()
  })),
  checkStoreAvailability
);

// ============================================
// User Loyalty Routes
// ============================================

// Get user's visit count and loyalty info for a store
router.get('/:storeId/user-visits',
  authenticate,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required()
  })),
  getUserStoreVisits
);

// Get recent earnings by users at a store (People are earning here)
router.get('/:storeId/recent-earnings',
  optionalAuth,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(5)
  })),
  getRecentEarnings
);

// ============================================
// Follower Notification Routes
// ============================================

// Get follower count for a store (public)
router.get('/:storeId/followers/count',
  optionalAuth,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required()
  })),
  getStoreFollowerCount
);

// Get all followers of a store (merchant/admin only)
router.get('/:storeId/followers',
  authenticate,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required()
  })),
  getStoreFollowers
);

// Send custom notification to all followers (merchant/admin only)
router.post('/:storeId/notify-followers',
  authenticate,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required()
  })),
  (req, res, next) => {
    const schema = Joi.object({
      title: Joi.string().trim().min(3).max(100).required(),
      message: Joi.string().trim().min(10).max(500).required(),
      imageUrl: Joi.string().uri().optional(),
      deepLink: Joi.string().trim().optional()
    });
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    next();
  },
  sendFollowerNotification
);

// Notify followers about a new offer (merchant/admin only)
router.post('/:storeId/notify-offer',
  authenticate,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required()
  })),
  (req, res, next) => {
    const schema = Joi.object({
      offerId: commonSchemas.objectId().required(),
      title: Joi.string().trim().min(3).max(100).required(),
      description: Joi.string().trim().max(500).optional(),
      discount: Joi.number().min(0).max(100).optional(),
      imageUrl: Joi.string().uri().optional()
    });
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    next();
  },
  notifyNewOffer
);

// Notify followers about a new product (merchant/admin only)
router.post('/:storeId/notify-product',
  authenticate,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required()
  })),
  (req, res, next) => {
    const schema = Joi.object({
      productId: commonSchemas.objectId().required()
    });
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    next();
  },
  notifyNewProduct
);

export default router;