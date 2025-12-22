/**
 * Privé Routes
 *
 * API endpoints for Privé eligibility and reputation system
 */

import { Router } from 'express';
import {
  getPriveEligibility,
  getPillarBreakdown,
  refreshEligibility,
  getReputationHistory,
  getImprovementTips,
} from '../controllers/priveController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

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

export default router;
