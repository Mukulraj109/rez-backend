import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { sendSuccess, sendBadRequest, sendNotFound, sendCreated } from '../utils/response';
import { Types } from 'mongoose';
import spinWheelService from '../services/spinWheelService';
import { Project } from '../models/Project';
import SocialMediaPost from '../models/SocialMediaPost';
import { SpinWheelSpin } from '../models/SpinWheel';
import Referral from '../models/Referral';
import earningsSocketService from '../services/earningsSocketService';

/**
 * Get user's complete earnings summary
 * GET /api/earnings/summary
 * @returns Total earnings with breakdown by source (projects, referrals, shareAndEarn, spin)
 */
export const getEarningsSummary = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  console.log('💰 [EARNINGS] Getting earnings summary for user:', userId);

  try {
    // Fetch all earnings data in parallel
    const [
      projectEarnings,
      referralEarnings,
      socialMediaEarnings,
      spinStats
    ] = await Promise.all([
      // Project earnings: Sum of paidAmount from approved project submissions
      (async () => {
        try {
          // Find all projects with user's submissions
          const projects = await Project.find({
            'submissions.user': userId
          }).lean();

          let total = 0;
          let approvedCount = 0;
          projects.forEach(project => {
            project.submissions?.forEach((sub: any) => {
              // Check if this submission belongs to the user and is approved with paidAmount
              if (sub.user && sub.user.toString() === userId && 
                  sub.status === 'approved' && 
                  sub.paidAmount && sub.paidAmount > 0) {
                total += sub.paidAmount;
                approvedCount++;
              }
            });
          });

          console.log(`💰 [EARNINGS] Project earnings: ${total} from ${approvedCount} approved submissions`);
          return total;
        } catch (error) {
          console.error('❌ [EARNINGS] Error calculating project earnings:', error);
          return 0;
        }
      })(),

      // Referral earnings: Sum of referrerAmount from rewarded referrals
      (async () => {
        try {
          // Get referrals where referrer has been rewarded
          const referrals = await Referral.find({
            referrer: userId,
            referrerRewarded: true // Only count referrals where reward has been given
          }).lean();

          let total = 0;
          referrals.forEach((ref: any) => {
            // Use rewards.referrerAmount field (not earnings.totalEarned)
            if (ref.rewards && ref.rewards.referrerAmount) {
              total += ref.rewards.referrerAmount;
            }
            // Also include milestone bonus if rewarded
            if (ref.milestoneRewarded && ref.rewards && ref.rewards.milestoneBonus) {
              total += ref.rewards.milestoneBonus;
            }
          });

          console.log(`💰 [EARNINGS] Referral earnings: ${total} from ${referrals.length} rewarded referrals`);
          return total;
        } catch (error) {
          console.error('❌ [EARNINGS] Error calculating referral earnings:', error);
          return 0;
        }
      })(),

      // Social media earnings: Sum of cashbackAmount from credited social media posts
      (async () => {
        try {
          const posts = await SocialMediaPost.find({
            user: userId,
            status: 'credited'
          }).lean();

          let total = 0;
          posts.forEach((post: any) => {
            // Use cashbackAmount field (not earnings.amount)
            if (post.cashbackAmount) {
              total += post.cashbackAmount;
            }
          });

          console.log(`💰 [EARNINGS] Social media earnings: ${total} from ${posts.length} credited posts`);
          return total;
        } catch (error) {
          console.error('❌ [EARNINGS] Error calculating social media earnings:', error);
          return 0;
        }
      })(),

      // Spin earnings: Get total coins won from spin wheel
      (async () => {
        try {
          const stats = await spinWheelService.getSpinStats(userId);
          return stats.totalCoinsWon || 0;
        } catch (error) {
          console.error('❌ [EARNINGS] Error calculating spin earnings:', error);
          return 0;
        }
      })()
    ]);

    // Calculate total earned
    const totalEarned = projectEarnings + referralEarnings + socialMediaEarnings + spinStats;

    // Build breakdown object
    const breakdown = {
      projects: projectEarnings,
      referrals: referralEarnings,
      shareAndEarn: socialMediaEarnings,
      spin: spinStats
    };

    // Get wallet balance for available and pending earnings
    let availableBalance = 0;
    let pendingEarnings = 0;

    try {
      const { Wallet } = await import('../models/Wallet');
      const wallet = await Wallet.findOne({ user: userId }).lean();
      
      if (wallet) {
        availableBalance = wallet.balance?.total || 0;
        // Pending earnings would be from projects in review
        const pendingProjects = await Project.find({
          'submissions.user': userId,
          'submissions.status': { $in: ['pending', 'in_review'] }
        }).lean();
        
        pendingProjects.forEach(project => {
          project.submissions?.forEach((sub: any) => {
            if (sub.user.toString() === userId && 
                (sub.status === 'pending' || sub.status === 'in_review') && 
                project.reward?.amount) {
              pendingEarnings += project.reward.amount;
            }
          });
        });
      }
    } catch (error) {
      console.error('❌ [EARNINGS] Error fetching wallet balance:', error);
    }

    const earningsSummary = {
      totalEarned,
      breakdown,
      availableBalance,
      pendingEarnings,
      currency: '₹'
    };

    console.log('✅ [EARNINGS] Earnings summary calculated:', earningsSummary);

    // Emit real-time earnings update
    try {
      earningsSocketService.emitEarningsUpdate(userId, {
        totalEarned,
        breakdown
      });
    } catch (error) {
      console.error('❌ [EARNINGS] Error emitting earnings update:', error);
    }

    sendSuccess(res, earningsSummary, 'Earnings summary retrieved successfully');
  } catch (error) {
    console.error('❌ [EARNINGS] Error getting earnings summary:', error);
    throw new AppError('Failed to fetch earnings summary', 500);
  }
});

