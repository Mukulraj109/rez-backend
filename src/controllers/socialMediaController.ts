// Social Media Controller
// Handles social media post submissions and cashback tracking

import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import SocialMediaPost from '../models/SocialMediaPost';
import { Order } from '../models/Order';
import { Wallet } from '../models/Wallet';
import AuditLog from '../models/AuditLog';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';
import achievementService from '../services/achievementService';

// Submit a new social media post
export const submitPost = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { platform, postUrl, orderId } = req.body;

  console.log('📱 [SOCIAL MEDIA] Submitting post:', { userId, platform, postUrl, orderId });

  try {
    // Validate URL format based on platform
    const urlPatterns: Record<string, RegExp> = {
      instagram: /^https?:\/\/(www\.)?instagram\.com\/([\w.]+\/)?(p|reel|instagramreel)\/[a-zA-Z0-9_-]+\/?(\?.*)?$/,
      facebook: /^https?:\/\/(www\.)?facebook\.com\//,
      twitter: /^https?:\/\/(www\.)?(twitter|x)\.com\/.*\/status\/[0-9]+/,
      tiktok: /^https?:\/\/(www\.)?tiktok\.com\//
    };

    if (!urlPatterns[platform]?.test(postUrl)) {
      return sendError(res, `Invalid ${platform} post URL format`, 400);
    }

    // FRAUD PREVENTION CHECK 1: Check if URL already submitted
    const existingPost = await SocialMediaPost.findOne({ postUrl });
    if (existingPost) {
      console.warn('⚠️ [FRAUD] Duplicate URL submission attempt:', { userId, postUrl });
      return sendError(res, 'This post URL has already been submitted', 409);
    }

    // FRAUD PREVENTION CHECK 2: Check if user already submitted for this order
    if (orderId) {
      const existingForOrder = await SocialMediaPost.findOne({
        user: userId,
        order: orderId
      });
      if (existingForOrder) {
        console.warn('⚠️ [FRAUD] User tried to submit same order twice:', { userId, orderId });
        return sendError(res, 'You have already submitted a post for this order', 409);
      }
    }

    // FRAUD PREVENTION CHECK 3: Check cooldown period (24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSubmission = await SocialMediaPost.findOne({
      user: userId,
      submittedAt: { $gte: twentyFourHoursAgo }
    });
    if (recentSubmission) {
      const hoursRemaining = Math.ceil((recentSubmission.submittedAt.getTime() + 24 * 60 * 60 * 1000 - Date.now()) / (60 * 60 * 1000));
      console.warn('⚠️ [FRAUD] User in cooldown period:', { userId, hoursRemaining });
      return sendError(res, `Please wait ${hoursRemaining} hours before submitting another post`, 429);
    }

    // FRAUD PREVENTION CHECK 4: Check daily limit (3 posts per day)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todaySubmissions = await SocialMediaPost.countDocuments({
      user: userId,
      submittedAt: { $gte: oneDayAgo }
    });
    if (todaySubmissions >= 3) {
      console.warn('⚠️ [FRAUD] User exceeded daily limit:', { userId, submissions: todaySubmissions });
      return sendError(res, 'Maximum 3 submissions per day reached. Please try again tomorrow.', 429);
    }

    // Calculate cashback amount
    let cashbackAmount = 0;
    let orderNumber = '';

    if (orderId) {
      const order = await Order.findOne({ _id: orderId, user: userId });
      if (order) {
        const orderTotal = order.totals?.total || 0;
        cashbackAmount = Math.round(orderTotal * 0.05); // 5% cashback
        orderNumber = order.orderNumber;
      }
    }

    // Capture request metadata for fraud prevention
    const submissionIp = req.ip || req.socket.remoteAddress || req.headers['x-forwarded-for'];
    const deviceFingerprint = req.headers['x-device-id'] as string;
    const userAgent = req.headers['user-agent'];

    console.log('🔒 [FRAUD TRACKING] Submission metadata:', {
      userId,
      submissionIp,
      deviceFingerprint: deviceFingerprint ? 'present' : 'missing',
      userAgent: userAgent?.substring(0, 50)
    });

    // Create post submission
    const post = new SocialMediaPost({
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
    await AuditLog.log({
      userId,
      action: 'social_media_post_submitted',
      resource: 'SocialMediaPost',
      resourceId: post._id as Types.ObjectId,
      changes: {
        platform,
        postUrl: postUrl.substring(0, 50) + '...', // Don't store full URL in logs
        cashbackAmount,
        orderId
      },
      metadata: {
        ipAddress: submissionIp,
        deviceFingerprint,
        userAgent
      }
    });

    // Trigger achievement update for social media post submission
    try {
      await achievementService.triggerAchievementUpdate(userId, 'social_media_post_submitted');
    } catch (error) {
      console.error('❌ [SOCIAL MEDIA] Error triggering achievement update:', error);
    }

    sendSuccess(res, {
      post: {
        id: post._id,
        platform: post.platform,
        status: post.status,
        cashbackAmount: post.cashbackAmount,
        submittedAt: post.submittedAt,
        estimatedReview: '48 hours'
      }
    }, 'Post submitted successfully! We will review it within 48 hours.', 201);

  } catch (error) {
    console.error('❌ [SOCIAL MEDIA] Submit error:', error);
    throw new AppError('Failed to submit post', 500);
  }
});

