"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const merchantauth_1 = require("../middleware/merchantauth");
const merchantvalidation_1 = require("../middleware/merchantvalidation");
const Video_1 = require("../models/Video");
const Store_1 = require("../models/Store");
const Product_1 = require("../models/Product");
const joi_1 = __importDefault(require("joi"));
const mongoose_1 = __importDefault(require("mongoose"));
const cloudinaryUtils_1 = require("../utils/cloudinaryUtils");
const router = (0, express_1.Router)();
// All routes require merchant authentication
router.use(merchantauth_1.authMiddleware);
// Validation schemas
const createVideoSchema = joi_1.default.object({
    title: joi_1.default.string().required().min(1).max(200).trim(),
    description: joi_1.default.string().max(2000).trim().optional().allow(''),
    storeId: joi_1.default.string().required().custom((value, helpers) => {
        if (!mongoose_1.default.Types.ObjectId.isValid(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    }),
    videoUrl: joi_1.default.string().required().uri(),
    thumbnailUrl: joi_1.default.string().required().uri(),
    products: joi_1.default.array().items(joi_1.default.string().custom((value, helpers) => {
        if (!mongoose_1.default.Types.ObjectId.isValid(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    })).min(1).required().messages({
        'array.min': 'At least one product must be tagged'
    }),
    tags: joi_1.default.array().items(joi_1.default.string().trim()).optional(),
    category: joi_1.default.string().valid('featured', 'tutorial', 'review').default('featured'),
    duration: joi_1.default.number().required().min(1).max(180).messages({
        'number.max': 'Video duration must be 3 minutes (180 seconds) or less'
    }),
    publicId: joi_1.default.string().optional() // Cloudinary public ID for deletion
});
const updateVideoSchema = joi_1.default.object({
    title: joi_1.default.string().min(1).max(200).trim().optional(),
    description: joi_1.default.string().max(2000).trim().optional().allow(''),
    products: joi_1.default.array().items(joi_1.default.string().custom((value, helpers) => {
        if (!mongoose_1.default.Types.ObjectId.isValid(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    })).min(1).optional().messages({
        'array.min': 'At least one product must be tagged'
    }),
    tags: joi_1.default.array().items(joi_1.default.string().trim()).optional(),
    isPublished: joi_1.default.boolean().optional()
});
const videoIdSchema = joi_1.default.object({
    videoId: joi_1.default.string().required().custom((value, helpers) => {
        if (!mongoose_1.default.Types.ObjectId.isValid(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    })
});
const storeIdSchema = joi_1.default.object({
    storeId: joi_1.default.string().required().custom((value, helpers) => {
        if (!mongoose_1.default.Types.ObjectId.isValid(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    })
});
/**
 * @route   POST /api/merchant/videos
 * @desc    Create a promotional video for a store
 * @access  Private (Merchant)
 */
router.post('/', (0, merchantvalidation_1.validateRequest)(createVideoSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { title, description, storeId, videoUrl, thumbnailUrl, products, tags, category, duration, publicId } = req.body;
        console.log('📹 [MERCHANT VIDEO] Creating promotional video:', { title, storeId, merchantId });
        // Validate store ownership
        const store = await Store_1.Store.findOne({
            _id: storeId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found or does not belong to this merchant'
            });
        }
        // Validate products belong to the store
        const validProducts = await Product_1.Product.find({
            _id: { $in: products.map((id) => new mongoose_1.default.Types.ObjectId(id)) },
            store: new mongoose_1.default.Types.ObjectId(storeId)
        }).select('_id name');
        if (validProducts.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one valid product from this store must be tagged'
            });
        }
        if (validProducts.length !== products.length) {
            console.warn('⚠️ Some products were not found or do not belong to the store');
        }
        // Create the video document
        const video = new Video_1.Video({
            title: title.trim(),
            description: description?.trim() || '',
            creator: new mongoose_1.default.Types.ObjectId(merchantId), // Use merchantId as creator
            contentType: 'merchant',
            videoUrl,
            thumbnail: thumbnailUrl,
            category: category || 'featured',
            tags: tags || [],
            hashtags: [],
            products: validProducts.map(p => p._id),
            stores: [new mongoose_1.default.Types.ObjectId(storeId)],
            engagement: {
                views: 0,
                likes: [],
                shares: 0,
                comments: 0,
                saves: 0,
                reports: 0
            },
            metadata: {
                duration,
                format: 'mp4',
                aspectRatio: '9:16'
            },
            processing: {
                status: 'completed',
                originalUrl: videoUrl,
                processedUrl: videoUrl,
                thumbnailUrl: thumbnailUrl
            },
            analytics: {
                totalViews: 0,
                uniqueViews: 0,
                avgWatchTime: 0,
                completionRate: 0,
                engagementRate: 0,
                shareRate: 0,
                likeRate: 0,
                likes: 0,
                comments: 0,
                shares: 0,
                engagement: 0
            },
            isPublished: true,
            isFeatured: false,
            isApproved: true, // Auto-approve merchant videos
            isTrending: false,
            isSponsored: false,
            moderationStatus: 'approved',
            privacy: 'public',
            allowComments: true,
            allowSharing: true,
            publishedAt: new Date()
        });
        // Save with publicId in metadata for later deletion
        if (publicId) {
            video.cloudinaryPublicId = publicId;
        }
        await video.save();
        // Populate products for response
        const populatedVideo = await Video_1.Video.findById(video._id)
            .populate('products', 'name images pricing')
            .populate('stores', 'name logo');
        console.log('✅ [MERCHANT VIDEO] Created successfully:', video._id);
        res.status(201).json({
            success: true,
            message: 'Promotional video created successfully',
            data: {
                video: populatedVideo
            }
        });
    }
    catch (error) {
        console.error('❌ [MERCHANT VIDEO] Error creating video:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create promotional video',
            error: error.message
        });
    }
});
/**
 * @route   GET /api/merchant/videos/store/:storeId
 * @desc    Get all promotional videos for a store (merchant dashboard)
 * @access  Private (Merchant)
 */
router.get('/store/:storeId', (0, merchantvalidation_1.validateParams)(storeIdSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { storeId } = req.params;
        const { page = 1, limit = 20, sortBy = 'newest' } = req.query;
        console.log('📹 [MERCHANT VIDEO] Fetching videos for store:', storeId);
        // Validate store ownership
        const store = await Store_1.Store.findOne({
            _id: storeId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found or does not belong to this merchant'
            });
        }
        // Build sort options
        let sortOptions = { createdAt: -1 }; // Default: newest
        if (sortBy === 'popular') {
            sortOptions = { 'analytics.totalViews': -1, createdAt: -1 };
        }
        else if (sortBy === 'views') {
            sortOptions = { 'engagement.views': -1 };
        }
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        // Get videos for this store
        const [videos, total] = await Promise.all([
            Video_1.Video.find({
                stores: new mongoose_1.default.Types.ObjectId(storeId),
                contentType: 'merchant'
            })
                .populate('products', 'name images pricing')
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Video_1.Video.countDocuments({
                stores: new mongoose_1.default.Types.ObjectId(storeId),
                contentType: 'merchant'
            })
        ]);
        console.log('✅ [MERCHANT VIDEO] Found', videos.length, 'videos');
        res.json({
            success: true,
            data: {
                videos: videos.map((video) => ({
                    _id: video._id,
                    title: video.title,
                    description: video.description,
                    videoUrl: video.videoUrl,
                    thumbnail: video.thumbnail,
                    products: video.products,
                    engagement: {
                        views: video.engagement?.views || video.analytics?.totalViews || 0,
                        likes: Array.isArray(video.engagement?.likes) ? video.engagement.likes.length : (video.analytics?.likes || 0),
                        shares: video.engagement?.shares || video.analytics?.shares || 0,
                        comments: video.engagement?.comments || video.analytics?.comments || 0
                    },
                    metadata: {
                        duration: video.metadata?.duration || 0
                    },
                    isPublished: video.isPublished,
                    createdAt: video.createdAt,
                    updatedAt: video.updatedAt
                })),
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum)
                }
            }
        });
    }
    catch (error) {
        console.error('❌ [MERCHANT VIDEO] Error fetching videos:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch promotional videos',
            error: error.message
        });
    }
});
/**
 * @route   GET /api/merchant/videos/analytics/:storeId
 * @desc    Get analytics for all promotional videos of a store
 * @access  Private (Merchant)
 */
