"use strict";
// Enhanced Referral Tier Controller
// Handles tier-based referral program with viral growth features
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
exports.applyCode = exports.validateCode = exports.checkUpgrade = exports.getAnalytics = exports.getMilestones = exports.generateQR = exports.getLeaderboard = exports.claimReward = exports.getRewards = exports.getTier = void 0;
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../middleware/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
const referralTierService_1 = __importDefault(require("../services/referralTierService"));
const voucherRedemptionService_1 = __importDefault(require("../services/voucherRedemptionService"));
const referralAnalyticsService_1 = __importDefault(require("../services/referralAnalyticsService"));
const referralFraudDetection_1 = __importDefault(require("../services/referralFraudDetection"));
const Referral_1 = __importStar(require("../models/Referral"));
const User_1 = require("../models/User");
// @ts-ignore - qrcode package may not have TypeScript definitions
const qrcode_1 = __importDefault(require("qrcode"));
/**
 * @desc    Get current tier and progress
 * @route   GET /api/referral/tier
 * @access  Private
 */
exports.getTier = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const tierInfo = await referralTierService_1.default.getUserTier(userId);
        const progress = await referralTierService_1.default.calculateProgress(userId);
        const stats = await referralTierService_1.default.getReferralStats(userId);
        const milestones = await referralTierService_1.default.getUpcomingMilestones(userId);
        (0, response_1.sendSuccess)(res, {
            currentTier: tierInfo.current,
            tierData: tierInfo.data,
            progress,
            stats,
            upcomingMilestones: milestones
        }, 'Tier information retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError(error.message || 'Failed to get tier information', 500);
    }
});
/**
 * @desc    Get claimable rewards
 * @route   GET /api/referral/rewards
 * @access  Private
 */
exports.getRewards = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const referrals = await Referral_1.default.find({ referrer: userId });
        const claimableRewards = [];
        const claimedRewards = [];
        for (const referral of referrals) {
            const reward = referral.rewards;
            // Check if referrer has been rewarded
            if (referral.referrerRewarded) {
                claimedRewards.push({
                    referralId: referral._id,
                    type: 'referrer_bonus',
                    amount: reward.referrerAmount,
                    description: 'Referrer bonus',
                    claimedAt: referral.completedAt
                });
            }
            else if (referral.status === 'qualified' || referral.status === 'completed') {
                // Referrer reward is claimable
                claimableRewards.push({
                    referralId: referral._id,
                    type: 'referrer_bonus',
                    amount: reward.referrerAmount,
                    description: 'Referrer bonus'
                });
            }
            // Check milestone bonus
            if (referral.milestoneRewarded && reward.milestoneBonus) {
                claimedRewards.push({
                    referralId: referral._id,
                    type: 'milestone_bonus',
                    amount: reward.milestoneBonus,
                    description: reward.description || 'Milestone bonus',
                    claimedAt: referral.completedAt
                });
            }
            else if (!referral.milestoneRewarded &&
                reward.milestoneBonus &&
                (referral.metadata?.milestoneOrders?.count ?? 0) >= 3) {
                // Milestone bonus is claimable
                claimableRewards.push({
                    referralId: referral._id,
                    type: 'milestone_bonus',
                    amount: reward.milestoneBonus,
                    description: reward.description || 'Milestone bonus (3+ orders)'
                });
            }
            // Check voucher rewards
            if (reward.voucherCode) {
                claimableRewards.push({
                    referralId: referral._id,
                    type: 'voucher',
                    voucherCode: reward.voucherCode,
                    voucherType: reward.voucherType,
                    description: reward.description
                });
            }
        }
        (0, response_1.sendSuccess)(res, {
            claimable: claimableRewards,
            claimed: claimedRewards,
            totalClaimableValue: claimableRewards.reduce((sum, r) => sum + (r.amount || 0), 0)
        }, 'Rewards retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError(error.message || 'Failed to get rewards', 500);
    }
});
/**
 * @desc    Claim specific reward
 * @route   POST /api/referral/claim-reward/:rewardId
 * @access  Private
 */