// Get user's posts
export const getUserPosts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { page = 1, limit = 20, status } = req.query;

  console.log('📱 [SOCIAL MEDIA] Getting user posts:', { userId, page, limit, status });

  try {
    const query: any = { user: userId };
    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const posts = await SocialMediaPost.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await SocialMediaPost.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    console.log(`✅ [SOCIAL MEDIA] Found ${posts.length} posts`);

    sendSuccess(res, {
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

  } catch (error) {
    console.error('❌ [SOCIAL MEDIA] Get posts error:', error);
    throw new AppError('Failed to fetch posts', 500);
  }
});

// Get user's earnings
export const getUserEarnings = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  console.log('📱 [SOCIAL MEDIA] Getting user earnings:', userId);

  try {
    const earnings = await SocialMediaPost.getUserEarnings(new Types.ObjectId(userId));

    console.log('✅ [SOCIAL MEDIA] Earnings calculated:', earnings);

    sendSuccess(res, earnings, 'Earnings retrieved successfully');

  } catch (error) {
    console.error('❌ [SOCIAL MEDIA] Get earnings error:', error);
    throw new AppError('Failed to fetch earnings', 500);
  }
});

// Get single post by ID
export const getPostById = asyncHandler(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const userId = req.userId!;

  console.log('📱 [SOCIAL MEDIA] Getting post:', { postId, userId });

  try {
    const post = await SocialMediaPost.findOne({ _id: postId, user: userId })
      .populate('order', 'orderNumber totals.total')
      .lean();

    if (!post) {
      return sendNotFound(res, 'Post not found');
    }

    sendSuccess(res, post, 'Post retrieved successfully');

  } catch (error) {
    console.error('❌ [SOCIAL MEDIA] Get post error:', error);
    throw new AppError('Failed to fetch post', 500);
  }
});

