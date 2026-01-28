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

// Rate limit configuration
const RATE_LIMITS = {
  COOLDOWN_HOURS: 1, // 1 hour between submissions (aligned with frontend)
  DAILY_LIMIT: 3,
  WEEKLY_LIMIT: 10,
  MONTHLY_LIMIT: 30,
  REJECTION_COOLDOWN_HOURS: 24 // 24 hours after rejection
};

// Submit a new social media post
export const submitPost = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { platform, postUrl, orderId, fraudMetadata } = req.body;

  console.log('\n========================================');
  console.log('📱 [SOCIAL MEDIA] SUBMIT POST START');
  console.log('========================================');
  console.log('📱 [SOCIAL MEDIA] Request body:', JSON.stringify({ userId, platform, postUrl, orderId }, null, 2));

  // Log fraud metadata if provided
  if (fraudMetadata) {
    console.log('🔒 [FRAUD] Metadata received:', {
      deviceId: fraudMetadata.deviceId?.substring(0, 10) + '...',
      trustScore: fraudMetadata.trustScore,
      riskScore: fraudMetadata.riskScore,
      riskLevel: fraudMetadata.riskLevel,
      checksPassed: fraudMetadata.checksPassed,
      totalChecks: fraudMetadata.totalChecks,
      warningsCount: fraudMetadata.warnings?.length || 0
    });

    // Block submissions with critical risk level
    if (fraudMetadata.riskLevel === 'critical') {
      console.warn('🚫 [FRAUD] Blocked critical risk submission:', { userId, riskScore: fraudMetadata.riskScore });
      return sendError(res, 'Submission blocked due to security concerns. Please contact support.', 403);
    }

    // Block if trust score is too low
    if (fraudMetadata.trustScore !== undefined && fraudMetadata.trustScore < 20) {
      console.warn('🚫 [FRAUD] Blocked low trust score submission:', { userId, trustScore: fraudMetadata.trustScore });
      return sendError(res, 'Device verification failed. Please try again or contact support.', 403);
    }
  }

  try {
    // Validate URL format based on platform
    // Note: Instagram supports /p/, /reel/, and /reels/ URLs
    const urlPatterns: Record<string, RegExp> = {
      instagram: /^https?:\/\/(www\.)?instagram\.com\/([\w.]+\/)?(p|reel|reels|instagramreel)\/[a-zA-Z0-9_-]+\/?(\?.*)?$/,
      facebook: /^https?:\/\/(www\.)?facebook\.com\//,
      twitter: /^https?:\/\/(www\.)?(twitter|x)\.com\/.*\/status\/[0-9]+/,
      tiktok: /^https?:\/\/(www\.)?tiktok\.com\//
    };

    const urlIsValid = urlPatterns[platform]?.test(postUrl);
    console.log('📱 [SOCIAL MEDIA] URL validation:', { platform, postUrl, urlIsValid, pattern: urlPatterns[platform]?.toString() });

    if (!urlIsValid) {
      console.log('❌ [SOCIAL MEDIA] URL validation FAILED');
      return sendError(res, `Invalid ${platform} post URL format`, 400);
    }
    console.log('✅ [SOCIAL MEDIA] URL validation PASSED');

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

    // FRAUD PREVENTION CHECK 3: Check cooldown period (1 hour - aligned with frontend)
    const cooldownTime = new Date(Date.now() - RATE_LIMITS.COOLDOWN_HOURS * 60 * 60 * 1000);
    const recentSubmission = await SocialMediaPost.findOne({
      user: userId,
      submittedAt: { $gte: cooldownTime }
    });
    if (recentSubmission) {
      const minutesRemaining = Math.ceil((recentSubmission.submittedAt.getTime() + RATE_LIMITS.COOLDOWN_HOURS * 60 * 60 * 1000 - Date.now()) / (60 * 1000));
      console.warn('⚠️ [FRAUD] User in cooldown period:', { userId, minutesRemaining });
      return sendError(res, `Please wait ${minutesRemaining} minutes before submitting another post`, 429);
    }

    // FRAUD PREVENTION CHECK 4: Check rejection cooldown (24 hours after rejection)
    const rejectionCooldownTime = new Date(Date.now() - RATE_LIMITS.REJECTION_COOLDOWN_HOURS * 60 * 60 * 1000);
    const recentRejection = await SocialMediaPost.findOne({
      user: userId,
      status: 'rejected',
      reviewedAt: { $gte: rejectionCooldownTime }
    });
    if (recentRejection) {
      const hoursRemaining = Math.ceil((recentRejection.reviewedAt!.getTime() + RATE_LIMITS.REJECTION_COOLDOWN_HOURS * 60 * 60 * 1000 - Date.now()) / (60 * 60 * 1000));
      console.warn('⚠️ [FRAUD] User in rejection cooldown:', { userId, hoursRemaining });
      return sendError(res, `Your last post was rejected. Please wait ${hoursRemaining} hours before submitting again.`, 429);
    }

    // FRAUD PREVENTION CHECK 5: Check daily limit (3 posts per day)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todaySubmissions = await SocialMediaPost.countDocuments({
      user: userId,
      submittedAt: { $gte: oneDayAgo }
    });
    if (todaySubmissions >= RATE_LIMITS.DAILY_LIMIT) {
      console.warn('⚠️ [FRAUD] User exceeded daily limit:', { userId, submissions: todaySubmissions });
      return sendError(res, `Maximum ${RATE_LIMITS.DAILY_LIMIT} submissions per day reached. Please try again tomorrow.`, 429);
    }

    // FRAUD PREVENTION CHECK 6: Check weekly limit (10 posts per week)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklySubmissions = await SocialMediaPost.countDocuments({
      user: userId,
      submittedAt: { $gte: oneWeekAgo }
    });
    if (weeklySubmissions >= RATE_LIMITS.WEEKLY_LIMIT) {
      console.warn('⚠️ [FRAUD] User exceeded weekly limit:', { userId, submissions: weeklySubmissions });
      return sendError(res, `Maximum ${RATE_LIMITS.WEEKLY_LIMIT} submissions per week reached. Please try again next week.`, 429);
    }

    // FRAUD PREVENTION CHECK 7: Check monthly limit (30 posts per month)
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlySubmissions = await SocialMediaPost.countDocuments({
      user: userId,
      submittedAt: { $gte: oneMonthAgo }
    });
    if (monthlySubmissions >= RATE_LIMITS.MONTHLY_LIMIT) {
      console.warn('⚠️ [FRAUD] User exceeded monthly limit:', { userId, submissions: monthlySubmissions });
      return sendError(res, `Maximum ${RATE_LIMITS.MONTHLY_LIMIT} submissions per month reached.`, 429);
    }

    // Calculate cashback amount and extract store/merchant info
    let cashbackAmount = 0;
    let orderNumber = '';
    let storeId: Types.ObjectId | undefined;
    let merchantId: Types.ObjectId | undefined;

    if (orderId) {
      const order = await Order.findOne({ _id: orderId, user: userId })
        .populate({
          path: 'items.store',
          select: 'merchantId name' // NOTE: Store model uses 'merchantId', not 'merchant'
        });

      if (order) {
        const orderTotal = order.totals?.subtotal || 0;
        cashbackAmount = Math.round(orderTotal * 0.05); // 5% cashback (based on subtotal)
        orderNumber = order.orderNumber;

        // Extract store and merchant from order items
        // Use the first item's store (primary store for this order)
        const firstItemWithStore = order.items?.find((item: any) => item.store);
        if (firstItemWithStore && firstItemWithStore.store) {
          const store = firstItemWithStore.store as any;
          storeId = typeof store === 'object' ? store._id : store;

          // Get merchantId from store if populated
          // NOTE: Store model uses 'merchantId' field, not 'merchant'
          if (typeof store === 'object' && store.merchantId) {
            merchantId = store.merchantId;
          }
        }

        console.log('📦 [SOCIAL MEDIA] Order store/merchant:', { storeId, merchantId, orderNumber });
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

    // Determine if manual review is required based on risk level
    const requiresManualReview = fraudMetadata && (
      fraudMetadata.riskLevel === 'high' ||
      fraudMetadata.riskScore > 60 ||
      (fraudMetadata.warnings && fraudMetadata.warnings.length > 2)
    );

    // Create post submission
    const post = new SocialMediaPost({
      user: userId,
      order: orderId,
      store: storeId, // Link to store for merchant verification
      merchant: merchantId, // Link to merchant for filtering
      platform,
      postUrl,
      status: 'pending',
      cashbackAmount,
      cashbackPercentage: 5,
      submittedAt: new Date(),
      submissionIp: typeof submissionIp === 'string' ? submissionIp : submissionIp?.[0],
      deviceFingerprint: deviceFingerprint || fraudMetadata?.deviceId,
      userAgent,
      metadata: {
        orderNumber,
        // Store fraud metadata for review
        fraudMetadata: fraudMetadata ? {
          trustScore: fraudMetadata.trustScore,
          riskScore: fraudMetadata.riskScore,
          riskLevel: fraudMetadata.riskLevel,
          checksPassed: fraudMetadata.checksPassed,
          totalChecks: fraudMetadata.totalChecks,
          warnings: fraudMetadata.warnings,
          requiresManualReview
        } : undefined
      }
    });

    await post.save();

    console.log('========================================');
    console.log('✅ [SOCIAL MEDIA] POST SAVED SUCCESSFULLY');
    console.log('========================================');
    console.log('📱 [SOCIAL MEDIA] Saved post details:', JSON.stringify({
      postId: post._id,
      userId: post.user,
      orderId: post.order,
      storeId: post.store,
      status: post.status,
      cashbackAmount: post.cashbackAmount
    }, null, 2));

    // Audit Log: Track submission
    await AuditLog.log({
      merchantId: new Types.ObjectId('000000000000000000000000'), // System/user activity
      merchantUserId: new Types.ObjectId(userId),
      action: 'social_media_post_submitted',
      resourceType: 'SocialMediaPost',
      resourceId: post._id as Types.ObjectId,
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
        storeId: post.store,
        estimatedReview: '24 hours'
      }
    }, 'Post submitted successfully! The merchant will verify your post within 24 hours.', 201);

  } catch (error) {
    console.error('❌ [SOCIAL MEDIA] Submit error:', error);
    throw new AppError('Failed to submit post', 500);
  }
});

