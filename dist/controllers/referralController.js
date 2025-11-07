"use strict";
// Referral Controller
// Handles referral program API endpoints
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReferralStats = exports.getReferralCode = exports.getReferralLeaderboard = exports.claimReferralRewards = exports.shareReferralLink = exports.generateReferralLink = exports.getReferralStatistics = exports.getReferralHistory = exports.getReferralData = void 0;
const mongoose_1 = require("mongoose");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../middleware/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const User_1 = require("../models/User");
const Transaction_1 = require("../models/Transaction");
const referralService_1 = __importDefault(require("../services/referralService"));
/**
 * @desc    Get referral data
 * @route   GET /api/referral/data
 * @access  Private
 */
exports.getReferralData = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        // Get user's referral information
        const user = await User_1.User.findById(userId).select('referral');
        if (!user) {
            return (0, response_1.sendNotFound)(res, 'User not found');
        }
        // Get referral statistics
        const stats = await referralService_1.default.getReferralStats(new mongoose_1.Types.ObjectId(userId));
        const referralData = {
            title: "Refer and Earn",
            subtitle: "Invite your friends and get free jewellery",
            inviteButtonText: "Invite",
            inviteLink: `${process.env.FRONTEND_URL || 'https://app.rez.com'}/invite/${user.referral?.referralCode || ''}`,
            referralCode: user.referral?.referralCode || '',
            earnedRewards: user.referral?.referralEarnings || 0,
            totalReferrals: user.referral?.totalReferrals || 0,
            pendingRewards: stats.pendingEarnings || 0,
            completedReferrals: stats.completedReferrals || 0,
            isActive: true,
            rewardPerReferral: 100, // 100 RC per successful referral
            maxReferrals: 50 // Maximum referrals per user
        };
        (0, response_1.sendSuccess)(res, referralData, 'Referral data retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to get referral data', 500);
    }
});
/**
 * @desc    Get referral history
 * @route   GET /api/referral/history
 * @access  Private
 */
exports.getReferralHistory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const skip = (Number(page) - 1) * Number(limit);
        // Get referred users
        const referredUsers = await User_1.User.find({ 'referral.referredBy': userId })
            .select('profile.name email createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await User_1.User.countDocuments({ 'referral.referredBy': userId });
        const referrals = referredUsers.map(user => ({
            id: user._id.toString(),
            referredUser: {
                id: user._id.toString(),
                name: user.profile?.firstName ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim() : 'Anonymous',
                email: user.email,
                joinedAt: user.createdAt
            },
            status: 'completed', // For now, all referrals are considered completed
            rewardAmount: 100, // 100 RC per referral
            rewardStatus: 'credited',
            createdAt: user.createdAt,
            completedAt: user.createdAt
        }));
        (0, response_1.sendSuccess)(res, {
            referrals,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
                hasNext: Number(page) < Math.ceil(total / Number(limit)),
                hasPrev: Number(page) > 1
            }
        }, 'Referral history retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to get referral history', 500);
    }
});
/**
 * @desc    Get referral statistics
 * @route   GET /api/referral/statistics
 * @access  Private
 */
exports.getReferralStatistics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const stats = await referralService_1.default.getReferralStats(new mongoose_1.Types.ObjectId(userId));
        const statistics = {
            totalReferrals: stats.totalReferrals || 0,
            completedReferrals: stats.completedReferrals || 0,
            pendingReferrals: stats.pendingReferrals || 0,
            totalEarned: stats.totalEarnings || 0,
            pendingEarnings: stats.pendingEarnings || 0,
            averageRewardPerReferral: stats.totalReferrals > 0 ? (stats.totalEarnings / stats.totalReferrals) : 0,
            conversionRate: stats.totalReferrals > 0 ? (stats.completedReferrals / stats.totalReferrals) * 100 : 0
        };
        (0, response_1.sendSuccess)(res, statistics, 'Referral statistics retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to get referral statistics', 500);
    }
});
/**
 * @desc    Generate referral link
 * @route   POST /api/referral/generate-link
 * @access  Private
 */
