"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStripeWebhook = exports.handleRazorpayWebhook = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const Order_1 = require("../models/Order");
const WebhookLog_1 = require("../models/WebhookLog");
const PaymentService_1 = __importDefault(require("../services/PaymentService"));
const stripeService_1 = __importDefault(require("../services/stripeService"));
const razorpayService_1 = require("../services/razorpayService");
const response_1 = require("../utils/response");
/**
 * Enhanced Razorpay Webhook Handler
 * POST /api/webhooks/razorpay
 *
 * Handles all Razorpay webhook events with:
 * - Signature verification
 * - Idempotency handling
 * - Comprehensive logging
 * - Error handling and retries
 */
exports.handleRazorpayWebhook = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookBody = JSON.stringify(req.body);
    const event = req.body;
    console.log('🔔 [RAZORPAY WEBHOOK] Event received:', {
        eventType: event.event,
        eventId: event.payload?.payment?.entity?.id || event.payload?.order?.entity?.id || 'unknown',
        timestamp: new Date().toISOString()
    });
    // Validate webhook signature
    if (!webhookSignature) {
        console.error('❌ [RAZORPAY WEBHOOK] Missing signature');
        return (0, response_1.sendBadRequest)(res, 'Missing webhook signature');
    }
    try {
        // Step 1: Verify webhook signature
        const isValidSignature = razorpayService_1.razorpayService.validateWebhookSignature(webhookBody, webhookSignature);
        if (!isValidSignature) {
            console.error('❌ [RAZORPAY WEBHOOK] Invalid signature');
            // Log failed verification attempt
            await WebhookLog_1.WebhookLog.create({
                provider: 'razorpay',
                eventId: `failed_${Date.now()}`,
                eventType: event.event || 'unknown',
                payload: event,
                signature: webhookSignature,
                signatureValid: false,
                processed: false,
                status: 'failed',
                errorMessage: 'Invalid webhook signature'
            });
            return (0, response_1.sendUnauthorized)(res, 'Invalid webhook signature');
        }
        console.log('✅ [RAZORPAY WEBHOOK] Signature verified');
        // Step 2: Extract event details
        const eventType = event.event;
        const eventId = event.payload?.payment?.entity?.id ||
            event.payload?.order?.entity?.id ||
            event.payload?.refund?.entity?.id ||
            `event_${Date.now()}`;
        // Step 3: Check for duplicate events (idempotency)
        const isProcessed = await WebhookLog_1.WebhookLog.isEventProcessed(eventId);
        if (isProcessed) {
            console.log('⚠️ [RAZORPAY WEBHOOK] Duplicate event detected:', eventId);
            await WebhookLog_1.WebhookLog.markAsDuplicate(eventId);
            // Return 200 to prevent retries
            return res.status(200).json({
                received: true,
                status: 'duplicate',
                message: 'Event already processed'
            });
        }
        // Step 4: Create webhook log entry
        const webhookLog = await WebhookLog_1.WebhookLog.create({
            provider: 'razorpay',
            eventId,
            eventType,
            payload: event,
            signature: webhookSignature,
            signatureValid: true,
            processed: false,
            status: 'processing',
            metadata: {
                paymentId: event.payload?.payment?.entity?.id,
                orderId: event.payload?.payment?.entity?.notes?.orderId ||
                    event.payload?.order?.entity?.notes?.orderId,
                amount: event.payload?.payment?.entity?.amount,
                currency: event.payload?.payment?.entity?.currency
            }
        });
        console.log('📝 [RAZORPAY WEBHOOK] Log created:', webhookLog._id);
        // Step 5: Process the webhook event
        try {
            await processRazorpayEvent(event, webhookLog);
            // Mark as successfully processed
            webhookLog.processed = true;
            webhookLog.processedAt = new Date();
            webhookLog.status = 'success';
            await webhookLog.save();
            console.log('✅ [RAZORPAY WEBHOOK] Event processed successfully');
            return res.status(200).json({
                received: true,
                status: 'success',
                eventId: webhookLog.eventId
            });
        }
        catch (processingError) {
            console.error('❌ [RAZORPAY WEBHOOK] Processing error:', processingError);
            // Update log with error
            webhookLog.status = 'failed';
            webhookLog.errorMessage = processingError.message;
            webhookLog.retryCount += 1;
            await webhookLog.save();
            // Return 200 to prevent unnecessary retries for application errors
            return res.status(200).json({
                received: true,
                status: 'error',
                message: processingError.message
            });
        }
    }
    catch (error) {
        console.error('❌ [RAZORPAY WEBHOOK] Unexpected error:', error);
        // Return 200 to prevent retries
        return res.status(200).json({
            received: true,
            status: 'error',
            message: error.message
        });
    }
});
/**
 * Process Razorpay webhook events
 */
