import { Request, Response } from 'express';
import { Order } from '../models/Order';
import paymentService from '../services/PaymentService';
import stripeService from '../services/stripeService';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import {
  sendSuccess,
  sendBadRequest,
  sendNotFound,
  sendUnauthorized
} from '../utils/response';
import {
  ICreatePaymentOrderRequest,
  ICreatePaymentOrderResponse,
  IVerifyPaymentRequest,
  IVerifyPaymentResponse,
  IRazorpayWebhookEvent
} from '../types/payment';
import {
  verifyPaymentDataCompleteness,
  logPaymentVerificationAttempt,
  sanitizePaymentData
} from '../utils/razorpayUtils';
import { PaymentLogger } from '../services/logging/paymentLogger';

/**
 * Create Razorpay order for payment
 * POST /api/payment/create-order
 */
export const createPaymentOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { orderId, amount, currency = 'INR' }: ICreatePaymentOrderRequest = req.body;

  console.log('💳 [PAYMENT CONTROLLER] Creating payment order:', {
    orderId,
    amount,
    currency,
    userId
  });

  // Validate request
  if (!orderId || !amount) {
    return sendBadRequest(res, 'Order ID and amount are required');
  }

  try {
    // Verify order belongs to user
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    // Check if order is in correct status for payment
    if (order.status !== 'placed') {
      return sendBadRequest(res, 'Order cannot be paid at this stage');
    }

    // Check if payment is already completed
    if (order.payment.status === 'paid') {
      return sendBadRequest(res, 'Payment already completed for this order');
    }

    // Create Razorpay order
    const razorpayOrder = await paymentService.createPaymentOrder(orderId, amount, currency);

    // Prepare response
    const response: ICreatePaymentOrderResponse = {
      success: true,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: paymentService.getRazorpayKeyId(),
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderId: orderId,
      orderNumber: order.orderNumber,
      notes: razorpayOrder.notes
    };

    console.log('✅ [PAYMENT CONTROLLER] Payment order created successfully');

    sendSuccess(res, response, 'Payment order created successfully', 201);
  } catch (error: any) {
    console.error('❌ [PAYMENT CONTROLLER] Error creating payment order:', error);
    throw new AppError(`Failed to create payment order: ${error.message}`, 500);
  }
});

/**
 * Verify Razorpay payment signature
 * POST /api/payment/verify
 */
