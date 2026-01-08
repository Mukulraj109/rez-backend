import { Router } from 'express';
import {
  getFeaturedCreators,
  getCreatorById,
  getCreatorPicks,
  getTrendingPicks,
  getCreatorStats
} from '../controllers/creatorController';
import { optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, commonSchemas, Joi } from '../middleware/validation';

const router = Router();

// Get featured creators - FOR FRONTEND "Featured Creators" SECTION
// Aggregates top creators by video engagement
router.get('/featured',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(6)
  })),
  getFeaturedCreators
);

// Get trending picks from all creators - FOR FRONTEND "Trending Picks" SECTION
router.get('/trending-picks',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    category: Joi.string().optional()
  })),
  getTrendingPicks
);

// Get single creator by ID
router.get('/:id',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  getCreatorById
);

// Get creator's product picks
router.get('/:id/picks',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getCreatorPicks
);

// Get creator's stats (for profile page)
router.get('/:id/stats',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  getCreatorStats
);

export default router;
