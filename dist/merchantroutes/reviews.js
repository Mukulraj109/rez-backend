"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const merchantauth_1 = require("../middleware/merchantauth");
const merchantvalidation_1 = require("../middleware/merchantvalidation");
const Review_1 = require("../models/Review");
const Product_1 = require("../models/Product");
const Store_1 = require("../models/Store");
const joi_1 = __importDefault(require("joi"));
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
// All routes require authentication
router.use(merchantauth_1.authMiddleware);
// Validation schemas
const productIdSchema = joi_1.default.object({
    id: joi_1.default.string().required()
});
const reviewResponseSchema = joi_1.default.object({
    response: joi_1.default.string().required().min(10).max(500)
});
const flagReviewSchema = joi_1.default.object({
    reason: joi_1.default.string().required().valid('spam', 'inappropriate', 'offensive', 'misleading', 'other'),
    details: joi_1.default.string().max(500)
});
// @route   GET /api/merchant/products/:id/reviews
// @desc    Get all reviews for a product
// @access  Private
router.get('/:id/reviews', (0, merchantvalidation_1.validateParams)(productIdSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const productId = req.params.id;
        // Verify product belongs to merchant's store
        const store = await Store_1.Store.findOne({ merchantId });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found'
            });
        }
        const product = await Product_1.Product.findOne({
            _id: productId,
            store: store._id
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        // Get reviews - Note: Reviews reference store, not product
        // We need to check if there's a product-specific review model
        // For now, getting store reviews
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const filter = req.query.filter;
        const reviewQuery = {
            store: store._id,
            isActive: true
        };
        // Apply filters
        if (filter === 'with_images') {
            reviewQuery.images = { $exists: true, $ne: [] };
        }
        else if (filter === 'verified') {
            reviewQuery.verified = true;
        }
        else if (filter && !isNaN(parseInt(filter))) {
            reviewQuery.rating = parseInt(filter);
        }
        const [reviews, totalCount] = await Promise.all([
            Review_1.Review.find(reviewQuery)
                .populate('user', 'profile.name profile.avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Review_1.Review.countDocuments(reviewQuery)
        ]);
        // Get review stats
        const stats = await Review_1.Review.getStoreRatingStats(store._id.toString());
        return res.json({
            success: true,
            data: {
                reviews,
                stats,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages: Math.ceil(totalCount / limit),
                    hasNext: page < Math.ceil(totalCount / limit),
                    hasPrevious: page > 1
                }
            }
        });
    }
    catch (error) {
        console.error('Get product reviews error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews',
            error: error.message
        });
    }
});
// @route   POST /api/merchant/products/:id/reviews/:reviewId/response
// @desc    Merchant reply to a review
// @access  Private
router.post('/:id/reviews/:reviewId/response', (0, merchantvalidation_1.validateParams)(productIdSchema), (0, merchantvalidation_1.validateRequest)(reviewResponseSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { id: productId, reviewId } = req.params;
        const { response } = req.body;
        // Verify product belongs to merchant's store
        const store = await Store_1.Store.findOne({ merchantId });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found'
            });
        }
        const product = await Product_1.Product.findOne({
            _id: productId,
            store: store._id
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        // Find review
        const review = await Review_1.Review.findOne({
            _id: reviewId,
            store: store._id
        });
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        // Save merchant response to the review
        review.merchantResponse = {
            message: response,
            respondedAt: new Date(),
            respondedBy: new mongoose_1.default.Types.ObjectId(merchantId)
        };
        await review.save();
        // Send real-time notification to reviewer
        if (global.io) {
            global.io.to(`user-${review.user}`).emit('review_response', {
                reviewId: review._id,
                productId: product._id,
                response,
                timestamp: new Date()
            });
        }
        return res.json({
            success: true,
            message: 'Response posted successfully',
            data: {
                reviewId: review._id,
                merchantResponse: review.merchantResponse
            }
        });
    }
    catch (error) {
        console.error('Post review response error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to post response',
            error: error.message
        });
    }
});
// @route   PUT /api/merchant/products/:id/reviews/:reviewId/flag
// @desc    Flag inappropriate review
// @access  Private
router.put('/:id/reviews/:reviewId/flag', (0, merchantvalidation_1.validateParams)(productIdSchema), (0, merchantvalidation_1.validateRequest)(flagReviewSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { id: productId, reviewId } = req.params;
        const { reason, details } = req.body;
        // Verify product belongs to merchant's store
        const store = await Store_1.Store.findOne({ merchantId });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found'
            });
        }
        const product = await Product_1.Product.findOne({
            _id: productId,
            store: store._id
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        // Find review
        const review = await Review_1.Review.findOne({
            _id: reviewId,
            store: store._id
        });
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        // Flag review for moderation
        // This would require updating the Review model to include flags
        // For now, we'll track this in a separate moderation system
        console.log(`Review ${reviewId} flagged by merchant ${merchantId}:`, {
            reason,
            details
        });
        // Send notification to admin/moderation team
        if (global.io) {
            global.io.to('admins').emit('review_flagged', {
                reviewId: review._id,
                productId: product._id,
                merchantId,
                reason,
                details,
                timestamp: new Date()
            });
        }
        return res.json({
            success: true,
            message: 'Review flagged for moderation',
            data: {
                reviewId: review._id,
                status: 'flagged'
            }
        });
    }
    catch (error) {
        console.error('Flag review error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to flag review',
            error: error.message
        });
    }
});
// @route   GET /api/merchant/products/:id/reviews/stats
// @desc    Get review statistics for a product
// @access  Private
router.get('/:id/reviews/stats', (0, merchantvalidation_1.validateParams)(productIdSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const productId = req.params.id;
        // Verify product belongs to merchant's store
        const store = await Store_1.Store.findOne({ merchantId });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found'
            });
        }
        const product = await Product_1.Product.findOne({
            _id: productId,
            store: store._id
        });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        // Get review stats
        const stats = await Review_1.Review.getStoreRatingStats(store._id.toString());
        // Get additional analytics
        const recentReviews = await Review_1.Review.find({
            store: store._id,
            isActive: true
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('rating createdAt')
            .lean();
        const verifiedCount = await Review_1.Review.countDocuments({
            store: store._id,
            isActive: true,
            verified: true
        });
        const withImagesCount = await Review_1.Review.countDocuments({
            store: store._id,
            isActive: true,
            images: { $exists: true, $ne: [] }
        });
        return res.json({
            success: true,
            data: {
                overall: stats,
                verified: verifiedCount,
                withImages: withImagesCount,
                recentReviews,
                reviewStats: product.reviewStats || {
                    averageRating: 0,
                    totalReviews: 0,
                    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
                }
            }
        });
    }
    catch (error) {
        console.error('Get review stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch review stats',
            error: error.message
        });
    }
});
exports.default = router;
