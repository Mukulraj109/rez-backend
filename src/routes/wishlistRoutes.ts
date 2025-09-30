import { Router } from 'express';
import {
  getUserWishlists,
  createWishlist,
  getWishlistById,
  addToWishlist,
  removeFromWishlist,
  updateWishlistItem,
  deleteWishlist,
  getPublicWishlists
} from '../controllers/wishlistController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate, validateParams, validateQuery, wishlistSchemas, commonSchemas } from '../middleware/validation';
// import { generalLimiter } from '../middleware/rateLimiter'; // Disabled for development
import { Joi } from '../middleware/validation';

const router = Router();

// Get public wishlists
router.get('/public', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    category: Joi.string().valid('personal', 'gift', 'business', 'event', 'custom'),
    search: Joi.string().trim().max(100),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getPublicWishlists
);

// All other wishlist routes require authentication
router.use(authenticate);

// Get user's wishlists
router.get('/', 
  // generalLimiter,, // Disabled for development
  validateQuery(Joi.object({
    category: Joi.string().valid('personal', 'gift', 'business', 'event', 'custom'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getUserWishlists
);

// Create new wishlist
router.post('/', 
  // generalLimiter,, // Disabled for development
  validate(wishlistSchemas.createWishlist),
  createWishlist
);

// Get single wishlist by ID
router.get('/:wishlistId', 
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    wishlistId: commonSchemas.objectId().required()
  })),
  getWishlistById
);

// Delete wishlist
router.delete('/:wishlistId', 
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    wishlistId: commonSchemas.objectId().required()
  })),
  deleteWishlist
);

// Add item to wishlist
router.post('/:wishlistId/items', 
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    wishlistId: commonSchemas.objectId().required()
  })),
  validate(wishlistSchemas.addToWishlist),
  addToWishlist
);

// Update wishlist item
router.patch('/:wishlistId/items/:itemId', 
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    wishlistId: commonSchemas.objectId().required(),
    itemId: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    priority: Joi.string().valid('low', 'medium', 'high'),
    notes: Joi.string().trim().max(300).allow(''),
    targetPrice: Joi.number().min(0),
    notifyOnPriceChange: Joi.boolean(),
    notifyOnAvailability: Joi.boolean(),
    tags: Joi.array().items(Joi.string().trim().lowercase())
  })),
  updateWishlistItem
);

// Remove item from wishlist
router.delete('/:wishlistId/items/:itemId', 
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    wishlistId: commonSchemas.objectId().required(),
    itemId: commonSchemas.objectId().required()
  })),
  removeFromWishlist
);

export default router;