async function processRazorpayEvent(event, webhookLog) {
    const eventType = event.event;
    console.log(`🔄 [RAZORPAY WEBHOOK] Processing event type: ${eventType}`);
    switch (eventType) {
        case 'payment.captured':
            await handleRazorpayPaymentCaptured(event);
            break;
        case 'payment.failed':
            await handleRazorpayPaymentFailed(event);
            break;
        case 'payment.authorized':
            await handleRazorpayPaymentAuthorized(event);
            break;
        case 'order.paid':
            await handleRazorpayOrderPaid(event);
            break;
        case 'refund.created':
            await handleRazorpayRefundCreated(event);
            break;
        case 'refund.processed':
            await handleRazorpayRefundProcessed(event);
            break;
        case 'refund.failed':
            await handleRazorpayRefundFailed(event);
            break;
        default:
            console.log(`ℹ️ [RAZORPAY WEBHOOK] Unhandled event type: ${eventType}`);
        // Don't throw error for unhandled events
    }
}
/**
 * Handle payment.captured event
 */
async function handleRazorpayPaymentCaptured(event) {
    const payment = event.payload.payment.entity;
    const orderId = payment.notes?.orderId;
    if (!orderId) {
        console.error('❌ [RAZORPAY WEBHOOK] Order ID not found in payment notes');
        return;
    }
    console.log('✅ [RAZORPAY WEBHOOK] Payment captured for order:', orderId);
    const order = await Order_1.Order.findById(orderId);
    if (!order) {
        console.error('❌ [RAZORPAY WEBHOOK] Order not found:', orderId);
        return;
    }
    // Check if already processed
    if (order.payment.status === 'paid') {
        console.log('⚠️ [RAZORPAY WEBHOOK] Payment already marked as paid');
        return;
    }
    // Update order payment status
    order.payment.status = 'paid';
    order.payment.transactionId = payment.id;
    order.payment.paidAt = new Date(payment.created_at * 1000);
    order.totals.paidAmount = payment.amount / 100;
    // Update payment gateway details
    order.paymentGateway = {
        gatewayPaymentId: payment.id,
        gateway: 'razorpay',
        currency: payment.currency,
        amountPaid: payment.amount / 100,
        paidAt: new Date(payment.created_at * 1000)
    };
    // Add timeline entry
    order.timeline.push({
        status: 'payment_captured',
        message: 'Payment captured successfully via webhook',
        timestamp: new Date()
    });
    await order.save();
    console.log('✅ [RAZORPAY WEBHOOK] Order updated with payment details');
}
/**
 * Handle payment.failed event
 */
async function handleRazorpayPaymentFailed(event) {
    const payment = event.payload.payment.entity;
    const orderId = payment.notes?.orderId;
    if (!orderId) {
        console.error('❌ [RAZORPAY WEBHOOK] Order ID not found in payment notes');
        return;
    }
    console.log('❌ [RAZORPAY WEBHOOK] Payment failed for order:', orderId);
    const order = await Order_1.Order.findById(orderId);
    if (!order) {
        console.error('❌ [RAZORPAY WEBHOOK] Order not found:', orderId);
        return;
    }
    const failureReason = payment.error_description || payment.error_code || 'Payment failed';
    // Handle payment failure
    await PaymentService_1.default.handlePaymentFailure(orderId, failureReason);
    console.log('✅ [RAZORPAY WEBHOOK] Payment failure processed');
}
/**
 * Handle payment.authorized event
 */
async function handleRazorpayPaymentAuthorized(event) {
    const payment = event.payload.payment.entity;
    const orderId = payment.notes?.orderId;
    if (!orderId) {
        console.error('❌ [RAZORPAY WEBHOOK] Order ID not found in payment notes');
        return;
    }
    console.log('🔐 [RAZORPAY WEBHOOK] Payment authorized for order:', orderId);
    const order = await Order_1.Order.findById(orderId);
    if (!order) {
        console.error('❌ [RAZORPAY WEBHOOK] Order not found:', orderId);
        return;
    }
    // Update order status to processing
    order.payment.status = 'processing';
    order.timeline.push({
        status: 'payment_authorized',
        message: 'Payment authorized, pending capture',
        timestamp: new Date()
    });
    await order.save();
}
/**
 * Handle order.paid event
 */
