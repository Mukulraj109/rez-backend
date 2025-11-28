"use strict";
/**
 * Razorpay Utility Functions
 * Centralized utilities for Razorpay payment processing, signature validation, and error handling
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAZORPAY_CONSTANTS = void 0;
exports.validateRazorpayPaymentSignature = validateRazorpayPaymentSignature;
exports.validateRazorpayWebhookSignature = validateRazorpayWebhookSignature;
exports.verifyPaymentDataCompleteness = verifyPaymentDataCompleteness;
exports.convertToPaise = convertToPaise;
exports.convertToRupees = convertToRupees;
exports.isValidOrderStatus = isValidOrderStatus;
exports.isPaymentSuccessful = isPaymentSuccessful;
exports.formatRazorpayError = formatRazorpayError;
exports.validateRazorpayConfiguration = validateRazorpayConfiguration;
exports.generateReceiptId = generateReceiptId;
exports.logPaymentVerificationAttempt = logPaymentVerificationAttempt;
exports.sanitizePaymentData = sanitizePaymentData;
const crypto_1 = __importDefault(require("crypto"));
const paymentLogger_1 = require("../services/logging/paymentLogger");
/**
 * Validate Razorpay payment signature using HMAC-SHA256
 * This is the primary method for verifying payment authenticity
 *
 * @param orderId - Razorpay order ID
 * @param paymentId - Razorpay payment ID
 * @param signature - Signature received from Razorpay
 * @param secret - Razorpay key secret from environment
 * @returns Validation result with details
 */
function validateRazorpayPaymentSignature(orderId, paymentId, signature, secret) {
    try {
        // Input validation
        if (!orderId || !paymentId || !signature || !secret) {
            return {
                isValid: false,
                error: 'Missing required parameters for signature validation',
                details: {
                    orderId,
                    paymentId,
                    signatureProvided: signature
                }
            };
        }
        // Check if secret is the default/dummy value
        if (secret === 'dummy_secret' || secret === 'your_razorpay_key_secret_here') {
            return {
                isValid: false,
                error: 'Razorpay secret is not configured properly. Please set RAZORPAY_KEY_SECRET in .env',
                details: {
                    orderId,
                    paymentId,
                    signatureProvided: signature
                }
            };
        }
        // Create the text string as per Razorpay documentation
        // Format: razorpay_order_id + "|" + razorpay_payment_id
        const text = `${orderId}|${paymentId}`;
        // Generate HMAC SHA256 signature
        const generatedSignature = crypto_1.default
            .createHmac('sha256', secret)
            .update(text)
            .digest('hex');
        // Use timing-safe comparison to prevent timing attacks
        const isValid = crypto_1.default.timingSafeEqual(Buffer.from(generatedSignature), Buffer.from(signature));
        // Log the validation result
        if (isValid) {
            paymentLogger_1.PaymentLogger.logPaymentSuccess(paymentId, orderId, 0, 'razorpay');
            console.log('✅ [RAZORPAY UTILS] Signature validation successful:', {
                orderId,
                paymentId,
                timestamp: new Date().toISOString()
            });
        }
        else {
            console.error('❌ [RAZORPAY UTILS] Signature validation failed:', {
                orderId,
                paymentId,
                signatureProvided: signature,
                signatureGenerated: generatedSignature,
                timestamp: new Date().toISOString()
            });
        }
        return {
            isValid,
            details: {
                orderId,
                paymentId,
                signatureProvided: signature,
                signatureGenerated: generatedSignature
            }
        };
    }
    catch (error) {
        console.error('❌ [RAZORPAY UTILS] Error during signature validation:', error);
        return {
            isValid: false,
            error: `Signature validation error: ${error.message}`,
            details: {
                orderId,
                paymentId,
                signatureProvided: signature
            }
        };
    }
}
/**
 * Validate Razorpay webhook signature
 * Used to verify webhook events from Razorpay
 *
 * @param webhookBody - Raw webhook body as string
 * @param webhookSignature - Signature from x-razorpay-signature header
 * @param webhookSecret - Webhook secret from Razorpay dashboard
 * @returns Validation result
 */
