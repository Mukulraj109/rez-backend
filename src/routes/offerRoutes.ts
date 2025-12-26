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
  getRecommendedOffers,
  getMegaOffers,
  getStudentOffers,
  getNewArrivalOffers,
  getNearbyOffers,
  getOffersPageData,
  toggleOfferLike,
  shareOffer,
  getOfferCategories,
  getHeroBanners
} from '../controllers/offerController';
import {
  getHotspots,
  getHotspotOffers,
  getBOGOOffers,
  getSaleOffers,
  getFreeDeliveryOffers,
  getBankOffers,
  getExclusiveZones,
  getExclusiveZoneOffers,
  getSpecialProfiles,
  getSpecialProfileOffers,
  getFriendsRedeemed,
  getLoyaltyMilestones,
  getLoyaltyProgress,
  getFlashSaleOffers,
  getDiscountBuckets,
} from '../controllers/offersPageController';
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
    type: Joi.string().valid('cashback', 'discount', 'voucher', 'combo', 'special', 'walk_in'),
    tags: Joi.string(),
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

// New offers page specific routes

// Get complete offers page data
router.get('/page-data',
  optionalAuth,
  validateQuery(Joi.object({
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180)
  })),
  getOffersPageData
);

// Get mega offers
router.get('/mega',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getMegaOffers
);

// Get student offers
router.get('/students',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getStudentOffers
);

// Get new arrival offers
router.get('/new-arrivals',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getNewArrivalOffers
);

// Get nearby offers
router.get('/nearby',
  optionalAuth,
  validateQuery(Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    maxDistance: Joi.number().min(1).max(100).default(10),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getNearbyOffers
);

// Like/unlike an offer
router.post('/:id/like',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  toggleOfferLike
);

// Share an offer
router.post('/:id/share',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    platform: Joi.string().valid('facebook', 'twitter', 'instagram', 'whatsapp', 'telegram', 'copy_link').optional(),
    message: Joi.string().max(500).optional()
  })),
  shareOffer
);

// Get offer categories
router.get('/categories',
  optionalAuth,
  getOfferCategories
);

// Get hero banners
router.get('/hero-banners',
  optionalAuth,
  validateQuery(Joi.object({
    page: Joi.string().valid('offers', 'home', 'category', 'product', 'all').default('offers'),
    position: Joi.string().valid('top', 'middle', 'bottom').default('top')
  })),
  getHeroBanners
);

// =====================
// NEW OFFERS PAGE ROUTES
// =====================

// Get discount buckets (real-time aggregation counts)
router.get('/discount-buckets',
  optionalAuth,
  getDiscountBuckets
);

// Get hotspot areas
router.get('/hotspots',
  optionalAuth,
  validateQuery(Joi.object({
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getHotspots
);

// Get offers for a specific hotspot
router.get('/hotspots/:slug/offers',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getHotspotOffers
);

// Get BOGO offers
router.get('/bogo',
  optionalAuth,
  validateQuery(Joi.object({
    bogoType: Joi.string().valid('buy1get1', 'buy2get1', 'buy1get50', 'buy2get50'),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getBOGOOffers
);

// Get sale/clearance offers
router.get('/sales-clearance',
  optionalAuth,
  validateQuery(Joi.object({
    saleTag: Joi.string().valid('clearance', 'sale', 'last_pieces', 'mega_sale'),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getSaleOffers
);

// Get flash sale offers (from offers with metadata.flashSale.isActive)
router.get('/flash-sales',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getFlashSaleOffers
);

// Get free delivery offers
router.get('/free-delivery',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getFreeDeliveryOffers
);

// Get bank offers
router.get('/bank-offers',
  optionalAuth,
  validateQuery(Joi.object({
    cardType: Joi.string().valid('credit', 'debit', 'wallet', 'upi', 'bnpl'),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getBankOffers
);

// Get exclusive zones
router.get('/exclusive-zones',
  optionalAuth,
  getExclusiveZones
);

// Get offers for a specific exclusive zone
router.get('/exclusive-zones/:slug/offers',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getExclusiveZoneOffers
);

// Get special profiles (Defence, Healthcare, etc.)
router.get('/special-profiles',
  optionalAuth,
  getSpecialProfiles
);

// Get offers for a specific special profile
router.get('/special-profiles/:slug/offers',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getSpecialProfileOffers
);

// Get friends' redeemed offers (social proof)
router.get('/friends-redeemed',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getFriendsRedeemed
);

// Get loyalty milestones
router.get('/loyalty/milestones',
  optionalAuth,
  getLoyaltyMilestones
);

// Get user's loyalty progress
router.get('/loyalty/progress',
  optionalAuth,
  getLoyaltyProgress
);

// Get single offer by ID (must be last to avoid conflicts with specific routes)
router.get('/:id',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  getOfferById
);

export default router;