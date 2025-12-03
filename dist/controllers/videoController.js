"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackVideoView = exports.toggleVideoBookmark = exports.reportVideo = exports.getVideosByStore = exports.searchVideos = exports.getVideoComments = exports.addVideoComment = exports.toggleVideoLike = exports.getVideosByCreator = exports.getTrendingVideos = exports.getVideosByCategory = exports.getVideoById = exports.getVideos = exports.createVideo = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Video_1 = require("../models/Video");
const User_1 = require("../models/User");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const achievementService_1 = __importDefault(require("../services/achievementService"));
const response_2 = require("../utils/response");
// Create a new video
exports.createVideo = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { title, description, videoUrl, thumbnailUrl, category, contentType, associatedArticle, tags, products, duration, isPublic = true } = req.body;
    try {
        console.log('🎥 [VIDEO] Creating video for user:', userId);
        // Validate required fields
        if (!title || !videoUrl) {
            return (0, response_1.sendBadRequest)(res, 'Title and video URL are required');
        }
        // Create new video
        const video = new Video_1.Video({
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
            await achievementService_1.default.triggerAchievementUpdate(userId, 'video_created');
        }
        catch (error) {
            console.error('❌ [VIDEO] Error triggering achievement update:', error);
        }
        // Populate creator info for response
        await video.populate('creator', 'profile.firstName profile.lastName profile.avatar');
        (0, response_2.sendCreated)(res, {
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
    }
    catch (error) {
        console.error('❌ [VIDEO] Create video error:', error);
        throw new errorHandler_1.AppError('Failed to create video', 500);
    }
});
// Get all videos with filtering
exports.getVideos = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category, creator, contentType, hasProducts, search, sortBy = 'newest', page = 1, limit = 20 } = req.query;
    try {
        const query = {
            isPublished: true,
            isApproved: true,
            moderationStatus: 'approved'
        };
        // Apply filters
        if (category)
            query.category = category;
        if (creator)
            query.creator = creator;
        if (contentType)
            query.contentType = contentType;
        if (hasProducts === 'true') {
            query['products.0'] = { $exists: true };
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }
        // Sorting
        const sortOptions = {};
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
        const videos = await Video_1.Video.find(query)
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
        const total = await Video_1.Video.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));
        (0, response_1.sendSuccess)(res, {
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
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch videos', 500);
    }
});
// Get single video by ID
exports.getVideoById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.userId;
    try {
        // First try to find the video - merchant videos don't need isPublished/isApproved
        const video = await Video_1.Video.findById(videoId)
            .populate('creator', 'profile.firstName profile.lastName profile.avatar profile.bio')
            .populate('stores', 'name slug logo')
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
            return (0, response_1.sendNotFound)(res, 'Video not found');
        }
        // For UGC content (not merchant), check publish/approval status
        const videoData = video;
        if (videoData.contentType !== 'merchant' && (!videoData.isPublished || !videoData.isApproved)) {
            return (0, response_1.sendNotFound)(res, 'Video not available');
        }
        // NOTE: View count is NOT incremented here - use the dedicated /videos/:id/view endpoint
        // This prevents double-counting when just fetching video data
        // Get the first store from stores array (for merchant videos)
        const primaryStore = videoData.stores && videoData.stores.length > 0 ? videoData.stores[0] : null;
        // Get related videos (same store for merchant, same creator for UGC)
        let otherVideos = [];
        if (videoData.contentType === 'merchant' && primaryStore) {
            // For merchant videos, get other videos from the same store
            otherVideos = await Video_1.Video.find({
                stores: primaryStore._id || primaryStore,
                _id: { $ne: videoId },
                contentType: 'merchant'
            })
                .populate('stores', 'name slug logo')
                .limit(10)
                .sort({ createdAt: -1 })
                .lean();
        }
        else if (videoData.creator) {
            // For UGC, get other videos from the same creator
            otherVideos = await Video_1.Video.find({
                creator: videoData.creator._id || videoData.creator,
                _id: { $ne: videoId },
                isPublished: true
            })
                .populate('creator', 'profile.firstName profile.lastName profile.avatar')
                .limit(10)
                .sort({ createdAt: -1 })
                .lean();
        }
        // Check if authenticated user has liked/bookmarked this video
        let userLiked = false;
        let userBookmarked = false;
        if (userId) {
            // Check likedBy array
            if (videoData.likedBy && Array.isArray(videoData.likedBy)) {
                userLiked = videoData.likedBy.some((id) => id && id.toString() === userId);
            }
            // Also check engagement.likes array (legacy)
            if (!userLiked && videoData.engagement?.likes && Array.isArray(videoData.engagement.likes)) {
                userLiked = videoData.engagement.likes.some((id) => id && id.toString() === userId);
            }
            // Check bookmarkedBy array
            if (videoData.bookmarkedBy && Array.isArray(videoData.bookmarkedBy)) {
                userBookmarked = videoData.bookmarkedBy.some((id) => id && id.toString() === userId);
            }
        }
        // Transform video to API response format
        const responseVideo = {
            id: videoData._id,
            title: videoData.title,
            description: videoData.description,
            videoUrl: videoData.videoUrl,
            thumbnail: videoData.thumbnail, // Use correct field name
            duration: videoData.metadata?.duration || 0,
            contentType: videoData.contentType,
            creator: videoData.creator ? {
                id: videoData.creator._id,
                name: videoData.creator.profile
                    ? `${videoData.creator.profile.firstName || ''} ${videoData.creator.profile.lastName || ''}`.trim()
                    : 'User',
                avatar: videoData.creator.profile?.avatar,
            } : primaryStore ? {
                id: primaryStore._id,
                name: primaryStore.name || 'Store',
                avatar: primaryStore.logo,
            } : null,
            metrics: {
                views: videoData.analytics?.totalViews || videoData.engagement?.views || 0,
                likes: videoData.analytics?.likes || (videoData.likedBy?.length || videoData.engagement?.likes?.length || 0),
                comments: videoData.analytics?.comments || videoData.engagement?.comments || 0,
                shares: videoData.analytics?.shares || videoData.engagement?.shares || 0,
            },
            engagement: {
                liked: userLiked,
                bookmarked: userBookmarked,
            },
            tags: videoData.tags || [],
            relatedProducts: (videoData.products || []).map((p) => ({
                id: p._id,
                name: p.name,
                price: p.pricing?.currentPrice || p.price || 0,
                thumbnail: p.images?.[0]?.url || p.images?.[0],
            })),
            createdAt: videoData.createdAt,
        };
        (0, response_1.sendSuccess)(res, {
            video: responseVideo,
            otherVideos: otherVideos.map((v) => ({
                id: v._id,
                title: v.title,
                thumbnail: v.thumbnail,
                duration: v.metadata?.duration || 0,
                views: v.analytics?.totalViews || v.engagement?.views || 0,
            })),
            isLiked: userLiked,
            isFollowing: false
        }, 'Video retrieved successfully');
    }
    catch (error) {
        console.error('Error fetching video:', error);
        throw new errorHandler_1.AppError('Failed to fetch video', 500);
    }
});
// Get videos by category
exports.getVideosByCategory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { category } = req.params;
    const { page = 1, limit = 20, sortBy = 'newest' } = req.query;
    try {
        const query = {
            category,
            isPublished: true
        };
        const sortOptions = {};
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
        const videos = await Video_1.Video.find(query)
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
        const total = await Video_1.Video.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));
        (0, response_1.sendSuccess)(res, {
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
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch videos by category', 500);
    }
});
// Get trending videos
exports.getTrendingVideos = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { limit = 20, timeframe = '7d' } = req.query;
    try {
        // Calculate date for timeframe
        const days = timeframe === '1d' ? 1 : timeframe === '7d' ? 7 : 30;
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);
        const videos = await Video_1.Video.find({
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
        (0, response_1.sendSuccess)(res, videos, 'Trending videos retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch trending videos', 500);
    }
});
// Get videos by creator
exports.getVideosByCreator = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { creatorId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    try {
        const creator = await User_1.User.findById(creatorId).select('profile.firstName profile.lastName profile.avatar profile.bio');
        if (!creator) {
            return (0, response_1.sendNotFound)(res, 'Creator not found');
        }
        const query = {
            creator: creatorId,
            isPublished: true
        };
        const skip = (Number(page) - 1) * Number(limit);
        const videos = await Video_1.Video.find(query)
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
        const total = await Video_1.Video.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));
        // Get creator stats
        const creatorStats = await Video_1.Video.aggregate([
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
        (0, response_1.sendSuccess)(res, {
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
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch creator videos', 500);
    }
});
// Like/Unlike video
exports.toggleVideoLike = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.userId;
    try {
        const video = await Video_1.Video.findById(videoId);
        if (!video) {
            return (0, response_1.sendNotFound)(res, 'Video not found');
        }
        const userObjectId = new mongoose_1.default.Types.ObjectId(userId);
        // Initialize arrays if they don't exist
        if (!video.likedBy) {
            video.likedBy = [];
        }
        if (!video.engagement) {
            video.engagement = { views: 0, likes: [], shares: 0, comments: 0, saves: 0, reports: 0 };
        }
        if (!video.engagement.likes) {
            video.engagement.likes = [];
        }
        // Check if user already liked the video (check both arrays)
        const likedInLikedBy = video.likedBy.some(id => id && id.equals(userObjectId));
        const likedInEngagement = video.engagement.likes.some((id) => id && id.equals(userObjectId));
        const wasLiked = likedInLikedBy || likedInEngagement;
        let isLiked = false;
        if (wasLiked) {
            // Unlike: remove user from BOTH arrays
            video.likedBy = video.likedBy.filter(id => !id || !id.equals(userObjectId));
            video.engagement.likes = video.engagement.likes.filter((id) => !id || !id.equals(userObjectId));
        }
        else {
            // Like: add user to BOTH arrays
            video.likedBy.push(userObjectId);
            video.engagement.likes.push(userObjectId);
            isLiked = true;
        }
        // Update analytics.likes count for consistency
        if (!video.analytics) {
            video.analytics = {};
        }
        video.analytics.likes = video.likedBy.length;
        // Get total likes from likedBy array length
        const totalLikes = video.likedBy.length;
        await video.save();
        console.log(`✅ [toggleVideoLike] User ${userId} ${isLiked ? 'liked' : 'unliked'} video ${videoId}. Total likes: ${totalLikes}`);
        (0, response_1.sendSuccess)(res, {
            videoId: video._id,
            isLiked,
            totalLikes
        }, isLiked ? 'Video liked successfully' : 'Video unliked successfully');
    }
    catch (error) {
        console.error('[toggleVideoLike] Error:', error);
        throw new errorHandler_1.AppError('Failed to toggle video like', 500);
    }
});
// Add comment to video
exports.addVideoComment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { videoId } = req.params;
    const { comment } = req.body;
    const userId = req.userId;
    try {
        const video = await Video_1.Video.findById(videoId);
        if (!video) {
            return (0, response_1.sendNotFound)(res, 'Video not found');
        }
        // Add comment
        video.comments.push({
            user: new mongoose_1.default.Types.ObjectId(userId),
            content: comment,
            timestamp: new Date()
        });
        // Update analytics
        video.analytics.comments += 1;
        video.analytics.engagement = video.analytics.likes + video.analytics.comments + (video.analytics.shares || 0);
        await video.save();
        // Get the added comment with user details
        const populatedVideo = await Video_1.Video.findById(videoId)
            .populate('comments.user', 'profile.firstName profile.lastName profile.avatar')
            .select('comments')
            .lean();
        const addedComment = populatedVideo.comments[populatedVideo.comments.length - 1];
        (0, response_1.sendSuccess)(res, {
            comment: addedComment,
            totalComments: video.analytics.comments
        }, 'Comment added successfully', 201);
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to add comment', 500);
    }
});
// Get video comments
exports.getVideoComments = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    try {
        const video = await Video_1.Video.findById(videoId)
            .populate('comments.user', 'profile.firstName profile.lastName profile.avatar')
            .select('comments')
            .lean();
        if (!video) {
            return (0, response_1.sendNotFound)(res, 'Video not found');
        }
        // Pagination for comments
        const skip = (Number(page) - 1) * Number(limit);
        const comments = video.comments
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(skip, skip + Number(limit));
        const total = video.comments.length;
        const totalPages = Math.ceil(total / Number(limit));
        (0, response_1.sendSuccess)(res, {
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
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to fetch video comments', 500);
    }
});
// Search videos
exports.searchVideos = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { q: searchText, page = 1, limit = 20, category, creator } = req.query;
    if (!searchText) {
        return (0, response_1.sendBadRequest)(res, 'Search query is required');
    }
    try {
        const query = {
            isPublished: true,
            $or: [
                { title: { $regex: searchText, $options: 'i' } },
                { description: { $regex: searchText, $options: 'i' } },
                { tags: { $in: [new RegExp(searchText, 'i')] } }
            ]
        };
        if (category)
            query.category = category;
        if (creator)
            query.creator = creator;
        const skip = (Number(page) - 1) * Number(limit);
        const videos = await Video_1.Video.find(query)
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
        const total = await Video_1.Video.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));
        (0, response_1.sendSuccess)(res, {
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
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to search videos', 500);
    }
});
// Get videos by store
exports.getVideosByStore = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { storeId } = req.params;
    const { type, limit = 20, offset = 0 } = req.query;
    const userId = req.userId; // Optional - can be undefined for non-authenticated users
    try {
        console.log('🎥 [VIDEO] Fetching videos for store:', storeId);
        // Check if storeId is a valid ObjectId format (24 hex characters)
        // If not, return empty results immediately since stores field only accepts ObjectIds
        if (!mongoose_1.default.Types.ObjectId.isValid(storeId) || !/^[0-9a-fA-F]{24}$/.test(storeId)) {
            console.log(`ℹ️ [VIDEO] Store ID "${storeId}" is not a valid ObjectId format, returning empty array`);
            return (0, response_1.sendSuccess)(res, {
                content: [],
                total: 0
            }, 'Videos retrieved successfully');
        }
        // Build query with valid ObjectId
        // Include both approved UGC and merchant videos (merchant videos are auto-approved)
        const query = {
            isPublished: true,
            stores: new mongoose_1.default.Types.ObjectId(storeId),
            $or: [
                // UGC videos that are approved
                { contentType: 'ugc', isApproved: true, moderationStatus: 'approved' },
                // Merchant promotional videos (auto-approved)
                { contentType: 'merchant' }
            ]
        };
        // Filter by type if specified (both ugc and merchant are treated as video content)
        if (type === 'video') {
            // Already filtered in $or clause above
        }
        const videos = await Video_1.Video.find(query)
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
        const total = await Video_1.Video.countDocuments(query);
        console.log(`✅ [VIDEO] Found ${videos.length} videos for store ${storeId}`);
        // Return empty array if no videos found (not an error)
        if (videos.length === 0) {
            console.log(`ℹ️ [VIDEO] No videos found for store ${storeId}, returning empty array`);
        }
        // Transform videos to match UGC API format
        const content = videos.map((video) => {
            // Compute user-specific like/bookmark status
            const isLiked = userId ? (video.likedBy?.some((id) => id.toString() === userId) ||
                video.engagement?.likes?.some((id) => id.toString() === userId) ||
                false) : false;
            const isBookmarked = userId ? (video.bookmarkedBy?.some((id) => id.toString() === userId) ||
                false) : false;
            return {
                _id: video._id,
                userId: video.creator?._id || video.creator,
                user: {
                    _id: video.creator?._id || video.creator,
                    profile: video.creator?.profile || { firstName: '', lastName: '', avatar: '' }
                },
                type: 'video',
                url: video.videoUrl,
                videoUrl: video.videoUrl,
                thumbnail: video.thumbnail,
                caption: video.description,
                description: video.description,
                tags: video.tags || [],
                relatedProduct: video.products?.[0] || null,
                relatedStore: video.stores?.[0] ? {
                    _id: video.stores[0],
                    name: '',
                    logo: ''
                } : null,
                likes: video.analytics?.likes || video.likedBy?.length || video.engagement?.likes?.length || 0,
                comments: video.analytics?.comments || video.engagement?.comments || 0,
                shares: video.analytics?.shares || video.engagement?.shares || 0,
                views: video.analytics?.totalViews || video.analytics?.views || video.engagement?.views || 0,
                isLiked,
                isBookmarked,
                createdAt: video.createdAt,
                updatedAt: video.updatedAt
            };
        });
        (0, response_1.sendSuccess)(res, {
            content,
            total
        }, 'Videos retrieved successfully');
    }
    catch (error) {
        console.error('❌ [VIDEO] Get videos by store error:', error);
        throw new errorHandler_1.AppError('Failed to fetch store videos', 500);
    }
});
// Report video
exports.reportVideo = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { videoId } = req.params;
    const { reason, details } = req.body;
    const userId = req.userId;
    try {
        const video = await Video_1.Video.findById(videoId);
        if (!video) {
            return (0, response_1.sendNotFound)(res, 'Video not found');
        }
        // Use the reportVideo method from the model
        await video.reportVideo(userId, reason, details);
        console.log(`✅ [VIDEO] Video ${videoId} reported by user ${userId} for reason: ${reason}`);
        (0, response_1.sendSuccess)(res, {
            videoId: video._id,
            reportCount: video.reportCount,
            isReported: video.isReported
        }, 'Video reported successfully. Thank you for helping keep our community safe.');
    }
    catch (error) {
        console.error('❌ [VIDEO] Report video error:', error);
        throw new errorHandler_1.AppError('Failed to report video', 500);
    }
});
// Toggle bookmark on video
exports.toggleVideoBookmark = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.userId;
    try {
        const video = await Video_1.Video.findById(videoId);
        if (!video) {
            return (0, response_1.sendNotFound)(res, 'Video not found');
        }
        // Use the toggleBookmark method from the model
        const isBookmarked = await video.toggleBookmark(userId);
        console.log(`✅ [VIDEO] Video ${videoId} ${isBookmarked ? 'bookmarked' : 'unbookmarked'} by user ${userId}`);
        (0, response_1.sendSuccess)(res, {
            videoId: video._id,
            isBookmarked,
            totalBookmarks: video.bookmarkedBy?.length || 0
        }, isBookmarked ? 'Video bookmarked successfully' : 'Bookmark removed successfully');
    }
    catch (error) {
        console.error('❌ [VIDEO] Toggle bookmark error:', error);
        throw new errorHandler_1.AppError('Failed to toggle bookmark', 500);
    }
});
// Track video view
exports.trackVideoView = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.userId; // Optional - can be undefined for non-authenticated users
    try {
        const video = await Video_1.Video.findById(videoId);
        if (!video) {
            return (0, response_1.sendNotFound)(res, 'Video not found');
        }
        // Use the incrementViews method from the model
        await video.incrementViews(userId || undefined);
        console.log(`✅ [VIDEO] View tracked for video ${videoId}${userId ? ` by user ${userId}` : ' (anonymous)'}`);
        (0, response_1.sendSuccess)(res, {
            videoId: video._id,
            views: video.engagement.views
        }, 'View tracked successfully');
    }
    catch (error) {
        console.error('❌ [VIDEO] Track view error:', error);
        throw new errorHandler_1.AppError('Failed to track view', 500);
    }
});
