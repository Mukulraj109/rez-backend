import express from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  getPaymentStatus,
  createCheckoutSession,
  verifyStripeSession,
  verifyStripePayment,
  handleStripeWebhook
} from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * Payment Routes
 * Base path: /api/payment
 */

// ==================== RAZORPAY ROUTES ====================

// Create Razorpay order for payment (requires authentication)
router.post('/create-order', authenticate, createPaymentOrder);

// Verify Razorpay payment signature (requires authentication)
router.post('/verify', authenticate, verifyPayment);

// Handle Razorpay webhooks (no authentication - verified via signature)
router.post('/webhook', handleWebhook);

// ==================== STRIPE ROUTES ====================

// Create Stripe Checkout Session for subscription or one-time payment (requires authentication)
router.post('/create-checkout-session', authenticate, createCheckoutSession);

// Verify Stripe checkout session after payment (requires authentication)
router.post('/verify-stripe-session', authenticate, verifyStripeSession);

// Verify Stripe payment intent (requires authentication)
router.post('/verify-stripe-payment', authenticate, verifyStripePayment);

// Handle Stripe webhooks (no authentication - verified via signature)
// IMPORTANT: This route needs raw body parser (not JSON parser)
router.post('/stripe-webhook', handleStripeWebhook);

// ==================== COMMON ROUTES ====================

// Get payment status for an order (requires authentication)
router.get('/status/:orderId', authenticate, getPaymentStatus);

export default router;