"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const projectController_1 = require("../controllers/projectController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Get earning project categories
router.get('/categories', auth_1.optionalAuth, projectController_1.getEarningCategories);
// Get earning projects (alias to regular projects)
router.get('/', auth_1.optionalAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    category: validation_2.Joi.string().valid('review', 'social_share', 'ugc_content', 'store_visit', 'survey', 'photo', 'video', 'data_collection', 'mystery_shopping', 'referral'),
    difficulty: validation_2.Joi.string().valid('easy', 'medium', 'hard'),
    status: validation_2.Joi.string().valid('active', 'completed'),
    search: validation_2.Joi.string().trim().max(100),
    sortBy: validation_2.Joi.string().valid('newest', 'popular', 'trending', 'difficulty_easy', 'difficulty_hard').default('newest'),
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), projectController_1.getProjects);
// Get earning project by ID
router.get('/:id', auth_1.optionalAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), projectController_1.getProjectById);
// Start an earning project (creates a submission)
router.post('/:id/start', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_2.Joi.object({
    content: validation_2.Joi.alternatives().try(validation_2.Joi.string().trim().min(1).max(5000), validation_2.Joi.array().items(validation_2.Joi.string().uri())).optional(),
    contentType: validation_2.Joi.string().valid('text', 'image', 'video', 'rating', 'checkin', 'receipt').default('text'),
    description: validation_2.Joi.string().trim().max(1000).optional(),
    metadata: validation_2.Joi.object().optional()
})), async (req, res, next) => {
    // Map to submitProject with projectId from params
    req.body.projectId = req.params.id;
    return (0, projectController_1.submitProject)(req, res, next);
});
// Complete an earning project (marks submission as completed)
router.post('/:id/complete', auth_1.authenticate, (0, validation_1.validateParams)(validation_2.Joi.object({
    id: validation_1.commonSchemas.objectId().required()
})), (0, validation_1.validate)(validation_2.Joi.object({
    submissionId: validation_1.commonSchemas.objectId().optional(),
    content: validation_2.Joi.alternatives().try(validation_2.Joi.string().trim().min(1).max(5000), validation_2.Joi.array().items(validation_2.Joi.string().uri())).optional(),
    contentType: validation_2.Joi.string().valid('text', 'image', 'video', 'rating', 'checkin', 'receipt').default('text'),
    description: validation_2.Joi.string().trim().max(1000).optional(),
    metadata: validation_2.Joi.object().optional()
})), async (req, res, next) => {
    // For complete, we submit the work if not already submitted
    req.body.projectId = req.params.id;
    return (0, projectController_1.submitProject)(req, res, next);
});
exports.default = router;
