import { Request, Response } from 'express';
import { Activity } from '../models/Activity';
import { Store } from '../models/Store';
import { Review } from '../models/Review';
import { StoreComparison } from '../models/StoreComparison';
import {
  sendSuccess,
  sendNotFound
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { MallOffer } from '../models/MallOffer';

// Get live stats for explore page
export const getExploreStats = asyncHandler(async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get active users (activities in last 30 minutes)
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const activeUsersCount = await Activity.countDocuments({
      createdAt: { $gte: thirtyMinutesAgo }
    });

    // Get total earned today (from activities with amount)
    const todayEarnings = await Activity.aggregate([
      {
        $match: {
          createdAt: { $gte: todayStart },
          amount: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Get active deals count
    const activeDealsCount = await MallOffer.countDocuments({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    });

    // Get nearby people (unique users active in last hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const nearbyPeopleCount = await Activity.distinct('user', {
      createdAt: { $gte: oneHourAgo }
    });

    // Get people who earned today
    const peopleEarnedToday = await Activity.distinct('user', {
      createdAt: { $gte: todayStart },
      amount: { $gt: 0 }
    });

    sendSuccess(res, {
      activeUsers: Math.max(activeUsersCount, 10), // Minimum 10 for display
      earnedToday: todayEarnings[0]?.total || 0,
      dealsLive: activeDealsCount || 50,
      peopleNearby: nearbyPeopleCount.length || 15,
      peopleEarnedToday: peopleEarnedToday.length || 0
    }, 'Explore stats retrieved successfully');
  } catch (error) {
    console.error('Get explore stats error:', error);
    throw new AppError('Failed to fetch explore stats', 500);
  }
});

// Get verified reviews for explore page
export const getVerifiedReviews = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 5, page = 1 } = req.query;
  const limitNum = Number(limit);
  const pageNum = Number(page);
  const skip = (pageNum - 1) * limitNum;

  try {
    // Get total count for pagination
    const total = await Review.countDocuments({
      verified: true,
      isActive: true,
      moderationStatus: 'approved'
    });

    const reviews = await Review.find({
      verified: true,
      isActive: true,
      moderationStatus: 'approved'
    })
      .populate('user', 'profile.name profile.avatar')
      .populate('store', 'name logo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Transform for frontend
    const transformedReviews = reviews.map((review: any) => ({
      id: review._id,
      user: review.user?.profile?.name || 'Anonymous',
      avatar: review.user?.profile?.avatar,
      rating: review.rating,
      review: review.comment,
      store: review.store?.name || 'Unknown Store',
      storeId: review.store?._id,
      storeLogo: review.store?.logo,
      cashback: 0, // Will be calculated from transactions if needed
      verified: review.verified,
      time: getTimeAgo(review.createdAt)
    }));

    const hasMore = skip + reviews.length < total;

    sendSuccess(res, {
      reviews: transformedReviews,
      total,
      hasMore,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    }, 'Verified reviews retrieved successfully');
  } catch (error) {
    console.error('Get verified reviews error:', error);
    throw new AppError('Failed to fetch verified reviews', 500);
  }
});

// Get featured comparison for explore page
export const getFeaturedComparison = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get a recent comparison that has multiple stores
    const comparison = await StoreComparison.findOne({})
      .populate('stores', 'name logo description location ratings cashbackRate operationalInfo')
      .sort({ updatedAt: -1 })
      .lean();

    if (!comparison) {
      return sendSuccess(res, { comparison: null }, 'No featured comparison available');
    }

    sendSuccess(res, {
      comparison
    }, 'Featured comparison retrieved successfully');
  } catch (error) {
    console.error('Get featured comparison error:', error);
    throw new AppError('Failed to fetch featured comparison', 500);
  }
});

// Get friends activity for explore page
export const getFriendsActivity = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { limit = 10 } = req.query;

  try {
    // Get recent activities
    const activities = await Activity.find({})
      .populate('user', 'profile.name profile.avatar')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // Transform activities for frontend
    const transformedActivities = activities.map((activity: any) => ({
      id: activity._id,
      type: activity.type?.toLowerCase() || 'order',
      user: activity.user ? {
        name: activity.user.profile?.name || 'User',
        avatar: activity.user.profile?.avatar
      } : null,
      message: activity.description || activity.title,
      store: activity.metadata?.storeName,
      amount: activity.amount,
      time: getTimeAgo(activity.createdAt),
      isFriend: false // Would need Follow model to determine
    }));

    sendSuccess(res, {
      activities: transformedActivities
    }, 'Friends activity retrieved successfully');
  } catch (error) {
    console.error('Get friends activity error:', error);
    throw new AppError('Failed to fetch friends activity', 500);
  }
});

// Get explore page stats summary (partner stores, cashback, etc)
export const getExploreStatsSummary = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get partner stores count
    const partnerStoresCount = await Store.countDocuments({ isActive: true });

    // Get max cashback rate
    const maxCashbackStore = await Store.findOne({ isActive: true })
      .sort({ 'offers.cashback': -1 })
      .select('offers.cashback')
      .lean();

    // Get total users (from activities)
    const totalUsers = await Activity.distinct('user');

    sendSuccess(res, {
      partnerStores: partnerStoresCount || 1000,
      maxCashback: maxCashbackStore?.offers?.cashback || 25,
      totalUsers: totalUsers.length || 50000
    }, 'Explore stats summary retrieved successfully');
  } catch (error) {
    console.error('Get explore stats summary error:', error);
    throw new AppError('Failed to fetch explore stats summary', 500);
  }
});

// Helper function to get time ago string
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
}
