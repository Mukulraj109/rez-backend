"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const videoController_1 = require("../controllers/videoController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
// // import { generalLimiter, searchLimiter } from '../middleware/rateLimiter'; // Disabled for development // Disabled for development
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Create a new video (requires authentication)
router.post('/', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    title: validation_2.Joi.string().trim().min(1).max(100).required(),
    description: validation_2.Joi.string().trim().max(1000).optional(),
    videoUrl: validation_2.Joi.string().uri().required(),
    thumbnailUrl: validation_2.Joi.string().uri().optional(),
    category: validation_2.Joi.string().valid('trending_me', 'trending_her', 'waist', 'article', 'featured', 'challenge', 'tutorial', 'review').default('general'),
    tags: validation_2.Joi.array().items(validation_2.Joi.string().trim().max(50)).max(10).optional(),
    products: validation_2.Joi.array().items(validation_1.commonSchemas.objectId()).max(20).optional(),
    duration: validation_2.Joi.number().integer().min(0).optional(),
    isPublic: validation_2.Joi.boolean().default(true)
})), videoController_1.createVideo);
// Get all videos with filtering
router.get('/', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_1.videoSchemas.getVideos), videoController_1.getVideos);
// Search videos
router.get('/search', 
// searchLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    q: validation_2.Joi.string().trim().min(2).max(100).required(),
    category: validation_2.Joi.string().valid('trending_me', 'trending_her', 'waist', 'article', 'featured', 'challenge', 'tutorial', 'review'),
    creator: validation_1.commonSchemas.objectId(),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), videoController_1.searchVideos);
// Get trending videos
router.get('/trending', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
    timeframe: validation_2.Joi.string().valid('1d', '7d', '30d').default('7d')
})), videoController_1.getTrendingVideos);
// Get videos by category
router.get('/category/:category', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    category: validation_2.Joi.string().valid('trending_me', 'trending_her', 'waist', 'article', 'featured', 'challenge', 'tutorial', 'review').required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
    sortBy: validation_2.Joi.string().valid('newest', 'popular', 'trending').default('newest')
})), videoController_1.getVideosByCategory);
// Get videos by creator
router.get('/creator/:creatorId', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    creatorId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), videoController_1.getVideosByCreator);
// Get single video by ID
router.get('/:videoId', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    videoId: validation_1.commonSchemas.objectId().required()
})), videoController_1.getVideoById);
// Like/Unlike video (requires authentication)
router.post('/:videoId/like', 
// generalLimiter,, // Disabled for development
auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    videoId: validation_1.commonSchemas.objectId().required()
})), videoController_1.toggleVideoLike);
// Add comment to video (requires authentication)
router.post('/:videoId/comments', 
// generalLimiter,, // Disabled for development
auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    videoId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_2.Joi.object({
    comment: validation_2.Joi.string().trim().min(1).max(500).required()
})), videoController_1.addVideoComment);
// Get video comments
router.get('/:videoId/comments', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    videoId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), videoController_1.getVideoComments);
exports.default = router;
