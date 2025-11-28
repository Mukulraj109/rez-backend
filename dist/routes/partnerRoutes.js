"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const partnerController_1 = require("../controllers/partnerController");
const auth_1 = require("../middleware/auth");
const partnerValidation_1 = require("../middleware/partnerValidation");
const router = express_1.default.Router();
// All partner routes require authentication
router.use(auth_1.authenticate);
// Sanitize all request bodies
router.use(partnerValidation_1.sanitizeRequestBody);
/**
 * @route   GET /api/partner/dashboard
 * @desc    Get complete partner dashboard data (profile, milestones, tasks, jackpot, offers, faqs)
 * @access  Private
 */
router.get('/dashboard', partnerController_1.getPartnerDashboard);
/**
 * @route   GET /api/partner/benefits
 * @desc    Get partner benefits for all levels
 * @access  Private
 */
router.get('/benefits', partnerController_1.getPartnerBenefits);
/**
 * @route   GET /api/partner/profile
 * @desc    Get partner profile information
 * @access  Private
 */
router.get('/profile', partnerController_1.getPartnerProfile);
/**
 * @route   GET /api/partner/earnings
 * @desc    Get partner earnings details and transaction history
 * @access  Private
 */
router.get('/earnings', partnerController_1.getPartnerEarnings);
/**
 * @route   GET /api/partner/stats
 * @desc    Get partner statistics and rankings
 * @access  Private
 */
router.get('/stats', partnerController_1.getPartnerStats);
/**
 * @route   GET /api/partner/milestones
 * @desc    Get all partner milestones
 * @access  Private
 */
router.get('/milestones', partnerController_1.getPartnerMilestones);
/**
 * @route   POST /api/partner/milestones/:milestoneId/claim
 * @desc    Claim a milestone reward
 * @access  Private
 */
router.post('/milestones/:milestoneId/claim', partnerValidation_1.validateClaimMilestone, partnerController_1.claimMilestoneReward);
/**
 * @route   GET /api/partner/tasks
 * @desc    Get all partner reward tasks
 * @access  Private
 */
router.get('/tasks', partnerController_1.getPartnerTasks);
/**
 * @route   POST /api/partner/tasks/:taskId/claim
 * @desc    Claim a task reward
 * @access  Private
 */
router.post('/tasks/:taskId/claim', partnerValidation_1.validateClaimTask, partnerController_1.claimTaskReward);
/**
 * @route   POST /api/partner/tasks/:taskType/update
 * @desc    Update task progress manually
 * @body    progress - Current progress value
 * @access  Private
 */
router.post('/tasks/:taskType/update', partnerValidation_1.validateUpdateTaskProgress, partnerController_1.updateTaskProgress);
/**
 * @route   GET /api/partner/jackpot
 * @desc    Get jackpot milestone progress
 * @access  Private
 */
router.get('/jackpot', partnerController_1.getJackpotProgress);
/**
 * @route   POST /api/partner/jackpot/:spendAmount/claim
 * @desc    Claim a jackpot milestone reward
 * @access  Private
 */
router.post('/jackpot/:spendAmount/claim', partnerValidation_1.validateClaimJackpot, partnerController_1.claimJackpotReward);
/**
 * @route   GET /api/partner/offers
 * @desc    Get all claimable partner offers
 * @access  Private
 */
router.get('/offers', partnerController_1.getPartnerOffers);
/**
 * @route   POST /api/partner/offers/claim
 * @desc    Claim a partner offer
 * @body    offerId - The offer title/ID to claim
 * @access  Private
 */
router.post('/offers/claim', partnerValidation_1.validateClaimOffer, partnerController_1.claimPartnerOffer);
/**
 * @route   GET /api/partner/faqs
 * @desc    Get partner program FAQs
 * @query   category - Optional category filter
 * @access  Private
 */
router.get('/faqs', partnerController_1.getPartnerFAQs);
/**
 * @route   GET /api/partner/levels
 * @desc    Get all partner levels and their benefits
 * @access  Private
 */
router.get('/levels', partnerController_1.getPartnerLevels);
/**
 * @route   POST /api/partner/payout/request
 * @desc    Request payout of partner earnings
 * @body    amount, method
 * @access  Private
 */
router.post('/payout/request', partnerValidation_1.validateRequestPayout, partnerController_1.requestPayout);
exports.default = router;