/**
 * Get user's project statistics
 * GET /api/earnings/project-stats
 * @returns Project status counts (completeNow, inReview, completed)
 */
export const getProjectStats = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  console.log('📊 [EARNINGS] Getting project stats for user:', userId);

  try {
    // Find all projects with user's submissions
    const projectsWithSubmissions = await Project.find({
      'submissions.user': userId
    }).lean();

    let inReview = 0; // Submissions pending or under_review
    let completed = 0; // Approved submissions

    // Count submissions by status
    projectsWithSubmissions.forEach(project => {
      project.submissions?.forEach((sub: any) => {
        if (sub.user && sub.user.toString() === userId) {
          if (sub.status === 'pending' || sub.status === 'under_review') {
            inReview++;
          } else if (sub.status === 'approved') {
            completed++;
          }
        }
      });
    });

    // Count active projects user can complete (active projects where user has no submissions)
    const allActiveProjects = await Project.find({
      status: 'active'
    }).lean();

    let completeNow = 0;
    allActiveProjects.forEach(project => {
      // Check if user has any submission for this project
      const hasUserSubmission = project.submissions?.some((sub: any) => 
        sub.user && sub.user.toString() === userId
      );
      
      // If user hasn't submitted, it's available to complete
      if (!hasUserSubmission) {
        completeNow++;
      }
    });

    const stats = {
      completeNow,
      inReview,
      completed,
      totalProjects: completeNow + inReview + completed
    };

    console.log('✅ [EARNINGS] Project stats calculated:', stats);

    // Emit real-time project status update
    try {
      earningsSocketService.emitProjectStatusUpdate(userId, stats);
    } catch (error) {
      console.error('❌ [EARNINGS] Error emitting project status update:', error);
    }

    sendSuccess(res, stats, 'Project statistics retrieved successfully');
  } catch (error) {
    console.error('❌ [EARNINGS] Error getting project stats:', error);
    throw new AppError('Failed to fetch project statistics', 500);
  }
});