// Submit a new social media post with media files (photo/video proof)
export const submitPostWithMedia = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { platform, orderId, fraudMetadata } = req.body;
  const files = req.files as Express.Multer.File[];

  console.log('\n========================================');
  console.log('📱 [SOCIAL MEDIA] SUBMIT POST WITH MEDIA START');
  console.log('========================================');
  console.log('📱 [SOCIAL MEDIA] Request:', JSON.stringify({ userId, platform, orderId, fileCount: files?.length }, null, 2));

  // Log fraud metadata if provided
  if (fraudMetadata) {
    const parsed = typeof fraudMetadata === 'string' ? JSON.parse(fraudMetadata) : fraudMetadata;
    if (parsed.riskLevel === 'critical') {
      return sendError(res, 'Submission blocked due to security concerns. Please contact support.', 403);
    }
    if (parsed.trustScore !== undefined && parsed.trustScore < 20) {
      return sendError(res, 'Device verification failed. Please try again or contact support.', 403);
    }
  }

  try {
    if (!files || files.length === 0) {
      return sendError(res, 'At least one photo or video is required', 400);
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

    // FRAUD PREVENTION CHECK 3: Check cooldown period (1 hour)
    const cooldownTime = new Date(Date.now() - RATE_LIMITS.COOLDOWN_HOURS * 60 * 60 * 1000);
    const recentSubmission = await SocialMediaPost.findOne({
      user: userId,
      submittedAt: { $gte: cooldownTime }
    });
    if (recentSubmission) {
      const minutesRemaining = Math.ceil((recentSubmission.submittedAt.getTime() + RATE_LIMITS.COOLDOWN_HOURS * 60 * 60 * 1000 - Date.now()) / (60 * 1000));
      return sendError(res, `Please wait ${minutesRemaining} minutes before submitting another post`, 429);
    }

    // FRAUD PREVENTION CHECK 4: Check rejection cooldown (24 hours)
    const rejectionCooldownTime = new Date(Date.now() - RATE_LIMITS.REJECTION_COOLDOWN_HOURS * 60 * 60 * 1000);
    const recentRejection = await SocialMediaPost.findOne({
      user: userId,
      status: 'rejected',
      reviewedAt: { $gte: rejectionCooldownTime }
    });
    if (recentRejection) {
      const hoursRemaining = Math.ceil((recentRejection.reviewedAt!.getTime() + RATE_LIMITS.REJECTION_COOLDOWN_HOURS * 60 * 60 * 1000 - Date.now()) / (60 * 60 * 1000));
      return sendError(res, `Your last post was rejected. Please wait ${hoursRemaining} hours before submitting again.`, 429);
    }

    // FRAUD PREVENTION CHECK 5: Daily limit
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todaySubmissions = await SocialMediaPost.countDocuments({
      user: userId,
      submittedAt: { $gte: oneDayAgo }
    });
    if (todaySubmissions >= RATE_LIMITS.DAILY_LIMIT) {
      return sendError(res, `Maximum ${RATE_LIMITS.DAILY_LIMIT} submissions per day reached. Please try again tomorrow.`, 429);
    }

    // FRAUD PREVENTION CHECK 6: Weekly limit
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklySubmissions = await SocialMediaPost.countDocuments({
      user: userId,
      submittedAt: { $gte: oneWeekAgo }
    });
    if (weeklySubmissions >= RATE_LIMITS.WEEKLY_LIMIT) {
      return sendError(res, `Maximum ${RATE_LIMITS.WEEKLY_LIMIT} submissions per week reached.`, 429);
    }

    // FRAUD PREVENTION CHECK 7: Monthly limit
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlySubmissions = await SocialMediaPost.countDocuments({
      user: userId,
      submittedAt: { $gte: oneMonthAgo }
    });
    if (monthlySubmissions >= RATE_LIMITS.MONTHLY_LIMIT) {
      return sendError(res, `Maximum ${RATE_LIMITS.MONTHLY_LIMIT} submissions per month reached.`, 429);
    }

    // Extract Cloudinary URLs from uploaded files
    const proofMedia = files.map((file: any) => ({
      type: (file.mimetype?.startsWith('video/') ? 'video' : 'image') as 'image' | 'video',
      url: file.path || file.secure_url || file.url,
      publicId: file.filename || file.public_id || ''
    }));

    // Calculate cashback amount
    let cashbackAmount = 0;
    let orderNumber = '';
    let storeId: Types.ObjectId | undefined;
    let merchantId: Types.ObjectId | undefined;

    if (orderId) {
      const order = await Order.findOne({ _id: orderId, user: userId })
        .populate({
          path: 'items.store',
          select: 'merchantId name'
        });

      if (order) {
        const orderTotal = order.totals?.subtotal || 0;
        cashbackAmount = Math.round(orderTotal * 0.05);
        orderNumber = order.orderNumber;

        const firstItemWithStore = order.items?.find((item: any) => item.store);
        if (firstItemWithStore && firstItemWithStore.store) {
          const store = firstItemWithStore.store as any;
          storeId = typeof store === 'object' ? store._id : store;
          if (typeof store === 'object' && store.merchantId) {
            merchantId = store.merchantId;
          }
        }
      }
    }

    // Capture request metadata
    const submissionIp = req.ip || req.socket.remoteAddress || req.headers['x-forwarded-for'];
    const deviceFingerprint = req.headers['x-device-id'] as string;
    const userAgent = req.headers['user-agent'];

    // Create post with media
    const post = new SocialMediaPost({
      user: userId,
      order: orderId,
      store: storeId,
      merchant: merchantId,
      platform,
      postUrl: proofMedia[0]?.url || '', // Use first file URL as postUrl
      submissionType: 'media',
      proofMedia,
      status: 'pending',
      cashbackAmount,
      cashbackPercentage: 5,
      submittedAt: new Date(),
      submissionIp: typeof submissionIp === 'string' ? submissionIp : submissionIp?.[0],
      deviceFingerprint: deviceFingerprint,
      userAgent,
      metadata: {
        orderNumber
      }
    });

    await post.save();

    console.log('✅ [SOCIAL MEDIA] POST WITH MEDIA SAVED:', {
      postId: post._id,
      mediaCount: proofMedia.length,
      cashbackAmount: post.cashbackAmount
    });

    // Audit Log
    await AuditLog.log({
      merchantId: new Types.ObjectId('000000000000000000000000'),
      merchantUserId: new Types.ObjectId(userId),
      action: 'social_media_post_submitted',
      resourceType: 'SocialMediaPost',
      resourceId: post._id as Types.ObjectId,
      details: {
        changes: {
          platform,
          submissionType: 'media',
          mediaCount: proofMedia.length,
          cashbackAmount,
          orderId
        }
      },
      ipAddress: typeof submissionIp === 'string' ? submissionIp : submissionIp?.[0] || '0.0.0.0',
      userAgent: userAgent || 'unknown'
    });

    // Trigger achievement update
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
        storeId: post.store,
        mediaCount: proofMedia.length,
        estimatedReview: '24 hours'
      }
    }, 'Post submitted successfully! The merchant will verify your post within 24 hours.', 201);

  } catch (error) {
    console.error('❌ [SOCIAL MEDIA] Submit with media error:', error);
    throw new AppError('Failed to submit post with media', 500);
  }
});

