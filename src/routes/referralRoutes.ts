// Referral Routes
// Routes for referral program endpoints

import express from 'express';
import {
  getReferralData,
  getReferralHistory,
  getReferralStatistics,
  generateReferralLink,
  shareReferralLink,
  claimReferralRewards,
  getReferralLeaderboard,
  getReferralCode,
  getReferralStats
} from '../controllers/referralController';
import { authenticate } from '../middleware/auth';
import { referralLimiter, referralShareLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// All referral routes require authentication
router.use(authenticate);

// ✅ Apply rate limiting to all referral routes to prevent abuse
router.use(referralLimiter);

/**
 * @route   GET /api/referral/data
 * @desc    Get referral data
 * @access  Private
 */
router.get('/data', getReferralData);

/**
 * @route   GET /api/referral/history
 * @desc    Get referral history
 * @access  Private
 */
router.get('/history', getReferralHistory);

/**
 * @route   GET /api/referral/statistics
 * @desc    Get referral statistics
 * @access  Private
 */
router.get('/statistics', getReferralStatistics);

/**
 * @route   POST /api/referral/generate-link
 * @desc    Generate referral link
 * @access  Private
 */
router.post('/generate-link', generateReferralLink);

/**
 * @route   POST /api/referral/share
 * @desc    Share referral link
 * @access  Private
 * @note    Additional strict rate limiting to prevent spam
 */
router.post('/share', referralShareLimiter, shareReferralLink);

/**
 * @route   POST /api/referral/claim-rewards
 * @desc    Claim referral rewards
 * @access  Private
 */
router.post('/claim-rewards', claimReferralRewards);

/**
 * @route   GET /api/referral/leaderboard
 * @desc    Get referral leaderboard
 * @access  Private
 */
router.get('/leaderboard', getReferralLeaderboard);

/**
 * @route   GET /api/referral/code
 * @desc    Get user's referral code
 * @access  Private
 */
router.get('/code', getReferralCode);

/**
 * @route   GET /api/referral/stats
 * @desc    Get user's referral statistics
 * @access  Private
 */
router.get('/stats', getReferralStats);

export default router;
