"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reviewController_1 = require("../controllers/reviewController");
const uploadController_1 = require("../controllers/uploadController");
const upload_1 = require("../middleware/upload");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
// // import { generalLimiter, reviewLimiter } from '../middleware/rateLimiter'; // Disabled for development // Disabled for development
const validation_2 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Get reviews for a store
router.get('/store/:storeId', 
// generalLimiter,, // Disabled for development
(0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId()
})), (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20),
    rating: validation_2.Joi.number().integer().min(1).max(5),
    sortBy: validation_2.Joi.string().valid('newest', 'oldest', 'highest', 'lowest', 'helpful').default('newest')
})), reviewController_1.getStoreReviews);
// Check if user can review a store
router.get('/store/:storeId/can-review', 
// generalLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId()
})), reviewController_1.canUserReviewStore);
// Create a new review
router.post('/store/:storeId', 
// reviewLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    storeId: validation_1.commonSchemas.objectId()
})), (0, validation_1.validateBody)(validation_2.Joi.object({
    rating: validation_2.Joi.number().integer().min(1).max(5).required(),
    title: validation_2.Joi.string().trim().max(100),
    comment: validation_2.Joi.string().trim().min(10).max(1000).required(),
    images: validation_2.Joi.array().items(validation_2.Joi.string().uri()).max(5)
})), reviewController_1.createReview);
// Update a review
router.put('/:reviewId', 
// reviewLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    reviewId: validation_1.commonSchemas.objectId()
})), (0, validation_1.validateBody)(validation_2.Joi.object({
    rating: validation_2.Joi.number().integer().min(1).max(5),
    title: validation_2.Joi.string().trim().max(100),
    comment: validation_2.Joi.string().trim().min(10).max(1000),
    images: validation_2.Joi.array().items(validation_2.Joi.string().uri()).max(5)
})), reviewController_1.updateReview);
// Delete a review
router.delete('/:reviewId', 
// reviewLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    reviewId: validation_1.commonSchemas.objectId()
})), reviewController_1.deleteReview);
// Mark review as helpful
router.post('/:reviewId/helpful', 
// reviewLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateParams)(validation_2.Joi.object({
    reviewId: validation_1.commonSchemas.objectId()
})), reviewController_1.markReviewHelpful);
// Get user's reviews
router.get('/user/my-reviews', 
// generalLimiter,, // Disabled for development
auth_1.requireAuth, (0, validation_1.validateQuery)(validation_2.Joi.object({
    page: validation_2.Joi.number().integer().min(1).default(1),
    limit: validation_2.Joi.number().integer().min(1).max(50).default(20)
})), reviewController_1.getUserReviews);
// Upload review image to Cloudinary
router.post('/upload-image', auth_1.requireAuth, upload_1.uploadReviewImage.single('image'), uploadController_1.uploadReviewImage);
exports.default = router;
