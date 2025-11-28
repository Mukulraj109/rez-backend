"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const articleController_1 = require("../controllers/articleController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Create a new article (requires authentication)
router.post('/', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    title: validation_2.Joi.string().trim().min(1).max(200).required(),
    excerpt: validation_2.Joi.string().trim().min(1).max(500).required(),
    content: validation_2.Joi.string().trim().required(),
    coverImage: validation_2.Joi.string().uri().required(),
    category: validation_2.Joi.string().valid('fashion', 'beauty', 'lifestyle', 'tech', 'general').required(),
    tags: validation_2.Joi.array().items(validation_2.Joi.string().trim().max(50)).max(10).optional(),
    products: validation_2.Joi.array().items(validation_1.commonSchemas.objectId()).max(20).optional(),
    stores: validation_2.Joi.array().items(validation_1.commonSchemas.objectId()).max(10).optional(),
    isPublished: validation_2.Joi.boolean().default(false),
    scheduledAt: validation_2.Joi.date().optional()
})), articleController_1.createArticle);
// Get all articles with filtering
router.get('/', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
    category: validation_2.Joi.string().valid('fashion', 'beauty', 'lifestyle', 'tech', 'general'),
    author: validation_1.commonSchemas.objectId(),
    isPublished: validation_2.Joi.boolean(),
    isFeatured: validation_2.Joi.boolean(),
    sortBy: validation_2.Joi.string().valid('newest', 'popular', 'trending').default('newest')
})), articleController_1.getArticles);
// Search articles
router.get('/search', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    q: validation_2.Joi.string().trim().min(2).max(100).required(),
    category: validation_2.Joi.string().valid('fashion', 'beauty', 'lifestyle', 'tech', 'general'),
    author: validation_1.commonSchemas.objectId(),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), articleController_1.searchArticles);
// Get trending articles
router.get('/trending', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10),
    timeframe: validation_2.Joi.string().valid('1d', '7d', '30d').default('7d')
})), articleController_1.getTrendingArticles);
// Get featured articles
router.get('/featured', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10)
})), articleController_1.getFeaturedArticles);
// Get articles by category
router.get('/category/:category', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    category: validation_2.Joi.string().valid('fashion', 'beauty', 'lifestyle', 'tech', 'general').required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
    sortBy: validation_2.Joi.string().valid('newest', 'popular', 'trending').default('newest')
})), articleController_1.getArticlesByCategory);
// Get single article by ID
router.get('/:articleId', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    articleId: validation_1.commonSchemas.objectId().required()
})), articleController_1.getArticleById);
// Update article (requires authentication and ownership)
router.put('/:articleId', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    articleId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_2.Joi.object({
    title: validation_2.Joi.string().trim().min(1).max(200).optional(),
    excerpt: validation_2.Joi.string().trim().min(1).max(500).optional(),
    content: validation_2.Joi.string().trim().optional(),
    coverImage: validation_2.Joi.string().uri().optional(),
    category: validation_2.Joi.string().valid('fashion', 'beauty', 'lifestyle', 'tech', 'general').optional(),
    tags: validation_2.Joi.array().items(validation_2.Joi.string().trim().max(50)).max(10).optional(),
    products: validation_2.Joi.array().items(validation_1.commonSchemas.objectId()).max(20).optional(),
    stores: validation_2.Joi.array().items(validation_1.commonSchemas.objectId()).max(10).optional(),
    isPublished: validation_2.Joi.boolean().optional(),
    scheduledAt: validation_2.Joi.date().optional()
})), articleController_1.updateArticle);
// Delete article (requires authentication and ownership)
router.delete('/:articleId', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    articleId: validation_1.commonSchemas.objectId().required()
})), articleController_1.deleteArticle);
// Like/Unlike article (requires authentication)
router.post('/:articleId/like', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    articleId: validation_1.commonSchemas.objectId().required()
})), articleController_1.toggleArticleLike);
// Bookmark/Unbookmark article (requires authentication)
router.post('/:articleId/bookmark', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    articleId: validation_1.commonSchemas.objectId().required()
})), articleController_1.toggleArticleBookmark);
// Share article (authenticated or anonymous)
router.post('/:articleId/share', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    articleId: validation_1.commonSchemas.objectId().required()
})), articleController_1.incrementArticleShare);
exports.default = router;
