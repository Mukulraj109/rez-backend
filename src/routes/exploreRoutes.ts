import { Router } from 'express';
import {
  getExploreStats,
  getVerifiedReviews,
  getFeaturedComparison,
  getFriendsActivity,
  getExploreStatsSummary
} from '../controllers/exploreController';
import { optionalAuth } from '../middleware/auth';
import { validateQuery } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// Get live stats for explore page
router.get('/live-stats',
  optionalAuth,
  getExploreStats
);

// Get verified reviews for explore page
router.get('/verified-reviews',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(5),
    page: Joi.number().integer().min(1).default(1)
  })),
  getVerifiedReviews
);

// Get featured comparison for explore page
router.get('/featured-comparison',
  optionalAuth,
  getFeaturedComparison
);

// Get friends activity for explore page
router.get('/friends-activity',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  getFriendsActivity
);

// Get explore stats summary (partner stores, max cashback, etc)
router.get('/stats-summary',
  optionalAuth,
  getExploreStatsSummary
);

export default router;
