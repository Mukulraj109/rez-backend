"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paymentController_1 = require("../controllers/paymentController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * Payment Routes
 * Base path: /api/payment
 */
// ==================== RAZORPAY ROUTES ====================
// Create Razorpay order for payment (requires authentication)
router.post('/create-order', auth_1.authenticate, paymentController_1.createPaymentOrder);
// Verify Razorpay payment signature (requires authentication)
router.post('/verify', auth_1.authenticate, paymentController_1.verifyPayment);
// Handle Razorpay webhooks (no authentication - verified via signature)
router.post('/webhook', paymentController_1.handleWebhook);
// ==================== STRIPE ROUTES ====================
// Create Stripe Checkout Session for subscription or one-time payment (requires authentication)
router.post('/create-checkout-session', auth_1.authenticate, paymentController_1.createCheckoutSession);
// Verify Stripe checkout session after payment (requires authentication)
router.post('/verify-stripe-session', auth_1.authenticate, paymentController_1.verifyStripeSession);
// Verify Stripe payment intent (requires authentication)
router.post('/verify-stripe-payment', auth_1.authenticate, paymentController_1.verifyStripePayment);
// Handle Stripe webhooks (no authentication - verified via signature)
// IMPORTANT: This route needs raw body parser (not JSON parser)
router.post('/stripe-webhook', paymentController_1.handleStripeWebhook);
// ==================== COMMON ROUTES ====================
// Get payment status for an order (requires authentication)
router.get('/status/:orderId', auth_1.authenticate, paymentController_1.getPaymentStatus);
exports.default = router;