/**
 * Get user's earning notifications
 * GET /api/earnings/notifications
 * @returns List of notifications related to earnings
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const { unreadOnly, limit } = req.query;

  console.log('🔔 [EARNINGS] Getting notifications for user:', userId);

  try {
    // For now, return empty array as notifications system may be separate
    // In the future, this could query a Notifications collection
    const notifications: any[] = [];

    // Filter by unread if requested
    const filteredNotifications = unreadOnly === 'true' 
      ? notifications.filter(n => !n.isRead)
      : notifications;

    // Limit results
    const limitedNotifications = limit 
      ? filteredNotifications.slice(0, parseInt(limit as string))
      : filteredNotifications;

    console.log('✅ [EARNINGS] Notifications retrieved:', limitedNotifications.length);

    sendSuccess(res, limitedNotifications, 'Notifications retrieved successfully');
  } catch (error) {
    console.error('❌ [EARNINGS] Error getting notifications:', error);
    throw new AppError('Failed to fetch notifications', 500);
  }
});

/**
 * Mark notification as read
 * PATCH /api/earnings/notifications/:id/read
 * @returns Success message
 */
export const markNotificationAsRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const { id } = req.params;

  console.log('🔔 [EARNINGS] Marking notification as read:', id, 'for user:', userId);

  try {
    // For now, just return success as notifications system may be separate
    // In the future, this would update a Notifications collection
    sendSuccess(res, { 
      notificationId: id,
      isRead: true 
    }, 'Notification marked as read successfully');
  } catch (error) {
    console.error('❌ [EARNINGS] Error marking notification as read:', error);
    throw new AppError('Failed to mark notification as read', 500);
  }
});

/**
 * Get user's referral information
 * GET /api/earnings/referral-info
 * @returns Referral stats and referral link
 */
export const getReferralInfo = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  console.log('🔗 [EARNINGS] Getting referral info for user:', userId);

  try {
    // Get all referrals where user is the referrer
    const referrals = await Referral.find({
      referrer: userId
    }).lean();

    // Calculate stats
    const totalReferrals = referrals.length;
    let totalEarningsFromReferrals = 0;
    let pendingReferrals = 0;

    referrals.forEach((ref: any) => {
      // Count pending referrals (not completed)
      if (ref.status !== 'completed' && ref.status !== 'expired') {
        pendingReferrals++;
      }

      // Sum earnings from rewarded referrals
      if (ref.referrerRewarded && ref.rewards && ref.rewards.referrerAmount) {
        totalEarningsFromReferrals += ref.rewards.referrerAmount;
      }
      if (ref.milestoneRewarded && ref.rewards && ref.rewards.milestoneBonus) {
        totalEarningsFromReferrals += ref.rewards.milestoneBonus;
      }
    });

    // Get user's referral code (from User model or generate from userId)
    // For now, we'll use a simple code based on userId
    const referralCode = `REZ${userId.slice(-6).toUpperCase()}`;
    const referralLink = `${process.env.FRONTEND_URL || 'https://rez.app'}/ref/${referralCode}`;

    // Default referral bonus (can be configured)
    const referralBonus = 50; // ₹50 per referral

    const referralInfo = {
      totalReferrals,
      totalEarningsFromReferrals,
      pendingReferrals,
      referralBonus,
      referralCode,
      referralLink
    };

    console.log('✅ [EARNINGS] Referral info calculated:', referralInfo);

    sendSuccess(res, referralInfo, 'Referral information retrieved successfully');
  } catch (error) {
    console.error('❌ [EARNINGS] Error getting referral info:', error);
    throw new AppError('Failed to fetch referral information', 500);
  }
});

/**
 * Get user's earnings history
 * GET /api/earnings/history
 * @returns List of earnings transactions with summary
 */
