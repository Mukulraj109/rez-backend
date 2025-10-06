"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analyticsController_1 = require("../controllers/analyticsController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
// // import { generalLimiter, analyticsLimiter } from '../middleware/rateLimiter'; // Disabled for development // Disabled for development
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Track an analytics event
router.post('/track', 
// analyticsLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateBody)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId().required(),
    eventType: validation_2.Joi.string().valid('view', 'search', 'favorite', 'unfavorite', 'compare', 'review', 'click', 'share').required(),
    eventData: validation_2.Joi.object({
        searchQuery: validation_2.Joi.string().trim().max(100),
        category: validation_2.Joi.string().trim().max(50),
        source: validation_2.Joi.string().trim().max(50),
        location: validation_2.Joi.object({
            coordinates: validation_2.Joi.array().items(validation_2.Joi.number()).length(2),
            address: validation_2.Joi.string().trim().max(200)
        }),
        metadata: validation_2.Joi.object()
    })
})), analyticsController_1.trackEvent);
// Get store analytics
router.get('/store/:storeId', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    startDate: validation_2.Joi.date().iso(),
    endDate: validation_2.Joi.date().iso(),
    eventType: validation_2.Joi.string().valid('view', 'search', 'favorite', 'unfavorite', 'compare', 'review', 'click', 'share'),
    groupBy: validation_2.Joi.string().valid('hour', 'day', 'week', 'month').default('day')
})), analyticsController_1.getStoreAnalytics);
// Get popular stores
router.get('/popular', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    startDate: validation_2.Joi.date().iso(),
    endDate: validation_2.Joi.date().iso(),
    eventType: validation_2.Joi.string().valid('view', 'search', 'favorite', 'unfavorite', 'compare', 'review', 'click', 'share'),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10)
})), analyticsController_1.getPopularStores);
// Get user analytics
router.get('/user/my-analytics', 
// generalLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    startDate: validation_2.Joi.date().iso(),
    endDate: validation_2.Joi.date().iso(),
    eventType: validation_2.Joi.string().valid('view', 'search', 'favorite', 'unfavorite', 'compare', 'review', 'click', 'share')
})), analyticsController_1.getUserAnalytics);
// Get analytics dashboard
router.get('/dashboard', 
// generalLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    startDate: validation_2.Joi.date().iso(),
    endDate: validation_2.Joi.date().iso()
})), analyticsController_1.getAnalyticsDashboard);
// Get search analytics
router.get('/search', 
// generalLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    startDate: validation_2.Joi.date().iso(),
    endDate: validation_2.Joi.date().iso(),
    limit: validation_2.Joi.number().integer().min(1).max(100).default(20)
})), analyticsController_1.getSearchAnalytics);
// Get category analytics
router.get('/categories', 
// generalLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    startDate: validation_2.Joi.date().iso(),
    endDate: validation_2.Joi.date().iso()
})), analyticsController_1.getCategoryAnalytics);
exports.default = router;
