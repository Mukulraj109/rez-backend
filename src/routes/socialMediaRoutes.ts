// Social Media Routes
// Routes for social media post submissions and cashback tracking

import { Router } from 'express';
import {
  submitPost,
  getUserPosts,
  getUserEarnings,
  getPostById,
  updatePostStatus,
  deletePost,
  getPlatformStats
} from '../controllers/socialMediaController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validateBody, validateParams, validateQuery, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Submit a new social media post
router.post('/submit',
  validateBody(Joi.object({
    platform: Joi.string().valid('instagram', 'facebook', 'twitter', 'tiktok').required(),
    postUrl: Joi.string().uri().required(),
    orderId: commonSchemas.objectId()
  })),
  submitPost
);

// Get user's posts
router.get('/posts',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    status: Joi.string().valid('pending', 'approved', 'rejected', 'credited')
  })),
  getUserPosts
);

// Get user's earnings summary
router.get('/earnings',
  getUserEarnings
);

// Get platform statistics
router.get('/stats',
  getPlatformStats
);

// Get single post by ID
router.get('/posts/:postId',
  validateParams(Joi.object({
    postId: commonSchemas.objectId().required()
  })),
  getPostById
);

// Update post status (Admin only - PROTECTED)
router.patch('/posts/:postId/status',
  requireAdmin, // ✅ Admin verification added
  validateParams(Joi.object({
    postId: commonSchemas.objectId().required()
  })),
  validateBody(Joi.object({
    status: Joi.string().valid('approved', 'rejected', 'credited').required(),
    rejectionReason: Joi.string().max(500).when('status', {
      is: 'rejected',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  })),
  updatePostStatus
);

// Delete a post (user can only delete pending posts)
router.delete('/posts/:postId',
  validateParams(Joi.object({
    postId: commonSchemas.objectId().required()
  })),
  deletePost
);

export default router;
