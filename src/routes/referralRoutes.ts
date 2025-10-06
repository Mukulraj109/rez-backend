// Referral Routes
// Routes for referral program endpoints

import express from 'express';
import {
  getReferralStats,
  getReferralHistory,
  validateReferralCode,
  trackShare,
  getReferralCode,
} from '../controllers/referralController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Protected routes (require authentication)
router.get('/stats', authenticate, getReferralStats);
router.get('/history', authenticate, getReferralHistory);
router.get('/code', authenticate, getReferralCode);
router.post('/track-share', authenticate, trackShare);

// Public routes
router.post('/validate-code', validateReferralCode);

export default router;