exports.generateReferralLink = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const user = await User_1.User.findById(userId).select('referral referralCode');
        if (!user) {
            return (0, response_1.sendNotFound)(res, 'User not found');
        }
        // Initialize referral object if missing
        if (!user.referral) {
            user.referral = {
                referralCode: '',
                referredUsers: [],
                totalReferrals: 0,
                referralEarnings: 0
            };
        }
        // Generate referral code if not exists (will be auto-generated on save via pre-save hook)
        if (!user.referral.referralCode && !user.referralCode) {
            await user.save(); // This triggers the pre-save hook that generates the code
            await user.populate('referral'); // Refresh to get the generated code
        }
        // Use either nested or top-level referral code
        const referralCode = user.referral?.referralCode || user.referralCode || '';
        if (!referralCode) {
            throw new errorHandler_1.AppError('Failed to generate referral code', 500);
        }
        const referralLink = `${process.env.FRONTEND_URL || 'https://app.rez.com'}/invite/${referralCode}`;
        (0, response_1.sendSuccess)(res, {
            referralLink,
            referralCode
        }, 'Referral link generated successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to generate referral link', 500);
    }
});
/**
 * @desc    Share referral link
 * @route   POST /api/referral/share
 * @access  Private
 */
exports.shareReferralLink = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { platform } = req.body;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    // ✅ Input validation: platform must be a valid string
    if (!platform || typeof platform !== 'string') {
        return (0, response_1.sendBadRequest)(res, 'Platform is required and must be a string');
    }
    // ✅ Input validation: platform must be one of allowed values
    const allowedPlatforms = ['whatsapp', 'telegram', 'email', 'sms', 'facebook', 'twitter', 'copy'];
    if (!allowedPlatforms.includes(platform.toLowerCase())) {
        return (0, response_1.sendBadRequest)(res, `Invalid platform. Must be one of: ${allowedPlatforms.join(', ')}`);
    }
    try {
        const user = await User_1.User.findById(userId);
        if (!user || !user.referral?.referralCode) {
            return (0, response_1.sendNotFound)(res, 'User or referral code not found');
        }
        const referralLink = `${process.env.FRONTEND_URL || 'https://app.rez.com'}/invite/${user.referral.referralCode}`;
        // In a real application, you would integrate with the respective platform APIs
        // For now, we'll just return success
        // Note: Logging without PII - only platform type and userId (sanitized)
        console.log(`📱 [REFERRAL] User shared link via ${platform} - UserID: ${userId.toString().slice(-4)}`);
        (0, response_1.sendSuccess)(res, { success: true }, 'Referral link shared successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to share referral link', 500);
    }
});
/**
 * @desc    Claim referral rewards
 * @route   POST /api/referral/claim-rewards
 * @access  Private
 */
exports.claimReferralRewards = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const user = await User_1.User.findById(userId);
        if (!user) {
            return (0, response_1.sendNotFound)(res, 'User not found');
        }
        const pendingRewards = user.referral?.referralEarnings || 0;
        if (pendingRewards <= 0) {
            return (0, response_1.sendBadRequest)(res, 'No pending rewards to claim');
        }
        // Add rewards to wallet
        user.wallet = user.wallet || {};
        user.wallet.balance = (user.wallet.balance || 0) + pendingRewards;
        user.wallet.totalEarned = (user.wallet.totalEarned || 0) + pendingRewards;
        // Reset referral earnings
        user.referral = user.referral || {};
        user.referral.referralEarnings = 0;
        await user.save();
        // Create transaction record
        const transaction = new Transaction_1.Transaction({
            user: new mongoose_1.Types.ObjectId(userId),
            type: 'credit',
            category: 'bonus',
            amount: pendingRewards,
            currency: 'RC',
            description: 'Referral rewards claimed',
            source: {
                type: 'referral',
                reference: userId,
                description: 'Referral program rewards'
            },
            balanceBefore: (user.wallet.balance || 0) - pendingRewards,
            balanceAfter: user.wallet.balance,
            status: {
                current: 'completed',
                history: [{
                        status: 'completed',
                        timestamp: new Date()
                    }]
            }
        });
        await transaction.save();
        (0, response_1.sendSuccess)(res, {
            success: true,
            totalClaimed: pendingRewards,
            transactionId: transaction._id.toString()
        }, 'Referral rewards claimed successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to claim referral rewards', 500);
    }
});
/**
 * @desc    Get referral leaderboard
 * @route   GET /api/referral/leaderboard
 * @access  Private
 */
