import { Request, Response } from 'express';
import { Order } from '../models/Order';
import paymentService from '../services/paymentService';
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

  console.log('🔐 [PAYMENT CONTROLLER] Verifying payment:', {
    orderId,
    razorpay_order_id,
    razorpay_payment_id,
    userId
  });

  // Validate request
  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return sendBadRequest(res, 'Missing required payment verification parameters');
  }

  try {
    // Verify order belongs to user
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    // Verify signature
    const isValidSignature = paymentService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      console.error('❌ [PAYMENT CONTROLLER] Invalid payment signature');

      // Handle payment failure
      await paymentService.handlePaymentFailure(orderId, 'Invalid payment signature');

      const response: IVerifyPaymentResponse = {
        success: false,
        message: 'Payment verification failed - Invalid signature',
        verified: false
      };

      return sendBadRequest(res, 'Payment verification failed - Invalid signature');
    }

    // Process successful payment and deduct stock
    const updatedOrder = await paymentService.handlePaymentSuccess(orderId, {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    console.log('✅ [PAYMENT CONTROLLER] Payment verified and processed successfully');

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
    throw new AppError(`Failed to create Stripe checkout session: ${error.message}`, 500);
  }
});
