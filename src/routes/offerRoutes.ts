import { Router } from 'express';
import {
  getOffers,
  getFeaturedOffers,
  getTrendingOffers,
  searchOffers,
  getOffersByCategory,
  getOffersByStore,
  getOfferById,
  redeemOffer,
  getUserRedemptions,
  addOfferToFavorites,
  removeOfferFromFavorites,
  getUserFavoriteOffers,
  trackOfferView,
  trackOfferClick,
  getRecommendedOffers
} from '../controllers/offerController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, validate, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// Public Routes (no authentication required, but can use optionalAuth for personalization)

// Get all offers with filters
router.get('/',
  optionalAuth,
  validateQuery(Joi.object({
    category: commonSchemas.objectId,
    store: commonSchemas.objectId,
    featured: Joi.boolean(),
    trending: Joi.boolean(),
    bestSeller: Joi.boolean(),
    special: Joi.boolean(),
    isNew: Joi.boolean(),
    minCashback: Joi.number().min(0).max(100),
    maxCashback: Joi.number().min(0).max(100),
    sortBy: Joi.string().valid('cashback', 'createdAt', 'redemptionCount', 'endDate'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getOffers
);

// Get featured offers
router.get('/featured',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getFeaturedOffers
);

// Get trending offers
router.get('/trending',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getTrendingOffers
);

// Search offers
router.get('/search',
  optionalAuth,
  validateQuery(Joi.object({
    q: Joi.string().required().trim().min(1).max(100),
    category: commonSchemas.objectId,
    store: commonSchemas.objectId,
    minCashback: Joi.number().min(0).max(100),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  searchOffers
);

// Get offers by category
router.get('/category/:categoryId',
  optionalAuth,
  validateParams(Joi.object({
    categoryId: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    featured: Joi.boolean(),
    trending: Joi.boolean(),
    sortBy: Joi.string().valid('cashback', 'createdAt', 'redemptionCount'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getOffersByCategory
);

// Get offers by store
router.get('/store/:storeId',
  optionalAuth,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    category: commonSchemas.objectId,
    active: Joi.boolean().default(true),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getOffersByStore
);

// Get single offer by ID
router.get('/:id',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  getOfferById
);

// Get recommended offers based on user preferences
router.get('/user/recommendations',
  authenticate,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getRecommendedOffers
);

// Authenticated Routes (require user login)

// Redeem an offer
router.post('/:id/redeem',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    redemptionType: Joi.string().valid('online', 'instore').required(),
    location: Joi.object({
      type: Joi.string().valid('Point').default('Point'),
      coordinates: Joi.array().items(Joi.number()).length(2)
    })
  })),
  redeemOffer
);

// Get user's redemptions
router.get('/user/redemptions',
  authenticate,
  validateQuery(Joi.object({
    status: Joi.string().valid('pending', 'active', 'used', 'expired', 'cancelled'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getUserRedemptions
);

// Get user's favorite offers
router.get('/user/favorites',
  authenticate,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getUserFavoriteOffers
);

// Add offer to favorites
router.post('/:id/favorite',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  addOfferToFavorites
);

// Remove offer from favorites
router.delete('/:id/favorite',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  removeOfferFromFavorites
);

// Analytics Routes (can be anonymous)

// Track offer view (analytics)
router.post('/:id/view',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  trackOfferView
);

// Track offer click (analytics)
router.post('/:id/click',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  trackOfferClick
);

export default router;