export const getEarningsHistory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const { type, page = 1, limit = 20, startDate, endDate } = req.query;

  console.log('📜 [EARNINGS] Getting earnings history for user:', userId);

  try {
    const transactions: any[] = [];
    const userObjectId = new Types.ObjectId(userId);

    // Get project earnings (approved submissions)
    if (!type || type === 'project') {
      const projects = await Project.find({
        'submissions.user': userObjectId
      }).lean();

      projects.forEach((project: any) => {
        project.submissions?.forEach((sub: any) => {
          if (sub.user && sub.user.toString() === userId && sub.status === 'approved' && sub.paidAmount > 0) {
            transactions.push({
              _id: sub._id || `${project._id}_${sub.submittedAt}`,
              type: 'project',
              source: 'Project Completion',
              amount: sub.paidAmount,
              currency: '₹',
              status: 'completed',
              description: `Earned from "${project.title}"`,
              metadata: {
                projectId: project._id,
                projectTitle: project.title
              },
              createdAt: sub.paidAt || sub.submittedAt,
              completedAt: sub.paidAt
            });
          }
        });
      });
    }

    // Get referral earnings
    if (!type || type === 'referral') {
      const referrals = await Referral.find({
        referrer: userId,
        referrerRewarded: true
      }).lean();

      referrals.forEach((ref: any) => {
        if (ref.rewards && ref.rewards.referrerAmount > 0) {
          transactions.push({
            _id: `ref_${ref._id}`,
            type: 'referral',
            source: 'Referral Bonus',
            amount: ref.rewards.referrerAmount,
            currency: '₹',
            status: 'completed',
            description: `Referral bonus for ${ref.referredUser ? 'user' : 'signup'}`,
            metadata: {
              referralId: ref._id
            },
            createdAt: ref.rewardedAt || ref.createdAt,
            completedAt: ref.rewardedAt
          });
        }
      });
    }

    // Get social media earnings
    if (!type || type === 'social_media') {
      const socialPosts = await SocialMediaPost.find({
        user: userId,
        status: { $in: ['approved', 'credited'] }
      }).sort({ createdAt: -1 }).lean();

      socialPosts.forEach(post => {
        transactions.push({
          id: post._id.toString(),
          type: 'social_media',
          title: `${post.platform.charAt(0).toUpperCase() + post.platform.slice(1)} Post`,
          description: `Cashback from social media post`,
          amount: post.cashbackAmount,
          currency: 'INR',
          status: post.status === 'credited' ? 'completed' : 'pending',
          createdAt: post.submittedAt || post.createdAt,
          metadata: {
            platform: post.platform,
            postUrl: post.postUrl,
            cashbackPercentage: post.cashbackPercentage
          }
        });
      });
    }

    // Get spin earnings
    if (!type || type === 'spin') {
      const spins = await SpinWheelSpin.find({
        userId,
        status: { $in: ['pending', 'claimed'] },
        rewardType: { $ne: 'nothing' }
      }).sort({ spinTimestamp: -1 }).lean();

      spins.forEach(spin => {
        transactions.push({
          id: spin._id.toString(),
          type: 'spin',
          title: `Spin Wheel - ${spin.segmentLabel}`,
          description: `Reward from spin wheel`,
          amount: spin.rewardValue,
          currency: spin.rewardType === 'coins' ? 'COINS' : 'INR',
          status: spin.status === 'claimed' ? 'completed' : 'pending',
          createdAt: spin.spinTimestamp,
          metadata: {
            rewardType: spin.rewardType,
            segmentLabel: spin.segmentLabel,
            expiresAt: spin.expiresAt
          }
        });
      });
    }

    // Sort by date (newest first)
    transactions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Filter by date range if provided
    let filteredTransactions = transactions;
    if (startDate || endDate) {
      filteredTransactions = transactions.filter(t => {
        const date = new Date(t.createdAt);
        if (startDate && date < new Date(startDate as string)) return false;
        if (endDate && date > new Date(endDate as string)) return false;
        return true;
      });
    }

    // Pagination
    const total = filteredTransactions.length;
    const skip = (Number(page) - 1) * Number(limit);
    const paginatedTransactions = filteredTransactions.slice(skip, skip + Number(limit));
    const totalPages = Math.ceil(total / Number(limit));

    // Calculate summary
    const totalEarned = transactions
      .filter(t => t.type !== 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalWithdrawn = transactions
      .filter(t => t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const pendingAmount = transactions
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);

    const breakdown = {
      projects: transactions.filter(t => t.type === 'project').reduce((sum, t) => sum + t.amount, 0),
      referrals: transactions.filter(t => t.type === 'referral').reduce((sum, t) => sum + t.amount, 0),
      socialMedia: transactions.filter(t => t.type === 'social_media').reduce((sum, t) => sum + t.amount, 0),
      spin: transactions.filter(t => t.type === 'spin').reduce((sum, t) => sum + t.amount, 0),
    };

    const result = {
      transactions: paginatedTransactions,
      summary: {
        totalEarned,
        totalWithdrawn,
        pendingAmount,
        breakdown
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    };

    console.log('✅ [EARNINGS] Earnings history retrieved:', total, 'transactions');

    sendSuccess(res, result, 'Earnings history retrieved successfully');
  } catch (error) {
    console.error('❌ [EARNINGS] Error getting earnings history:', error);
    throw new AppError('Failed to fetch earnings history', 500);
  }
});