router.get('/analytics/:storeId', (0, merchantvalidation_1.validateParams)(storeIdSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { storeId } = req.params;
        console.log('📊 [MERCHANT VIDEO] Fetching analytics for store:', storeId);
        // Validate store ownership
        const store = await Store_1.Store.findOne({
            _id: storeId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: 'Store not found or does not belong to this merchant'
            });
        }
        // Aggregate analytics
        const analytics = await Video_1.Video.aggregate([
            {
                $match: {
                    stores: new mongoose_1.default.Types.ObjectId(storeId),
                    contentType: 'merchant'
                }
            },
            {
                $group: {
                    _id: null,
                    totalVideos: { $sum: 1 },
                    totalViews: { $sum: { $ifNull: ['$analytics.totalViews', '$engagement.views'] } },
                    totalLikes: { $sum: { $size: { $ifNull: ['$engagement.likes', []] } } },
                    totalShares: { $sum: { $ifNull: ['$engagement.shares', 0] } },
                    totalComments: { $sum: { $ifNull: ['$engagement.comments', 0] } }
                }
            }
        ]);
        // Get best performing video
        const bestPerforming = await Video_1.Video.findOne({
            stores: new mongoose_1.default.Types.ObjectId(storeId),
            contentType: 'merchant'
        })
            .sort({ 'analytics.totalViews': -1, 'engagement.views': -1 })
            .select('title thumbnail analytics.totalViews engagement.views')
            .lean();
        // Get recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentActivity = await Video_1.Video.aggregate([
            {
                $match: {
                    stores: new mongoose_1.default.Types.ObjectId(storeId),
                    contentType: 'merchant'
                }
            },
            {
                $project: {
                    viewsByDate: { $objectToArray: { $ifNull: ['$analytics.viewsByDate', {}] } }
                }
            },
            { $unwind: { path: '$viewsByDate', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$viewsByDate.k',
                    views: { $sum: '$viewsByDate.v' }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 7 }
        ]);
        const stats = analytics[0] || {
            totalVideos: 0,
            totalViews: 0,
            totalLikes: 0,
            totalShares: 0,
            totalComments: 0
        };
        console.log('✅ [MERCHANT VIDEO] Analytics fetched successfully');
        res.json({
            success: true,
            data: {
                totalVideos: stats.totalVideos,
                totalViews: stats.totalViews,
                totalLikes: stats.totalLikes,
                totalShares: stats.totalShares,
                totalComments: stats.totalComments,
                bestPerforming: bestPerforming ? {
                    _id: bestPerforming._id,
                    title: bestPerforming.title,
                    thumbnail: bestPerforming.thumbnail,
                    views: bestPerforming.analytics?.totalViews || bestPerforming.engagement?.views || 0
                } : null,
                recentActivity: recentActivity.map(item => ({
                    date: item._id,
                    views: item.views
                }))
            }
        });
    }
    catch (error) {
        console.error('❌ [MERCHANT VIDEO] Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch video analytics',
            error: error.message
        });
    }
});
/**
 * @route   PUT /api/merchant/videos/:videoId
 * @desc    Update a promotional video
 * @access  Private (Merchant)
 */
