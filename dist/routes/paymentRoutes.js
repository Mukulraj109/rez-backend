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
// Create Razorpay order for payment (requires authentication)
router.post('/create-order', auth_1.authenticate, paymentController_1.createPaymentOrder);
// Verify Razorpay payment signature (requires authentication)
router.post('/verify', auth_1.authenticate, paymentController_1.verifyPayment);
// Handle Razorpay webhooks (no authentication - verified via signature)
router.post('/webhook', paymentController_1.handleWebhook);
// Get payment status for an order (requires authentication)
router.get('/status/:orderId', auth_1.authenticate, paymentController_1.getPaymentStatus);
// Create Stripe Checkout Session for subscription (requires authentication)
router.post('/create-checkout-session', auth_1.authenticate, paymentController_1.createCheckoutSession);
exports.default = router;