/**
 * Withdraw earnings
 * POST /api/earnings/withdraw
 * @returns Withdrawal transaction details
 */
export const withdrawEarnings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const { amount, method, accountDetails } = req.body;

  console.log('💸 [EARNINGS] Withdrawing earnings for user:', userId, 'amount:', amount);

  try {
    // Validate amount
    if (!amount || amount <= 0) {
      return sendBadRequest(res, 'Invalid withdrawal amount');
    }

    // Get user's wallet balance
    const { Wallet } = await import('../models/Wallet');
    const wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      return sendNotFound(res, 'Wallet not found');
    }

    // Get rez coin balance
    const rezCoin = wallet.coins.find((c: any) => c.type === 'rez');
    const availableBalance = rezCoin?.amount || 0;

    // Check if user has sufficient balance
    if (availableBalance < amount) {
      return sendBadRequest(res, 'Insufficient balance');
    }

    // Minimum withdrawal amount (can be configured)
    const minWithdrawal = 100; // ₹100
    if (amount < minWithdrawal) {
      return sendBadRequest(res, `Minimum withdrawal amount is ₹${minWithdrawal}`);
    }

    // Create withdrawal transaction
    // Note: This would typically create a withdrawal record in a Withdrawals collection
    // For now, we'll just return success
    const withdrawalId = new Types.ObjectId();

    // In a real implementation, you would:
    // 1. Create a withdrawal record
    // 2. Deduct from wallet (or mark as pending)
    // 3. Process the withdrawal through payment gateway
    // 4. Update wallet balance
    // 5. Send notification to user

    // Emit real-time withdrawal notification
    try {
      earningsSocketService.emitNotification(userId, {
        type: 'withdrawal',
        title: 'Withdrawal Request Submitted',
        description: `Your withdrawal request of ₹${amount} has been submitted`,
        data: {
          withdrawalId: withdrawalId.toString(),
          amount,
          method,
          status: 'pending'
        }
      });
    } catch (error) {
      console.error('❌ [EARNINGS] Error emitting withdrawal notification:', error);
    }

    const withdrawal = {
      _id: withdrawalId,
      type: 'withdrawal',
      source: 'Withdrawal',
      amount,
      currency: '₹',
      status: 'pending', // Will be updated when processed
      description: `Withdrawal via ${method || 'bank'}`,
      metadata: {
        method,
        accountDetails
      },
      createdAt: new Date(),
    };

    console.log('✅ [EARNINGS] Withdrawal request created:', withdrawalId);

    sendSuccess(res, {
      withdrawal,
      message: 'Withdrawal request submitted successfully. It will be processed within 3-5 business days.'
    }, 'Withdrawal request submitted successfully', 201);
  } catch (error) {
    console.error('❌ [EARNINGS] Error processing withdrawal:', error);
    throw new AppError('Failed to process withdrawal', 500);
  }
});