router.put('/:videoId', (0, merchantvalidation_1.validateParams)(videoIdSchema), (0, merchantvalidation_1.validateRequest)(updateVideoSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { videoId } = req.params;
        const updateData = req.body;
        console.log('📹 [MERCHANT VIDEO] Updating video:', videoId);
        // Find video and validate ownership
        const video = await Video_1.Video.findById(videoId);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }
        // Check if merchant owns the store associated with this video
        const storeId = video.stores[0];
        const store = await Store_1.Store.findOne({
            _id: storeId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        });
        if (!store) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update this video'
            });
        }
        // If updating products, validate they belong to the store
        if (updateData.products && updateData.products.length > 0) {
            const validProducts = await Product_1.Product.find({
                _id: { $in: updateData.products.map((id) => new mongoose_1.default.Types.ObjectId(id)) },
                store: storeId
            }).select('_id');
            if (validProducts.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one valid product from this store must be tagged'
                });
            }
            updateData.products = validProducts.map(p => p._id);
        }
        // Update video
        const updatedVideo = await Video_1.Video.findByIdAndUpdate(videoId, { $set: updateData }, { new: true })
            .populate('products', 'name images pricing')
            .populate('stores', 'name logo');
        console.log('✅ [MERCHANT VIDEO] Updated successfully:', videoId);
        res.json({
            success: true,
            message: 'Promotional video updated successfully',
            data: {
                video: updatedVideo
            }
        });
    }
    catch (error) {
        console.error('❌ [MERCHANT VIDEO] Error updating video:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update promotional video',
            error: error.message
        });
    }
});
/**
 * @route   DELETE /api/merchant/videos/:videoId
 * @desc    Delete a promotional video
 * @access  Private (Merchant)
 */
