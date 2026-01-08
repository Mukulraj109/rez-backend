import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Video } from '../models/Video';
import { Product } from '../models/Product';
import Follow from '../models/Follow';
import {
  sendSuccess,
  sendNotFound,
  sendError,
  sendPaginated
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import redisService from '../services/redisService';
import { CacheTTL } from '../config/redis';

// Cache key helpers
const CACHE_KEYS = {
  featuredCreators: (limit: number) => `creators:featured:${limit}`,
  creatorProfile: (id: string) => `creators:profile:${id}`,
  creatorPicks: (id: string, limit: number) => `creators:picks:${id}:${limit}`,
  trendingPicks: (limit: number, category?: string) => `creators:trending-picks:${limit}:${category || 'all'}`,
};

/**
 * Get featured creators
 * Aggregates users with most video engagement
 * GET /api/creators/featured
 */
export const getFeaturedCreators = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 6 } = req.query;
  const limitNum = Number(limit);

  // Try cache first
  const cacheKey = CACHE_KEYS.featuredCreators(limitNum);
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    console.log('[CREATORS] Returning featured creators from cache');
    return sendSuccess(res, cached, 'Featured creators fetched');
  }

  try {
    // Aggregate videos to find top creators by engagement
    const creatorStats = await Video.aggregate([
      {
        $match: {
          isPublished: true,
          moderationStatus: 'approved'
        }
      },
      {
        $group: {
          _id: '$creator',
          totalViews: { $sum: '$engagement.views' },
          totalLikes: { $sum: { $size: { $ifNull: ['$engagement.likes', []] } } },
          totalShares: { $sum: '$engagement.shares' },
          totalPicks: { $sum: 1 },
          avgEngagementRate: { $avg: '$analytics.engagementRate' }
        }
      },
      {
        $sort: { totalViews: -1, totalPicks: -1 }
      },
      {
        $limit: limitNum
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $lookup: {
          from: 'follows',
          let: { creatorId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$following', '$$creatorId'] }
              }
            },
            {
              $count: 'count'
            }
          ],
          as: 'followers'
        }
      },
      {
        $project: {
          id: '$_id',
          name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$user.profile.firstName', ''] },
                  ' ',
                  { $ifNull: ['$user.profile.lastName', ''] }
                ]
              }
            }
          },
          avatar: { $ifNull: ['$user.profile.avatar', 'https://i.pravatar.cc/150?img=1'] },
          bio: '$user.profile.bio',
          verified: { $eq: ['$user.auth.isVerified', true] },
          rating: {
            $round: [
              { $min: [5, { $max: [1, { $divide: [{ $ifNull: ['$avgEngagementRate', 50] }, 20] }] }] },
              1
            ]
          },
          totalPicks: 1,
          totalViews: 1,
          totalLikes: 1,
          followers: { $ifNull: [{ $arrayElemAt: ['$followers.count', 0] }, 0] }
        }
      }
    ]);

    // If no creators found via videos, get verified users as fallback
    let creators = creatorStats;
    if (creators.length === 0) {
      const verifiedUsers = await User.find({
        'auth.isVerified': true,
        isActive: true
      })
        .select('profile.firstName profile.lastName profile.avatar profile.bio auth.isVerified')
        .limit(limitNum)
        .lean();

      creators = verifiedUsers.map((user: any) => ({
        id: user._id,
        name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || 'ReZ Creator',
        avatar: user.profile?.avatar || 'https://i.pravatar.cc/150?img=1',
        bio: user.profile?.bio || '',
        verified: true,
        rating: 4.5,
        totalPicks: 0,
        totalViews: 0,
        followers: 0
      }));
    }

    const responseData = {
      creators,
      total: creators.length
    };

    // Cache for 5 minutes
    await redisService.set(cacheKey, responseData, 300);

    return sendSuccess(res, responseData, 'Featured creators fetched');
  } catch (error: any) {
    console.error('[CREATORS] Error fetching featured creators:', error);
    return sendError(res, error.message || 'Failed to fetch featured creators', 500);
  }
});

