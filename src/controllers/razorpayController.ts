import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError, sendBadRequest } from '../utils/response';
import { razorpayService } from '../services/razorpayService';
import { Order } from '../models/Order';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { SMSService } from '../services/SMSService';
import EmailService from '../services/EmailService';

/**
 * @desc Create a Razorpay order for payment
 * @route POST /api/razorpay/create-order
 * @access Private
 */
export const createRazorpayOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { amount, orderId, notes } = req.body;

  // Validate input
  if (!amount || amount <= 0) {
    return sendBadRequest(res, 'Valid amount is required');
  }

  try {
    // Generate receipt
    const receipt = `order_${orderId || Date.now()}`;

    // Create Razorpay order
    const razorpayOrder = await razorpayService.createOrder(
      amount,
      receipt,
      {
        userId,
        orderId: orderId || 'pending',
        ...notes,
      }
    );

    console.log('✅ [RAZORPAY CONTROLLER] Order created successfully:', razorpayOrder.id);

    // Return order details to frontend
    sendSuccess(res, {
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt: razorpayOrder.receipt,
      notes: razorpayOrder.notes,
    }, 'Razorpay order created successfully');

  } catch (error: any) {
    console.error('❌ [RAZORPAY CONTROLLER] Order creation error:', error);
    sendError(res, error.message || 'Failed to create Razorpay order', 500);
  }
});

/**
 * @desc Verify Razorpay payment and create order
 * @route POST /api/razorpay/verify-payment
 * @access Private
 */
export const verifyRazorpayPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    orderData, // Cart items, delivery address, etc.
  } = req.body;

  // Validate input
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return sendBadRequest(res, 'Payment verification data is required');
  }

  try {
    // Step 1: Verify signature
    const isValid = razorpayService.verifySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      console.error('❌ [RAZORPAY CONTROLLER] Payment signature verification failed');
      return sendError(res, 'Payment verification failed. Please contact support.', 400);
    }

    console.log('✅ [RAZORPAY CONTROLLER] Payment signature verified');

    // Step 2: Fetch payment details from Razorpay
    const paymentDetails = await razorpayService.fetchPaymentDetails(razorpayPaymentId);

    if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
      console.error('❌ [RAZORPAY CONTROLLER] Payment not successful:', paymentDetails.status);
      return sendError(res, `Payment failed with status: ${paymentDetails.status}`, 400);
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

    sendSuccess(res, {
      verified: true,
      paymentId: razorpayPaymentId,
      orderId: razorpayOrderId,
      paymentMethod: paymentDetails.method,
      amount: amountInRupees,
      status: paymentDetails.status,
      transactionId: razorpayPaymentId,
    }, 'Payment verified successfully');

  } catch (error: any) {
    console.error('❌ [RAZORPAY CONTROLLER] Payment verification error:', error);
    sendError(res, error.message || 'Payment verification failed', 500);
  }
});

/**
 * @desc Get Razorpay configuration for frontend
 * @route GET /api/razorpay/config
 * @access Private
 */
export const getRazorpayConfig = asyncHandler(async (req: Request, res: Response) => {
  try {
    const config = razorpayService.getConfigForFrontend();
    
    sendSuccess(res, config, 'Razorpay configuration retrieved successfully');
  } catch (error: any) {
    console.error('❌ [RAZORPAY CONTROLLER] Config retrieval error:', error);
    sendError(res, error.message || 'Failed to get Razorpay config', 500);
  }
});

/**
 * @desc Handle Razorpay webhook events
 * @route POST /api/razorpay/webhook
 * @access Public (but verified with signature)
 */
export const handleRazorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
  const webhookSignature = req.headers['x-razorpay-signature'] as string;
  const webhookBody = JSON.stringify(req.body);

  if (!webhookSignature) {
    return sendBadRequest(res, 'Webhook signature missing');
  }

  try {
    // Verify webhook signature
    const isValid = razorpayService.validateWebhookSignature(webhookBody, webhookSignature);

    if (!isValid) {
      console.error('❌ [RAZORPAY WEBHOOK] Signature verification failed');
      return sendError(res, 'Invalid webhook signature', 401);
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

  } catch (error: any) {
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
export const createRazorpayRefund = asyncHandler(async (req: Request, res: Response) => {
  const { paymentId, amount, notes } = req.body;

  if (!paymentId) {
    return sendBadRequest(res, 'Payment ID is required');
  }

  try {
    const refund = await razorpayService.createRefund(paymentId, amount, notes);

    console.log('✅ [RAZORPAY CONTROLLER] Refund created:', refund.id);

    const refundAmountInRupees = refund.amount ? Number(refund.amount) / 100 : 0;

    sendSuccess(res, {
      refundId: refund.id,
      paymentId: refund.payment_id,
      amount: refundAmountInRupees,
      status: refund.status,
    }, 'Refund created successfully');

  } catch (error: any) {
    console.error('❌ [RAZORPAY CONTROLLER] Refund creation error:', error);
    sendError(res, error.message || 'Failed to create refund', 500);
  }
});