async function handleRazorpayOrderPaid(event) {
    const razorpayOrder = event.payload.order.entity;
    const orderId = razorpayOrder.notes?.orderId;
    if (!orderId) {
        console.error('❌ [RAZORPAY WEBHOOK] Order ID not found in order notes');
        return;
    }
    console.log('✅ [RAZORPAY WEBHOOK] Order paid:', orderId);
    const order = await Order_1.Order.findById(orderId);
    if (!order) {
        console.error('❌ [RAZORPAY WEBHOOK] Order not found:', orderId);
        return;
    }
    // Additional processing if needed
    order.timeline.push({
        status: 'order_paid_webhook',
        message: 'Order payment confirmed via webhook',
        timestamp: new Date()
    });
    await order.save();
}
/**
 * Handle refund.created event
 */
async function handleRazorpayRefundCreated(event) {
    const refund = event.payload.refund.entity;
    const paymentId = refund.payment_id;
    console.log('💰 [RAZORPAY WEBHOOK] Refund created:', refund.id);
    // Find order by payment ID
    const order = await Order_1.Order.findOne({ 'payment.transactionId': paymentId });
    if (!order) {
        console.error('❌ [RAZORPAY WEBHOOK] Order not found for payment:', paymentId);
        return;
    }
    // Update refund details
    order.payment.refundId = refund.id;
    order.payment.status = 'refunded';
    order.totals.refundAmount = (order.totals.refundAmount || 0) + (refund.amount / 100);
    order.timeline.push({
        status: 'refund_created',
        message: `Refund of ₹${refund.amount / 100} initiated`,
        timestamp: new Date()
    });
    await order.save();
    console.log('✅ [RAZORPAY WEBHOOK] Refund details updated');
}
/**
 * Handle refund.processed event
 */
async function handleRazorpayRefundProcessed(event) {
    const refund = event.payload.refund.entity;
    const paymentId = refund.payment_id;
    console.log('✅ [RAZORPAY WEBHOOK] Refund processed:', refund.id);
    const order = await Order_1.Order.findOne({ 'payment.transactionId': paymentId });
    if (!order) {
        console.error('❌ [RAZORPAY WEBHOOK] Order not found for payment:', paymentId);
        return;
    }
    order.payment.refundedAt = new Date();
    order.timeline.push({
        status: 'refund_processed',
        message: `Refund of ₹${refund.amount / 100} processed successfully`,
        timestamp: new Date()
    });
    await order.save();
}
/**
 * Handle refund.failed event
 */
async function handleRazorpayRefundFailed(event) {
    const refund = event.payload.refund.entity;
    const paymentId = refund.payment_id;
    console.log('❌ [RAZORPAY WEBHOOK] Refund failed:', refund.id);
    const order = await Order_1.Order.findOne({ 'payment.transactionId': paymentId });
    if (!order) {
        console.error('❌ [RAZORPAY WEBHOOK] Order not found for payment:', paymentId);
        return;
    }
    order.timeline.push({
        status: 'refund_failed',
        message: `Refund of ₹${refund.amount / 100} failed`,
        timestamp: new Date()
    });
    await order.save();
}
/**
 * Enhanced Stripe Webhook Handler
 * POST /api/webhooks/stripe
 *
 * Handles all Stripe webhook events with:
 * - Signature verification
 * - Idempotency handling
 * - Comprehensive logging
 * - Error handling and retries
 */
