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
  getPlatformStats,
  verifyInstagramPost,
  verifyInstagramAccount,
  extractInstagramPostData
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
    orderId: commonSchemas.objectId(),
    // Optional fraud detection metadata from frontend
    fraudMetadata: Joi.object({
      deviceId: Joi.string().optional(),
      trustScore: Joi.number().optional(),
      riskScore: Joi.number().optional(),
      riskLevel: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
      checksPassed: Joi.number().optional(),
      totalChecks: Joi.number().optional(),
      warnings: Joi.array().items(Joi.string()).optional()
    }).optional()
  })),
  submitPost
);

// Get user's posts
router.get('/posts',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20), // Increased max to 100
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

// ============================================================================
// INSTAGRAM VERIFICATION ENDPOINTS
// ============================================================================

// Verify an Instagram post exists and is accessible
router.post('/instagram/verify-post',
  validateBody(Joi.object({
    url: Joi.string().uri().required(),
    postId: Joi.string().optional(),
    username: Joi.string().optional()
  })),
  verifyInstagramPost
);

// Verify an Instagram account
router.post('/instagram/verify-account',
  validateBody(Joi.object({
    username: Joi.string().required()
  })),
  verifyInstagramAccount
);

// Extract basic data from an Instagram post URL
router.post('/instagram/extract-post-data',
  validateBody(Joi.object({
    url: Joi.string().uri().required(),
    postId: Joi.string().optional()
  })),
  extractInstagramPostData
);

export default router;
