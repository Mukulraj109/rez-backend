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

// Get reviews for a store
export const getStoreReviews = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const { 
    page = 1, 
    limit = 20, 
    rating, 
    sortBy = 'newest' 
  } = req.query;

  try {
    const query: any = { 
      store: storeId, 
      isActive: true 
    };

    // Filter by rating if provided
    if (rating) {
      query.rating = Number(rating);
    }

    // Sorting options
    let sort: any = {};
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
    
    const reviews = await Review.find(query)
      .populate('user', 'profile.name profile.avatar')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Review.countDocuments(query);

    // Get rating statistics
    const ratingStats = await Review.getStoreRatingStats(storeId);

    sendSuccess(res, {
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

    // Create new review
    const review = new Review({
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
    const ratingStats = await Review.getStoreRatingStats(storeId);
    await Store.findByIdAndUpdate(storeId, {
      'ratings.average': ratingStats.average,
      'ratings.count': ratingStats.count,
      'ratings.distribution': ratingStats.distribution
    });

    // Populate user info for response
    await review.populate('user', 'profile.name profile.avatar');

    sendCreated(res, {
      review
    }, 'Review created successfully');

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

    // Update review
    review.rating = rating || review.rating;
    review.title = title || review.title;
    review.comment = comment || review.comment;
    review.images = images || review.images;

    await review.save();

    // Update store rating statistics
    const ratingStats = await Review.getStoreRatingStats(review.store.toString());
    await Store.findByIdAndUpdate(review.store, {
      'ratings.average': ratingStats.average,
      'ratings.count': ratingStats.count,
      'ratings.distribution': ratingStats.distribution
    });

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
      isActive: true 
    })
      .populate('store', 'name logo location.address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Review.countDocuments({ 
      user: userId, 
      isActive: true 
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