exports.handleStripeWebhook = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('❌ [STRIPE WEBHOOK] Webhook secret not configured');
        return (0, response_1.sendBadRequest)(res, 'Stripe webhook secret not configured');
    }
    if (!signature) {
        console.error('❌ [STRIPE WEBHOOK] Missing signature');
        return (0, response_1.sendBadRequest)(res, 'Missing webhook signature');
    }
    console.log('🔔 [STRIPE WEBHOOK] Event received at:', new Date().toISOString());
    try {
        // Step 1: Verify webhook signature using Stripe's constructEvent
        const event = stripeService_1.default.verifyWebhookSignature(req.body, signature, webhookSecret);
        console.log('✅ [STRIPE WEBHOOK] Signature verified:', {
            eventType: event.type,
            eventId: event.id
        });
        // Step 2: Check for duplicate events (idempotency)
        const isProcessed = await WebhookLog_1.WebhookLog.isEventProcessed(event.id);
        if (isProcessed) {
            console.log('⚠️ [STRIPE WEBHOOK] Duplicate event detected:', event.id);
            await WebhookLog_1.WebhookLog.markAsDuplicate(event.id);
            return res.status(200).json({
                received: true,
                status: 'duplicate',
                message: 'Event already processed'
            });
        }
        // Step 3: Extract metadata
        const metadata = extractStripeMetadata(event);
        // Step 4: Create webhook log entry
        const webhookLog = await WebhookLog_1.WebhookLog.create({
            provider: 'stripe',
            eventId: event.id,
            eventType: event.type,
            payload: event,
            signature: signature,
            signatureValid: true,
            processed: false,
            status: 'processing',
            metadata
        });
        console.log('📝 [STRIPE WEBHOOK] Log created:', webhookLog._id);
        // Step 5: Process the webhook event
        try {
            await processStripeEvent(event, webhookLog);
            // Mark as successfully processed
            webhookLog.processed = true;
            webhookLog.processedAt = new Date();
            webhookLog.status = 'success';
            await webhookLog.save();
            console.log('✅ [STRIPE WEBHOOK] Event processed successfully');
            return res.status(200).json({
                received: true,
                status: 'success',
                eventId: webhookLog.eventId
            });
        }
        catch (processingError) {
            console.error('❌ [STRIPE WEBHOOK] Processing error:', processingError);
            // Update log with error
            webhookLog.status = 'failed';
            webhookLog.errorMessage = processingError.message;
            webhookLog.retryCount += 1;
            await webhookLog.save();
            // Return 200 to prevent unnecessary retries
            return res.status(200).json({
                received: true,
                status: 'error',
                message: processingError.message
            });
        }
    }
    catch (error) {
        console.error('❌ [STRIPE WEBHOOK] Signature verification failed:', error);
        // Log failed verification attempt
        await WebhookLog_1.WebhookLog.create({
            provider: 'stripe',
            eventId: `failed_${Date.now()}`,
            eventType: 'unknown',
            payload: req.body,
            signature: signature,
            signatureValid: false,
            processed: false,
            status: 'failed',
            errorMessage: error.message
        });
        return (0, response_1.sendUnauthorized)(res, 'Invalid webhook signature');
    }
});
/**
 * Extract metadata from Stripe event
 */
function extractStripeMetadata(event) {
    const metadata = {};
    switch (event.type) {
        case 'payment_intent.succeeded':
        case 'payment_intent.payment_failed':
            const paymentIntent = event.data.object;
            metadata.paymentId = paymentIntent.id;
            metadata.amount = paymentIntent.amount;
            metadata.currency = paymentIntent.currency;
            metadata.orderId = paymentIntent.metadata?.orderId || paymentIntent.metadata?.subscriptionId;
            break;
        case 'charge.refunded':
            const charge = event.data.object;
            metadata.paymentId = charge.id;
            metadata.amount = charge.amount_refunded;
            metadata.currency = charge.currency;
            break;
        case 'checkout.session.completed':
            const session = event.data.object;
            metadata.orderId = session.metadata?.subscriptionId;
            metadata.amount = session.amount_total;
            metadata.currency = session.currency;
            break;
    }
    return metadata;
}
/**
 * Process Stripe webhook events
 */
async function processStripeEvent(event, webhookLog) {
    const eventType = event.type;
    console.log(`🔄 [STRIPE WEBHOOK] Processing event type: ${eventType}`);
    switch (eventType) {
        case 'payment_intent.succeeded':
            await handleStripePaymentIntentSucceeded(event);
            break;
        case 'payment_intent.payment_failed':
            await handleStripePaymentIntentFailed(event);
            break;
        case 'charge.refunded':
            await handleStripeChargeRefunded(event);
            break;
        case 'checkout.session.completed':
            await handleStripeCheckoutSessionCompleted(event);
            break;
        case 'payment_intent.created':
            await handleStripePaymentIntentCreated(event);
            break;
        case 'payment_intent.canceled':
            await handleStripePaymentIntentCanceled(event);
            break;
        default:
            console.log(`ℹ️ [STRIPE WEBHOOK] Unhandled event type: ${eventType}`);
        // Don't throw error for unhandled events
    }
}
/**
 * Handle payment_intent.succeeded event
 */