function validateRazorpayWebhookSignature(webhookBody, webhookSignature, webhookSecret) {
    try {
        // Input validation
        if (!webhookBody || !webhookSignature || !webhookSecret) {
            return {
                isValid: false,
                error: 'Missing required parameters for webhook validation'
            };
        }
        // Check if webhook secret is configured
        if (webhookSecret === 'your_webhook_secret_here' || !webhookSecret) {
            console.warn('⚠️ [RAZORPAY UTILS] Webhook secret not configured. Set RAZORPAY_WEBHOOK_SECRET in .env');
            return {
                isValid: false,
                error: 'Webhook secret not configured'
            };
        }
        // Generate expected signature
        const expectedSignature = crypto_1.default
            .createHmac('sha256', webhookSecret)
            .update(webhookBody)
            .digest('hex');
        // Use timing-safe comparison
        const isValid = crypto_1.default.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(webhookSignature));
        // Parse event type for logging
        let eventType;
        try {
            const payload = JSON.parse(webhookBody);
            eventType = payload.event;
            if (isValid && eventType) {
                paymentLogger_1.PaymentLogger.logRazorpayEvent(eventType, payload.payload?.payment?.entity?.id || 'unknown', payload);
            }
        }
        catch (parseError) {
            console.warn('⚠️ [RAZORPAY UTILS] Could not parse webhook body for event type');
        }
        if (isValid) {
            console.log('✅ [RAZORPAY UTILS] Webhook signature validated:', {
                eventType,
                timestamp: new Date().toISOString()
            });
        }
        else {
            console.error('❌ [RAZORPAY UTILS] Webhook signature validation failed:', {
                eventType,
                timestamp: new Date().toISOString()
            });
        }
        return {
            isValid,
            eventType
        };
    }
    catch (error) {
        console.error('❌ [RAZORPAY UTILS] Webhook validation error:', error);
        return {
            isValid: false,
            error: `Webhook validation error: ${error.message}`
        };
    }
}
/**
 * Verify payment data completeness before processing
 * Ensures all required fields are present and valid
 *
 * @param verificationData - Payment verification data from frontend
 * @returns Object with isValid flag and error message if invalid
 */
function verifyPaymentDataCompleteness(verificationData) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = verificationData;
    // Check for missing fields
    if (!razorpay_order_id) {
        return { isValid: false, error: 'Razorpay order ID is missing' };
    }
    if (!razorpay_payment_id) {
        return { isValid: false, error: 'Razorpay payment ID is missing' };
    }
    if (!razorpay_signature) {
        return { isValid: false, error: 'Razorpay signature is missing' };
    }
    // Validate format (basic checks)
    if (!razorpay_order_id.startsWith('order_')) {
        return { isValid: false, error: 'Invalid Razorpay order ID format' };
    }
    if (!razorpay_payment_id.startsWith('pay_')) {
        return { isValid: false, error: 'Invalid Razorpay payment ID format' };
    }
    // Signature should be 64 characters (SHA256 hex)
    if (razorpay_signature.length !== 64) {
        return { isValid: false, error: 'Invalid signature format' };
    }
    return { isValid: true };
}
/**
 * Convert amount from rupees to paise (smallest currency unit)
 * Razorpay requires amounts in paise (1 rupee = 100 paise)
 *
 * @param amountInRupees - Amount in rupees
 * @returns Amount in paise
 */
function convertToPaise(amountInRupees) {
    if (typeof amountInRupees !== 'number' || isNaN(amountInRupees)) {
        throw new Error('Invalid amount: must be a valid number');
    }
    if (amountInRupees < 0) {
        throw new Error('Invalid amount: cannot be negative');
    }
    // Round to avoid floating point issues
    return Math.round(amountInRupees * 100);
}
/**
 * Convert amount from paise to rupees
 *
 * @param amountInPaise - Amount in paise
 * @returns Amount in rupees
 */
function convertToRupees(amountInPaise) {
    if (typeof amountInPaise !== 'number' || isNaN(amountInPaise)) {
        throw new Error('Invalid amount: must be a valid number');
    }
    if (amountInPaise < 0) {
        throw new Error('Invalid amount: cannot be negative');
    }
    // Divide by 100 and round to 2 decimal places
    return Math.round(amountInPaise) / 100;
}
/**
 * Validate Razorpay order status
 * Checks if order is in a valid state for payment processing
 *
 * @param orderStatus - Razorpay order status
 * @returns Whether the order status is valid
 */
function isValidOrderStatus(orderStatus) {
    const validStatuses = ['created', 'attempted', 'paid'];
    return validStatuses.includes(orderStatus);
}
/**
 * Validate Razorpay payment status
 * Checks if payment is in a valid completed state
 *
 * @param paymentStatus - Razorpay payment status
 * @returns Whether the payment is successfully completed
 */
function isPaymentSuccessful(paymentStatus) {
    // Payment must be 'captured' or 'authorized' to be considered successful
    const successStatuses = ['captured', 'authorized'];
    return successStatuses.includes(paymentStatus);
}
/**
 * Format Razorpay error for logging and user display
 *
 * @param error - Error object from Razorpay
 * @returns Formatted error message
 */
function formatRazorpayError(error) {
    // Handle Razorpay-specific errors
    if (error.error) {
        const razorpayError = error.error;
        return {
            userMessage: razorpayError.description || 'Payment processing failed',
            technicalMessage: `${razorpayError.code}: ${razorpayError.description}`,
            code: razorpayError.code
        };
    }
    // Handle generic errors
    return {
        userMessage: 'Payment processing failed. Please try again.',
        technicalMessage: error.message || 'Unknown error',
        code: error.code
    };
}
/**
 * Check if Razorpay is properly configured
 * Validates that all required environment variables are set
 *
 * @returns Configuration validation result
 */
