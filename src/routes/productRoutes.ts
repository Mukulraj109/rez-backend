import { Router } from 'express';
import {
  getProducts,
  getProductById,
  getProductsByCategory,
  getProductsByStore,
  getFeaturedProducts,
  getNewArrivals,
  searchProducts,
  getRecommendations
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
    ...commonSchemas.pagination
  })),
  getProductsByCategory
);

// Get products by store
router.get('/store/:storeId', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required()
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

export default router;