// Get user's posts
export const getUserPosts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { page = 1, limit = 20, status } = req.query;

  console.log('\n========================================');
  console.log('📱 [SOCIAL MEDIA] GET USER POSTS');
  console.log('========================================');
  console.log('📱 [SOCIAL MEDIA] Query params:', { userId, page, limit, status });

  try {
    const query: any = { user: userId };
    if (status) {
      query.status = status;
    }

    console.log('📱 [SOCIAL MEDIA] MongoDB query:', JSON.stringify(query));

    const skip = (Number(page) - 1) * Number(limit);

    const posts = await SocialMediaPost.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await SocialMediaPost.countDocuments(query);
    const totalPages = Math.ceil(total / Number(limit));

    console.log(`✅ [SOCIAL MEDIA] Found ${posts.length} posts, total: ${total}`);
    if (posts.length > 0) {
      console.log('📱 [SOCIAL MEDIA] First post:', JSON.stringify(posts[0], null, 2));
    }

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
        merchantId: new Types.ObjectId('000000000000000000000000'), // System/user activity
        merchantUserId: new Types.ObjectId(reviewerId),
        action: 'social_media_post_approved',
        resourceType: 'SocialMediaPost',
        resourceId: post._id as Types.ObjectId,
        details: {
          changes: {
            postUser: post.user,
            platform: post.platform,
            cashbackAmount: post.cashbackAmount
          }
        },
        ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0') as string,
        userAgent: (req.headers['user-agent'] || 'unknown') as string
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
        merchantId: new Types.ObjectId('000000000000000000000000'), // System/user activity
        merchantUserId: new Types.ObjectId(reviewerId),
        action: 'social_media_post_rejected',
        resourceType: 'SocialMediaPost',
        resourceId: post._id as Types.ObjectId,
        details: {
          changes: {
            postUser: post.user,
            platform: post.platform,
            rejectionReason
          }
        },
        ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0') as string,
        userAgent: (req.headers['user-agent'] || 'unknown') as string
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
        merchantId: new Types.ObjectId('000000000000000000000000'), // System/user activity
        merchantUserId: new Types.ObjectId(reviewerId),
        action: 'social_media_cashback_credited',
        resourceType: 'SocialMediaPost',
        resourceId: post._id as Types.ObjectId,
        details: {
          changes: {
            postUser: post.user,
            cashbackAmount: post.cashbackAmount,
            walletId: wallet._id,
            newWalletBalance: wallet.balance.total
          }
        },
        ipAddress: (req.ip || req.socket.remoteAddress || '0.0.0.0') as string,
        userAgent: (req.headers['user-agent'] || 'unknown') as string
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

// ============================================================================
// INSTAGRAM VERIFICATION ENDPOINTS
// ============================================================================

// Configuration for Instagram content requirements
const INSTAGRAM_CONFIG = {
  REQUIRED_BRAND_MENTIONS: ['@rezapp', '#rezapp', 'rez app', 'rezapp'],
  REQUIRED_HASHTAGS: ['#cashback', '#shopping'],
  OPTIONAL_HASHTAGS: ['#deals', '#savings', '#onlineshopping'],
  MIN_CAPTION_LENGTH: 20,
  MAX_POST_AGE_DAYS: 30,
  CONTENT_MATCH_THRESHOLD: 0.6,
  MIN_FOLLOWERS: 100,
  MIN_POSTS: 10
};

// Helper: Parse Instagram URL
const parseInstagramUrl = (url: string): {
  postId?: string;
  username?: string;
  postType?: 'post' | 'reel';
  isValid: boolean;
} => {
  try {
    const cleanUrl = url.trim().toLowerCase();

    // Pattern 1: instagram.com/p/POST_ID
    const pattern1 = /instagram\.com\/p\/([a-zA-Z0-9_-]+)/i;
    const match1 = url.match(pattern1);
    if (match1) {
      return { postId: match1[1], postType: 'post', isValid: true };
    }

    // Pattern 2: instagram.com/reel/POST_ID
    const pattern2 = /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/i;
    const match2 = url.match(pattern2);
    if (match2) {
      return { postId: match2[1], postType: 'reel', isValid: true };
    }

    // Pattern 3: instagram.com/USERNAME/p/POST_ID
    const pattern3 = /instagram\.com\/([\w.]+)\/p\/([a-zA-Z0-9_-]+)/i;
    const match3 = url.match(pattern3);
    if (match3) {
      return { username: match3[1], postId: match3[2], postType: 'post', isValid: true };
    }

    // Pattern 4: instagram.com/USERNAME/reel/POST_ID
    const pattern4 = /instagram\.com\/([\w.]+)\/reel\/([a-zA-Z0-9_-]+)/i;
    const match4 = url.match(pattern4);
    if (match4) {
      return { username: match4[1], postId: match4[2], postType: 'reel', isValid: true };
    }

    return { isValid: false };
  } catch {
    return { isValid: false };
  }
};

// Helper: Analyze caption content
const analyzeCaption = (caption: string = ''): {
  hasBrandMention: boolean;
  hasRequiredHashtags: boolean;
  brandMentions: string[];
  requiredHashtags: string[];
  optionalHashtags: string[];
  matchScore: number;
} => {
  const lowerCaption = caption.toLowerCase();

  // Check brand mentions
  const brandMentions = INSTAGRAM_CONFIG.REQUIRED_BRAND_MENTIONS.filter(
    mention => lowerCaption.includes(mention.toLowerCase())
  );
  const hasBrandMention = brandMentions.length > 0;

  // Check required hashtags
  const requiredHashtags = INSTAGRAM_CONFIG.REQUIRED_HASHTAGS.filter(
    tag => lowerCaption.includes(tag.toLowerCase())
  );
  const hasRequiredHashtags = requiredHashtags.length > 0;

  // Check optional hashtags
  const optionalHashtags = INSTAGRAM_CONFIG.OPTIONAL_HASHTAGS.filter(
    tag => lowerCaption.includes(tag.toLowerCase())
  );

  // Calculate match score (0-100)
  let matchScore = 0;
  if (hasBrandMention) matchScore += 50;
  if (hasRequiredHashtags) matchScore += 30;
  if (caption.length >= INSTAGRAM_CONFIG.MIN_CAPTION_LENGTH) matchScore += 10;
  if (optionalHashtags.length > 0) matchScore += 10;

  return {
    hasBrandMention,
    hasRequiredHashtags,
    brandMentions,
    requiredHashtags,
    optionalHashtags,
    matchScore: Math.min(matchScore, 100)
  };
};

// Verify Instagram post
export const verifyInstagramPost = asyncHandler(async (req: Request, res: Response) => {
  const { url, postId: providedPostId, username: providedUsername } = req.body;

  console.log('📸 [INSTAGRAM] Verifying post:', { url });

  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Step 1: Parse and validate URL
    const parsed = parseInstagramUrl(url);
    if (!parsed.isValid || !parsed.postId) {
      errors.push('Invalid Instagram URL format');
      return sendSuccess(res, {
        isValid: false,
        exists: false,
        isAccessible: false,
        errors,
        warnings
      });
    }

    const postId = providedPostId || parsed.postId;
    const username = providedUsername || parsed.username;

    // Step 2: Simulate post verification
    // NOTE: In production, this would call Instagram Graph API
    // For now, we verify URL format and return simulated data

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // For demo purposes, assume post exists and is accessible
    // In production, you would:
    // 1. Use Instagram Graph API with a valid access token
    // 2. Call GET /{post-id}?fields=id,caption,media_type,timestamp,username
    // 3. Handle API errors (post deleted, private, etc.)

    const simulatedPostData = {
      id: postId,
      permalink: url,
      caption: `Amazing purchase from @rezapp! #cashback #shopping #deals - Love this product!`,
      media_type: parsed.postType === 'reel' ? 'VIDEO' : 'IMAGE',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      username: username || 'user123'
    };

    const simulatedAccountData = {
      id: 'account_' + postId,
      username: username || 'user123',
      account_type: 'PERSONAL',
      followers_count: 250,
      follows_count: 180,
      media_count: 45
    };

    // Step 3: Analyze content
    const contentAnalysis = analyzeCaption(simulatedPostData.caption);

    if (!contentAnalysis.hasBrandMention) {
      warnings.push(`Post should mention our brand: ${INSTAGRAM_CONFIG.REQUIRED_BRAND_MENTIONS.slice(0, 2).join(', ')}`);
    }

    if (!contentAnalysis.hasRequiredHashtags) {
      warnings.push(`Post should include hashtags: ${INSTAGRAM_CONFIG.REQUIRED_HASHTAGS.join(', ')}`);
    }

    if (contentAnalysis.matchScore < INSTAGRAM_CONFIG.CONTENT_MATCH_THRESHOLD * 100) {
      warnings.push(`Content match score is ${contentAnalysis.matchScore}%. Consider adding more relevant content.`);
    }

    // Step 4: Check post age
    const postDate = new Date(simulatedPostData.timestamp);
    const daysSincePost = (Date.now() - postDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePost > INSTAGRAM_CONFIG.MAX_POST_AGE_DAYS) {
      warnings.push(`Post is ${Math.floor(daysSincePost)} days old. We prefer posts from the last ${INSTAGRAM_CONFIG.MAX_POST_AGE_DAYS} days.`);
    }

    // Step 5: Check account requirements
    if (simulatedAccountData.followers_count < INSTAGRAM_CONFIG.MIN_FOLLOWERS) {
      warnings.push(`Account has fewer than ${INSTAGRAM_CONFIG.MIN_FOLLOWERS} followers`);
    }

    if (simulatedAccountData.media_count < INSTAGRAM_CONFIG.MIN_POSTS) {
      warnings.push(`Account has fewer than ${INSTAGRAM_CONFIG.MIN_POSTS} posts`);
    }

    console.log('✅ [INSTAGRAM] Post verification complete');

    sendSuccess(res, {
      isValid: errors.length === 0,
      exists: true,
      isAccessible: true,
      postData: simulatedPostData,
      accountData: simulatedAccountData,
      contentMatches: {
        hasBrandMention: contentAnalysis.hasBrandMention,
        hasRequiredHashtags: contentAnalysis.hasRequiredHashtags,
        hasProductMention: true, // Simulated
        matchScore: contentAnalysis.matchScore
      },
      errors,
      warnings
    });

  } catch (error) {
    console.error('❌ [INSTAGRAM] Verification error:', error);
    errors.push('Failed to verify Instagram post');
    sendSuccess(res, {
      isValid: false,
      exists: false,
      isAccessible: false,
      errors,
      warnings
    });
  }
});

