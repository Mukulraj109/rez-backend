import { Request, Response } from 'express';
import { Review } from '../models/Review';
import { Store } from '../models/Store';
import {
  sendSuccess,
  sendNotFound,
  sendBadRequest,
  sendCreated
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import activityService from '../services/activityService';
import achievementService from '../services/achievementService';
import { Types } from 'mongoose';

// Get reviews for a store
export const getStoreReviews = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const { 
    page = 1, 
    limit = 20, 
    rating, 
    sortBy = 'newest',
    sort = 'newest' // Support both sortBy and sort for compatibility
  } = req.query;
  
  // Use sort if provided, otherwise use sortBy
  const sortParam = (sort || sortBy) as string;

  try {
    const userId = req.user?.id;
    
    // Base query: show approved reviews to all users
    // Also show user's own pending reviews if they're the reviewer
    const query: any = { 
      store: storeId, 
      isActive: true,
      $or: [
        { moderationStatus: 'approved' }, // Show approved reviews to everyone
        ...(userId ? [{ 
          moderationStatus: 'pending', 
          user: userId // Show user's own pending reviews
        }] : [])
      ]
    };

    // Filter by rating if provided
    if (rating) {
      query.rating = Number(rating);
    }

    // Sorting options
    let sortOptions: any = {};
    switch (sortParam) {
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'rating_high':
      case 'highest':
        sortOptions = { rating: -1, createdAt: -1 };
        break;
      case 'rating_low':
      case 'lowest':
        sortOptions = { rating: 1, createdAt: -1 };
        break;
      case 'helpful':
        sortOptions = { helpful: -1, createdAt: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    const reviews = await Review.find(query)
      .populate('user', 'profile.firstName profile.lastName profile.avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Review.countDocuments(query);

    // Get rating statistics (only approved reviews for public stats)
    const ratingStats = await Review.getStoreRatingStats(storeId);

    // If user has pending reviews, add them to the count for their view
    let adjustedStats = { ...ratingStats };
    if (userId) {
      const userPendingCount = await Review.countDocuments({
        store: storeId,
        user: userId,
        isActive: true,
        moderationStatus: 'pending'
      });
      
      if (userPendingCount > 0) {
        // Add pending reviews to total count for user's view
        adjustedStats.count = ratingStats.count + userPendingCount;
      }
    }

    // Transform reviews to match frontend format
    const transformedReviews = reviews.map((review: any) => {
      // Combine firstName and lastName to create full name
      // Fall back to userName field if user profile is not populated
      const firstName = review.user?.profile?.firstName || '';
      const lastName = review.user?.profile?.lastName || '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || review.userName || 'Anonymous';
      
      return {
        id: review._id.toString(),
        _id: review._id.toString(),
        user: {
          id: review.user?._id?.toString() || review.user?.id || '',
          _id: review.user?._id?.toString() || review.user?.id || '',
          name: fullName,
          avatar: review.user?.profile?.avatar || review.user?.avatar,
        },
        moderationStatus: review.moderationStatus || 'approved', // Include moderation status
        rating: review.rating,
        title: review.title || '',
        comment: review.comment || review.text || '',
        helpful: review.helpful || 0,
        createdAt: review.createdAt,
        verified: review.verified || false,
        images: review.images || [],
        metadata: review.metadata ? {
          cashbackEarned: review.metadata.cashbackEarned,
          orderNumber: review.metadata.orderNumber,
          purchaseDate: review.metadata.purchaseDate,
        } : undefined,
        merchantResponse: review.merchantResponse ? {
          message: review.merchantResponse.message,
          respondedAt: review.merchantResponse.respondedAt,
          respondedBy: review.merchantResponse.respondedBy?.toString() || '',
        } : undefined,
      };
    });

    // Transform rating stats to match frontend format
    // Note: averageRating and ratingBreakdown only include approved reviews
    // totalReviews includes user's own pending reviews for their view
    const summary = {
      averageRating: ratingStats.average || 0, // Only approved reviews
      totalReviews: adjustedStats.count || 0, // Includes user's pending reviews
      ratingBreakdown: {
        5: ratingStats.distribution?.[5] || 0, // Only approved reviews
        4: ratingStats.distribution?.[4] || 0,
        3: ratingStats.distribution?.[3] || 0,
        2: ratingStats.distribution?.[2] || 0,
        1: ratingStats.distribution?.[1] || 0,
      },
    };

    sendSuccess(res, {
      reviews: transformedReviews,
      summary,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total: total,
        limit: Number(limit),
        hasNext: skip + reviews.length < total,
        hasPrevious: Number(page) > 1
      }
    });

  } catch (error) {
    console.error('Get store reviews error:', error);
    throw new AppError('Failed to fetch store reviews', 500);
  }
});

// Create a new review
export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const { rating, title, comment, images } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    // Check if store exists
    const store = await Store.findById(storeId);
    if (!store) {
      throw new AppError('Store not found', 404);
    }

    // Check if user has already reviewed this store
    const existingReview = await Review.findOne({ 
      store: storeId, 
      user: userId,
      isActive: true 
    });

    if (existingReview) {
      throw new AppError('You have already reviewed this store', 400);
    }

    // Create new review with pending status
    const review = new Review({
      store: storeId,
      user: userId,
      rating,
      title,
      comment,
      images: images || [],
      verified: false, // Not verified until approved
      moderationStatus: 'pending' // Requires merchant approval
    });

    await review.save();

    // Don't update store rating statistics yet - wait for approval
    // Store ratings will be updated when merchant approves the review

    // Populate user info for response
    await review.populate('user', 'profile.name profile.avatar');

    // Create activity for review submission
    await activityService.review.onReviewSubmitted(
      new Types.ObjectId(userId),
      new Types.ObjectId(review._id as any),
      store.name
    );

    // Trigger achievement update for review creation
    try {
      await achievementService.triggerAchievementUpdate(userId, 'review_created');
    } catch (error) {
      console.error('❌ [REVIEW] Error triggering achievement update:', error);
    }

    sendCreated(res, {
      review
    }, 'Review submitted successfully. It will be visible after merchant approval.');

  } catch (error) {
    console.error('Create review error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to create review', 500);
  }
});