export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const {
    orderId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  }: IVerifyPaymentRequest = req.body;

  // Sanitize payment data for logging
  const sanitizedData = sanitizePaymentData({
    orderId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  });

  console.log('🔐 [PAYMENT CONTROLLER] Verifying payment:', {
    ...sanitizedData,
    userId,
    timestamp: new Date().toISOString()
  });

  // Log payment initiation for audit
  PaymentLogger.logPaymentInitiation(userId, 0, 'razorpay', razorpay_order_id);

  // Validate request completeness using utility
  const dataValidation = verifyPaymentDataCompleteness({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  });

  if (!dataValidation.isValid) {
    console.error('❌ [PAYMENT CONTROLLER] Invalid payment data:', dataValidation.error);
    PaymentLogger.logPaymentFailure(
      razorpay_payment_id || 'unknown',
      userId,
      0,
      new Error(dataValidation.error),
      'Invalid payment data'
    );
    return sendBadRequest(res, dataValidation.error || 'Invalid payment verification data');
  }

  // Validate MongoDB order ID
  if (!orderId) {
    return sendBadRequest(res, 'Order ID is required');
  }

  try {
    // Verify order belongs to user
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    // Log verification attempt for audit trail
    logPaymentVerificationAttempt(
      orderId,
      userId,
      razorpay_order_id,
      razorpay_payment_id,
      false // Will be updated below
    );

    // Verify signature
    const isValidSignature = paymentService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      console.error('❌ [PAYMENT CONTROLLER] Invalid payment signature');

      // Log failed verification attempt
      logPaymentVerificationAttempt(
        orderId,
        userId,
        razorpay_order_id,
        razorpay_payment_id,
        false
      );

      // Log payment failure
      PaymentLogger.logPaymentFailure(
        razorpay_payment_id,
        userId,
        order.totals.total,
        new Error('Invalid payment signature'),
        'Signature verification failed'
      );

      // Handle payment failure
      await paymentService.handlePaymentFailure(orderId, 'Invalid payment signature');

      const response: IVerifyPaymentResponse = {
        success: false,
        message: 'Payment verification failed - Invalid signature',
        verified: false
      };

      return sendBadRequest(res, 'Payment verification failed - Invalid signature');
    }

    // Log successful verification
    logPaymentVerificationAttempt(
      orderId,
      userId,
      razorpay_order_id,
      razorpay_payment_id,
      true
    );

    // Process successful payment and deduct stock
    const updatedOrder = await paymentService.handlePaymentSuccess(orderId, {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    console.log('✅ [PAYMENT CONTROLLER] Payment verified and processed successfully');

    // Auto-trigger bank_offer bonus campaign on successful payment
    try {
      const bonusCampaignService = require('../services/bonusCampaignService');
      console.log('[PAYMENT] Triggering bank_offer for order:', orderId);
      await bonusCampaignService.autoClaimForTransaction('bank_offer', userId, {
        transactionRef: { type: 'payment' as const, refId: razorpay_payment_id },
        transactionAmount: order.totals.total,
        paymentMethod: order.payment?.method,
      });
    } catch (bonusErr) {
      console.error('[PAYMENT] bank_offer auto-claim failed (non-blocking):', bonusErr);
    }

    // Populate order for response
    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate('items.product', 'name image images')
      .populate('items.store', 'name logo')
      .populate('user', 'profile.firstName profile.lastName profile.phoneNumber');

    const response: IVerifyPaymentResponse = {
      success: true,
      message: 'Payment verified and order confirmed successfully',
      verified: true,
      order: populatedOrder
    };

    sendSuccess(res, response, 'Payment verified successfully');
  } catch (error: any) {
    console.error('❌ [PAYMENT CONTROLLER] Error verifying payment:', error);

    // Handle payment failure
    try {
      await paymentService.handlePaymentFailure(orderId, error.message);
    } catch (failureError) {
      console.error('❌ [PAYMENT CONTROLLER] Error handling payment failure:', failureError);
    }

    throw new AppError(`Payment verification failed: ${error.message}`, 500);
  }
});

/**
 * Handle Razorpay webhook events
 * POST /api/payment/webhook
 */
export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const webhookSignature = req.headers['x-razorpay-signature'] as string;
  const webhookBody = JSON.stringify(req.body);

  console.log('🔔 [PAYMENT CONTROLLER] Received webhook event');

  try {
    // Verify webhook signature
    const isValidSignature = paymentService.verifyWebhookSignature(
      webhookBody,
      webhookSignature
    );

    if (!isValidSignature) {
      console.error('❌ [PAYMENT CONTROLLER] Invalid webhook signature');
      return sendUnauthorized(res, 'Invalid webhook signature');
    }

    const event: IRazorpayWebhookEvent = req.body;

    console.log('🔔 [PAYMENT CONTROLLER] Webhook event type:', event.event);

    // Handle different webhook events
    switch (event.event) {
      case 'payment.captured':
        await handlePaymentCaptured(event);
        break;

      case 'payment.failed':
        await handlePaymentFailed(event);
        break;

      case 'order.paid':
        await handleOrderPaid(event);
        break;

      default:
        console.log('ℹ️ [PAYMENT CONTROLLER] Unhandled webhook event:', event.event);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    console.error('❌ [PAYMENT CONTROLLER] Error handling webhook:', error);
    // Still return 200 to acknowledge receipt
    res.status(200).json({ status: 'error', message: error.message });
  }
});

/**
 * Get payment status for an order
 * GET /api/payment/status/:orderId
 */
export const getPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { orderId } = req.params;

  console.log('📊 [PAYMENT CONTROLLER] Getting payment status for order:', orderId);

  try {
    // Verify order belongs to user
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    const paymentGateway = (order as any).paymentGateway;

    const response = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentStatus: order.payment.status,
      gatewayOrderId: paymentGateway?.gatewayOrderId,
      gatewayPaymentId: paymentGateway?.gatewayPaymentId,
      amount: order.totals.total,
      currency: 'INR',
      paidAt: order.payment.paidAt,
      failureReason: order.payment.failureReason
    };

    sendSuccess(res, response, 'Payment status retrieved successfully');
  } catch (error: any) {
    console.error('❌ [PAYMENT CONTROLLER] Error getting payment status:', error);
    throw new AppError(`Failed to get payment status: ${error.message}`, 500);
  }
});

