"use strict";
// Social Media Routes
// Routes for social media post submissions and cashback tracking
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const socialMediaController_1 = require("../controllers/socialMediaController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.requireAuth);
// Submit a new social media post
router.post('/submit', (0, validation_1.validateBody)(validation_2.Joi.object({
    platform: validation_2.Joi.string().valid('instagram', 'facebook', 'twitter', 'tiktok').required(),
    postUrl: validation_2.Joi.string().uri().required(),
    orderId: validation_1.commonSchemas.objectId()
})), socialMediaController_1.submitPost);
// Get user's posts
router.get('/posts', (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
    status: validation_2.Joi.string().valid('pending', 'approved', 'rejected', 'credited')
})), socialMediaController_1.getUserPosts);
// Get user's earnings summary
router.get('/earnings', socialMediaController_1.getUserEarnings);
// Get platform statistics
router.get('/stats', socialMediaController_1.getPlatformStats);
// Get single post by ID
router.get('/posts/:postId', (0, validation_1.validateParams)(validation_2.Joi.object({
    postId: validation_1.commonSchemas.objectId().required()
})), socialMediaController_1.getPostById);
// Update post status (Admin only - PROTECTED)
router.patch('/posts/:postId/status', auth_1.requireAdmin, // ✅ Admin verification added
(0, validation_1.validateParams)(validation_2.Joi.object({
    postId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validateBody)(validation_2.Joi.object({
    status: validation_2.Joi.string().valid('approved', 'rejected', 'credited').required(),
    rejectionReason: validation_2.Joi.string().max(500).when('status', {
        is: 'rejected',
        then: validation_2.Joi.required(),
        otherwise: validation_2.Joi.optional()
    })
})), socialMediaController_1.updatePostStatus);
// Delete a post (user can only delete pending posts)
router.delete('/posts/:postId', (0, validation_1.validateParams)(validation_2.Joi.object({
    postId: validation_1.commonSchemas.objectId().required()
})), socialMediaController_1.deletePost);
exports.default = router;
