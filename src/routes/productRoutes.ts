import { Router } from 'express';
import {
  getProducts,
  getProductById,
  getProductsByCategory,
  getProductsBySubcategory,
  getProductsByStore,
  getFeaturedProducts,
  getNewArrivals,
  searchProducts,
  getRecommendations,
  trackProductView,
  getProductAnalytics,
  getFrequentlyBoughtTogether,
  getBundleProducts,
  getSearchSuggestions,
  getPopularSearches,
  getTrendingProducts,
  getRelatedProducts,
  checkAvailability,
  getPopularProducts,
  getNearbyProducts,
  getHotDeals,
  getProductsByCategorySlugHomepage,
  getSimilarProducts
} from '../controllers/productController';
import { optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, productSchemas, commonSchemas } from '../middleware/validation';
// // import { searchLimiter, generalLimiter } from '../middleware/rateLimiter'; // Disabled for development // Disabled for development
import { Joi } from '../middleware/validation';

const router = Router();

// Get all products with filtering
router.get('/',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(productSchemas.getProducts),
  getProducts
);

// Get featured products - FOR FRONTEND "Just for You" SECTION
router.get('/featured',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  getFeaturedProducts
);

// Get new arrival products - FOR FRONTEND "New Arrivals" SECTION
router.get('/new-arrivals',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  getNewArrivals
);

// Search products
router.get('/search',
  // searchLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    q: Joi.string().required().trim().min(1).max(100),
    category: commonSchemas.objectId(),
    store: commonSchemas.objectId(),
    brand: Joi.string().max(50),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    rating: Joi.number().min(1).max(5),
    inStock: Joi.boolean(),
    ...commonSchemas.pagination()
  })),
  searchProducts
);

// Get search suggestions - FOR FRONTEND SEARCH AUTOCOMPLETE
router.get('/suggestions',
  // searchLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    q: Joi.string().required().trim().min(1).max(100)
  })),
  getSearchSuggestions
);

// Get popular searches - FOR FRONTEND SEARCH
router.get('/popular-searches',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  getPopularSearches
);

// Get trending products - FOR FRONTEND TRENDING SECTION
router.get('/trending',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    category: commonSchemas.objectId(),
    limit: Joi.number().integer().min(1).max(50).default(20),
    page: Joi.number().integer().min(1).default(1),
    days: Joi.number().integer().min(1).max(30).default(7)
  })),
  getTrendingProducts
);

// Get popular products - FOR FRONTEND "Popular" SECTION (v2)
router.get('/popular',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  getPopularProducts
);

// Get nearby products - FOR FRONTEND "In Your Area" SECTION
router.get('/nearby',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  getNearbyProducts
);

// Get hot deals - FOR FRONTEND "Hot Deals" SECTION
router.get('/hot-deals',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  getHotDeals
);

// Get similar products - FOR FRONTEND EMPTY STATE
router.get('/similar',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    query: Joi.string().trim().max(100),
    category: commonSchemas.objectId(),
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getSimilarProducts
);

// Get products by category slug - FOR FRONTEND HOMEPAGE CATEGORY SECTIONS
router.get('/category-section/:categorySlug',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    categorySlug: Joi.string().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  getProductsByCategorySlugHomepage
);

// Get single product by ID
router.get('/:id',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  getProductById
);

// Get product recommendations
router.get('/:productId/recommendations',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    productId: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(6)
  })),
  getRecommendations
);

// Get products by category
router.get('/category/:categorySlug',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    categorySlug: Joi.string().required()
  })),
  validateQuery(Joi.object({
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    rating: Joi.number().min(1).max(5),
    sortBy: Joi.string().valid('price_low', 'price_high', 'rating', 'newest'),
    ...commonSchemas.pagination()
  })),
  getProductsByCategory
);

// Get products by subcategory slug - FOR BROWSE CATEGORIES SLIDER
router.get('/subcategory/:subcategorySlug',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    subcategorySlug: Joi.string().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  getProductsBySubcategory
);

// Get products by store
router.get('/store/:storeId',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    // Accept both ObjectId format and string IDs (for mock data compatibility)
    storeId: Joi.string().trim().min(1).required()
  })),
  validateQuery(Joi.object({
    category: commonSchemas.objectId,
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    sortBy: Joi.string().valid('price_low', 'price_high', 'rating', 'newest'),
    ...commonSchemas.pagination
  })),
  getProductsByStore
);

// Track product view
router.post('/:id/track-view',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  trackProductView
);

// Get product analytics
router.get('/:id/analytics',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    location: Joi.string() // JSON stringified location object
  })),
  getProductAnalytics
);

// Get frequently bought together products
router.get('/:id/frequently-bought',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(10).default(4)
  })),
  getFrequentlyBoughtTogether
);

// Get bundle products
router.get('/:id/bundles',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  getBundleProducts
);

// Get related products - FOR FRONTEND PRODUCT DETAILS PAGE
router.get('/:id/related',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(5)
  })),
  getRelatedProducts
);

// Check product availability - FOR FRONTEND CART/CHECKOUT
router.get('/:id/availability',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    variantId: Joi.string(),
    quantity: Joi.number().integer().min(1).default(1)
  })),
  checkAvailability
);

export default router;