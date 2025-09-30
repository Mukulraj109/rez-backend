import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Video } from '../models/Video';
import { User } from '../models/User';
import { 
  sendSuccess, 
  sendNotFound, 
  sendBadRequest 
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// Get all videos with filtering
export const getVideos = asyncHandler(async (req: Request, res: Response) => {
  const { 
    category, 
    creator, 
    hasProducts, 
    search, 
    sortBy = 'newest', 
    page = 1, 
    limit = 20 
  } = req.query;

  try {
    const query: any = {
      isPublished: true,
      isApproved: true,
      moderationStatus: 'approved'
    };
    
    // Apply filters
    if (category) query.category = category;
    if (creator) query.creator = creator;
    if (hasProducts === 'true') {
      query['products.0'] = { $exists: true };
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search as string, 'i')] } }
      ];
    }

    // Sorting
    const sortOptions: any = {};
    switch (sortBy) {
      case 'newest':
        sortOptions.createdAt = -1;
        break;
      case 'popular':
        sortOptions['analytics.views'] = -1;
        break;
      case 'trending':
        sortOptions['analytics.engagement'] = -1;
        break;
      case 'likes':
        sortOptions['analytics.likes'] = -1;
        break;
      default:
        sortOptions.createdAt = -1;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const videos = await Video.find(query)
      .populate('creator', 'profile.firstName profile.lastName profile.avatar')
      .populate('products', 'name basePrice images')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Video.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      videos,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Videos retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch videos', 500);
  }
});

// Get single video by ID
export const getVideoById = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const userId = req.userId;

  try {
    const video = await Video.findOne({ _id: videoId, isPublished: true, isApproved: true })
      .populate('creator', 'profile.firstName profile.lastName profile.avatar profile.bio')
      .populate('products', 'name basePrice salePrice images description store')
      .populate('products.store', 'name slug')
      .lean();

    if (!video) {
      return sendNotFound(res, 'Video not found');
    }

    // Increment view count
    await Video.findByIdAndUpdate(videoId, {
      $inc: { 'analytics.views': 1 }
    });

    // Get creator's other videos
    const otherVideos = await Video.find({
      creator: (video as any).creator._id,
      _id: { $ne: videoId },
      isPublished: true
    })
    .populate('creator', 'profile.firstName profile.lastName profile.avatar')
    .limit(10)
    .sort({ createdAt: -1 })
    .lean();

    sendSuccess(res, {
      video,
      otherVideos,
      isLiked: false, // TODO: Check if user liked the video
      isFollowing: false // TODO: Check if user follows the creator
    }, 'Video retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch video', 500);
  }
});

// Get videos by category
export const getVideosByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  const { page = 1, limit = 20, sortBy = 'newest' } = req.query;

  try {
    const query = { 
      category, 
      isPublished: true 
    };

    const sortOptions: any = {};
    switch (sortBy) {
      case 'newest':
        sortOptions.createdAt = -1;
        break;
      case 'popular':
        sortOptions['analytics.views'] = -1;
        break;
      case 'trending':
        sortOptions['analytics.engagement'] = -1;
        break;
      default:
        sortOptions.createdAt = -1;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const videos = await Video.find(query)
      .populate('creator', 'profile.firstName profile.lastName profile.avatar')
      .populate('products', 'name basePrice images')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Video.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      videos,
      category,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, `Videos in category "${category}" retrieved successfully`);

  } catch (error) {
    throw new AppError('Failed to fetch videos by category', 500);
  }
});

// Get trending videos
export const getTrendingVideos = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 20, timeframe = '7d' } = req.query;

  try {
    // Calculate date for timeframe
    const days = timeframe === '1d' ? 1 : timeframe === '7d' ? 7 : 30;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const videos = await Video.find({
      isPublished: true,
      createdAt: { $gte: sinceDate }
    })
    .populate('creator', 'profile.firstName profile.lastName profile.avatar')
    .populate('products', 'name basePrice images')
    .sort({ 
      'analytics.engagement': -1,
      'analytics.views': -1,
      createdAt: -1
    })
    .limit(Number(limit))
    .lean();

    sendSuccess(res, videos, 'Trending videos retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch trending videos', 500);
  }
});

