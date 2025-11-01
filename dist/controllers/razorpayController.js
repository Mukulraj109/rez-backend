"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRazorpayRefund = exports.handleRazorpayWebhook = exports.getRazorpayConfig = exports.verifyRazorpayPayment = exports.createRazorpayOrder = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const razorpayService_1 = require("../services/razorpayService");
/**
 * @desc Create a Razorpay order for payment
 * @route POST /api/razorpay/create-order
 * @access Private
 */
exports.createRazorpayOrder = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { amount, orderId, notes } = req.body;
    // Validate input
    if (!amount || amount <= 0) {
        return (0, response_1.sendBadRequest)(res, 'Valid amount is required');
    }
    try {
        // Generate receipt
        const receipt = `order_${orderId || Date.now()}`;
        // Create Razorpay order
        const razorpayOrder = await razorpayService_1.razorpayService.createOrder(amount, receipt, {
            userId,
            orderId: orderId || 'pending',
            ...notes,
        });
        console.log('✅ [RAZORPAY CONTROLLER] Order created successfully:', razorpayOrder.id);
        // Return order details to frontend
        (0, response_1.sendSuccess)(res, {
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            receipt: razorpayOrder.receipt,
            notes: razorpayOrder.notes,
        }, 'Razorpay order created successfully');
    }
    catch (error) {
        console.error('❌ [RAZORPAY CONTROLLER] Order creation error:', error);
        (0, response_1.sendError)(res, error.message || 'Failed to create Razorpay order', 500);
    }
});
/**
 * @desc Verify Razorpay payment and create order
 * @route POST /api/razorpay/verify-payment
 * @access Private
 */
exports.verifyRazorpayPayment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderData, // Cart items, delivery address, etc.
     } = req.body;
    // Validate input
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return (0, response_1.sendBadRequest)(res, 'Payment verification data is required');
    }
    try {
        // Step 1: Verify signature
        const isValid = razorpayService_1.razorpayService.verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
        if (!isValid) {
            console.error('❌ [RAZORPAY CONTROLLER] Payment signature verification failed');
            return (0, response_1.sendError)(res, 'Payment verification failed. Please contact support.', 400);
        }
        console.log('✅ [RAZORPAY CONTROLLER] Payment signature verified');
        // Step 2: Fetch payment details from Razorpay
        const paymentDetails = await razorpayService_1.razorpayService.fetchPaymentDetails(razorpayPaymentId);
        if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
            console.error('❌ [RAZORPAY CONTROLLER] Payment not successful:', paymentDetails.status);
            return (0, response_1.sendError)(res, `Payment failed with status: ${paymentDetails.status}`, 400);
        }
        const amountInRupees = Number(paymentDetails.amount) / 100;
        console.log('✅ [RAZORPAY CONTROLLER] Payment successful:', {
            paymentId: razorpayPaymentId,
            method: paymentDetails.method,
            amount: `₹${amountInRupees}`,
        });
        // Step 3: Create order in database
        // Note: The actual order creation logic should be handled by the order controller
        // This endpoint just verifies the payment and returns success
        (0, response_1.sendSuccess)(res, {
            verified: true,
            paymentId: razorpayPaymentId,
            orderId: razorpayOrderId,
            paymentMethod: paymentDetails.method,
            amount: amountInRupees,
            status: paymentDetails.status,
            transactionId: razorpayPaymentId,
        }, 'Payment verified successfully');
    }
    catch (error) {
        console.error('❌ [RAZORPAY CONTROLLER] Payment verification error:', error);
        (0, response_1.sendError)(res, error.message || 'Payment verification failed', 500);
    }
});
/**
 * @desc Get Razorpay configuration for frontend
 * @route GET /api/razorpay/config
 * @access Private
 */
exports.getRazorpayConfig = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        const config = razorpayService_1.razorpayService.getConfigForFrontend();
        (0, response_1.sendSuccess)(res, config, 'Razorpay configuration retrieved successfully');
    }
    catch (error) {
        console.error('❌ [RAZORPAY CONTROLLER] Config retrieval error:', error);
        (0, response_1.sendError)(res, error.message || 'Failed to get Razorpay config', 500);
    }
});
/**
 * @desc Handle Razorpay webhook events
 * @route POST /api/razorpay/webhook
 * @access Public (but verified with signature)
 */
exports.handleRazorpayWebhook = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookBody = JSON.stringify(req.body);
    if (!webhookSignature) {
        return (0, response_1.sendBadRequest)(res, 'Webhook signature missing');
    }
    try {
        // Verify webhook signature
        const isValid = razorpayService_1.razorpayService.validateWebhookSignature(webhookBody, webhookSignature);
        if (!isValid) {
            console.error('❌ [RAZORPAY WEBHOOK] Signature verification failed');
            return (0, response_1.sendError)(res, 'Invalid webhook signature', 401);
        }
        const event = req.body;
        console.log('📥 [RAZORPAY WEBHOOK] Event received:', {
            event: event.event,
            paymentId: event.payload?.payment?.entity?.id,
        });
        // Handle different webhook events
        switch (event.event) {
            case 'payment.captured':
                // Payment successful
                console.log('✅ [RAZORPAY WEBHOOK] Payment captured:', event.payload.payment.entity.id);
                // Update order status in database
                break;
            case 'payment.failed':
                // Payment failed
                console.log('❌ [RAZORPAY WEBHOOK] Payment failed:', event.payload.payment.entity.id);
                // Update order status in database
                break;
            case 'refund.created':
                // Refund created
                console.log('💰 [RAZORPAY WEBHOOK] Refund created:', event.payload.refund.entity.id);
                // Update order status in database
                break;
            default:
                console.log('ℹ️ [RAZORPAY WEBHOOK] Unhandled event:', event.event);
        }
        // Always return 200 to acknowledge webhook receipt
        res.status(200).json({ received: true });
    }
    catch (error) {
        console.error('❌ [RAZORPAY WEBHOOK] Processing error:', error);
        // Still return 200 to avoid Razorpay retrying
        res.status(200).json({ received: true, error: error.message });
    }
});
/**
 * @desc Create a refund for a Razorpay payment
 * @route POST /api/razorpay/refund
 * @access Private (Admin only ideally)
 */
exports.createRazorpayRefund = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { paymentId, amount, notes } = req.body;
    if (!paymentId) {
        return (0, response_1.sendBadRequest)(res, 'Payment ID is required');
    }
    try {
        const refund = await razorpayService_1.razorpayService.createRefund(paymentId, amount, notes);
        console.log('✅ [RAZORPAY CONTROLLER] Refund created:', refund.id);
        const refundAmountInRupees = refund.amount ? Number(refund.amount) / 100 : 0;
        (0, response_1.sendSuccess)(res, {
            refundId: refund.id,
            paymentId: refund.payment_id,
            amount: refundAmountInRupees,
            status: refund.status,
        }, 'Refund created successfully');
    }
    catch (error) {
        console.error('❌ [RAZORPAY CONTROLLER] Refund creation error:', error);
        (0, response_1.sendError)(res, error.message || 'Failed to create refund', 500);
    }
});
