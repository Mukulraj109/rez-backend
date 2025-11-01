"use strict";
// Referral Routes
// Routes for referral program endpoints
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const referralController_1 = require("../controllers/referralController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All referral routes require authentication
router.use(auth_1.authenticate);
/**
 * @route   GET /api/referral/data
 * @desc    Get referral data
 * @access  Private
 */
router.get('/data', referralController_1.getReferralData);
/**
 * @route   GET /api/referral/history
 * @desc    Get referral history
 * @access  Private
 */
router.get('/history', referralController_1.getReferralHistory);
/**
 * @route   GET /api/referral/statistics
 * @desc    Get referral statistics
 * @access  Private
 */
router.get('/statistics', referralController_1.getReferralStatistics);
/**
 * @route   POST /api/referral/generate-link
 * @desc    Generate referral link
 * @access  Private
 */
router.post('/generate-link', referralController_1.generateReferralLink);
/**
 * @route   POST /api/referral/share
 * @desc    Share referral link
 * @access  Private
 */
router.post('/share', referralController_1.shareReferralLink);
/**
 * @route   POST /api/referral/claim-rewards
 * @desc    Claim referral rewards
 * @access  Private
 */
router.post('/claim-rewards', referralController_1.claimReferralRewards);
/**
 * @route   GET /api/referral/leaderboard
 * @desc    Get referral leaderboard
 * @access  Private
 */
router.get('/leaderboard', referralController_1.getReferralLeaderboard);
/**
 * @route   GET /api/referral/code
 * @desc    Get user's referral code
 * @access  Private
 */
router.get('/code', referralController_1.getReferralCode);
/**
 * @route   GET /api/referral/stats
 * @desc    Get user's referral statistics
 * @access  Private
 */
router.get('/stats', referralController_1.getReferralStats);
exports.default = router;
