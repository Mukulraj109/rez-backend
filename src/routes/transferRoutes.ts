import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import { requireReAuthAbove } from '../middleware/reAuth';
import { requireWalletFeature, WALLET_FEATURES } from '../services/walletFeatureService';
import {
  initiateTransfer,
  confirmTransfer,
  getTransferHistory,
  getRecentRecipients
} from '../controllers/transferController';
import { validate, Joi } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Feature flag: disable all transfers if flag is off
router.use(requireWalletFeature(WALLET_FEATURES.TRANSFERS));

// Rate limiters for transfer operations
const transferWriteLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many transfer requests. Please try again later.' });
const transferReadLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30, message: 'Too many requests.' });

// Transfer operations — re-auth required above configured threshold
router.post('/initiate', transferWriteLimiter, requireReAuthAbove('transfer'), validate(Joi.object({
  recipientPhone: Joi.string(),
  recipientId: Joi.string(),
  amount: Joi.number().positive().required(),
  coinType: Joi.string(),
  note: Joi.string().max(200),
  idempotencyKey: Joi.string()
})), initiateTransfer);
router.post('/confirm', transferWriteLimiter, validate(Joi.object({
  transferId: Joi.string().required()
})), confirmTransfer);

// History and recipients
router.get('/history', transferReadLimiter, getTransferHistory);
router.get('/recipients', transferReadLimiter, getRecentRecipients);

export default router;