/**
 * Get creator by ID
 * GET /api/creators/:id
 */
export const getCreatorById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Try cache first
  const cacheKey = CACHE_KEYS.creatorProfile(id);
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    return sendSuccess(res, cached, 'Creator fetched');
  }

  try {
    const user = await User.findById(id)
      .select('profile auth wallet createdAt')
      .lean();

    if (!user) {
      return sendNotFound(res, 'Creator not found');
    }

    // Get video stats
    const videoStats = await Video.aggregate([
      {
        $match: {
          creator: new mongoose.Types.ObjectId(id),
          isPublished: true
        }
      },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: '$engagement.views' },
          totalLikes: { $sum: { $size: { $ifNull: ['$engagement.likes', []] } } },
          totalShares: { $sum: '$engagement.shares' }
        }
      }
    ]);

    // Get follower count
    const followerCount = await Follow.countDocuments({ following: id });

    const creator = {
      id: user._id,
      name: `${(user as any).profile?.firstName || ''} ${(user as any).profile?.lastName || ''}`.trim() || 'ReZ Creator',
      avatar: (user as any).profile?.avatar || 'https://i.pravatar.cc/150?img=1',
      bio: (user as any).profile?.bio || '',
      verified: (user as any).auth?.isVerified || false,
      joinedAt: (user as any).createdAt,
      stats: {
        totalVideos: videoStats[0]?.totalVideos || 0,
        totalViews: videoStats[0]?.totalViews || 0,
        totalLikes: videoStats[0]?.totalLikes || 0,
        totalShares: videoStats[0]?.totalShares || 0,
        followers: followerCount
      }
    };

    // Cache for 10 minutes
    await redisService.set(cacheKey, creator, 600);

    return sendSuccess(res, creator, 'Creator fetched');
  } catch (error: any) {
    console.error('[CREATORS] Error fetching creator:', error);
    return sendError(res, error.message || 'Failed to fetch creator', 500);
  }
});

/**
 * Get creator's product picks
 * GET /api/creators/:id/picks
 */
export const getCreatorPicks = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { limit = 10 } = req.query;
  const limitNum = Number(limit);

  // Try cache first
  const cacheKey = CACHE_KEYS.creatorPicks(id, limitNum);
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    return sendSuccess(res, cached, 'Creator picks fetched');
  }

  try {
    // Verify creator exists
    const user = await User.findById(id).select('_id').lean();
    if (!user) {
      return sendNotFound(res, 'Creator not found');
    }

    // Get videos with associated products
    const videos = await Video.find({
      creator: id,
      isPublished: true,
      'products.0': { $exists: true }
    })
      .populate({
        path: 'products',
        select: 'name pricing images brand tags',
        model: 'Product'
      })
      .sort({ 'engagement.views': -1 })
      .limit(limitNum)
      .lean();

    const picks = videos.map((video: any) => {
      const product = video.products?.[0];
      return {
        id: video._id,
        title: video.title?.substring(0, 30) + (video.title?.length > 30 ? '...' : '') || 'Product Pick',
        productImage: product?.images?.[0] || video.thumbnail,
        productPrice: product?.pricing?.selling || product?.pricing?.original || 0,
        productBrand: product?.brand || '',
        tag: video.hashtags?.[0] || '#picks',
        views: video.engagement?.views || 0,
        purchases: video.engagement?.shares || 0
      };
    });

    const responseData = {
      picks,
      total: picks.length
    };

    // Cache for 5 minutes
    await redisService.set(cacheKey, responseData, 300);

    return sendSuccess(res, responseData, 'Creator picks fetched');
  } catch (error: any) {
    console.error('[CREATORS] Error fetching creator picks:', error);
    return sendError(res, error.message || 'Failed to fetch creator picks', 500);
  }
});

