import express from 'express';
import {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  getPaymentStatus
} from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * Payment Routes
 * Base path: /api/payment
 */

// Create Razorpay order for payment (requires authentication)
router.post('/create-order', authenticate, createPaymentOrder);

// Verify Razorpay payment signature (requires authentication)
router.post('/verify', authenticate, verifyPayment);

// Handle Razorpay webhooks (no authentication - verified via signature)
router.post('/webhook', handleWebhook);

// Get payment status for an order (requires authentication)
router.get('/status/:orderId', authenticate, getPaymentStatus);

export default router;