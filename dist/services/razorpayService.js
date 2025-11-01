"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.razorpayService = void 0;
exports.createRazorpayOrder = createRazorpayOrder;
exports.verifyRazorpaySignature = verifyRazorpaySignature;
exports.fetchPaymentDetails = fetchPaymentDetails;
exports.createRefund = createRefund;
exports.getRazorpayConfigForFrontend = getRazorpayConfigForFrontend;
exports.validateWebhookSignature = validateWebhookSignature;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const razorpay_config_1 = require("../config/razorpay.config");
/**
 * Razorpay Service
 * Handles all payment gateway interactions
 */
// Initialize Razorpay instance
let razorpayInstance = null;
function getRazorpayInstance() {
    if (!razorpayInstance) {
        (0, razorpay_config_1.validateRazorpayConfig)();
        razorpayInstance = new razorpay_1.default({
            key_id: razorpay_config_1.razorpayConfig.keyId,
            key_secret: razorpay_config_1.razorpayConfig.keySecret,
        });
        console.log('✅ [RAZORPAY] Instance initialized');
    }
    return razorpayInstance;
}
/**
 * Create a Razorpay order
 */
async function createRazorpayOrder(amount, // Amount in rupees
receipt, notes) {
    try {
        const razorpay = getRazorpayInstance();
        const options = {
            amount: Math.round(amount * 100), // Convert to paise
            currency: razorpay_config_1.razorpayConfig.currency,
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
            notes: order.notes || {}, // Ensure notes is always an object
        };
    }
    catch (error) {
        console.error('❌ [RAZORPAY] Order creation failed:', error);
        throw new Error(`Razorpay order creation failed: ${error.message}`);
    }
}
/**
 * Verify Razorpay payment signature
 * This is critical for security - always verify payment on server side
 */
function verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
        const text = `${razorpayOrderId}|${razorpayPaymentId}`;
        const expectedSignature = crypto_1.default
            .createHmac('sha256', razorpay_config_1.razorpayConfig.keySecret)
            .update(text)
            .digest('hex');
        const isValid = expectedSignature === razorpaySignature;
        if (isValid) {
            console.log('✅ [RAZORPAY] Signature verified:', {
                orderId: razorpayOrderId,
                paymentId: razorpayPaymentId,
            });
        }
        else {
            console.error('❌ [RAZORPAY] Signature verification failed:', {
                orderId: razorpayOrderId,
                paymentId: razorpayPaymentId,
                expected: expectedSignature,
                received: razorpaySignature,
            });
        }
        return isValid;
    }
    catch (error) {
        console.error('❌ [RAZORPAY] Signature verification error:', error);
        return false;
    }
}
/**
 * Fetch payment details from Razorpay
 */
async function fetchPaymentDetails(paymentId) {
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
    }
    catch (error) {
        console.error('❌ [RAZORPAY] Failed to fetch payment details:', error);
        throw new Error(`Failed to fetch payment details: ${error.message}`);
    }
}
/**
 * Refund a payment
 */
async function createRefund(paymentId, amount, // Amount in rupees (optional, defaults to full refund)
notes) {
    try {
        const razorpay = getRazorpayInstance();
        const options = {
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
    }
    catch (error) {
        console.error('❌ [RAZORPAY] Refund creation failed:', error);
        throw new Error(`Refund creation failed: ${error.message}`);
    }
}
/**
 * Get Razorpay configuration for frontend
 * (Only sends safe, public information)
 */
function getRazorpayConfigForFrontend() {
    return {
        keyId: razorpay_config_1.razorpayConfig.keyId,
        currency: razorpay_config_1.razorpayConfig.currency,
        checkout: razorpay_config_1.razorpayConfig.checkout,
        isTestMode: razorpay_config_1.razorpayConfig.isTestMode,
    };
}
/**
 * Validate webhook signature (for webhook endpoints)
 */
function validateWebhookSignature(webhookBody, webhookSignature) {
    try {
        const expectedSignature = crypto_1.default
            .createHmac('sha256', razorpay_config_1.razorpayConfig.keySecret)
            .update(webhookBody)
            .digest('hex');
        return expectedSignature === webhookSignature;
    }
    catch (error) {
        console.error('❌ [RAZORPAY] Webhook signature validation failed:', error);
        return false;
    }
}
exports.razorpayService = {
    createOrder: createRazorpayOrder,
    verifySignature: verifyRazorpaySignature,
    fetchPaymentDetails,
    createRefund,
    getConfigForFrontend: getRazorpayConfigForFrontend,
    validateWebhookSignature,
};
