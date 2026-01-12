import { Router } from 'express';
import {
  getExploreDashboardStats,
  getFeaturedReviews,
  toggleReviewFeatured,
  getFeaturedComparisons,
  toggleComparisonFeatured,
  getEligibleReviews,
  bulkToggleReviewsFeatured
} from '../controllers/adminExploreController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validateQuery, validateParams, validateBody, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

// Get admin explore dashboard stats
router.get('/stats',
  getExploreDashboardStats
);

// Get featured reviews for explore page
router.get('/featured-reviews',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getFeaturedReviews
);

// Toggle review featured status
router.put('/reviews/:reviewId/feature',
  validateParams(Joi.object({
    reviewId: commonSchemas.objectId()
  })),
  validateBody(Joi.object({
    featured: Joi.boolean()
  })),
  toggleReviewFeatured
);

// Get featured comparisons for explore page
router.get('/featured-comparisons',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getFeaturedComparisons
);

// Toggle comparison featured status
router.put('/comparisons/:comparisonId/feature',
  validateParams(Joi.object({
    comparisonId: commonSchemas.objectId()
  })),
  validateBody(Joi.object({
    featured: Joi.boolean()
  })),
  toggleComparisonFeatured
);

// Get reviews eligible for featuring
router.get('/eligible-reviews',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    minRating: Joi.number().min(1).max(5).default(4)
  })),
  getEligibleReviews
);

// Bulk feature/unfeature reviews
router.post('/reviews/bulk-feature',
  validateBody(Joi.object({
    reviewIds: Joi.array().items(commonSchemas.objectId()).min(1).max(50).required(),
    featured: Joi.boolean().required()
  })),
  bulkToggleReviewsFeatured
);

export default router;
