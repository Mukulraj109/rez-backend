import { Router } from 'express';
import {
  getUserLoyalty,
  checkIn,
  completeMission,
  getCoinBalance
} from '../controllers/loyaltyController';
import { authenticate } from '../middleware/auth';
import { validateParams } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// All loyalty routes require authentication
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

export default router;
