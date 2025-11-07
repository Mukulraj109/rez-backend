"use strict";
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
exports.withdrawEarnings = exports.getEarningsHistory = exports.getReferralInfo = exports.markNotificationAsRead = exports.getNotifications = exports.getProjectStats = exports.getEarningsSummary = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const response_1 = require("../utils/response");
const mongoose_1 = require("mongoose");
const spinWheelService_1 = __importDefault(require("../services/spinWheelService"));
const Project_1 = require("../models/Project");
const SocialMediaPost_1 = __importDefault(require("../models/SocialMediaPost"));
const Referral_1 = __importDefault(require("../models/Referral"));
const earningsSocketService_1 = __importDefault(require("../services/earningsSocketService"));
/**
 * Get user's complete earnings summary
 * GET /api/earnings/summary
 * @returns Total earnings with breakdown by source (projects, referrals, shareAndEarn, spin)
 */
exports.getEarningsSummary = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const userId = req.user._id.toString();
    console.log('💰 [EARNINGS] Getting earnings summary for user:', userId);
    try {
        // Fetch all earnings data in parallel
        const [projectEarnings, referralEarnings, socialMediaEarnings, spinStats] = await Promise.all([
            // Project earnings: Sum of paidAmount from approved project submissions
            (async () => {
                try {
                    // Find all projects with user's submissions
                    const projects = await Project_1.Project.find({
                        'submissions.user': userId
                    }).lean();
                    let total = 0;
                    let approvedCount = 0;
                    projects.forEach(project => {
                        project.submissions?.forEach((sub) => {
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
                }
                catch (error) {
                    console.error('❌ [EARNINGS] Error calculating project earnings:', error);
                    return 0;
                }
            })(),
            // Referral earnings: Sum of referrerAmount from rewarded referrals
            (async () => {
                try {
                    // Get referrals where referrer has been rewarded
                    const referrals = await Referral_1.default.find({
                        referrer: userId,
                        referrerRewarded: true // Only count referrals where reward has been given
                    }).lean();
                    let total = 0;
                    referrals.forEach((ref) => {
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
                }
                catch (error) {
                    console.error('❌ [EARNINGS] Error calculating referral earnings:', error);
                    return 0;
                }
            })(),
            // Social media earnings: Sum of cashbackAmount from credited social media posts
            (async () => {
                try {
                    const posts = await SocialMediaPost_1.default.find({
                        user: userId,
                        status: 'credited'
                    }).lean();
                    let total = 0;
                    posts.forEach((post) => {
                        // Use cashbackAmount field (not earnings.amount)
                        if (post.cashbackAmount) {
                            total += post.cashbackAmount;
                        }
                    });
                    console.log(`💰 [EARNINGS] Social media earnings: ${total} from ${posts.length} credited posts`);
                    return total;
                }
                catch (error) {
                    console.error('❌ [EARNINGS] Error calculating social media earnings:', error);
                    return 0;
                }
            })(),
            // Spin earnings: Get total coins won from spin wheel
            (async () => {
                try {
                    const stats = await spinWheelService_1.default.getSpinStats(userId);
                    return stats.totalCoinsWon || 0;
                }
                catch (error) {
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
            const { Wallet } = await Promise.resolve().then(() => __importStar(require('../models/Wallet')));
            const wallet = await Wallet.findOne({ user: userId }).lean();
            if (wallet) {
                availableBalance = wallet.balance?.total || 0;
                // Pending earnings would be from projects in review
                const pendingProjects = await Project_1.Project.find({
                    'submissions.user': userId,
                    'submissions.status': { $in: ['pending', 'in_review'] }
                }).lean();
                pendingProjects.forEach(project => {
                    project.submissions?.forEach((sub) => {
                        if (sub.user.toString() === userId &&
                            (sub.status === 'pending' || sub.status === 'in_review') &&
                            project.reward?.amount) {
                            pendingEarnings += project.reward.amount;
                        }
                    });
                });
            }
        }
        catch (error) {
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
            earningsSocketService_1.default.emitEarningsUpdate(userId, {
                totalEarned,
                breakdown
            });
        }
        catch (error) {
            console.error('❌ [EARNINGS] Error emitting earnings update:', error);
        }
        (0, response_1.sendSuccess)(res, earningsSummary, 'Earnings summary retrieved successfully');
    }
    catch (error) {
        console.error('❌ [EARNINGS] Error getting earnings summary:', error);
        throw new errorHandler_1.AppError('Failed to fetch earnings summary', 500);
    }
});
/**
 * Get user's project statistics
 * GET /api/earnings/project-stats
 * @returns Project status counts (completeNow, inReview, completed)
 */
exports.getProjectStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const userId = req.user._id.toString();
    console.log('📊 [EARNINGS] Getting project stats for user:', userId);
    try {
        // Find all projects with user's submissions
        const projectsWithSubmissions = await Project_1.Project.find({
            'submissions.user': userId
        }).lean();
        let inReview = 0; // Submissions pending or under_review
        let completed = 0; // Approved submissions
        // Count submissions by status
        projectsWithSubmissions.forEach(project => {
            project.submissions?.forEach((sub) => {
                if (sub.user && sub.user.toString() === userId) {
                    if (sub.status === 'pending' || sub.status === 'under_review') {
                        inReview++;
                    }
                    else if (sub.status === 'approved') {
                        completed++;
                    }
                }
            });
        });
        // Count active projects user can complete (active projects where user has no submissions)
        const allActiveProjects = await Project_1.Project.find({
            status: 'active'
        }).lean();
        let completeNow = 0;
        allActiveProjects.forEach(project => {
            // Check if user has any submission for this project
            const hasUserSubmission = project.submissions?.some((sub) => sub.user && sub.user.toString() === userId);
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
            earningsSocketService_1.default.emitProjectStatusUpdate(userId, stats);
        }
        catch (error) {
            console.error('❌ [EARNINGS] Error emitting project status update:', error);
        }
        (0, response_1.sendSuccess)(res, stats, 'Project statistics retrieved successfully');
    }
    catch (error) {
        console.error('❌ [EARNINGS] Error getting project stats:', error);
        throw new errorHandler_1.AppError('Failed to fetch project statistics', 500);
    }
});
/**
 * Get user's earning notifications
 * GET /api/earnings/notifications
 * @returns List of notifications related to earnings
 */
exports.getNotifications = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const userId = req.user._id.toString();
    const { unreadOnly, limit } = req.query;
    console.log('🔔 [EARNINGS] Getting notifications for user:', userId);
    try {
        // For now, return empty array as notifications system may be separate
        // In the future, this could query a Notifications collection
        const notifications = [];
        // Filter by unread if requested
        const filteredNotifications = unreadOnly === 'true'
            ? notifications.filter(n => !n.isRead)
            : notifications;
        // Limit results
        const limitedNotifications = limit
            ? filteredNotifications.slice(0, parseInt(limit))
            : filteredNotifications;
        console.log('✅ [EARNINGS] Notifications retrieved:', limitedNotifications.length);
        (0, response_1.sendSuccess)(res, limitedNotifications, 'Notifications retrieved successfully');
    }
    catch (error) {
        console.error('❌ [EARNINGS] Error getting notifications:', error);
        throw new errorHandler_1.AppError('Failed to fetch notifications', 500);
    }
});
/**
 * Mark notification as read
 * PATCH /api/earnings/notifications/:id/read
 * @returns Success message
 */
exports.markNotificationAsRead = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const userId = req.user._id.toString();
    const { id } = req.params;
    console.log('🔔 [EARNINGS] Marking notification as read:', id, 'for user:', userId);
    try {
        // For now, just return success as notifications system may be separate
        // In the future, this would update a Notifications collection
        (0, response_1.sendSuccess)(res, {
            notificationId: id,
            isRead: true
        }, 'Notification marked as read successfully');
    }
    catch (error) {
        console.error('❌ [EARNINGS] Error marking notification as read:', error);
        throw new errorHandler_1.AppError('Failed to mark notification as read', 500);
    }
});
/**
 * Get user's referral information
 * GET /api/earnings/referral-info
 * @returns Referral stats and referral link
 */
exports.getReferralInfo = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const userId = req.user._id.toString();
    console.log('🔗 [EARNINGS] Getting referral info for user:', userId);
    try {
        // Get all referrals where user is the referrer
        const referrals = await Referral_1.default.find({
            referrer: userId
        }).lean();
        // Calculate stats
        const totalReferrals = referrals.length;
        let totalEarningsFromReferrals = 0;
        let pendingReferrals = 0;
        referrals.forEach((ref) => {
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
        (0, response_1.sendSuccess)(res, referralInfo, 'Referral information retrieved successfully');
    }
    catch (error) {
        console.error('❌ [EARNINGS] Error getting referral info:', error);
        throw new errorHandler_1.AppError('Failed to fetch referral information', 500);
    }
});
/**
 * Get user's earnings history
 * GET /api/earnings/history
 * @returns List of earnings transactions with summary
 */
exports.getEarningsHistory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const userId = req.user._id.toString();
    const { type, page = 1, limit = 20, startDate, endDate } = req.query;
    console.log('📜 [EARNINGS] Getting earnings history for user:', userId);
    try {
        const transactions = [];
        const userObjectId = new mongoose_1.Types.ObjectId(userId);
        // Get project earnings (approved submissions)
        if (!type || type === 'project') {
            const projects = await Project_1.Project.find({
                'submissions.user': userObjectId
            }).lean();
            projects.forEach((project) => {
                project.submissions?.forEach((sub) => {
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
            const referrals = await Referral_1.default.find({
                referrer: userId,
                referrerRewarded: true
            }).lean();
            referrals.forEach((ref) => {
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
            // Note: This would need to query the SocialMediaPost model
            // For now, we'll add a placeholder
            // const socialPosts = await SocialMediaPost.find({...}).lean();
        }
        // Get spin earnings
        if (!type || type === 'spin') {
            // Note: This would need to query the SpinWheel model
            // For now, we'll add a placeholder
            // const spins = await SpinWheel.find({...}).lean();
        }
        // Sort by date (newest first)
        transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Filter by date range if provided
        let filteredTransactions = transactions;
        if (startDate || endDate) {
            filteredTransactions = transactions.filter(t => {
                const date = new Date(t.createdAt);
                if (startDate && date < new Date(startDate))
                    return false;
                if (endDate && date > new Date(endDate))
                    return false;
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
        (0, response_1.sendSuccess)(res, result, 'Earnings history retrieved successfully');
    }
    catch (error) {
        console.error('❌ [EARNINGS] Error getting earnings history:', error);
        throw new errorHandler_1.AppError('Failed to fetch earnings history', 500);
    }
});
/**
 * Withdraw earnings
 * POST /api/earnings/withdraw
 * @returns Withdrawal transaction details
 */
exports.withdrawEarnings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const userId = req.user._id.toString();
    const { amount, method, accountDetails } = req.body;
    console.log('💸 [EARNINGS] Withdrawing earnings for user:', userId, 'amount:', amount);
    try {
        // Validate amount
        if (!amount || amount <= 0) {
            return (0, response_1.sendBadRequest)(res, 'Invalid withdrawal amount');
        }
        // Get user's wallet balance
        const { Wallet } = await Promise.resolve().then(() => __importStar(require('../models/Wallet')));
        const wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            return (0, response_1.sendNotFound)(res, 'Wallet not found');
        }
        // Get wasil coin balance
        const wasilCoin = wallet.coins.find((c) => c.type === 'wasil');
        const availableBalance = wasilCoin?.amount || 0;
        // Check if user has sufficient balance
        if (availableBalance < amount) {
            return (0, response_1.sendBadRequest)(res, 'Insufficient balance');
        }
        // Minimum withdrawal amount (can be configured)
        const minWithdrawal = 100; // ₹100
        if (amount < minWithdrawal) {
            return (0, response_1.sendBadRequest)(res, `Minimum withdrawal amount is ₹${minWithdrawal}`);
        }
        // Create withdrawal transaction
        // Note: This would typically create a withdrawal record in a Withdrawals collection
        // For now, we'll just return success
        const withdrawalId = new mongoose_1.Types.ObjectId();
        // In a real implementation, you would:
        // 1. Create a withdrawal record
        // 2. Deduct from wallet (or mark as pending)
        // 3. Process the withdrawal through payment gateway
        // 4. Update wallet balance
        // 5. Send notification to user
        // Emit real-time withdrawal notification
        try {
            earningsSocketService_1.default.emitNotification(userId, {
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
        }
        catch (error) {
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
        (0, response_1.sendSuccess)(res, {
            withdrawal,
            message: 'Withdrawal request submitted successfully. It will be processed within 3-5 business days.'
        }, 'Withdrawal request submitted successfully', 201);
    }
    catch (error) {
        console.error('❌ [EARNINGS] Error processing withdrawal:', error);
        throw new errorHandler_1.AppError('Failed to process withdrawal', 500);
    }
});
