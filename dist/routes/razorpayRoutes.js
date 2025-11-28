"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const razorpayController_1 = require("../controllers/razorpayController");
const router = (0, express_1.Router)();
/**
 * @route GET /api/razorpay/config
 * @desc Get Razorpay configuration for frontend
 * @access Private
 */
router.get('/config', auth_1.authenticate, razorpayController_1.getRazorpayConfig);
/**
 * @route POST /api/razorpay/create-order
 * @desc Create a Razorpay order
 * @access Private
 */
router.post('/create-order', auth_1.authenticate, razorpayController_1.createRazorpayOrder);
/**
 * @route POST /api/razorpay/verify-payment
 * @desc Verify Razorpay payment signature and complete order
 * @access Private
 */
router.post('/verify-payment', auth_1.authenticate, razorpayController_1.verifyRazorpayPayment);
/**
 * @route POST /api/razorpay/webhook
 * @desc Handle Razorpay webhook events
 * @access Public (verified with signature)
 */
router.post('/webhook', razorpayController_1.handleRazorpayWebhook);
/**
 * @route POST /api/razorpay/refund
 * @desc Create a refund
 * @access Private
 */
router.post('/refund', auth_1.authenticate, razorpayController_1.createRazorpayRefund);
exports.default = router;
