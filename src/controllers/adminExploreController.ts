import { Request, Response } from 'express';
import { Review } from '../models/Review';
import { StoreComparison } from '../models/StoreComparison';
import { Store } from '../models/Store';
import { Activity } from '../models/Activity';
import { MallOffer } from '../models/MallOffer';
import {
  sendSuccess,
  sendNotFound,
  sendBadRequest
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// Get admin explore dashboard stats
export const getExploreDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get counts
    const [
      totalReviews,
      featuredReviews,
      verifiedReviews,
      totalComparisons,
      featuredComparisons,
      activeDeals,
      totalStores,
      todayActivities
    ] = await Promise.all([
      Review.countDocuments({ isActive: true }),
      Review.countDocuments({ isActive: true, isFeaturedOnExplore: true }),
      Review.countDocuments({ isActive: true, verified: true }),
      StoreComparison.countDocuments({}),
      StoreComparison.countDocuments({ isFeaturedOnExplore: true }),
      MallOffer.countDocuments({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } }),
      Store.countDocuments({ isActive: true }),
      Activity.countDocuments({ createdAt: { $gte: todayStart } })
    ]);

    sendSuccess(res, {
      reviews: {
        total: totalReviews,
        featured: featuredReviews,
        verified: verifiedReviews
      },
      comparisons: {
        total: totalComparisons,
        featured: featuredComparisons
      },
      deals: {
        active: activeDeals
      },
      stores: {
        total: totalStores
      },
      activity: {
        today: todayActivities
      }
    }, 'Admin explore stats retrieved successfully');
  } catch (error) {
    console.error('Get admin explore stats error:', error);
    throw new AppError('Failed to fetch admin explore stats', 500);
  }
});

// Get featured reviews for explore page management
export const getFeaturedReviews = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query;

  try {
    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      Review.find({ isActive: true, isFeaturedOnExplore: true })
        .populate('user', 'profile.name profile.avatar')
        .populate('store', 'name logo')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Review.countDocuments({ isActive: true, isFeaturedOnExplore: true })
    ]);

    sendSuccess(res, {
      reviews,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit)
      }
    }, 'Featured reviews retrieved successfully');
  } catch (error) {
    console.error('Get featured reviews error:', error);
    throw new AppError('Failed to fetch featured reviews', 500);
  }
});

// Toggle review featured status on explore page
export const toggleReviewFeatured = asyncHandler(async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const { featured } = req.body;

  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      throw new AppError('Review not found', 404);
    }

    review.isFeaturedOnExplore = featured !== undefined ? featured : !review.isFeaturedOnExplore;
    await review.save();

    sendSuccess(res, {
      review: {
        id: review._id,
        isFeaturedOnExplore: review.isFeaturedOnExplore
      }
    }, `Review ${review.isFeaturedOnExplore ? 'featured' : 'unfeatured'} on explore page`);
  } catch (error) {
    console.error('Toggle review featured error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to toggle review featured status', 500);
  }
});

// Get featured comparisons for explore page management
export const getFeaturedComparisons = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query;

  try {
    const skip = (Number(page) - 1) * Number(limit);

    const [comparisons, total] = await Promise.all([
      StoreComparison.find({ isFeaturedOnExplore: true })
        .populate('stores', 'name logo cashbackRate ratings')
        .populate('user', 'profile.name')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      StoreComparison.countDocuments({ isFeaturedOnExplore: true })
    ]);

    sendSuccess(res, {
      comparisons,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit)
      }
    }, 'Featured comparisons retrieved successfully');
  } catch (error) {
    console.error('Get featured comparisons error:', error);
    throw new AppError('Failed to fetch featured comparisons', 500);
  }
});

// Toggle comparison featured status on explore page
export const toggleComparisonFeatured = asyncHandler(async (req: Request, res: Response) => {
  const { comparisonId } = req.params;
  const { featured } = req.body;

  try {
    const comparison = await StoreComparison.findById(comparisonId);

    if (!comparison) {
      throw new AppError('Comparison not found', 404);
    }

    comparison.isFeaturedOnExplore = featured !== undefined ? featured : !comparison.isFeaturedOnExplore;
    await comparison.save();

    sendSuccess(res, {
      comparison: {
        id: comparison._id,
        isFeaturedOnExplore: comparison.isFeaturedOnExplore
      }
    }, `Comparison ${comparison.isFeaturedOnExplore ? 'featured' : 'unfeatured'} on explore page`);
  } catch (error) {
    console.error('Toggle comparison featured error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to toggle comparison featured status', 500);
  }
});

// Get reviews eligible for featuring (verified, high rating)
export const getEligibleReviews = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, minRating = 4 } = req.query;

  try {
    const skip = (Number(page) - 1) * Number(limit);

    const query = {
      isActive: true,
      verified: true,
      rating: { $gte: Number(minRating) },
      isFeaturedOnExplore: false,
      moderationStatus: 'approved'
    };

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('user', 'profile.name profile.avatar')
        .populate('store', 'name logo')
        .sort({ rating: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Review.countDocuments(query)
    ]);

    sendSuccess(res, {
      reviews,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total,
        limit: Number(limit)
      }
    }, 'Eligible reviews retrieved successfully');
  } catch (error) {
    console.error('Get eligible reviews error:', error);
    throw new AppError('Failed to fetch eligible reviews', 500);
  }
});

// Bulk feature/unfeature reviews
export const bulkToggleReviewsFeatured = asyncHandler(async (req: Request, res: Response) => {
  const { reviewIds, featured } = req.body;

  if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
    throw new AppError('Review IDs array is required', 400);
  }

  try {
    const result = await Review.updateMany(
      { _id: { $in: reviewIds } },
      { isFeaturedOnExplore: featured }
    );

    sendSuccess(res, {
      modifiedCount: result.modifiedCount
    }, `${result.modifiedCount} reviews ${featured ? 'featured' : 'unfeatured'} successfully`);
  } catch (error) {
    console.error('Bulk toggle reviews featured error:', error);
    throw new AppError('Failed to bulk update reviews', 500);
  }
});
