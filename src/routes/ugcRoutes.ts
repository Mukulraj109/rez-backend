import { Router } from 'express';
import { getVideosByStore } from '../controllers/videoController';
import { optionalAuth, authenticate as authenticateToken } from '../middleware/auth';
import { validateParams, validateQuery, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';
import { createUgcReel, getMyReels, getUgcFeed, getPendingReels, moderateUgcReel } from '../controllers/ugcController';

const router = Router();

/**
 * UGC (User Generated Content) Routes
 *
 * These routes provide access to user-generated content (photos and videos).
 */

// User endpoints
router.post('/create', authenticateToken, createUgcReel);
router.get('/my-reels', authenticateToken, getMyReels);

// Public feed
router.get('/feed', optionalAuth, getUgcFeed);

// Admin moderation
router.get('/pending', authenticateToken, getPendingReels);
router.patch('/:id/moderate', authenticateToken, moderateUgcReel);

// Get UGC content for a store
router.get('/store/:storeId',
  optionalAuth,
  validateParams(Joi.object({
    // Accept both ObjectId format and string IDs (for mock data compatibility)
    storeId: Joi.string().trim().min(1).required()
  })),
  validateQuery(Joi.object({
    type: Joi.string().valid('photo', 'video').optional(),
    limit: Joi.number().integer().min(1).max(50).default(20),
    offset: Joi.number().integer().min(0).default(0)
  })),
  getVideosByStore
);

export default router;
