/**
 * Privé Routes
 *
 * API endpoints for Privé eligibility, offers, check-in, and dashboard
 */

import { Router } from 'express';
import {
  getPriveEligibility,
  getPillarBreakdown,
  refreshEligibility,
  getReputationHistory,
  getImprovementTips,
  dailyCheckIn,
  getHabitLoops,
  getPriveDashboard,
  getPriveOffers,
  getPriveOfferById,
  getPriveHighlights,
  trackOfferClick,
} from '../controllers/priveController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==========================================
// Eligibility & Reputation
// ==========================================

/**
 * @route   GET /api/prive/eligibility
 * @desc    Get user's Privé eligibility status
 * @access  Private
 */
router.get('/eligibility', getPriveEligibility);

/**
 * @route   GET /api/prive/pillars
 * @desc    Get detailed pillar breakdown with factors
 * @access  Private
 */
router.get('/pillars', getPillarBreakdown);

/**
 * @route   POST /api/prive/refresh
 * @desc    Force recalculation of reputation score
 * @access  Private
 */
router.post('/refresh', refreshEligibility);

/**
 * @route   GET /api/prive/history
 * @desc    Get reputation score history
 * @access  Private
 */
router.get('/history', getReputationHistory);

/**
 * @route   GET /api/prive/tips
 * @desc    Get personalized tips to improve eligibility
 * @access  Private
 */
router.get('/tips', getImprovementTips);

// ==========================================
// Daily Check-in & Habits
// ==========================================

/**
 * @route   POST /api/prive/check-in
 * @desc    Daily check-in with streak tracking
 * @access  Private
 */
router.post('/check-in', dailyCheckIn);

/**
 * @route   GET /api/prive/habit-loops
 * @desc    Get daily habit loops with progress
 * @access  Private
 */
router.get('/habit-loops', getHabitLoops);

// ==========================================
// Dashboard
// ==========================================

/**
 * @route   GET /api/prive/dashboard
 * @desc    Get combined dashboard data (eligibility, coins, offers, etc.)
 * @access  Private
 */
router.get('/dashboard', getPriveDashboard);

// ==========================================
// Offers
// ==========================================

/**
 * @route   GET /api/prive/offers
 * @desc    Get Privé exclusive offers
 * @access  Private
 */
router.get('/offers', getPriveOffers);

/**
 * @route   GET /api/prive/offers/:id
 * @desc    Get single Privé offer by ID
 * @access  Private
 */
router.get('/offers/:id', getPriveOfferById);

/**
 * @route   POST /api/prive/offers/:id/click
 * @desc    Track offer click for analytics
 * @access  Private
 */
router.post('/offers/:id/click', trackOfferClick);

// ==========================================
// Highlights
// ==========================================

/**
 * @route   GET /api/prive/highlights
 * @desc    Get today's personalized highlights
 * @access  Private
 */
router.get('/highlights', getPriveHighlights);

export default router;