async function handleStripePaymentIntentSucceeded(event) {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.orderId || paymentIntent.metadata?.subscriptionId;
    console.log('✅ [STRIPE WEBHOOK] Payment intent succeeded:', paymentIntent.id);
    if (!orderId) {
        console.error('❌ [STRIPE WEBHOOK] Order ID not found in metadata');
        return;
    }
    const order = await Order_1.Order.findById(orderId);
    if (!order) {
        console.error('❌ [STRIPE WEBHOOK] Order not found:', orderId);
        return;
    }
    // Check if already processed
    if (order.payment.status === 'paid') {
        console.log('⚠️ [STRIPE WEBHOOK] Payment already marked as paid');
        return;
    }
    // Update order payment status
    order.payment.status = 'paid';
    order.payment.transactionId = paymentIntent.id;
    order.payment.paidAt = new Date(paymentIntent.created * 1000);
    order.totals.paidAmount = paymentIntent.amount / 100;
    // Update payment gateway details
    order.paymentGateway = {
        gatewayPaymentId: paymentIntent.id,
        gateway: 'stripe',
        currency: paymentIntent.currency,
        amountPaid: paymentIntent.amount / 100,
        paidAt: new Date(paymentIntent.created * 1000)
    };
    // Add timeline entry
    order.timeline.push({
        status: 'payment_success',
        message: 'Payment completed successfully via Stripe webhook',
        timestamp: new Date()
    });
    await order.save();
    console.log('✅ [STRIPE WEBHOOK] Order updated with payment details');
}
/**
 * Handle payment_intent.payment_failed event
 */
async function handleStripePaymentIntentFailed(event) {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.orderId || paymentIntent.metadata?.subscriptionId;
    console.log('❌ [STRIPE WEBHOOK] Payment intent failed:', paymentIntent.id);
    if (!orderId) {
        console.error('❌ [STRIPE WEBHOOK] Order ID not found in metadata');
        return;
    }
    const order = await Order_1.Order.findById(orderId);
    if (!order) {
        console.error('❌ [STRIPE WEBHOOK] Order not found:', orderId);
        return;
    }
    const failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';
    // Handle payment failure
    await PaymentService_1.default.handlePaymentFailure(orderId, failureReason);
    console.log('✅ [STRIPE WEBHOOK] Payment failure processed');
}
/**
 * Handle charge.refunded event
 */
async function handleStripeChargeRefunded(event) {
    const charge = event.data.object;
    const paymentIntentId = charge.payment_intent;
    console.log('💰 [STRIPE WEBHOOK] Charge refunded:', charge.id);
    // Find order by payment ID
    const order = await Order_1.Order.findOne({ 'payment.transactionId': paymentIntentId });
    if (!order) {
        console.error('❌ [STRIPE WEBHOOK] Order not found for payment:', paymentIntentId);
        return;
    }
    // Update refund details
    order.payment.status = 'refunded';
    order.payment.refundedAt = new Date();
    order.totals.refundAmount = (order.totals.refundAmount || 0) + (charge.amount_refunded / 100);
    order.timeline.push({
        status: 'refund_processed',
        message: `Refund of ${(charge.amount_refunded / 100).toFixed(2)} ${charge.currency.toUpperCase()} processed`,
        timestamp: new Date()
    });
    await order.save();
    console.log('✅ [STRIPE WEBHOOK] Refund details updated');
}
/**
 * Handle checkout.session.completed event
 */
async function handleStripeCheckoutSessionCompleted(event) {
    const session = event.data.object;
    const subscriptionId = session.metadata?.subscriptionId;
    console.log('✅ [STRIPE WEBHOOK] Checkout session completed:', session.id);
    if (!subscriptionId) {
        console.log('ℹ️ [STRIPE WEBHOOK] No subscription ID in metadata');
        return;
    }
    // Handle subscription payment completion
    // This would typically update subscription status in your database
    console.log('✅ [STRIPE WEBHOOK] Subscription payment completed:', subscriptionId);
}
/**
 * Handle payment_intent.created event
 */
async function handleStripePaymentIntentCreated(event) {
    const paymentIntent = event.data.object;
    console.log('📝 [STRIPE WEBHOOK] Payment intent created:', paymentIntent.id);
    // Log for audit purposes
}
/**
 * Handle payment_intent.canceled event
 */
async function handleStripePaymentIntentCanceled(event) {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.orderId;
    console.log('❌ [STRIPE WEBHOOK] Payment intent canceled:', paymentIntent.id);
    if (!orderId) {
        return;
    }
    const order = await Order_1.Order.findById(orderId);
    if (!order) {
        return;
    }
    order.timeline.push({
        status: 'payment_canceled',
        message: 'Payment was canceled',
        timestamp: new Date()
    });
    await order.save();
}