// Helper functions for webhook event handling

async function handlePaymentCaptured(event: IRazorpayWebhookEvent) {
  try {
    const payment = event.payload.payment.entity;
    const orderId = payment.notes?.orderId;

    if (!orderId) {
      console.error('❌ [WEBHOOK] Order ID not found in payment notes');
      return;
    }

    console.log('✅ [WEBHOOK] Payment captured for order:', orderId);

    // Payment success is already handled in verify endpoint
    // This is just for logging and backup
  } catch (error) {
    console.error('❌ [WEBHOOK] Error handling payment.captured:', error);
  }
}

async function handlePaymentFailed(event: IRazorpayWebhookEvent) {
  try {
    const payment = event.payload.payment.entity;
    const orderId = payment.notes?.orderId;

    if (!orderId) {
      console.error('❌ [WEBHOOK] Order ID not found in payment notes');
      return;
    }

    console.log('❌ [WEBHOOK] Payment failed for order:', orderId);

    const failureReason = payment.error_description || 'Payment failed';

    // Handle payment failure
    await paymentService.handlePaymentFailure(orderId, failureReason);
  } catch (error) {
    console.error('❌ [WEBHOOK] Error handling payment.failed:', error);
  }
}

async function handleOrderPaid(event: IRazorpayWebhookEvent) {
  try {
    const order = event.payload.order.entity;
    const orderId = order.notes?.orderId;

    if (!orderId) {
      console.error('❌ [WEBHOOK] Order ID not found in order notes');
      return;
    }

    console.log('✅ [WEBHOOK] Order paid:', orderId);

    // Additional processing if needed
  } catch (error) {
    console.error('❌ [WEBHOOK] Error handling order.paid:', error);
  }
}

/**
 * Create Stripe Checkout Session for subscription payment
 * POST /api/payment/create-checkout-session
 */
export const createCheckoutSession = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const {
    subscriptionId,
    tier,
    amount,
    billingCycle,
    successUrl,
    cancelUrl,
    customerEmail
  } = req.body;

  console.log('💳 [PAYMENT CONTROLLER] Creating Stripe checkout session:', {
    subscriptionId,
    tier,
    amount,
    billingCycle,
    userId
  });

  // Validate request
  if (!subscriptionId || !tier || !amount || !billingCycle || !successUrl || !cancelUrl) {
    return sendBadRequest(res, 'Missing required parameters: subscriptionId, tier, amount, billingCycle, successUrl, cancelUrl');
  }

  // Validate amount
  if (typeof amount !== 'number' || amount <= 0) {
    return sendBadRequest(res, 'Invalid amount');
  }

  // Validate tier
  if (!['premium', 'vip'].includes(tier.toLowerCase())) {
    return sendBadRequest(res, 'Invalid tier. Must be premium or vip');
  }

  // Validate billing cycle
  if (!['monthly', 'yearly'].includes(billingCycle.toLowerCase())) {
    return sendBadRequest(res, 'Invalid billing cycle. Must be monthly or yearly');
  }

  try {
    // Check if Stripe is configured
    if (!stripeService.isStripeConfigured()) {
      return sendBadRequest(res, 'Stripe is not configured on the server');
    }

    // Create Stripe checkout session
    const session = await stripeService.createCheckoutSession({
      subscriptionId,
      tier,
      amount,
      billingCycle,
      successUrl,
      cancelUrl,
      customerEmail,
      metadata: {
        userId: userId.toString(),
      }
    });

    console.log('✅ [PAYMENT CONTROLLER] Stripe checkout session created successfully');

    const response = {
      success: true,
      sessionId: session.id,
      url: session.url,
    };

    sendSuccess(res, response, 'Stripe checkout session created successfully', 201);
  } catch (error: any) {
    console.error('❌ [PAYMENT CONTROLLER] Error creating Stripe checkout session:', error);

    // Handle Stripe-specific errors
    const stripeError = stripeService.handleStripeError(error);
    throw new AppError(stripeError.message, stripeError.statusCode);
  }
});

/**
 * Verify Stripe checkout session after payment
 * POST /api/payment/verify-stripe-session
 */
