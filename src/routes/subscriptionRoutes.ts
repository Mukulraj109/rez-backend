import express from 'express';
import * as subscriptionController from '../controllers/subscriptionController';
import { authenticate } from '../middleware/auth';
import {
  razorpayIPWhitelist,
  webhookRateLimiter,
  validateWebhookPayload,
  logWebhookSecurityEvent,
} from '../middleware/webhookSecurity';

const router = express.Router();

// Public routes
router.get('/tiers', subscriptionController.getSubscriptionTiers);

// Webhook endpoint with comprehensive security middleware stack
// Order matters: IP whitelist -> rate limit -> payload validation -> logging -> controller
router.post(
  '/webhook',
  razorpayIPWhitelist, // Check IP is from Razorpay
  webhookRateLimiter, // Rate limiting
  validateWebhookPayload, // Validate payload structure
  logWebhookSecurityEvent, // Audit logging
  subscriptionController.handleWebhook // Main handler with replay attack prevention
);

// Protected routes (require authentication)
router.use(authenticate);

router.get('/current', subscriptionController.getCurrentSubscription);
router.get('/benefits', subscriptionController.getSubscriptionBenefits);
router.get('/usage', subscriptionController.getSubscriptionUsage);
router.get('/value-proposition/:tier', subscriptionController.getValueProposition);

router.post('/subscribe', subscriptionController.subscribeToPlan);
router.post('/validate-promo', subscriptionController.validatePromoCode);
router.post('/upgrade', subscriptionController.upgradeSubscription);
router.post('/downgrade', subscriptionController.downgradeSubscription);
router.post('/cancel', subscriptionController.cancelSubscription);
router.post('/renew', subscriptionController.renewSubscription);

router.patch('/auto-renew', subscriptionController.toggleAutoRenew);

export default router;
