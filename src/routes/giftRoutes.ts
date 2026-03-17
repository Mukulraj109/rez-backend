import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import { requireReAuthAbove } from '../middleware/reAuth';
import { requireWalletFeature, WALLET_FEATURES } from '../services/walletFeatureService';
import {
  getGiftConfig,
  validateRecipient,
  sendGift,
  getReceivedGifts,
  claimGift,
  getSentGifts
} from '../controllers/giftController';
import { validate, validateParams, Joi } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Feature flag: disable all gifts if flag is off
router.use(requireWalletFeature(WALLET_FEATURES.GIFTS));

// Rate limiters for gift operations
const giftWriteLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10, message: 'Too many gift requests. Please try again later.' });
const giftReadLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30, message: 'Too many requests.' });
const validateLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 10, message: 'Too many validation requests. Please slow down.' });

// Config & validation
router.get('/config', giftReadLimiter, getGiftConfig);
router.post('/validate-recipient', validateLimiter, validate(Joi.object({
  recipientPhone: Joi.string(),
  recipientId: Joi.string()
})), validateRecipient);

// Gift operations — re-auth required above configured threshold
router.post('/send', giftWriteLimiter, requireReAuthAbove('gift'), validate(Joi.object({
  recipientPhone: Joi.string(),
  recipientId: Joi.string(),
  amount: Joi.number().positive().required(),
  coinType: Joi.string(),
  theme: Joi.string().required(),
  message: Joi.string().max(200),
  deliveryType: Joi.string(),
  scheduledAt: Joi.date(),
  idempotencyKey: Joi.string()
})), sendGift);
router.get('/received', giftReadLimiter, getReceivedGifts);
router.post('/:id/claim', giftWriteLimiter, validateParams(Joi.object({
  id: Joi.string().required()
})), claimGift);
router.get('/sent', giftReadLimiter, getSentGifts);

export default router;
