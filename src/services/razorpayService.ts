import Razorpay from 'razorpay';
import crypto from 'crypto';
import { razorpayConfig, validateRazorpayConfig } from '../config/razorpay.config';

/**
 * Razorpay Service
 * Handles all payment gateway interactions
 */

// Initialize Razorpay instance
let razorpayInstance: Razorpay | null = null;

function getRazorpayInstance(): Razorpay {
  if (!razorpayInstance) {
    validateRazorpayConfig();
    
    razorpayInstance = new Razorpay({
      key_id: razorpayConfig.keyId,
      key_secret: razorpayConfig.keySecret,
    });
    
    console.log('✅ [RAZORPAY] Instance initialized');
  }
  
  return razorpayInstance;
}

/**
 * Create a Razorpay order
 */
export async function createRazorpayOrder(
  amount: number, // Amount in rupees
  receipt: string,
  notes?: Record<string, any>
): Promise<{
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, any>;
  created_at: number;
}> {
  try {
    const razorpay = getRazorpayInstance();
    
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: razorpayConfig.currency,
      receipt,
      notes: notes || {},
    };
    
    console.log('💳 [RAZORPAY] Creating order:', {
      amount: `₹${amount}`,
      receipt,
      notes,
    });
    
    const order = await razorpay.orders.create(options);
    
    console.log('✅ [RAZORPAY] Order created:', {
      orderId: order.id,
      amount: `₹${amount}`,
      status: order.status,
    });
    
    // Return with properly typed fields (convert to ensure correct types)
    return {
      ...order,
      amount: Number(order.amount),
      amount_paid: Number(order.amount_paid || 0),
      amount_due: Number(order.amount_due || order.amount),
      receipt: order.receipt || receipt, // Use original receipt if order.receipt is undefined
      notes: (order.notes as Record<string, any>) || {}, // Ensure notes is always an object
    };
  } catch (error: any) {
    console.error('❌ [RAZORPAY] Order creation failed:', error);
    throw new Error(`Razorpay order creation failed: ${error.message}`);
  }
}

/**
 * Verify Razorpay payment signature
 * This is critical for security - always verify payment on server side
 */
export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  try {
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    
    const expectedSignature = crypto
      .createHmac('sha256', razorpayConfig.keySecret)
      .update(text)
      .digest('hex');
    
    const isValid = expectedSignature === razorpaySignature;
    
    if (isValid) {
      console.log('✅ [RAZORPAY] Signature verified:', {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
      });
    } else {
      console.error('❌ [RAZORPAY] Signature verification failed:', {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        expected: expectedSignature,
        received: razorpaySignature,
      });
    }
    
    return isValid;
  } catch (error) {
    console.error('❌ [RAZORPAY] Signature verification error:', error);
    return false;
  }
}

/**
 * Fetch payment details from Razorpay
 */
export async function fetchPaymentDetails(paymentId: string) {
  try {
    const razorpay = getRazorpayInstance();
    const payment = await razorpay.payments.fetch(paymentId);
    
    const paymentAmount = Number(payment.amount) / 100;
    
    console.log('✅ [RAZORPAY] Payment details fetched:', {
      paymentId,
      status: payment.status,
      method: payment.method,
      amount: `₹${paymentAmount}`,
    });
    
    return payment;
  } catch (error: any) {
    console.error('❌ [RAZORPAY] Failed to fetch payment details:', error);
    throw new Error(`Failed to fetch payment details: ${error.message}`);
  }
}

/**
 * Refund a payment
 */
export async function createRefund(
  paymentId: string,
  amount?: number, // Amount in rupees (optional, defaults to full refund)
  notes?: Record<string, any>
) {
  try {
    const razorpay = getRazorpayInstance();
    
    const options: any = {
      notes: notes || {},
    };
    
    if (amount) {
      options.amount = Math.round(amount * 100); // Convert to paise
    }
    
    console.log('💰 [RAZORPAY] Creating refund:', {
      paymentId,
      amount: amount ? `₹${amount}` : 'Full refund',
    });
    
    const refund = await razorpay.payments.refund(paymentId, options);
    
    const refundAmount = refund.amount ? Number(refund.amount) / 100 : 0;
    
    console.log('✅ [RAZORPAY] Refund created:', {
      refundId: refund.id,
      status: refund.status,
      amount: `₹${refundAmount}`,
    });
    
    return refund;
  } catch (error: any) {
    console.error('❌ [RAZORPAY] Refund creation failed:', error);
    throw new Error(`Refund creation failed: ${error.message}`);
  }
}

/**
 * Get Razorpay configuration for frontend
 * (Only sends safe, public information)
 */
export function getRazorpayConfigForFrontend() {
  return {
    keyId: razorpayConfig.keyId,
    currency: razorpayConfig.currency,
    checkout: razorpayConfig.checkout,
    isTestMode: razorpayConfig.isTestMode,
  };
}

/**
 * Validate webhook signature (for webhook endpoints)
 */
export function validateWebhookSignature(
  webhookBody: string,
  webhookSignature: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', razorpayConfig.keySecret)
      .update(webhookBody)
      .digest('hex');
    
    return expectedSignature === webhookSignature;
  } catch (error) {
    console.error('❌ [RAZORPAY] Webhook signature validation failed:', error);
    return false;
  }
}

export const razorpayService = {
  createOrder: createRazorpayOrder,
  verifySignature: verifyRazorpaySignature,
  fetchPaymentDetails,
  createRefund,
  getConfigForFrontend: getRazorpayConfigForFrontend,
  validateWebhookSignature,
};