export const verifyStripeSession = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { sessionId, orderId } = req.body;

  console.log('🔐 [PAYMENT CONTROLLER] Verifying Stripe session:', {
    sessionId,
    orderId,
    userId
  });

  // Validate request
  if (!sessionId) {
    return sendBadRequest(res, 'Session ID is required');
  }

  try {
    // Check if Stripe is configured
    if (!stripeService.isStripeConfigured()) {
      return sendBadRequest(res, 'Stripe is not configured on the server');
    }

    // Verify checkout session
    const verification = await stripeService.verifyCheckoutSession(sessionId);

    if (!verification.verified) {
      console.error('❌ [PAYMENT CONTROLLER] Stripe payment not completed:', verification.paymentStatus);

      return sendBadRequest(res, `Payment not completed. Status: ${verification.paymentStatus}`);
    }

    // If orderId is provided, update the order
    if (orderId) {
      const order = await Order.findOne({ _id: orderId, user: userId });

      if (!order) {
        return sendNotFound(res, 'Order not found');
      }

      // Update order payment status
      order.payment.status = 'paid';
      order.payment.transactionId = verification.paymentIntentId || sessionId;
      order.payment.paidAt = new Date();
      order.payment.paymentGateway = 'stripe';
      order.totals.paidAmount = verification.amount;

      // Add timeline entry
      order.timeline.push({
        status: 'payment_success',
        message: 'Stripe payment completed successfully',
        timestamp: new Date()
      });

      // Update order status to confirmed
      order.status = 'confirmed';
      order.timeline.push({
        status: 'confirmed',
        message: 'Order confirmed after Stripe payment',
        timestamp: new Date()
      });

      await order.save();

      console.log('✅ [PAYMENT CONTROLLER] Order updated with Stripe payment');
    }

    const response = {
      success: true,
      verified: true,
      message: 'Stripe payment verified successfully',
      paymentDetails: {
        amount: verification.amount,
        currency: verification.currency,
        paymentStatus: verification.paymentStatus,
        paymentIntentId: verification.paymentIntentId
      }
    };

    sendSuccess(res, response, 'Stripe payment verified successfully');
  } catch (error: any) {
    console.error('❌ [PAYMENT CONTROLLER] Error verifying Stripe session:', error);

    // Handle Stripe-specific errors
    const stripeError = stripeService.handleStripeError(error);
    throw new AppError(stripeError.message, stripeError.statusCode);
  }
});

/**
 * Verify Stripe payment intent
 * POST /api/payment/verify-stripe-payment
 */
export const verifyStripePayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { paymentIntentId, orderId } = req.body;

  console.log('🔐 [PAYMENT CONTROLLER] Verifying Stripe payment intent:', {
    paymentIntentId,
    orderId,
    userId
  });

  // Validate request
  if (!paymentIntentId) {
    return sendBadRequest(res, 'Payment Intent ID is required');
  }

  try {
    // Check if Stripe is configured
    if (!stripeService.isStripeConfigured()) {
      return sendBadRequest(res, 'Stripe is not configured on the server');
    }

    // Verify payment intent
    const verification = await stripeService.verifyPaymentIntent(paymentIntentId);

    if (!verification.verified) {
      console.error('❌ [PAYMENT CONTROLLER] Stripe payment not successful:', verification.status);

      return sendBadRequest(res, `Payment not successful. Status: ${verification.status}`);
    }

    // If orderId is provided, update the order
    if (orderId) {
      const order = await Order.findOne({ _id: orderId, user: userId });

      if (!order) {
        return sendNotFound(res, 'Order not found');
      }

      // Update order payment status
      order.payment.status = 'paid';
      order.payment.transactionId = paymentIntentId;
      order.payment.paidAt = new Date();
      order.payment.paymentGateway = 'stripe';
      order.totals.paidAmount = verification.amount;

      // Add timeline entry
      order.timeline.push({
        status: 'payment_success',
        message: 'Stripe payment completed successfully',
        timestamp: new Date()
      });

      // Update order status to confirmed
      order.status = 'confirmed';
      order.timeline.push({
        status: 'confirmed',
        message: 'Order confirmed after Stripe payment',
        timestamp: new Date()
      });

      await order.save();

      console.log('✅ [PAYMENT CONTROLLER] Order updated with Stripe payment');
    }

    const response = {
      success: true,
      verified: true,
      message: 'Stripe payment verified successfully',
      paymentDetails: {
        amount: verification.amount,
        currency: verification.currency,
        status: verification.status
      }
    };

    sendSuccess(res, response, 'Stripe payment verified successfully');
  } catch (error: any) {
    console.error('❌ [PAYMENT CONTROLLER] Error verifying Stripe payment:', error);

    // Handle Stripe-specific errors
    const stripeError = stripeService.handleStripeError(error);
    throw new AppError(stripeError.message, stripeError.statusCode);
  }
});

