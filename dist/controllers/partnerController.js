"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPartnerStats = exports.requestPayout = exports.getPartnerLevels = exports.getPartnerFAQs = exports.updateTaskProgress = exports.claimPartnerOffer = exports.getPartnerOffers = exports.claimJackpotReward = exports.getJackpotProgress = exports.claimTaskReward = exports.getPartnerTasks = exports.claimMilestoneReward = exports.getPartnerMilestones = exports.getPartnerEarnings = exports.getPartnerProfile = exports.getPartnerDashboard = exports.getPartnerBenefits = void 0;
const partnerService_1 = __importDefault(require("../services/partnerService"));
const Partner_1 = require("../models/Partner");
/**
 * Partner Controller
 * Handles HTTP requests for partner program endpoints
 */
/**
 * @route   GET /api/partner/benefits
 * @desc    Get partner benefits for all levels
 * @access  Private
 */
const getPartnerBenefits = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }
        const partnerBenefitsService = require('../services/partnerBenefitsService').default;
        const Partner = require('../models/Partner').default;
        // Get user's current partner level
        const partner = await Partner.findOne({ userId });
        const currentLevel = partner?.currentLevel?.level || 1;
        const currentBenefits = await partnerBenefitsService.getPartnerBenefits(userId);
        // Get all level benefits
        const allLevels = partnerBenefitsService.getAllLevelBenefits();
        res.status(200).json({
            success: true,
            data: {
                currentLevel,
                currentBenefits,
                allLevels,
                levels: allLevels // For frontend compatibility
            }
        });
    }
    catch (error) {
        console.error('Error getting partner benefits:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get partner benefits'
        });
    }
};
exports.getPartnerBenefits = getPartnerBenefits;
/**
 * @route   GET /api/partner/dashboard
 * @desc    Get complete partner dashboard data
 * @access  Private
 */
const getPartnerDashboard = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }
        const dashboardData = await partnerService_1.default.getPartnerDashboard(userId);
        res.status(200).json({
            success: true,
            data: dashboardData
        });
    }
    catch (error) {
        console.error('Error getting partner dashboard:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get partner dashboard'
        });
    }
};
exports.getPartnerDashboard = getPartnerDashboard;
/**
 * @route   GET /api/partner/profile
 * @desc    Get partner profile
 * @access  Private
 */
const getPartnerProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }
        const partner = await partnerService_1.default.getOrCreatePartner(userId);
        const daysRemaining = partner.getDaysRemaining();
        res.status(200).json({
            success: true,
            data: {
                profile: {
                    _id: partner._id,
                    userId: partner.userId,
                    name: partner.name,
                    email: partner.email,
                    avatar: partner.avatar,
                    level: {
                        level: partner.currentLevel.level,
                        name: partner.currentLevel.name,
                        requirements: partner.currentLevel.requirements
                    },
                    ordersThisLevel: partner.ordersThisLevel,
                    totalOrders: partner.totalOrders,
                    daysRemaining,
                    validUntil: partner.validUntil.toISOString().split('T')[0],
                    earnings: partner.earnings
                }
            }
        });
    }
    catch (error) {
        console.error('Error getting partner profile:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get partner profile'
        });
    }
};
exports.getPartnerProfile = getPartnerProfile;
/**
 * @route   GET /api/partner/earnings
 * @desc    Get partner earnings details
 * @access  Private
 */
const getPartnerEarnings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }
        const partner = await partnerService_1.default.getOrCreatePartner(userId);
        // Mock transaction data - in production, fetch from a transactions collection
        const transactions = [
            {
                _id: 'txn1',
                amount: 500,
                type: 'commission',
                status: 'paid',
                description: 'Level upgrade bonus',
                createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                _id: 'txn2',
                amount: 100,
                type: 'bonus',
                status: 'pending',
                description: 'Milestone reward',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];
        res.status(200).json({
            success: true,
            data: {
                totalEarnings: partner.earnings.total,
                pendingEarnings: partner.earnings.pending,
                paidEarnings: partner.earnings.paid,
                thisMonth: partner.earnings.thisMonth,
                lastMonth: partner.earnings.lastMonth,
                transactions
            }
        });
    }
    catch (error) {
        console.error('Error getting partner earnings:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get partner earnings'
        });
    }
};
exports.getPartnerEarnings = getPartnerEarnings;
/**
 * @route   GET /api/partner/milestones
 * @desc    Get partner milestones
 * @access  Private
 */
const getPartnerMilestones = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }
        const partner = await partnerService_1.default.getOrCreatePartner(userId);
        const milestones = partner.milestones.map((m) => ({
            id: `milestone-${m.orderCount}`,
            orderCount: m.orderCount,
            reward: m.reward,
            achieved: m.achieved,
            claimedAt: m.claimedAt
        }));
        res.status(200).json({
            success: true,
            data: { milestones }
        });
    }
    catch (error) {
        console.error('Error getting partner milestones:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get partner milestones'
        });
    }
};
exports.getPartnerMilestones = getPartnerMilestones;
/**
 * @route   POST /api/partner/milestones/:milestoneId/claim
 * @desc    Claim milestone reward
 * @access  Private
 */
