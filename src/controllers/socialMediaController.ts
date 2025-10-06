// Social Media Controller
// Handles social media post submissions and cashback tracking

import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import SocialMediaPost from '../models/SocialMediaPost';
import { Order } from '../models/Order';
import { Wallet } from '../models/Wallet';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';

// Submit a new social media post
export const submitPost = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { platform, postUrl, orderId } = req.body;

  console.log('📱 [SOCIAL MEDIA] Submitting post:', { userId, platform, postUrl, orderId });

  try {
    // Validate URL format based on platform
    const urlPatterns: Record<string, RegExp> = {
      instagram: /^https?:\/\/(www\.)?instagram\.com\/p\/[a-zA-Z0-9_-]+\/?/,
      facebook: /^https?:\/\/(www\.)?facebook\.com\//,
      twitter: /^https?:\/\/(www\.)?(twitter|x)\.com\/.*\/status\/[0-9]+/,
      tiktok: /^https?:\/\/(www\.)?tiktok\.com\//
    };

    if (!urlPatterns[platform]?.test(postUrl)) {
      return sendError(res, `Invalid ${platform} post URL format`, 400);
    }

    // Check if URL already submitted
    const existingPost = await SocialMediaPost.findOne({ postUrl });
    if (existingPost) {
      return sendError(res, 'This post URL has already been submitted', 409);
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
      metadata: {
        orderNumber
      }
    });

    await post.save();

    console.log('✅ [SOCIAL MEDIA] Post submitted successfully:', post._id);

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
    } else if (status === 'rejected') {
      await post.reject(new Types.ObjectId(reviewerId), rejectionReason);
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
