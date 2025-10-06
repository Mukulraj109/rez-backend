import { Router } from 'express';
import {
  getCashbackSummary,
  getCashbackHistory,
  getPendingCashback,
  getExpiringSoon,
  redeemCashback,
  getCashbackCampaigns,
  forecastCashback,
  getCashbackStatistics,
} from '../controllers/cashbackController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateQuery, validate, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// Get cashback summary
router.get('/summary',
  authenticate,
  getCashbackSummary
);

// Get cashback history
router.get('/history',
  authenticate,
  validateQuery(Joi.object({
    status: Joi.string().valid('pending', 'credited', 'expired', 'cancelled'),
    source: Joi.string().valid('order', 'referral', 'promotion', 'special_offer', 'bonus', 'signup'),
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  })),
  getCashbackHistory
);

// Get pending cashback (ready for redemption)
router.get('/pending',
  authenticate,
  getPendingCashback
);

// Get expiring soon cashback
router.get('/expiring-soon',
  authenticate,
  validateQuery(Joi.object({
    days: Joi.number().integer().min(1).max(30).default(7),
  })),
  getExpiringSoon
);

// Redeem pending cashback
router.post('/redeem',
  authenticate,
  redeemCashback
);

// Get active cashback campaigns
router.get('/campaigns',
  optionalAuth,
  getCashbackCampaigns
);

// Forecast cashback for cart
router.post('/forecast',
  optionalAuth,
  validate(Joi.object({
    cartData: Joi.object({
      items: Joi.array().items(Joi.object({
        product: Joi.object().required(),
        quantity: Joi.number().integer().min(1).required(),
        price: Joi.number().min(0).required(),
      })).min(1).required(),
      subtotal: Joi.number().min(0).required(),
    }).required(),
  })),
  forecastCashback
);

// Get cashback statistics
router.get('/statistics',
  authenticate,
  validateQuery(Joi.object({
    period: Joi.string().valid('day', 'week', 'month', 'year').default('month'),
  })),
  getCashbackStatistics
);

export default router;