const claimMilestoneReward = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { milestoneId } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }
        // Extract order count from milestoneId (format: "milestone-5")
        const orderCount = parseInt(milestoneId.split('-')[1]);
        if (isNaN(orderCount)) {
            res.status(400).json({
                success: false,
                error: 'Invalid milestone ID'
            });
            return;
        }
        const partner = await partnerService_1.default.claimMilestoneReward(userId, orderCount);
        const milestone = partner.milestones.find(m => m.orderCount === orderCount);
        res.status(200).json({
            success: true,
            message: 'Milestone reward claimed successfully',
            data: {
                milestone: {
                    id: `milestone-${milestone?.orderCount}`,
                    orderCount: milestone?.orderCount,
                    reward: milestone?.reward,
                    achieved: milestone?.achieved,
                    claimedAt: milestone?.claimedAt
                }
            }
        });
    }
    catch (error) {
        console.error('Error claiming milestone reward:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to claim milestone reward'
        });
    }
};
exports.claimMilestoneReward = claimMilestoneReward;
/**
 * @route   GET /api/partner/tasks
 * @desc    Get partner tasks
 * @access  Private
 */
const getPartnerTasks = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }
        const partner = await partnerService_1.default.getOrCreatePartner(userId);
        const tasks = partner.tasks.map((t) => ({
            id: t.title,
            title: t.title,
            description: t.description,
            type: t.type, // Add the missing type field
            reward: {
                ...t.reward,
                isClaimed: t.claimed // Map claimed to reward.isClaimed for frontend compatibility
            },
            progress: t.progress,
            isCompleted: t.completed, // Map completed to isCompleted for frontend compatibility
            completed: t.completed, // Keep for backward compatibility
            claimed: t.claimed // Keep for backward compatibility
        }));
        res.status(200).json({
            success: true,
            data: { tasks }
        });
    }
    catch (error) {
        console.error('Error getting partner tasks:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get partner tasks'
        });
    }
};
exports.getPartnerTasks = getPartnerTasks;
/**
 * @route   POST /api/partner/tasks/:taskId/claim
 * @desc    Claim task reward
 * @access  Private
 */
const claimTaskReward = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { taskId } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }
        // taskId is the task title
        const partner = await partnerService_1.default.claimTaskReward(userId, decodeURIComponent(taskId));
        const task = partner.tasks.find(t => t.title === decodeURIComponent(taskId));
        res.status(200).json({
            success: true,
            message: 'Task reward claimed successfully',
            data: {
                task: {
                    id: task?.title,
                    title: task?.title,
                    description: task?.description,
                    reward: task?.reward,
                    progress: task?.progress,
                    completed: task?.completed,
                    claimed: task?.claimed
                }
            }
        });
    }
    catch (error) {
        console.error('Error claiming task reward:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to claim task reward'
        });
    }
};
exports.claimTaskReward = claimTaskReward;
/**
 * @route   GET /api/partner/jackpot
 * @desc    Get jackpot progress
 * @access  Private
 */
const getJackpotProgress = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }
        const partner = await partnerService_1.default.getOrCreatePartner(userId);
        const milestones = partner.jackpotProgress.map((j) => ({
            id: j.title,
            spendAmount: j.spendAmount,
            title: j.title,
            description: j.description,
            reward: j.reward,
            achieved: j.achieved
        }));
        res.status(200).json({
            success: true,
            data: {
                currentSpent: partner.totalSpent,
                milestones
            }
        });
    }
    catch (error) {
        console.error('Error getting jackpot progress:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get jackpot progress'
        });
    }
};
exports.getJackpotProgress = getJackpotProgress;
/**
 * @route   POST /api/partner/jackpot/:spendAmount/claim
 * @desc    Claim jackpot milestone reward
 * @access  Private
 */
const claimJackpotReward = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { spendAmount } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }
        const amount = parseInt(spendAmount);
        if (isNaN(amount)) {
            res.status(400).json({
                success: false,
                error: 'Invalid spend amount'
            });
            return;
        }
        const partner = await partnerService_1.default.claimJackpotReward(userId, amount);
        const jackpot = partner.jackpotProgress.find((j) => j.spendAmount === amount);
        res.status(200).json({
            success: true,
            message: 'Jackpot reward claimed successfully',
            data: {
                jackpot: {
                    id: jackpot?.title,
                    spendAmount: jackpot?.spendAmount,
                    title: jackpot?.title,
                    reward: jackpot?.reward,
                    claimedAt: jackpot?.claimedAt
                }
            }
        });
    }
    catch (error) {
        console.error('Error claiming jackpot reward:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to claim jackpot reward'
        });
    }
};
exports.claimJackpotReward = claimJackpotReward;
/**
 * @route   GET /api/partner/offers
 * @desc    Get claimable offers
 * @access  Private
 */
