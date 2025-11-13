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
import achievementService from '../services/achievementService';
import { sendCreated } from '../utils/response';

// Create a new video
export const createVideo = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const {
    title,
    description,
    videoUrl,
    thumbnailUrl,
    category,
    contentType,
    associatedArticle,
    tags,
    products,
    duration,
    isPublic = true
  } = req.body;

  try {
    console.log('🎥 [VIDEO] Creating video for user:', userId);

    // Validate required fields
    if (!title || !videoUrl) {
      return sendBadRequest(res, 'Title and video URL are required');
    }

    // Create new video
    const video = new Video({
      title,
      description: description || '',
      videoUrl,
      thumbnail: thumbnailUrl || '',
      creator: userId,
      contentType: contentType || 'ugc',
      category: category || 'general',
      associatedArticle: associatedArticle || undefined,
      tags: tags || [],
      hashtags: tags || [], // Use tags for hashtags as well
      products: products || [],
      stores: [], // Empty stores array for now
      isPublished: isPublic,
      isApproved: true, // Auto-approve for now
      isFeatured: false,
      isTrending: false,
      isSponsored: false,
      moderationStatus: 'approved',
      analytics: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        engagement: 0
      },
      engagement: {
        views: 0,
        likes: [],
        shares: 0
      },
      metadata: {
        duration: duration || 0,
        fileSize: 0,
        resolution: '1080p',
        format: 'mp4',
        uploadedAt: new Date(),
        lastModified: new Date()
      },
      processing: {
        status: 'completed',
        progress: 100,
        startedAt: new Date(),
        completedAt: new Date(),
        error: null
      }
    });

    await video.save();

    console.log('✅ [VIDEO] Video created successfully:', video._id);

    // Trigger achievement update for video creation
    try {
      await achievementService.triggerAchievementUpdate(userId, 'video_created');
    } catch (error) {
      console.error('❌ [VIDEO] Error triggering achievement update:', error);
    }

    // Populate creator info for response
    await video.populate('creator', 'profile.firstName profile.lastName profile.avatar');

    sendCreated(res, {
      video: {
        id: video._id,
        title: video.title,
        description: video.description,
        videoUrl: video.videoUrl,
        thumbnail: video.thumbnail,
        category: video.category,
        tags: video.tags,
        duration: video.metadata.duration,
        isPublished: video.isPublished,
        creator: video.creator,
        analytics: video.analytics,
        createdAt: video.createdAt
      }
    }, 'Video created successfully');

  } catch (error) {
    console.error('❌ [VIDEO] Create video error:', error);
    throw new AppError('Failed to create video', 500);
  }
});

// Get all videos with filtering
export const getVideos = asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    creator,
    contentType,
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
    if (contentType) query.contentType = contentType;
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
      .populate({
        path: 'products',
        select: 'name images description price inventory rating category store',
        populate: {
          path: 'store',
          select: 'name slug logo'
        }
      })
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
      .populate({
        path: 'products',
        select: 'name images description price pricing inventory rating category store',
        populate: {
          path: 'store',
          select: 'name slug logo'
        }
      })
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
      .populate({
        path: 'products',
        select: 'name images description price inventory rating category store',
        populate: {
          path: 'store',
          select: 'name slug logo'
        }
      })
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
    .populate({
      path: 'products',
      select: 'name images description pricing inventory rating category store',
      populate: {
        path: 'store',
        select: 'name slug logo'
      }
    })
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
      .populate({
        path: 'products',
        select: 'name images description price inventory rating category store',
        populate: {
          path: 'store',
          select: 'name slug logo'
        }
      })
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

// Get videos by store
export const getVideosByStore = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const { type, limit = 20, offset = 0 } = req.query;

  try {
    console.log('🎥 [VIDEO] Fetching videos for store:', storeId);

    // Check if storeId is a valid ObjectId format (24 hex characters)
    // If not, return empty results immediately since stores field only accepts ObjectIds
    if (!mongoose.Types.ObjectId.isValid(storeId) || !/^[0-9a-fA-F]{24}$/.test(storeId)) {
      console.log(`ℹ️ [VIDEO] Store ID "${storeId}" is not a valid ObjectId format, returning empty array`);
      return sendSuccess(res, {
        content: [],
        total: 0
      }, 'Videos retrieved successfully');
    }

    // Build query with valid ObjectId
    const query: any = {
      isPublished: true,
      isApproved: true,
      moderationStatus: 'approved',
      stores: new mongoose.Types.ObjectId(storeId)
    };

    // Filter by type if specified
    if (type === 'video') {
      query.contentType = { $in: ['ugc', 'merchant'] };
    }

    const videos = await Video.find(query)
      .populate('creator', 'profile.firstName profile.lastName profile.avatar')
      .populate({
        path: 'products',
        select: 'name images description price inventory rating category store',
        populate: {
          path: 'store',
          select: 'name slug logo'
        }
      })
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .lean();

    const total = await Video.countDocuments(query);

    console.log(`✅ [VIDEO] Found ${videos.length} videos for store ${storeId}`);

    // Return empty array if no videos found (not an error)
    if (videos.length === 0) {
      console.log(`ℹ️ [VIDEO] No videos found for store ${storeId}, returning empty array`);
    }

    // Transform videos to match UGC API format
    const content = videos.map((video: any) => ({
      _id: video._id,
      userId: video.creator?._id || video.creator,
      user: {
        _id: video.creator?._id || video.creator,
        profile: video.creator?.profile || { firstName: '', lastName: '', avatar: '' }
      },
      type: 'video',
      url: video.videoUrl,
      thumbnail: video.thumbnail,
      caption: video.description,
      tags: video.tags || [],
      relatedProduct: video.products?.[0] || null,
      relatedStore: video.stores?.[0] ? {
        _id: video.stores[0],
        name: '',
        logo: ''
      } : null,
      likes: video.analytics?.likes || video.engagement?.likes?.length || 0,
      comments: video.analytics?.comments || video.engagement?.comments || 0,
      shares: video.analytics?.shares || video.engagement?.shares || 0,
      views: video.analytics?.totalViews || video.analytics?.views || video.engagement?.views || 0,
      isLiked: false,
      isBookmarked: false,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt
    }));

    sendSuccess(res, {
      content,
      total
    }, 'Videos retrieved successfully');

  } catch (error) {
    console.error('❌ [VIDEO] Get videos by store error:', error);
    throw new AppError('Failed to fetch store videos', 500);
  }
});

// Report video
export const reportVideo = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const { reason, details } = req.body;
  const userId = req.userId!;

  try {
    const video = await Video.findById(videoId);

    if (!video) {
      return sendNotFound(res, 'Video not found');
    }

    // Use the reportVideo method from the model
    await video.reportVideo(userId, reason, details);

    console.log(`✅ [VIDEO] Video ${videoId} reported by user ${userId} for reason: ${reason}`);

    sendSuccess(res, {
      videoId: video._id,
      reportCount: video.reportCount,
      isReported: video.isReported
    }, 'Video reported successfully. Thank you for helping keep our community safe.');

  } catch (error) {
    console.error('❌ [VIDEO] Report video error:', error);
    throw new AppError('Failed to report video', 500);
  }
});