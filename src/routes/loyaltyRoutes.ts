import { Router, Request, Response } from 'express';
import {
  getUserLoyalty,
  checkIn,
  completeMission,
  getCoinBalance,
  syncBrandLoyalty,
  getHomepageLoyaltySummary
} from '../controllers/loyaltyController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateParams } from '../middleware/validation';
import { Joi } from '../middleware/validation';
import LoyaltyMilestone from '../models/LoyaltyMilestone';

const router = Router();

// Get all active loyalty milestones (public)
router.get('/milestones', async (req: Request, res: Response) => {
  try {
    const milestones = await LoyaltyMilestone.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    res.json({
      success: true,
      data: milestones,
      message: 'Loyalty milestones retrieved successfully',
    });
  } catch (error) {
    console.error('[Loyalty] Error fetching milestones:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch loyalty milestones',
    });
  }
});

// Homepage summary - uses optional auth (works for both logged in and anonymous users)
router.get('/homepage-summary', optionalAuth, getHomepageLoyaltySummary);

// All other loyalty routes require authentication
router.use(authenticate);

// Get user's loyalty data
router.get('/', getUserLoyalty);

// Daily check-in
router.post('/checkin', checkIn);

// Complete mission
router.post('/missions/:missionId/complete',
  validateParams(Joi.object({
    missionId: Joi.string().required()
  })),
  completeMission
);

// Get coin balance
router.get('/coins', getCoinBalance);

// Sync brand loyalty from order history
router.post('/sync-brands', syncBrandLoyalty);

export default router;