const getPartnerOffers = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }
        const partner = await partnerService_1.default.getOrCreatePartner(userId);
        const offers = partner.claimableOffers.map((o) => ({
            id: o.title,
            title: o.title,
            description: o.description,
            discount: o.discount,
            category: o.category,
            validUntil: o.validUntil.toISOString().split('T')[0],
            termsAndConditions: o.termsAndConditions,
            claimed: o.claimed,
            voucherCode: o.voucherCode
        }));
        res.status(200).json({
            success: true,
            data: { offers }
        });
    }
    catch (error) {
        console.error('Error getting partner offers:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get partner offers'
        });
    }
};
exports.getPartnerOffers = getPartnerOffers;
/**
 * @route   POST /api/partner/offers/:offerId/claim
 * @desc    Claim partner offer
 * @access  Private
 */
const claimPartnerOffer = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { offerId } = req.body; // Get from body instead of params
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }
        console.log('🎫 [CONTROLLER] Claiming offer:', offerId);
        // No need to decode - coming from body as plain string
        const { partner, voucherCode } = await partnerService_1.default.claimOffer(userId, offerId);
        const offer = partner.claimableOffers.find(o => o.title === offerId);
        res.status(200).json({
            success: true,
            message: 'Offer claimed successfully',
            data: {
                voucher: {
                    code: voucherCode,
                    expiryDate: offer?.validUntil.toISOString().split('T')[0] || ''
                }
            }
        });
    }
    catch (error) {
        console.error('Error claiming partner offer:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to claim offer'
        });
    }
};
exports.claimPartnerOffer = claimPartnerOffer;
/**
 * @route   POST /api/partner/tasks/:taskType/update
 * @desc    Update task progress
 * @access  Private
 */
const updateTaskProgress = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { taskType } = req.params;
        const { progress } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }
        const partner = await partnerService_1.default.updateTaskProgress(userId, taskType, progress);
        const task = partner.tasks.find((t) => t.type === taskType);
        res.status(200).json({
            success: true,
            message: 'Task progress updated successfully',
            data: {
                task: {
                    id: task?.title,
                    title: task?.title,
                    description: task?.description,
                    type: task?.type,
                    progress: task?.progress,
                    completed: task?.completed
                }
            }
        });
    }
    catch (error) {
        console.error('Error updating task progress:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update task progress'
        });
    }
};
exports.updateTaskProgress = updateTaskProgress;
/**
 * @route   GET /api/partner/faqs
 * @desc    Get partner FAQs
 * @access  Private
 */
const getPartnerFAQs = async (req, res) => {
    try {
        const { category } = req.query;
        const dashboardData = await partnerService_1.default.getPartnerDashboard(req.user?.id || '');
        let faqs = dashboardData.faqs;
        // Filter by category if provided
        if (category && typeof category === 'string') {
            faqs = faqs.filter((faq) => faq.category === category);
        }
        res.status(200).json({
            success: true,
            data: { faqs }
        });
    }
    catch (error) {
        console.error('Error getting partner FAQs:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get partner FAQs'
        });
    }
};
exports.getPartnerFAQs = getPartnerFAQs;
/**
 * @route   GET /api/partner/levels
 * @desc    Get all partner levels and their benefits
 * @access  Private
 */
const getPartnerLevels = async (req, res) => {
    try {
        const levels = Object.values(Partner_1.PARTNER_LEVELS).map(level => ({
            level: level.level,
            name: level.name,
            requirements: level.requirements,
            benefits: level.benefits
        }));
        res.status(200).json({
            success: true,
            data: { levels }
        });
    }
    catch (error) {
        console.error('Error getting partner levels:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get partner levels'
        });
    }
};
exports.getPartnerLevels = getPartnerLevels;
/**
 * @route   POST /api/partner/payout/request
 * @desc    Request payout of earnings
 * @access  Private
 */
const requestPayout = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { amount, method } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }
        if (!amount || !method) {
            res.status(400).json({
                success: false,
                error: 'Amount and payment method are required'
            });
            return;
        }
        const result = await partnerService_1.default.requestPayout(userId, amount, method);
        res.status(200).json({
            success: true,
            message: result.message,
            data: {
                payoutId: result.payoutId
            }
        });
    }
    catch (error) {
        console.error('Error requesting payout:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to request payout'
        });
    }
};
exports.requestPayout = requestPayout;
/**
 * @route   GET /api/partner/stats
 * @desc    Get partner statistics and rankings
 * @access  Private
 */
const getPartnerStats = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'User not authenticated'
            });
            return;
        }
        const stats = await partnerService_1.default.getPartnerStats(userId);
        res.status(200).json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error getting partner stats:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get partner stats'
        });
    }
};
exports.getPartnerStats = getPartnerStats;