exports.claimReward = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { referralId, rewardType } = req.body;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    if (!referralId || !rewardType) {
        return (0, response_1.sendBadRequest)(res, 'Referral ID and reward type are required');
    }
    try {
        const referral = await Referral_1.default.findById(referralId);
        if (!referral) {
            return (0, response_1.sendNotFound)(res, 'Referral not found');
        }
        if (referral.referrer.toString() !== userId) {
            return (0, response_1.sendError)(res, 'Unauthorized: Not your referral', 403);
        }
        const reward = referral.rewards;
        // Check if referral has expired
        if (referral.expiresAt && referral.expiresAt < new Date()) {
            return (0, response_1.sendBadRequest)(res, 'Referral has expired');
        }
        // Handle different reward types
        if (rewardType === 'referrer_bonus') {
            if (referral.referrerRewarded) {
                return (0, response_1.sendBadRequest)(res, 'Referrer bonus already claimed');
            }
            if (referral.status !== 'qualified' && referral.status !== 'completed') {
                return (0, response_1.sendBadRequest)(res, 'Referral not yet qualified for reward');
            }
            // Credit coins to wallet
            const user = await User_1.User.findById(userId);
            if (!user) {
                return (0, response_1.sendNotFound)(res, 'User not found');
            }
            user.walletBalance = (user.walletBalance || 0) + reward.referrerAmount;
            await user.save();
            referral.referrerRewarded = true;
            await referral.save();
            (0, response_1.sendSuccess)(res, {
                success: true,
                rewardType: 'referrer_bonus',
                amount: reward.referrerAmount,
                newBalance: user.walletBalance
            }, 'Referrer bonus claimed successfully');
        }
        else if (rewardType === 'milestone_bonus') {
            if (referral.milestoneRewarded) {
                return (0, response_1.sendBadRequest)(res, 'Milestone bonus already claimed');
            }
            if (!reward.milestoneBonus) {
                return (0, response_1.sendNotFound)(res, 'No milestone bonus available');
            }
            if ((referral.metadata?.milestoneOrders?.count || 0) < 3) {
                return (0, response_1.sendBadRequest)(res, 'Referee has not completed 3 orders yet');
            }
            // Credit milestone bonus to wallet
            const user = await User_1.User.findById(userId);
            if (!user) {
                return (0, response_1.sendNotFound)(res, 'User not found');
            }
            user.walletBalance = (user.walletBalance || 0) + reward.milestoneBonus;
            await user.save();
            referral.milestoneRewarded = true;
            await referral.save();
            (0, response_1.sendSuccess)(res, {
                success: true,
                rewardType: 'milestone_bonus',
                amount: reward.milestoneBonus,
                newBalance: user.walletBalance
            }, 'Milestone bonus claimed successfully');
        }
        else if (rewardType === 'voucher') {
            // Claim voucher
            if (!reward.voucherCode) {
                return (0, response_1.sendNotFound)(res, 'No voucher available');
            }
            const result = await voucherRedemptionService_1.default.claimVoucher(userId, referralId);
            (0, response_1.sendSuccess)(res, result, 'Voucher claimed successfully');
        }
        else {
            return (0, response_1.sendBadRequest)(res, 'Invalid reward type');
        }
    }
    catch (error) {
        throw new errorHandler_1.AppError(error.message || 'Failed to claim reward', 500);
    }
});
/**
 * @desc    Get referral leaderboard
 * @route   GET /api/referral/leaderboard
 * @access  Private
 */
exports.getLeaderboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { limit = 100 } = req.query;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const leaderboard = await referralAnalyticsService_1.default.getLeaderboard(Number(limit));
        const userRank = await referralAnalyticsService_1.default.getUserRank(userId);
        (0, response_1.sendSuccess)(res, {
            leaderboard,
            userRank
        }, 'Leaderboard retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError(error.message || 'Failed to get leaderboard', 500);
    }
});
/**
 * @desc    Generate QR code for referral
 * @route   POST /api/referral/generate-qr
 * @access  Private
 */
exports.generateQR = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const user = await User_1.User.findById(userId);
        if (!user) {
            return (0, response_1.sendNotFound)(res, 'User not found');
        }
        // Get or create referral code
        let referralCode = user.referralCode;
        if (!referralCode) {
            referralCode = `REZ${userId.toString().slice(-8).toUpperCase()}`;
            user.referralCode = referralCode;
            await user.save();
        }
        const referralLink = `${process.env.FRONTEND_URL || 'https://rez.app'}/invite/${referralCode}`;
        // Generate QR code
        const qrCode = await qrcode_1.default.toDataURL(referralLink, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 512,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        (0, response_1.sendSuccess)(res, {
            qrCode,
            referralLink,
            referralCode
        }, 'QR code generated successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError(error.message || 'Failed to generate QR code', 500);
    }
});
/**
 * @desc    Get milestone progress
 * @route   GET /api/referral/milestones
 * @access  Private
 */
exports.getMilestones = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const milestones = await referralTierService_1.default.getUpcomingMilestones(userId);
        const progress = await referralTierService_1.default.calculateProgress(userId);
        (0, response_1.sendSuccess)(res, {
            current: progress,
            upcoming: milestones
        }, 'Milestones retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError(error.message || 'Failed to get milestones', 500);
    }
});
/**
 * @desc    Get referral analytics
 * @route   GET /api/referral/analytics
 * @access  Private (Admin)
 */