// Get videos by creator
export const getVideosByCreator = asyncHandler(async (req: Request, res: Response) => {
  const { creatorId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  try {
    const creator = await User.findById(creatorId).select('profile.firstName profile.lastName profile.avatar profile.bio');
    
    if (!creator) {
      return sendNotFound(res, 'Creator not found');
    }

    const query = { 
      creator: creatorId, 
      isPublished: true 
    };

    const skip = (Number(page) - 1) * Number(limit);

    const videos = await Video.find(query)
      .populate('creator', 'profile.firstName profile.lastName profile.avatar')
      .populate('products', 'name basePrice images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Video.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    // Get creator stats
    const creatorStats = await Video.aggregate([
      { $match: { creator: creator._id, isPublished: true, isApproved: true } },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: '$analytics.views' },
          totalLikes: { $sum: '$analytics.likes' },
          averageViews: { $avg: '$analytics.views' }
        }
      }
    ]);

    sendSuccess(res, {
      creator,
      videos,
      stats: creatorStats[0] || { totalVideos: 0, totalViews: 0, totalLikes: 0, averageViews: 0 },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Creator videos retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch creator videos', 500);
  }
});

// Like/Unlike video
export const toggleVideoLike = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const userId = req.userId!;

  try {
    const video = await Video.findById(videoId);
    
    if (!video) {
      return sendNotFound(res, 'Video not found');
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Check if user already liked the video
    const likedIndex = video.likedBy.findIndex(id => id.equals(userObjectId));
    let isLiked = false;

    if (likedIndex > -1) {
      // Unlike: remove user from likedBy array
      video.likedBy.splice(likedIndex, 1);
      video.analytics.likes = Math.max(0, video.analytics.likes - 1);
    } else {
      // Like: add user to likedBy array
      video.likedBy.push(userObjectId);
      video.analytics.likes += 1;
      isLiked = true;
    }

    // Update engagement score
    video.analytics.engagement = video.analytics.likes + video.analytics.comments + (video.analytics.shares || 0);

    await video.save();

    sendSuccess(res, {
      videoId: video._id,
      isLiked,
      totalLikes: video.analytics.likes
    }, isLiked ? 'Video liked successfully' : 'Video unliked successfully');

  } catch (error) {
    throw new AppError('Failed to toggle video like', 500);
  }
});

// Add comment to video
export const addVideoComment = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const { comment } = req.body;
  const userId = req.userId!;

  try {
    const video = await Video.findById(videoId);
    
    if (!video) {
      return sendNotFound(res, 'Video not found');
    }

    // Add comment
    video.comments.push({
      user: new mongoose.Types.ObjectId(userId),
      content: comment,
      timestamp: new Date()
    });

    // Update analytics
    video.analytics.comments += 1;
    video.analytics.engagement = video.analytics.likes + video.analytics.comments + (video.analytics.shares || 0);

    await video.save();

    // Get the added comment with user details
    const populatedVideo = await Video.findById(videoId)
      .populate('comments.user', 'profile.firstName profile.lastName profile.avatar')
      .select('comments')
      .lean();

    const addedComment = (populatedVideo as any).comments[(populatedVideo as any).comments.length - 1];

    sendSuccess(res, {
      comment: addedComment,
      totalComments: video.analytics.comments
    }, 'Comment added successfully', 201);

  } catch (error) {
    throw new AppError('Failed to add comment', 500);
  }
});

// Get video comments
export const getVideoComments = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  try {
    const video = await Video.findById(videoId)
      .populate('comments.user', 'profile.firstName profile.lastName profile.avatar')
      .select('comments')
      .lean();

    if (!video) {
      return sendNotFound(res, 'Video not found');
    }

    // Pagination for comments
    const skip = (Number(page) - 1) * Number(limit);
    const comments = (video as any).comments
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(skip, skip + Number(limit));

    const total = (video as any).comments.length;
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      comments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Video comments retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch video comments', 500);
  }
});

// Search videos
export const searchVideos = asyncHandler(async (req: Request, res: Response) => {
  const { q: searchText, page = 1, limit = 20, category, creator } = req.query;

  if (!searchText) {
    return sendBadRequest(res, 'Search query is required');
  }

  try {
    const query: any = {
      isPublished: true,
      $or: [
        { title: { $regex: searchText, $options: 'i' } },
        { description: { $regex: searchText, $options: 'i' } },
        { tags: { $in: [new RegExp(searchText as string, 'i')] } }
      ]
    };

    if (category) query.category = category;
    if (creator) query.creator = creator;

    const skip = (Number(page) - 1) * Number(limit);

    const videos = await Video.find(query)
      .populate('creator', 'profile.firstName profile.lastName profile.avatar')
      .populate('products', 'name basePrice images')
      .sort({ 
        'analytics.engagement': -1,
        'analytics.views': -1,
        createdAt: -1
      })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Video.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      videos,
      searchQuery: searchText,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Video search completed successfully');

  } catch (error) {
    throw new AppError('Failed to search videos', 500);
  }
});