// Verify Instagram account
export const verifyInstagramAccount = asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.body;

  console.log('📸 [INSTAGRAM] Verifying account:', username);

  const errors: string[] = [];

  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // In production, this would call Instagram Graph API
    // GET /{username}?fields=id,username,account_type,followers_count,media_count

    const simulatedAccountData = {
      id: 'account_' + username,
      username,
      account_type: 'PERSONAL',
      followers_count: Math.floor(Math.random() * 500) + 100,
      follows_count: Math.floor(Math.random() * 300) + 50,
      media_count: Math.floor(Math.random() * 100) + 10,
      profile_picture_url: `https://picsum.photos/seed/${username}/200/200`,
      is_verified: false
    };

    console.log('✅ [INSTAGRAM] Account verification complete');

    sendSuccess(res, {
      isValid: true,
      accountData: simulatedAccountData,
      errors
    });

  } catch (error) {
    console.error('❌ [INSTAGRAM] Account verification error:', error);
    errors.push('Failed to verify Instagram account');
    sendSuccess(res, {
      isValid: false,
      errors
    });
  }
});

// Extract Instagram post data
export const extractInstagramPostData = asyncHandler(async (req: Request, res: Response) => {
  const { url, postId: providedPostId } = req.body;

  console.log('📸 [INSTAGRAM] Extracting post data:', { url });

  try {
    const parsed = parseInstagramUrl(url);
    if (!parsed.isValid || !parsed.postId) {
      return sendError(res, 'Invalid Instagram URL', 400);
    }

    const postId = providedPostId || parsed.postId;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // In production, this would fetch actual thumbnail from Instagram
    const thumbnailUrl = `https://picsum.photos/seed/${postId}/400/400`;

    console.log('✅ [INSTAGRAM] Post data extracted');

    sendSuccess(res, {
      success: true,
      postId,
      username: parsed.username,
      postType: parsed.postType,
      thumbnailUrl
    });

  } catch (error) {
    console.error('❌ [INSTAGRAM] Extract data error:', error);
    sendError(res, 'Failed to extract post data', 500);
  }
});