router.delete('/:videoId', (0, merchantvalidation_1.validateParams)(videoIdSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { videoId } = req.params;
        console.log('🗑️ [MERCHANT VIDEO] Deleting video:', videoId);
        // Find video
        const video = await Video_1.Video.findById(videoId);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }
        // Check if merchant owns the store associated with this video
        const storeId = video.stores[0];
        const store = await Store_1.Store.findOne({
            _id: storeId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        });
        if (!store) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to delete this video'
            });
        }
        // Try to delete from Cloudinary if publicId exists
        const cloudinaryPublicId = video.cloudinaryPublicId;
        if (cloudinaryPublicId) {
            try {
                await (0, cloudinaryUtils_1.deleteFromCloudinary)(cloudinaryPublicId);
                console.log('✅ Deleted from Cloudinary:', cloudinaryPublicId);
            }
            catch (cloudinaryError) {
                console.warn('⚠️ Failed to delete from Cloudinary:', cloudinaryError);
                // Continue with database deletion even if Cloudinary fails
            }
        }
        // Delete from database
        await Video_1.Video.findByIdAndDelete(videoId);
        console.log('✅ [MERCHANT VIDEO] Deleted successfully:', videoId);
        res.json({
            success: true,
            message: 'Video deleted successfully'
        });
    }
    catch (error) {
        console.error('❌ [MERCHANT VIDEO] Error deleting video:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete video',
            error: error.message
        });
    }
});
/**
 * @route   GET /api/merchant/videos/:videoId
 * @desc    Get a single promotional video
 * @access  Private (Merchant)
 */
router.get('/:videoId', (0, merchantvalidation_1.validateParams)(videoIdSchema), async (req, res) => {
    try {
        const merchantId = req.merchantId;
        const { videoId } = req.params;
        const video = await Video_1.Video.findById(videoId)
            .populate('products', 'name images pricing')
            .populate('stores', 'name logo');
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }
        // Check if merchant owns the store associated with this video
        const storeId = video.stores[0]?._id || video.stores[0];
        const store = await Store_1.Store.findOne({
            _id: storeId,
            merchantId: new mongoose_1.default.Types.ObjectId(merchantId)
        });
        if (!store) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to view this video'
            });
        }
        res.json({
            success: true,
            data: {
                video
            }
        });
    }
    catch (error) {
        console.error('❌ [MERCHANT VIDEO] Error fetching video:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch video',
            error: error.message
        });
    }
});
exports.default = router;
