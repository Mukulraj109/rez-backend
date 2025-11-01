"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canUserReviewStore = exports.getUserReviews = exports.markReviewHelpful = exports.deleteReview = exports.updateReview = exports.createReview = exports.getStoreReviews = void 0;
const Review_1 = require("../models/Review");
const Store_1 = require("../models/Store");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const activityService_1 = __importDefault(require("../services/activityService"));
const achievementService_1 = __importDefault(require("../services/achievementService"));
const mongoose_1 = require("mongoose");
// Get reviews for a store
exports.getStoreReviews = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    const { page = 1, limit = 20, rating, sortBy = 'newest' } = req.query;
    try {
        const query = {
            store: storeId,
            isActive: true
        };
        // Filter by rating if provided
        if (rating) {
            query.rating = Number(rating);
        }
        // Sorting options
        let sort = {};
        switch (sortBy) {
            case 'newest':
                sort = { createdAt: -1 };
                break;
            case 'oldest':
                sort = { createdAt: 1 };
                break;
            case 'highest':
                sort = { rating: -1, createdAt: -1 };
                break;
            case 'lowest':
                sort = { rating: 1, createdAt: -1 };
                break;
            case 'helpful':
                sort = { helpful: -1, createdAt: -1 };
                break;
            default:
                sort = { createdAt: -1 };
        }
        // Pagination
        const skip = (Number(page) - 1) * Number(limit);
        const reviews = await Review_1.Review.find(query)
            .populate('user', 'profile.name profile.avatar')
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await Review_1.Review.countDocuments(query);
        // Get rating statistics
        const ratingStats = await Review_1.Review.getStoreRatingStats(storeId);
        (0, response_1.sendSuccess)(res, {
            reviews,
            ratingStats,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / Number(limit)),
                totalReviews: total,
                hasNextPage: skip + reviews.length < total,
                hasPrevPage: Number(page) > 1
            }
        });
    }
    catch (error) {
        console.error('Get store reviews error:', error);
        throw new errorHandler_1.AppError('Failed to fetch store reviews', 500);
    }
});
// Create a new review
exports.createReview = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    const { rating, title, comment, images } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        // Check if store exists
        const store = await Store_1.Store.findById(storeId);
        if (!store) {
            throw new errorHandler_1.AppError('Store not found', 404);
        }
        // Check if user has already reviewed this store
        const existingReview = await Review_1.Review.findOne({
            store: storeId,
            user: userId,
            isActive: true
        });
        if (existingReview) {
            throw new errorHandler_1.AppError('You have already reviewed this store', 400);
        }
        // Create new review
        const review = new Review_1.Review({
            store: storeId,
            user: userId,
            rating,
            title,
            comment,
            images: images || [],
            verified: true // Auto-verify for now
        });
        await review.save();
        // Update store rating statistics
        const ratingStats = await Review_1.Review.getStoreRatingStats(storeId);
        await Store_1.Store.findByIdAndUpdate(storeId, {
            'ratings.average': ratingStats.average,
            'ratings.count': ratingStats.count,
            'ratings.distribution': ratingStats.distribution
        });
        // Populate user info for response
        await review.populate('user', 'profile.name profile.avatar');
        // Create activity for review submission
        await activityService_1.default.review.onReviewSubmitted(new mongoose_1.Types.ObjectId(userId), new mongoose_1.Types.ObjectId(review._id), store.name);
        // Trigger achievement update for review creation
        try {
            await achievementService_1.default.triggerAchievementUpdate(userId, 'review_created');
        }
        catch (error) {
            console.error('❌ [REVIEW] Error triggering achievement update:', error);
        }
        (0, response_1.sendCreated)(res, {
            review
        }, 'Review created successfully');
    }
    catch (error) {
        console.error('Create review error:', error);
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to create review', 500);
    }
});
// Update a review
exports.updateReview = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { reviewId } = req.params;
    const { rating, title, comment, images } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const review = await Review_1.Review.findOne({
            _id: reviewId,
            user: userId,
            isActive: true
        });
        if (!review) {
            throw new errorHandler_1.AppError('Review not found or you are not authorized to update it', 404);
        }
        // Update review
        review.rating = rating || review.rating;
        review.title = title || review.title;
        review.comment = comment || review.comment;
        review.images = images || review.images;
        await review.save();
        // Update store rating statistics
        const ratingStats = await Review_1.Review.getStoreRatingStats(review.store.toString());
        await Store_1.Store.findByIdAndUpdate(review.store, {
            'ratings.average': ratingStats.average,
            'ratings.count': ratingStats.count,
            'ratings.distribution': ratingStats.distribution
        });
        // Populate user info for response
        await review.populate('user', 'profile.name profile.avatar');
        (0, response_1.sendSuccess)(res, {
            review
        }, 'Review updated successfully');
    }
    catch (error) {
        console.error('Update review error:', error);
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to update review', 500);
    }
});
// Delete a review
exports.deleteReview = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { reviewId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const review = await Review_1.Review.findOne({
            _id: reviewId,
            user: userId,
            isActive: true
        });
        if (!review) {
            throw new errorHandler_1.AppError('Review not found or you are not authorized to delete it', 404);
        }
        // Soft delete the review
        review.isActive = false;
        await review.save();
        // Update store rating statistics
        const ratingStats = await Review_1.Review.getStoreRatingStats(review.store.toString());
        await Store_1.Store.findByIdAndUpdate(review.store, {
            'ratings.average': ratingStats.average,
            'ratings.count': ratingStats.count,
            'ratings.distribution': ratingStats.distribution
        });
        (0, response_1.sendSuccess)(res, null, 'Review deleted successfully');
    }
    catch (error) {
        console.error('Delete review error:', error);
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to delete review', 500);
    }
});
// Mark review as helpful
exports.markReviewHelpful = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { reviewId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const review = await Review_1.Review.findById(reviewId);
        if (!review || !review.isActive) {
            throw new errorHandler_1.AppError('Review not found', 404);
        }
        // Increment helpful count
        review.helpful += 1;
        await review.save();
        (0, response_1.sendSuccess)(res, {
            helpful: review.helpful
        }, 'Review marked as helpful');
    }
    catch (error) {
        console.error('Mark review helpful error:', error);
        if (error instanceof errorHandler_1.AppError) {
            throw error;
        }
        throw new errorHandler_1.AppError('Failed to mark review as helpful', 500);
    }
});
// Get user's reviews
exports.getUserReviews = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { page = 1, limit = 20 } = req.query;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const skip = (Number(page) - 1) * Number(limit);
        const reviews = await Review_1.Review.find({
            user: userId,
            isActive: true
        })
            .populate('store', 'name logo location.address')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await Review_1.Review.countDocuments({
            user: userId,
            isActive: true
        });
        (0, response_1.sendSuccess)(res, {
            reviews,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / Number(limit)),
                totalReviews: total,
                hasNextPage: skip + reviews.length < total,
                hasPrevPage: Number(page) > 1
            }
        });
    }
    catch (error) {
        console.error('Get user reviews error:', error);
        throw new errorHandler_1.AppError('Failed to fetch user reviews', 500);
    }
});
// Check if user can review store
exports.canUserReviewStore = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    try {
        const hasReviewed = await Review_1.Review.hasUserReviewed(storeId, userId);
        (0, response_1.sendSuccess)(res, {
            canReview: !hasReviewed,
            hasReviewed
        });
    }
    catch (error) {
        console.error('Check user review eligibility error:', error);
        throw new errorHandler_1.AppError('Failed to check review eligibility', 500);
    }
});