/**
 * Get trending picks from all creators
 * GET /api/creators/trending-picks
 */
export const getTrendingPicks = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10, category } = req.query;
  const limitNum = Number(limit);

  // Try cache first
  const cacheKey = CACHE_KEYS.trendingPicks(limitNum, category as string);
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    return sendSuccess(res, cached, 'Trending picks fetched');
  }

  try {
    // Build query
    const query: any = {
      isPublished: true,
      moderationStatus: 'approved',
      'products.0': { $exists: true }
    };

    if (category) {
      query.category = category;
    }

    // Get trending videos with products
    const videos = await Video.find(query)
      .populate({
        path: 'products',
        select: 'name pricing images brand tags category',
        model: 'Product'
      })
      .populate({
        path: 'creator',
        select: 'profile.firstName profile.lastName profile.avatar auth.isVerified',
        model: 'User'
      })
      .sort({ 'engagement.views': -1, 'engagement.likes': -1 })
      .limit(limitNum)
      .lean();

    const picks = videos.map((video: any) => {
      const product = video.products?.[0];
      const creator = video.creator;
      return {
        id: video._id,
        title: video.title?.substring(0, 30) + (video.title?.length > 30 ? '...' : '') || 'Trending Pick',
        productImage: product?.images?.[0] || video.thumbnail,
        productPrice: product?.pricing?.selling || product?.pricing?.original || 0,
        productBrand: product?.brand || '',
        tag: video.hashtags?.[0] || '#trending',
        views: video.engagement?.views || 0,
        purchases: video.engagement?.shares || 0,
        creator: creator ? {
          id: creator._id,
          name: `${creator.profile?.firstName || ''} ${creator.profile?.lastName || ''}`.trim(),
          avatar: creator.profile?.avatar,
          verified: creator.auth?.isVerified || false
        } : null
      };
    });

    const responseData = {
      picks,
      total: picks.length
    };

    // Cache for 5 minutes
    await redisService.set(cacheKey, responseData, 300);

    return sendSuccess(res, responseData, 'Trending picks fetched');
  } catch (error: any) {
    console.error('[CREATORS] Error fetching trending picks:', error);
    return sendError(res, error.message || 'Failed to fetch trending picks', 500);
  }
});

/**
 * Get creator stats
 * GET /api/creators/:id/stats
 */
export const getCreatorStats = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Check if creator exists
    const user = await User.findById(id).select('_id').lean();
    if (!user) {
      return sendNotFound(res, 'Creator not found');
    }

    // Get comprehensive stats
    const [videoStats, followerCount, followingCount] = await Promise.all([
      Video.aggregate([
        {
          $match: {
            creator: new mongoose.Types.ObjectId(id),
            isPublished: true
          }
        },
        {
          $group: {
            _id: null,
            totalVideos: { $sum: 1 },
            totalViews: { $sum: '$engagement.views' },
            totalLikes: { $sum: { $size: { $ifNull: ['$engagement.likes', []] } } },
            totalShares: { $sum: '$engagement.shares' },
            totalComments: { $sum: '$engagement.comments' },
            avgEngagement: { $avg: '$analytics.engagementRate' }
          }
        }
      ]),
      Follow.countDocuments({ following: id }),
      Follow.countDocuments({ follower: id })
    ]);

    const stats = {
      videos: videoStats[0]?.totalVideos || 0,
      views: videoStats[0]?.totalViews || 0,
      likes: videoStats[0]?.totalLikes || 0,
      shares: videoStats[0]?.totalShares || 0,
      comments: videoStats[0]?.totalComments || 0,
      engagementRate: Math.round(videoStats[0]?.avgEngagement || 0),
      followers: followerCount,
      following: followingCount
    };

    return sendSuccess(res, stats, 'Creator stats fetched');
  } catch (error: any) {
    console.error('[CREATORS] Error fetching creator stats:', error);
    return sendError(res, error.message || 'Failed to fetch creator stats', 500);
  }
});
