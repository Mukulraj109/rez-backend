import { Router } from 'express';
import { getVideosByStore } from '../controllers/videoController';
import { optionalAuth } from '../middleware/auth';
import { validateParams, validateQuery, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

/**
 * UGC (User Generated Content) Routes
 *
 * These routes provide access to user-generated content (photos and videos).
 * Currently aliased to video controller as UGC content is stored in videos collection.
 */

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
