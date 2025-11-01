import { Router } from 'express';
import {
  createVideo,
  getVideos,
  getVideoById,
  getVideosByCategory,
  getTrendingVideos,
  getVideosByCreator,
  toggleVideoLike,
  addVideoComment,
  getVideoComments,
  searchVideos
} from '../controllers/videoController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate, validateParams, validateQuery, videoSchemas, commonSchemas } from '../middleware/validation';
// // import { generalLimiter, searchLimiter } from '../middleware/rateLimiter'; // Disabled for development // Disabled for development
import { Joi } from '../middleware/validation';

const router = Router();

// Create a new video (requires authentication)
router.post('/', 
  authenticate,
  validate(Joi.object({
    title: Joi.string().trim().min(1).max(100).required(),
    description: Joi.string().trim().max(1000).optional(),
    videoUrl: Joi.string().uri().required(),
    thumbnailUrl: Joi.string().uri().optional(),
    category: Joi.string().valid('trending_me', 'trending_her', 'waist', 'article', 'featured', 'challenge', 'tutorial', 'review').default('general'),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(10).optional(),
    products: Joi.array().items(commonSchemas.objectId()).max(20).optional(),
    duration: Joi.number().integer().min(0).optional(),
    isPublic: Joi.boolean().default(true)
  })),
  createVideo
);

// Get all videos with filtering
router.get('/', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(videoSchemas.getVideos),
  getVideos
);

// Search videos
router.get('/search', 
  // searchLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    q: Joi.string().trim().min(2).max(100).required(),
    category: Joi.string().valid('trending_me', 'trending_her', 'waist', 'article', 'featured', 'challenge', 'tutorial', 'review'),
    creator: commonSchemas.objectId(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  searchVideos
);

// Get trending videos
router.get('/trending', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20),
    timeframe: Joi.string().valid('1d', '7d', '30d').default('7d')
  })),
  getTrendingVideos
);

// Get videos by category
router.get('/category/:category', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    category: Joi.string().valid('trending_me', 'trending_her', 'waist', 'article', 'featured', 'challenge', 'tutorial', 'review').required()
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    sortBy: Joi.string().valid('newest', 'popular', 'trending').default('newest')
  })),
  getVideosByCategory
);

// Get videos by creator
router.get('/creator/:creatorId', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    creatorId: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getVideosByCreator
);

// Get single video by ID
router.get('/:videoId', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    videoId: commonSchemas.objectId().required()
  })),
  getVideoById
);

// Like/Unlike video (requires authentication)
router.post('/:videoId/like', 
  // generalLimiter,, // Disabled for development
  authenticate,
  validateParams(Joi.object({
    videoId: commonSchemas.objectId().required()
  })),
  toggleVideoLike
);

// Add comment to video (requires authentication)
router.post('/:videoId/comments', 
  // generalLimiter,, // Disabled for development
  authenticate,
  validateParams(Joi.object({
    videoId: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    comment: Joi.string().trim().min(1).max(500).required()
  })),
  addVideoComment
);

// Get video comments
router.get('/:videoId/comments', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    videoId: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getVideoComments
);

export default router;