exports.getReferralLeaderboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { period = 'month' } = req.query;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    if (!['week', 'month', 'year'].includes(period)) {
        return (0, response_1.sendBadRequest)(res, 'Invalid period. Must be one of: week, month, year');
    }
    try {
        // Get top referrers
        const topReferrers = await User_1.User.aggregate([
            {
                $match: {
                    'referral.totalReferrals': { $gt: 0 }
                }
            },
            {
                $project: {
                    name: {
                        $concat: [
                            { $ifNull: ['$profile.firstName', ''] },
                            ' ',
                            { $ifNull: ['$profile.lastName', ''] }
                        ]
                    },
                    totalReferrals: '$referral.totalReferrals',
                    totalEarned: '$referral.referralEarnings',
                    _id: 1
                }
            },
            {
                $sort: { totalReferrals: -1 }
            },
            {
                $limit: 10
            }
        ]);
        const leaderboard = topReferrers.map((user, index) => ({
            rank: index + 1,
            userId: user._id.toString(),
            userName: user.name?.trim() || 'Anonymous',
            totalReferrals: user.totalReferrals,
            totalEarned: user.totalEarned
        }));
        // Get current user's rank
        const userRank = await User_1.User.aggregate([
            {
                $match: {
                    'referral.totalReferrals': { $gt: 0 }
                }
            },
            {
                $project: {
                    totalReferrals: '$referral.totalReferrals',
                    totalEarned: '$referral.referralEarnings',
                    _id: 1
                }
            },
            {
                $sort: { totalReferrals: -1 }
            }
        ]);
        const currentUserRank = userRank.findIndex(user => user._id.toString() === userId) + 1;
        const currentUser = userRank.find(user => user._id.toString() === userId);
        (0, response_1.sendSuccess)(res, {
            leaderboard,
            userRank: currentUserRank > 0 ? {
                rank: currentUserRank,
                totalReferrals: currentUser?.totalReferrals || 0,
                totalEarned: currentUser?.totalEarned || 0
            } : null
        }, 'Referral leaderboard retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to get referral leaderboard', 500);
    }
});
/**
 * @desc    Get referral code (frontend expects /code endpoint)
 * @route   GET /api/referral/code
 * @access  Private
 */
exports.getReferralCode = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const user = await User_1.User.findById(userId).select('referral referralCode');
        if (!user) {
            return (0, response_1.sendNotFound)(res, 'User not found');
        }
        // Initialize referral object if missing
        if (!user.referral) {
            user.referral = {
                referralCode: '',
                referredUsers: [],
                totalReferrals: 0,
                referralEarnings: 0
            };
        }
        // Generate referral code if not exists (will be auto-generated on save via pre-save hook)
        if (!user.referral.referralCode && !user.referralCode) {
            await user.save(); // This triggers the pre-save hook that generates the code
            await user.populate('referral'); // Refresh to get the generated code
        }
        // Use either nested or top-level referral code
        const referralCode = user.referral?.referralCode || user.referralCode || '';
        if (!referralCode) {
            throw new errorHandler_1.AppError('Failed to generate referral code', 500);
        }
        const referralLink = `${process.env.FRONTEND_URL || 'https://app.rez.com'}/invite/${referralCode}`;
        (0, response_1.sendSuccess)(res, {
            referralCode,
            referralLink,
            shareMessage: `Join Rez using my referral code ${referralCode} and get exclusive rewards!`
        }, 'Referral code retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to get referral code', 500);
    }
});
/**
 * @desc    Get referral stats (frontend expects /stats endpoint)
 * @route   GET /api/referral/stats
 * @access  Private
 */
exports.getReferralStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const user = await User_1.User.findById(userId).select('referral wallet');
        if (!user) {
            return (0, response_1.sendNotFound)(res, 'User not found');
        }
        // Get referral statistics
        const stats = await referralService_1.default.getReferralStats(new mongoose_1.Types.ObjectId(userId));
        // Count referred users
        const referredUsersCount = await User_1.User.countDocuments({ 'referral.referredBy': userId });
        const referralStats = {
            totalReferrals: user.referral?.totalReferrals || referredUsersCount || 0,
            successfulReferrals: stats.completedReferrals || referredUsersCount || 0,
            pendingReferrals: stats.pendingReferrals || 0,
            totalEarned: user.referral?.referralEarnings || 0,
            availableBalance: user.wallet?.balance || 0,
            rewardPerReferral: 100,
            referralCode: user.referral?.referralCode || '',
            conversionRate: stats.totalReferrals > 0 ? ((stats.completedReferrals / stats.totalReferrals) * 100).toFixed(2) : '0.00',
            lifetimeEarnings: (user.referral?.totalReferrals || 0) * 100
        };
        (0, response_1.sendSuccess)(res, referralStats, 'Referral stats retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to get referral stats', 500);
    }
});
