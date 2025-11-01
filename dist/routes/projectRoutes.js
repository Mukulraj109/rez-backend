"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const projectController_1 = require("../controllers/projectController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
// import { generalLimiter } from '../middleware/rateLimiter'; // Disabled for development
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Submit a project (requires authentication)
router.post('/submit', auth_1.authenticate, (0, validation_1.validate)(validation_2.Joi.object({
    projectId: validation_1.commonSchemas.objectId().required(),
    content: validation_2.Joi.alternatives().try(validation_2.Joi.string().trim().min(1).max(5000), validation_2.Joi.array().items(validation_2.Joi.string().uri())).required(),
    contentType: validation_2.Joi.string().valid('text', 'image', 'video', 'rating', 'checkin', 'receipt').default('text'),
    description: validation_2.Joi.string().trim().max(1000).optional(),
    metadata: validation_2.Joi.object().optional()
})), projectController_1.submitProject);
// Get all projects with filtering
router.get('/', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    category: validation_2.Joi.string().valid('beauty', 'fashion', 'lifestyle', 'tutorial', 'diy', 'fitness'),
    difficulty: validation_2.Joi.string().valid('beginner', 'intermediate', 'advanced'),
    creator: validation_1.commonSchemas.objectId(),
    status: validation_2.Joi.string().valid('active', 'completed'),
    search: validation_2.Joi.string().trim().max(100),
    sortBy: validation_2.Joi.string().valid('newest', 'popular', 'trending', 'difficulty_easy', 'difficulty_hard').default('newest'),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), projectController_1.getProjects);
// Get featured projects
router.get('/featured', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    limit: validation_2.Joi.number().integer().min(1).max(50).default(10)
})), projectController_1.getFeaturedProjects);
// Get projects by category
router.get('/category/:category', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    category: validation_2.Joi.string().valid('beauty', 'fashion', 'lifestyle', 'tutorial', 'diy', 'fitness').required()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), projectController_1.getProjectsByCategory);
// Get user's project submissions (requires authentication)
router.get('/my-submissions', 
// generalLimiter,, // Disabled for development
auth_1.authenticate, (0, validation_1.validateQuery)(validation_2.Joi.object({
    status: validation_2.Joi.string().valid('pending', 'approved', 'rejected'),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), projectController_1.getMySubmissions);
// Get single project by ID
router.get('/:projectId', 
// generalLimiter,, // Disabled for development
auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    projectId: validation_1.commonSchemas.objectId().required()
})), projectController_1.getProjectById);
// Like/Unlike project (requires authentication)
router.post('/:projectId/like', 
// generalLimiter,, // Disabled for development
auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    projectId: validation_1.commonSchemas.objectId().required()
})), projectController_1.toggleProjectLike);
// Add comment to project (requires authentication)
router.post('/:projectId/comments', 
// generalLimiter,, // Disabled for development
auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    projectId: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_2.Joi.object({
    comment: validation_2.Joi.string().trim().min(1).max(500).required()
})), projectController_1.addProjectComment);
exports.default = router;
