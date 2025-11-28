"use strict";
// Social Media Controller
// Handles social media post submissions and cashback tracking
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlatformStats = exports.deletePost = exports.updatePostStatus = exports.getPostById = exports.getUserEarnings = exports.getUserPosts = exports.submitPost = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const SocialMediaPost_1 = __importDefault(require("../models/SocialMediaPost"));
const Order_1 = require("../models/Order");
const Wallet_1 = require("../models/Wallet");
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const response_1 = require("../utils/response");
const achievementService_1 = __importDefault(require("../services/achievementService"));
// Submit a new social media post
exports.submitPost = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { platform, postUrl, orderId } = req.body;
    console.log('📱 [SOCIAL MEDIA] Submitting post:', { userId, platform, postUrl, orderId });
    try {
        // Validate URL format based on platform
        const urlPatterns = {
            instagram: /^https?:\/\/(www\.)?instagram\.com\/([\w.]+\/)?(p|reel|instagramreel)\/[a-zA-Z0-9_-]+\/?(\?.*)?$/,
            facebook: /^https?:\/\/(www\.)?facebook\.com\//,
            twitter: /^https?:\/\/(www\.)?(twitter|x)\.com\/.*\/status\/[0-9]+/,
            tiktok: /^https?:\/\/(www\.)?tiktok\.com\//
        };
        if (!urlPatterns[platform]?.test(postUrl)) {
            return (0, response_1.sendError)(res, `Invalid ${platform} post URL format`, 400);
        }
        // FRAUD PREVENTION CHECK 1: Check if URL already submitted
        const existingPost = await SocialMediaPost_1.default.findOne({ postUrl });
        if (existingPost) {
            console.warn('⚠️ [FRAUD] Duplicate URL submission attempt:', { userId, postUrl });
            return (0, response_1.sendError)(res, 'This post URL has already been submitted', 409);
        }
        // FRAUD PREVENTION CHECK 2: Check if user already submitted for this order
        if (orderId) {
            const existingForOrder = await SocialMediaPost_1.default.findOne({
                user: userId,
                order: orderId
            });
            if (existingForOrder) {
                console.warn('⚠️ [FRAUD] User tried to submit same order twice:', { userId, orderId });
                return (0, response_1.sendError)(res, 'You have already submitted a post for this order', 409);
            }
        }
        // FRAUD PREVENTION CHECK 3: Check cooldown period (24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentSubmission = await SocialMediaPost_1.default.findOne({
            user: userId,
            submittedAt: { $gte: twentyFourHoursAgo }
        });
        if (recentSubmission) {
            const hoursRemaining = Math.ceil((recentSubmission.submittedAt.getTime() + 24 * 60 * 60 * 1000 - Date.now()) / (60 * 60 * 1000));
            console.warn('⚠️ [FRAUD] User in cooldown period:', { userId, hoursRemaining });
            return (0, response_1.sendError)(res, `Please wait ${hoursRemaining} hours before submitting another post`, 429);
        }
        // FRAUD PREVENTION CHECK 4: Check daily limit (3 posts per day)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const todaySubmissions = await SocialMediaPost_1.default.countDocuments({
            user: userId,
            submittedAt: { $gte: oneDayAgo }
        });
        if (todaySubmissions >= 3) {
            console.warn('⚠️ [FRAUD] User exceeded daily limit:', { userId, submissions: todaySubmissions });
            return (0, response_1.sendError)(res, 'Maximum 3 submissions per day reached. Please try again tomorrow.', 429);
        }
        // Calculate cashback amount
        let cashbackAmount = 0;
        let orderNumber = '';
        if (orderId) {
            const order = await Order_1.Order.findOne({ _id: orderId, user: userId });
            if (order) {
                const orderTotal = order.totals?.total || 0;
                cashbackAmount = Math.round(orderTotal * 0.05); // 5% cashback
                orderNumber = order.orderNumber;
            }
        }
        // Capture request metadata for fraud prevention
        const submissionIp = req.ip || req.socket.remoteAddress || req.headers['x-forwarded-for'];
        const deviceFingerprint = req.headers['x-device-id'];
        const userAgent = req.headers['user-agent'];
        console.log('🔒 [FRAUD TRACKING] Submission metadata:', {
            userId,
            submissionIp,
            deviceFingerprint: deviceFingerprint ? 'present' : 'missing',
            userAgent: userAgent?.substring(0, 50)
        });
        // Create post submission
        const post = new SocialMediaPost_1.default({
            user: userId,
            order: orderId,
            platform,
            postUrl,
            status: 'pending',
            cashbackAmount,
            cashbackPercentage: 5,
            submittedAt: new Date(),
            submissionIp: typeof submissionIp === 'string' ? submissionIp : submissionIp?.[0],
            deviceFingerprint,
            userAgent,
            metadata: {
                orderNumber
            }
        });
        await post.save();
        console.log('✅ [SOCIAL MEDIA] Post submitted successfully:', post._id);
        // Audit Log: Track submission
        await AuditLog_1.default.log({
            merchantId: new mongoose_1.Types.ObjectId('000000000000000000000000'), // System/user activity
            merchantUserId: new mongoose_1.Types.ObjectId(userId),
            action: 'social_media_post_submitted',
            resourceType: 'SocialMediaPost',
            resourceId: post._id,
            details: {
                changes: {
                    platform,
                    postUrl: postUrl.substring(0, 50) + '...', // Don't store full URL in logs
                    cashbackAmount,
                    orderId
                },
                metadata: {
                    deviceFingerprint
                }
            },
            ipAddress: typeof submissionIp === 'string' ? submissionIp : submissionIp?.[0] || '0.0.0.0',
            userAgent: userAgent || 'unknown'
        });
        // Trigger achievement update for social media post submission
        try {
            await achievementService_1.default.triggerAchievementUpdate(userId, 'social_media_post_submitted');
        }
        catch (error) {
            console.error('❌ [SOCIAL MEDIA] Error triggering achievement update:', error);
        }
        (0, response_1.sendSuccess)(res, {
            post: {
                id: post._id,
                platform: post.platform,
                status: post.status,
                cashbackAmount: post.cashbackAmount,
                submittedAt: post.submittedAt,
                estimatedReview: '48 hours'
            }
        }, 'Post submitted successfully! We will review it within 48 hours.', 201);
    }
    catch (error) {
        console.error('❌ [SOCIAL MEDIA] Submit error:', error);
        throw new errorHandler_1.AppError('Failed to submit post', 500);
    }
});
// Get user's posts
exports.getUserPosts = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { page = 1, limit = 20, status } = req.query;
    console.log('📱 [SOCIAL MEDIA] Getting user posts:', { userId, page, limit, status });
    try {
        const query = { user: userId };
        if (status) {
            query.status = status;
        }
        const skip = (Number(page) - 1) * Number(limit);
        const posts = await SocialMediaPost_1.default.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();
        const total = await SocialMediaPost_1.default.countDocuments(query);
        const totalPages = Math.ceil(total / Number(limit));
        console.log(`✅ [SOCIAL MEDIA] Found ${posts.length} posts`);
        (0, response_1.sendSuccess)(res, {
            posts,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages,
                hasNext: Number(page) < totalPages,
                hasPrev: Number(page) > 1
            }
        }, 'Posts retrieved successfully');
    }
    catch (error) {
        console.error('❌ [SOCIAL MEDIA] Get posts error:', error);
        throw new errorHandler_1.AppError('Failed to fetch posts', 500);
    }
});
// Get user's earnings
exports.getUserEarnings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    console.log('📱 [SOCIAL MEDIA] Getting user earnings:', userId);
    try {
        const earnings = await SocialMediaPost_1.default.getUserEarnings(new mongoose_1.Types.ObjectId(userId));
        console.log('✅ [SOCIAL MEDIA] Earnings calculated:', earnings);
        (0, response_1.sendSuccess)(res, earnings, 'Earnings retrieved successfully');
    }
    catch (error) {
        console.error('❌ [SOCIAL MEDIA] Get earnings error:', error);
        throw new errorHandler_1.AppError('Failed to fetch earnings', 500);
    }
});
// Get single post by ID
exports.getPostById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { postId } = req.params;
    const userId = req.userId;
    console.log('📱 [SOCIAL MEDIA] Getting post:', { postId, userId });
    try {
        const post = await SocialMediaPost_1.default.findOne({ _id: postId, user: userId })
            .populate('order', 'orderNumber totals.total')
            .lean();
        if (!post) {
            return (0, response_1.sendNotFound)(res, 'Post not found');
        }
        (0, response_1.sendSuccess)(res, post, 'Post retrieved successfully');
    }
    catch (error) {
        console.error('❌ [SOCIAL MEDIA] Get post error:', error);
        throw new errorHandler_1.AppError('Failed to fetch post', 500);
    }
});
// Update post status (Admin only)
exports.updatePostStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { postId } = req.params;
    const { status, rejectionReason } = req.body;
    const reviewerId = req.userId;
    console.log('📱 [SOCIAL MEDIA] Updating post status:', { postId, status, reviewerId });
    // Start transaction for atomic wallet update
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const post = await SocialMediaPost_1.default.findById(postId).session(session);
        if (!post) {
            await session.abortTransaction();
            return (0, response_1.sendNotFound)(res, 'Post not found');
        }
        if (status === 'approved') {
            await post.approve(new mongoose_1.Types.ObjectId(reviewerId));
            // Audit Log: Track approval
            await AuditLog_1.default.log({
                merchantId: new mongoose_1.Types.ObjectId('000000000000000000000000'), // System/user activity
                merchantUserId: new mongoose_1.Types.ObjectId(reviewerId),
                action: 'social_media_post_approved',
                resourceType: 'SocialMediaPost',
                resourceId: post._id,
                details: {
                    changes: {
                        postUser: post.user,
                        platform: post.platform,
                        cashbackAmount: post.cashbackAmount
                    }
                },
                ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0'),
                userAgent: (req.headers['user-agent'] || 'unknown')
            });
            // Trigger achievement update for social media post approval
            try {
                await achievementService_1.default.triggerAchievementUpdate(post.user, 'social_media_post_approved');
            }
            catch (error) {
                console.error('❌ [SOCIAL MEDIA] Error triggering achievement update for approval:', error);
            }
        }
        else if (status === 'rejected') {
            await post.reject(new mongoose_1.Types.ObjectId(reviewerId), rejectionReason);
            // Audit Log: Track rejection
            await AuditLog_1.default.log({
                merchantId: new mongoose_1.Types.ObjectId('000000000000000000000000'), // System/user activity
                merchantUserId: new mongoose_1.Types.ObjectId(reviewerId),
                action: 'social_media_post_rejected',
                resourceType: 'SocialMediaPost',
                resourceId: post._id,
                details: {
                    changes: {
                        postUser: post.user,
                        platform: post.platform,
                        rejectionReason
                    }
                },
                ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0'),
                userAgent: (req.headers['user-agent'] || 'unknown')
            });
        }
        else if (status === 'credited') {
            // Credit cashback to user's wallet
            const wallet = await Wallet_1.Wallet.findOne({ user: post.user }).session(session);
            if (!wallet) {
                await session.abortTransaction();
                throw new errorHandler_1.AppError('User wallet not found', 404);
            }
            // Add funds to wallet using the built-in method
            await wallet.addFunds(post.cashbackAmount, 'cashback');
            await wallet.save({ session });
            await post.creditCashback();
            console.log(`✅ [SOCIAL MEDIA] Credited ₹${post.cashbackAmount} to wallet`);
            // Audit Log: Track cashback crediting
            await AuditLog_1.default.log({
                merchantId: new mongoose_1.Types.ObjectId('000000000000000000000000'), // System/user activity
                merchantUserId: new mongoose_1.Types.ObjectId(reviewerId),
                action: 'social_media_cashback_credited',
                resourceType: 'SocialMediaPost',
                resourceId: post._id,
                details: {
                    changes: {
                        postUser: post.user,
                        cashbackAmount: post.cashbackAmount,
                        walletId: wallet._id,
                        newWalletBalance: wallet.balance.total
                    }
                },
                ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0'),
                userAgent: (req.headers['user-agent'] || 'unknown')
            });
            // Trigger achievement update for social media post crediting
            try {
                await achievementService_1.default.triggerAchievementUpdate(post.user, 'social_media_post_credited');
            }
            catch (error) {
                console.error('❌ [SOCIAL MEDIA] Error triggering achievement update for crediting:', error);
            }
        }
        await session.commitTransaction();
        console.log('✅ [SOCIAL MEDIA] Post status updated:', post.status);
        (0, response_1.sendSuccess)(res, {
            post: {
                id: post._id,
                status: post.status,
                reviewedAt: post.reviewedAt,
                creditedAt: post.creditedAt
            }
        }, 'Post status updated successfully');
    }
    catch (error) {
        await session.abortTransaction();
        console.error('❌ [SOCIAL MEDIA] Update status error:', error);
        throw error;
    }
    finally {
        session.endSession();
    }
});
// Delete a post (user can delete pending posts only)
exports.deletePost = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { postId } = req.params;
    const userId = req.userId;
    console.log('📱 [SOCIAL MEDIA] Deleting post:', { postId, userId });
    try {
        const post = await SocialMediaPost_1.default.findOne({ _id: postId, user: userId });
        if (!post) {
            return (0, response_1.sendNotFound)(res, 'Post not found');
        }
        if (post.status !== 'pending') {
            return (0, response_1.sendError)(res, 'Only pending posts can be deleted', 403);
        }
        await post.deleteOne();
        console.log('✅ [SOCIAL MEDIA] Post deleted');
        (0, response_1.sendSuccess)(res, null, 'Post deleted successfully');
    }
    catch (error) {
        console.error('❌ [SOCIAL MEDIA] Delete error:', error);
        throw new errorHandler_1.AppError('Failed to delete post', 500);
    }
});
// Get platform statistics
exports.getPlatformStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    console.log('📱 [SOCIAL MEDIA] Getting platform stats:', userId);
    try {
        const stats = await SocialMediaPost_1.default.aggregate([
            { $match: { user: new mongoose_1.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: '$platform',
                    totalPosts: { $sum: 1 },
                    totalCashback: { $sum: '$cashbackAmount' },
                    approvedPosts: {
                        $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
                    },
                    creditedPosts: {
                        $sum: { $cond: [{ $eq: ['$status', 'credited'] }, 1, 0] }
                    }
                }
            },
            {
                $project: {
                    platform: '$_id',
                    totalPosts: 1,
                    totalCashback: 1,
                    approvedPosts: 1,
                    creditedPosts: 1,
                    _id: 0
                }
            }
        ]);
        console.log('✅ [SOCIAL MEDIA] Platform stats calculated');
        (0, response_1.sendSuccess)(res, { stats }, 'Platform statistics retrieved successfully');
    }
    catch (error) {
        console.error('❌ [SOCIAL MEDIA] Stats error:', error);
        throw new errorHandler_1.AppError('Failed to fetch statistics', 500);
    }
});
