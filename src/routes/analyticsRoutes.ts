import { Router } from 'express';
import {
  trackEvent,
  getStoreAnalytics,
  getPopularStores,
  getUserAnalytics,
  getAnalyticsDashboard,
  getSearchAnalytics,
  getCategoryAnalytics
} from '../controllers/analyticsController';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { validateQuery, validateParams, validateBody, commonSchemas } from '../middleware/validation';
// // import { generalLimiter, analyticsLimiter } from '../middleware/rateLimiter'; // Disabled for development // Disabled for development
import { Joi } from '../middleware/validation';

const router = Router();

// Track an analytics event
router.post('/track',   // analyticsLimiter,, // Disabled for development
  optionalAuth,
  validateBody(Joi.object({
    storeId: commonSchemas.objectId().required(),
    eventType: Joi.string().valid('view', 'search', 'favorite', 'unfavorite', 'compare', 'review', 'click', 'share').required(),
    eventData: Joi.object({
      searchQuery: Joi.string().trim().max(100),
      category: Joi.string().trim().max(50),
      source: Joi.string().trim().max(50),
      location: Joi.object({
        coordinates: Joi.array().items(Joi.number()).length(2),
        address: Joi.string().trim().max(200)
      }),
      metadata: Joi.object()
    })
  })),
  trackEvent
);

// Get store analytics
router.get('/store/:storeId',   // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId()
  })),
  validateQuery(Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    eventType: Joi.string().valid('view', 'search', 'favorite', 'unfavorite', 'compare', 'review', 'click', 'share'),
    groupBy: Joi.string().valid('hour', 'day', 'week', 'month').default('day')
  })),
  getStoreAnalytics
);

// Get popular stores
router.get('/popular',   // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    eventType: Joi.string().valid('view', 'search', 'favorite', 'unfavorite', 'compare', 'review', 'click', 'share'),
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getPopularStores
);

// Get user analytics
router.get('/user/my-analytics',   // generalLimiter,, // Disabled for development
  requireAuth,
  validateQuery(Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    eventType: Joi.string().valid('view', 'search', 'favorite', 'unfavorite', 'compare', 'review', 'click', 'share')
  })),
  getUserAnalytics
);

// Get analytics dashboard
router.get('/dashboard',   // generalLimiter,, // Disabled for development
  requireAuth,
  validateQuery(Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso()
  })),
  getAnalyticsDashboard
);

// Get search analytics
router.get('/search',   // generalLimiter,, // Disabled for development
  requireAuth,
  validateQuery(Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })),
  getSearchAnalytics
);

// Get category analytics
router.get('/categories',   // generalLimiter,, // Disabled for development
  requireAuth,
  validateQuery(Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso()
  })),
  getCategoryAnalytics
);

export default router;