/**
 * Handle Stripe webhook events
 * POST /api/payment/stripe-webhook
 */
export const handleStripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;

  console.log('🔔 [PAYMENT CONTROLLER] Received Stripe webhook event');

  if (!signature) {
    console.error('❌ [PAYMENT CONTROLLER] Missing Stripe signature header');
    return sendUnauthorized(res, 'Missing Stripe signature');
  }

  try {
    // Check if Stripe is configured
    if (!stripeService.isStripeConfigured()) {
      console.error('❌ [PAYMENT CONTROLLER] Stripe is not configured');
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    // Verify webhook signature - req.body should be raw buffer
    const payload = JSON.stringify(req.body);
    const event = stripeService.verifyWebhookSignature(payload, signature);

    console.log('🔔 [PAYMENT CONTROLLER] Stripe webhook event type:', event.type);
    console.log('🔔 [PAYMENT CONTROLLER] Event ID:', event.id);

    // Handle different webhook events
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handleStripePaymentSucceeded(event);
        break;

      case 'payment_intent.payment_failed':
        await handleStripePaymentFailed(event);
        break;

      case 'checkout.session.completed':
        await handleStripeCheckoutCompleted(event);
        break;

      case 'checkout.session.expired':
        await handleStripeCheckoutExpired(event);
        break;

      case 'charge.refunded':
        await handleStripeRefund(event);
        break;

      default:
        console.log('ℹ️ [PAYMENT CONTROLLER] Unhandled Stripe webhook event:', event.type);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true, eventId: event.id });
  } catch (error: any) {
    console.error('❌ [PAYMENT CONTROLLER] Error handling Stripe webhook:', error);

    // Return 400 for signature verification failures
    if (error.message.includes('signature')) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Still return 200 for other errors to acknowledge receipt
    res.status(200).json({ received: false, error: error.message });
  }
});

// Helper functions for Stripe webhook event handling

async function handleStripePaymentSucceeded(event: any) {
  try {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.orderId;

    console.log('✅ [STRIPE WEBHOOK] Payment succeeded:', paymentIntent.id);

    if (!orderId) {
      console.warn('⚠️ [STRIPE WEBHOOK] No orderId in payment intent metadata');
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      console.error('❌ [STRIPE WEBHOOK] Order not found:', orderId);
      return;
    }

    // Check if already processed
    if (order.payment.status === 'paid') {
      console.log('ℹ️ [STRIPE WEBHOOK] Payment already processed for order:', orderId);
      return;
    }

    // Update order payment status
    order.payment.status = 'paid';
    order.payment.transactionId = paymentIntent.id;
    order.payment.paidAt = new Date();
    order.payment.paymentGateway = 'stripe';
    order.totals.paidAmount = paymentIntent.amount / 100; // Convert from cents

    // Add timeline entry
    order.timeline.push({
      status: 'payment_success',
      message: 'Stripe payment completed via webhook',
      timestamp: new Date()
    });

    // Update order status to confirmed
    order.status = 'confirmed';
    order.timeline.push({
      status: 'confirmed',
      message: 'Order confirmed after Stripe payment',
      timestamp: new Date()
    });

    await order.save();

    console.log('✅ [STRIPE WEBHOOK] Order updated successfully');
  } catch (error) {
    console.error('❌ [STRIPE WEBHOOK] Error handling payment_intent.succeeded:', error);
  }
}