function validateRazorpayConfiguration() {
    const missingVars = [];
    const warnings = [];
    // Check key ID
    const keyId = process.env.RAZORPAY_KEY_ID;
    if (!keyId || keyId === 'rzp_test_your_key_id_here') {
        missingVars.push('RAZORPAY_KEY_ID');
    }
    // Check key secret
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret || keySecret === 'your_razorpay_key_secret_here') {
        missingVars.push('RAZORPAY_KEY_SECRET');
    }
    // Check webhook secret (warning only, not critical)
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret || webhookSecret === 'your_webhook_secret_here') {
        warnings.push('RAZORPAY_WEBHOOK_SECRET is not configured. Webhook events will not be verified.');
    }
    // Check if using test keys in production
    if (process.env.NODE_ENV === 'production' && keyId && keyId.startsWith('rzp_test_')) {
        warnings.push('Using test Razorpay keys in production environment. Please use live keys.');
    }
    return {
        isValid: missingVars.length === 0,
        missingVars,
        warnings
    };
}
/**
 * Generate a unique receipt ID for Razorpay order
 * Format: order_rcpt_<timestamp>_<random>
 *
 * @param orderNumber - Optional order number to include
 * @returns Unique receipt ID
 */
function generateReceiptId(orderNumber) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    if (orderNumber) {
        return `rcpt_${orderNumber}_${timestamp}_${random}`;
    }
    return `rcpt_${timestamp}_${random}`;
}
/**
 * Log payment verification attempt for audit purposes
 *
 * @param orderId - MongoDB order ID
 * @param userId - User ID
 * @param razorpayOrderId - Razorpay order ID
 * @param razorpayPaymentId - Razorpay payment ID
 * @param isValid - Whether signature validation passed
 */
function logPaymentVerificationAttempt(orderId, userId, razorpayOrderId, razorpayPaymentId, isValid) {
    const logData = {
        orderId,
        userId,
        razorpayOrderId,
        razorpayPaymentId,
        isValid,
        timestamp: new Date().toISOString(),
        ipAddress: 'N/A' // Can be added from request object if available
    };
    if (isValid) {
        console.log('✅ [AUDIT] Payment verification successful:', logData);
    }
    else {
        console.error('❌ [AUDIT] Payment verification failed:', logData);
    }
}
/**
 * Sanitize payment data for logging (remove sensitive information)
 *
 * @param data - Payment data object
 * @returns Sanitized data safe for logging
 */
function sanitizePaymentData(data) {
    const sanitized = { ...data };
    // Remove or mask sensitive fields
    const sensitiveFields = [
        'razorpay_signature',
        'signature',
        'card_number',
        'cvv',
        'card',
        'token'
    ];
    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            // Mask the value (show only first 4 and last 4 characters)
            const value = String(sanitized[field]);
            if (value.length > 8) {
                sanitized[field] = `${value.substring(0, 4)}****${value.substring(value.length - 4)}`;
            }
            else {
                sanitized[field] = '****';
            }
        }
    });
    return sanitized;
}
/**
 * Constants for Razorpay integration
 */
exports.RAZORPAY_CONSTANTS = {
    CURRENCY: 'INR',
    PAYMENT_CAPTURE_AUTO: 1,
    PAYMENT_CAPTURE_MANUAL: 0,
    MIN_AMOUNT_PAISE: 100, // Minimum 1 rupee
    MAX_AMOUNT_PAISE: 1000000000, // Maximum 10,00,00,000 rupees (10 crores)
    ORDER_STATUS: {
        CREATED: 'created',
        ATTEMPTED: 'attempted',
        PAID: 'paid'
    },
    PAYMENT_STATUS: {
        CREATED: 'created',
        AUTHORIZED: 'authorized',
        CAPTURED: 'captured',
        REFUNDED: 'refunded',
        FAILED: 'failed'
    },
    WEBHOOK_EVENTS: {
        PAYMENT_AUTHORIZED: 'payment.authorized',
        PAYMENT_CAPTURED: 'payment.captured',
        PAYMENT_FAILED: 'payment.failed',
        ORDER_PAID: 'order.paid',
        REFUND_CREATED: 'refund.created',
        REFUND_PROCESSED: 'refund.processed'
    }
};
exports.default = {
    validateRazorpayPaymentSignature,
    validateRazorpayWebhookSignature,
    verifyPaymentDataCompleteness,
    convertToPaise,
    convertToRupees,
    isValidOrderStatus,
    isPaymentSuccessful,
    formatRazorpayError,
    validateRazorpayConfiguration,
    generateReceiptId,
    logPaymentVerificationAttempt,
    sanitizePaymentData,
    RAZORPAY_CONSTANTS: exports.RAZORPAY_CONSTANTS
};
