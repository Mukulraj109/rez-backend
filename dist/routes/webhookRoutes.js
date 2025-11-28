"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhookController_1 = require("../controllers/webhookController");
const express_2 = __importDefault(require("express"));
const router = (0, express_1.Router)();
/**
 * Webhook Routes
 * Base path: /api/webhooks
 *
 * IMPORTANT: Webhook routes should NOT use authentication middleware
 * They are verified using signature verification instead
 */
/**
 * @route POST /api/webhooks/razorpay
 * @desc Handle Razorpay webhook events
 * @access Public (verified with signature)
 *
 * Events handled:
 * - payment.captured: Payment successfully captured
 * - payment.failed: Payment failed
 * - payment.authorized: Payment authorized (pending capture)
 * - order.paid: Order marked as paid
 * - refund.created: Refund initiated
 * - refund.processed: Refund completed
 * - refund.failed: Refund failed
 */
router.post('/razorpay', express_2.default.json(), // Parse JSON body for signature verification
webhookController_1.handleRazorpayWebhook);
/**
 * @route POST /api/webhooks/stripe
 * @desc Handle Stripe webhook events
 * @access Public (verified with signature)
 *
 * Events handled:
 * - payment_intent.succeeded: Payment completed successfully
 * - payment_intent.payment_failed: Payment failed
 * - payment_intent.created: Payment intent created
 * - payment_intent.canceled: Payment intent canceled
 * - charge.refunded: Charge refunded
 * - checkout.session.completed: Checkout session completed
 */
router.post('/stripe', express_2.default.raw({ type: 'application/json' }), // Stripe requires raw body for signature verification
webhookController_1.handleStripeWebhook);
exports.default = router;