// Update post status (Admin only)
export const updatePostStatus = asyncHandler(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { status, rejectionReason } = req.body;
  const reviewerId = req.userId!;

  console.log('📱 [SOCIAL MEDIA] Updating post status:', { postId, status, reviewerId });

  // Start transaction for atomic wallet update
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const post = await SocialMediaPost.findById(postId).session(session);

    if (!post) {
      await session.abortTransaction();
      return sendNotFound(res, 'Post not found');
    }

    if (status === 'approved') {
      await post.approve(new Types.ObjectId(reviewerId));

      // Audit Log: Track approval
      await AuditLog.log({
        userId: reviewerId,
        action: 'social_media_post_approved',
        resource: 'SocialMediaPost',
        resourceId: post._id as Types.ObjectId,
        changes: {
          postUser: post.user,
          platform: post.platform,
          cashbackAmount: post.cashbackAmount
        },
        metadata: {
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent']
        }
      });

      // Trigger achievement update for social media post approval
      try {
        await achievementService.triggerAchievementUpdate(post.user, 'social_media_post_approved');
      } catch (error) {
        console.error('❌ [SOCIAL MEDIA] Error triggering achievement update for approval:', error);
      }
    } else if (status === 'rejected') {
      await post.reject(new Types.ObjectId(reviewerId), rejectionReason);

      // Audit Log: Track rejection
      await AuditLog.log({
        userId: reviewerId,
        action: 'social_media_post_rejected',
        resource: 'SocialMediaPost',
        resourceId: post._id as Types.ObjectId,
        changes: {
          postUser: post.user,
          platform: post.platform,
          rejectionReason
        },
        metadata: {
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent']
        }
      });
    } else if (status === 'credited') {
      // Credit cashback to user's wallet
      const wallet = await Wallet.findOne({ user: post.user }).session(session);

      if (!wallet) {
        await session.abortTransaction();
        throw new AppError('User wallet not found', 404);
      }

      // Add funds to wallet using the built-in method
      await wallet.addFunds(post.cashbackAmount, 'cashback');
      await wallet.save({ session });
      await post.creditCashback();

      console.log(`✅ [SOCIAL MEDIA] Credited ₹${post.cashbackAmount} to wallet`);

      // Audit Log: Track cashback crediting
      await AuditLog.log({
        userId: reviewerId,
        action: 'social_media_cashback_credited',
        resource: 'SocialMediaPost',
        resourceId: post._id as Types.ObjectId,
        changes: {
          postUser: post.user,
          cashbackAmount: post.cashbackAmount,
          walletId: wallet._id,
          newWalletBalance: wallet.balance.total
        },
        metadata: {
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent']
        }
      });

      // Trigger achievement update for social media post crediting
      try {
        await achievementService.triggerAchievementUpdate(post.user, 'social_media_post_credited');
      } catch (error) {
        console.error('❌ [SOCIAL MEDIA] Error triggering achievement update for crediting:', error);
      }
    }

    await session.commitTransaction();

    console.log('✅ [SOCIAL MEDIA] Post status updated:', post.status);

    sendSuccess(res, {
      post: {
        id: post._id,
        status: post.status,
        reviewedAt: post.reviewedAt,
        creditedAt: post.creditedAt
      }
    }, 'Post status updated successfully');

  } catch (error) {
    await session.abortTransaction();
    console.error('❌ [SOCIAL MEDIA] Update status error:', error);
    throw error;
  } finally {
    session.endSession();
  }
});

// Delete a post (user can delete pending posts only)
export const deletePost = asyncHandler(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const userId = req.userId!;

  console.log('📱 [SOCIAL MEDIA] Deleting post:', { postId, userId });

  try {
    const post = await SocialMediaPost.findOne({ _id: postId, user: userId });

    if (!post) {
      return sendNotFound(res, 'Post not found');
    }

    if (post.status !== 'pending') {
      return sendError(res, 'Only pending posts can be deleted', 403);
    }

    await post.deleteOne();

    console.log('✅ [SOCIAL MEDIA] Post deleted');

    sendSuccess(res, null, 'Post deleted successfully');

  } catch (error) {
    console.error('❌ [SOCIAL MEDIA] Delete error:', error);
    throw new AppError('Failed to delete post', 500);
  }
});

// Get platform statistics
export const getPlatformStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  console.log('📱 [SOCIAL MEDIA] Getting platform stats:', userId);

  try {
    const stats = await SocialMediaPost.aggregate([
      { $match: { user: new Types.ObjectId(userId) } },
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

    sendSuccess(res, { stats }, 'Platform statistics retrieved successfully');

  } catch (error) {
    console.error('❌ [SOCIAL MEDIA] Stats error:', error);
    throw new AppError('Failed to fetch statistics', 500);
  }
});