exports.getAnalytics = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { startDate, endDate } = req.query;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        const metrics = await referralAnalyticsService_1.default.getMetrics(start, end);
        const funnel = await referralAnalyticsService_1.default.getConversionFunnel(start || end ? { createdAt: { $gte: start, $lte: end } } : {});
        const sourcePerformance = await referralAnalyticsService_1.default.getSourcePerformance(start || end ? { createdAt: { $gte: start, $lte: end } } : {});
        (0, response_1.sendSuccess)(res, {
            metrics,
            funnel,
            sourcePerformance
        }, 'Analytics retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError(error.message || 'Failed to get analytics', 500);
    }
});
/**
 * @desc    Check tier upgrade eligibility
 * @route   GET /api/referral/check-upgrade
 * @access  Private
 */
exports.checkUpgrade = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    try {
        const upgradeCheck = await referralTierService_1.default.checkTierUpgrade(userId);
        if (upgradeCheck.upgraded) {
            // Award tier rewards
            const rewards = await referralTierService_1.default.awardTierRewards(userId, upgradeCheck.newTier);
            (0, response_1.sendSuccess)(res, {
                upgraded: true,
                oldTier: upgradeCheck.oldTier,
                newTier: upgradeCheck.newTier,
                rewards: rewards.rewards,
                celebrate: true
            }, 'Congratulations! You have been upgraded to a new tier!');
        }
        else {
            (0, response_1.sendSuccess)(res, {
                upgraded: false,
                currentTier: upgradeCheck.currentTier,
                qualifiedReferrals: upgradeCheck.qualifiedReferrals
            }, 'No tier upgrade available');
        }
    }
    catch (error) {
        throw new errorHandler_1.AppError(error.message || 'Failed to check tier upgrade', 500);
    }
});
/**
 * @desc    Validate referral code
 * @route   POST /api/referral/validate-code
 * @access  Public
 */
exports.validateCode = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { code } = req.body;
    if (!code) {
        return (0, response_1.sendBadRequest)(res, 'Referral code is required');
    }
    try {
        const user = await User_1.User.findOne({ referralCode: code.toUpperCase() });
        if (!user) {
            return (0, response_1.sendBadRequest)(res, 'Invalid referral code');
        }
        (0, response_1.sendSuccess)(res, {
            valid: true,
            referrerName: user.fullName || user.username || 'A friend',
            referrerId: user._id
        }, 'Valid referral code');
    }
    catch (error) {
        throw new errorHandler_1.AppError(error.message || 'Failed to validate code', 500);
    }
});
/**
 * @desc    Apply referral code during registration
 * @route   POST /api/referral/apply-code
 * @access  Private
 */
exports.applyCode = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { code, metadata } = req.body;
    if (!userId) {
        return (0, response_1.sendError)(res, 'Authentication required', 401);
    }
    if (!code) {
        return (0, response_1.sendBadRequest)(res, 'Referral code is required');
    }
    try {
        const referrer = await User_1.User.findOne({ referralCode: code.toUpperCase() });
        if (!referrer) {
            return (0, response_1.sendBadRequest)(res, 'Invalid referral code');
        }
        const referee = await User_1.User.findById(userId);
        if (!referee) {
            return (0, response_1.sendNotFound)(res, 'User not found');
        }
        // Check if user already used a referral code
        const existingReferral = await Referral_1.default.findOne({ referee: userId });
        if (existingReferral) {
            return (0, response_1.sendBadRequest)(res, 'You have already used a referral code');
        }
        // Fraud detection
        const fraudCheck = await referralFraudDetection_1.default.checkReferral(referrer._id, userId, metadata || {});
        if (fraudCheck.action === 'block') {
            return (0, response_1.sendError)(res, 'Referral cannot be processed: ' + fraudCheck.reasons.join(', '), 403);
        }
        // Create referral record
        const referral = new Referral_1.default({
            referrer: referrer._id,
            referee: userId,
            referralCode: code.toUpperCase(),
            status: Referral_1.ReferralStatus.REGISTERED,
            registeredAt: new Date(),
            metadata: metadata || {},
            tier: referrer.referralTier || 'STARTER'
        });
        await referral.save();
        // Award immediate registration bonus to referee
        referee.walletBalance = (referee.walletBalance || 0) + 30; // ₹30 welcome bonus
        await referee.save();
        (0, response_1.sendSuccess)(res, {
            success: true,
            referralId: referral._id,
            welcomeBonus: 30,
            message: `Welcome! You've received ₹30 bonus for using ${referrer.fullName || 'a friend'}'s referral code`
        }, 'Referral code applied successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError(error.message || 'Failed to apply referral code', 500);
    }
});
exports.default = {
    getTier: exports.getTier,
    getRewards: exports.getRewards,
    claimReward: exports.claimReward,
    getLeaderboard: exports.getLeaderboard,
    generateQR: exports.generateQR,
    getMilestones: exports.getMilestones,
    getAnalytics: exports.getAnalytics,
    checkUpgrade: exports.checkUpgrade,
    validateCode: exports.validateCode,
    applyCode: exports.applyCode
};