// Update a review
export const updateReview = asyncHandler(async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const { rating, title, comment, images } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const review = await Review.findOne({ 
      _id: reviewId, 
      user: userId,
      isActive: true 
    });

    if (!review) {
      throw new AppError('Review not found or you are not authorized to update it', 404);
    }

    // Store previous moderation status
    const wasApproved = review.moderationStatus === 'approved';
    
    // Update review
    review.rating = rating || review.rating;
    review.title = title || review.title;
    review.comment = comment || review.comment;
    review.images = images || review.images;
    
    // If review was approved and is being updated, reset to pending for re-approval
    if (wasApproved) {
      review.moderationStatus = 'pending';
      review.moderatedBy = undefined;
      review.moderatedAt = undefined;
      review.moderationReason = undefined;
    }

    await review.save();

    // Update store rating statistics if review was previously approved (to recalculate without this review)
    // or if it's still approved after update
    if (wasApproved || review.moderationStatus === 'approved') {
      const ratingStats = await Review.getStoreRatingStats(review.store.toString());
      await Store.findByIdAndUpdate(review.store, {
        'ratings.average': ratingStats.average,
        'ratings.count': ratingStats.count,
        'ratings.distribution': ratingStats.distribution
      });
    }

    // Populate user info for response
    await review.populate('user', 'profile.name profile.avatar');

    sendSuccess(res, {
      review
    }, 'Review updated successfully');

  } catch (error) {
    console.error('Update review error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to update review', 500);
  }
});

// Delete a review
export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const review = await Review.findOne({ 
      _id: reviewId, 
      user: userId,
      isActive: true 
    });

    if (!review) {
      throw new AppError('Review not found or you are not authorized to delete it', 404);
    }

    // Soft delete the review
    review.isActive = false;
    await review.save();

    // Update store rating statistics
    const ratingStats = await Review.getStoreRatingStats(review.store.toString());
    await Store.findByIdAndUpdate(review.store, {
      'ratings.average': ratingStats.average,
      'ratings.count': ratingStats.count,
      'ratings.distribution': ratingStats.distribution
    });

    sendSuccess(res, null, 'Review deleted successfully');

  } catch (error) {
    console.error('Delete review error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to delete review', 500);
  }
});

// Mark review as helpful
export const markReviewHelpful = asyncHandler(async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const review = await Review.findById(reviewId);
    if (!review || !review.isActive) {
      throw new AppError('Review not found', 404);
    }

    // Increment helpful count
    review.helpful += 1;
    await review.save();

    sendSuccess(res, {
      helpful: review.helpful
    }, 'Review marked as helpful');

  } catch (error) {
    console.error('Mark review helpful error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to mark review as helpful', 500);
  }
});

// Get user's reviews
export const getUserReviews = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { page = 1, limit = 20 } = req.query;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const skip = (Number(page) - 1) * Number(limit);
    
    const reviews = await Review.find({ 
      user: userId, 
      isActive: true,
      moderationStatus: 'approved' // Only show approved reviews to users
    })
      .populate('store', 'name logo location.address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Review.countDocuments({ 
      user: userId, 
      isActive: true,
      moderationStatus: 'approved'
    });

    sendSuccess(res, {
      reviews,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalReviews: total,
        hasNextPage: skip + reviews.length < total,
        hasPrevPage: Number(page) > 1
      }
    });

  } catch (error) {
    console.error('Get user reviews error:', error);
    throw new AppError('Failed to fetch user reviews', 500);
  }
});

// Check if user can review store
export const canUserReviewStore = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const hasReviewed = await Review.hasUserReviewed(storeId, userId);
    
    sendSuccess(res, {
      canReview: !hasReviewed,
      hasReviewed
    });

  } catch (error) {
    console.error('Check user review eligibility error:', error);
    throw new AppError('Failed to check review eligibility', 500);
  }
});