async function handleStripePaymentFailed(event: any) {
  try {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.orderId;

    console.log('❌ [STRIPE WEBHOOK] Payment failed:', paymentIntent.id);

    if (!orderId) {
      console.warn('⚠️ [STRIPE WEBHOOK] No orderId in payment intent metadata');
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      console.error('❌ [STRIPE WEBHOOK] Order not found:', orderId);
      return;
    }

    // Update order payment status
    order.payment.status = 'failed';
    order.payment.failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';

    // Add timeline entry
    order.timeline.push({
      status: 'payment_failed',
      message: `Stripe payment failed: ${order.payment.failureReason}`,
      timestamp: new Date()
    });

    // Update order status to cancelled
    order.status = 'cancelled';
    order.cancelReason = `Payment failed: ${order.payment.failureReason}`;
    order.cancelledAt = new Date();

    await order.save();

    console.log('✅ [STRIPE WEBHOOK] Order updated with payment failure');
  } catch (error) {
    console.error('❌ [STRIPE WEBHOOK] Error handling payment_intent.payment_failed:', error);
  }
}

async function handleStripeCheckoutCompleted(event: any) {
  try {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;

    console.log('✅ [STRIPE WEBHOOK] Checkout session completed:', session.id);

    if (!orderId) {
      console.log('ℹ️ [STRIPE WEBHOOK] No orderId in checkout session metadata (might be subscription)');
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      console.error('❌ [STRIPE WEBHOOK] Order not found:', orderId);
      return;
    }

    // Check if already processed
    if (order.payment.status === 'paid') {
      console.log('ℹ️ [STRIPE WEBHOOK] Payment already processed for order:', orderId);
      return;
    }

    // Update order payment status
    order.payment.status = 'paid';
    order.payment.transactionId = session.payment_intent as string;
    order.payment.paidAt = new Date();
    order.payment.paymentGateway = 'stripe';
    order.totals.paidAmount = (session.amount_total || 0) / 100;

    // Add timeline entry
    order.timeline.push({
      status: 'payment_success',
      message: 'Stripe checkout completed via webhook',
      timestamp: new Date()
    });

    // Update order status to confirmed
    order.status = 'confirmed';
    order.timeline.push({
      status: 'confirmed',
      message: 'Order confirmed after Stripe checkout',
      timestamp: new Date()
    });

    await order.save();

    console.log('✅ [STRIPE WEBHOOK] Order updated successfully');
  } catch (error) {
    console.error('❌ [STRIPE WEBHOOK] Error handling checkout.session.completed:', error);
  }
}

async function handleStripeCheckoutExpired(event: any) {
  try {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;

    console.log('⏰ [STRIPE WEBHOOK] Checkout session expired:', session.id);

    if (!orderId) {
      return;
    }

    const order = await Order.findById(orderId);
    if (!order) {
      console.error('❌ [STRIPE WEBHOOK] Order not found:', orderId);
      return;
    }

    // Only update if payment is still pending
    if (order.payment.status === 'pending') {
      order.payment.status = 'failed';
      order.payment.failureReason = 'Checkout session expired';

      order.timeline.push({
        status: 'payment_expired',
        message: 'Stripe checkout session expired',
        timestamp: new Date()
      });

      await order.save();

      console.log('✅ [STRIPE WEBHOOK] Order updated with expired status');
    }
  } catch (error) {
    console.error('❌ [STRIPE WEBHOOK] Error handling checkout.session.expired:', error);
  }
}

async function handleStripeRefund(event: any) {
  try {
    const charge = event.data.object;
    const paymentIntentId = charge.payment_intent;

    console.log('💸 [STRIPE WEBHOOK] Refund processed for charge:', charge.id);

    // Find order by payment intent ID
    const order = await Order.findOne({ 'payment.transactionId': paymentIntentId });

    if (!order) {
      console.error('❌ [STRIPE WEBHOOK] Order not found for payment intent:', paymentIntentId);
      return;
    }

    // Update order payment status
    const refundAmount = charge.amount_refunded / 100; // Convert from cents

    if (refundAmount >= order.totals.paidAmount) {
      order.payment.status = 'refunded';
    } else {
      order.payment.status = 'partially_refunded';
    }

    order.payment.refundId = charge.id;
    order.payment.refundedAt = new Date();
    order.totals.refundAmount = refundAmount;

    // Add timeline entry
    order.timeline.push({
      status: 'refund_processed',
      message: `Stripe refund of ₹${refundAmount} processed`,
      timestamp: new Date()
    });

    await order.save();

    console.log('✅ [STRIPE WEBHOOK] Order updated with refund details');
  } catch (error) {
    console.error('❌ [STRIPE WEBHOOK] Error handling charge.refunded:', error);
  }
}
