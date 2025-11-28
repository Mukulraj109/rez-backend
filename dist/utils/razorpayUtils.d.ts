/**
 * Razorpay Utility Functions
 * Centralized utilities for Razorpay payment processing, signature validation, and error handling
 */
/**
 * Razorpay signature validation result interface
 */
export interface IRazorpaySignatureValidationResult {
    isValid: boolean;
    error?: string;
    details?: {
        orderId: string;
        paymentId: string;
        signatureProvided: string;
        signatureGenerated?: string;
    };
}
/**
 * Payment verification data interface
 */
export interface IPaymentVerificationData {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}
/**
 * Razorpay webhook signature validation result
 */
export interface IWebhookValidationResult {
    isValid: boolean;
    error?: string;
    eventType?: string;
}
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
export declare function validateRazorpayPaymentSignature(orderId: string, paymentId: string, signature: string, secret: string): IRazorpaySignatureValidationResult;
/**
 * Validate Razorpay webhook signature
 * Used to verify webhook events from Razorpay
 *
 * @param webhookBody - Raw webhook body as string
 * @param webhookSignature - Signature from x-razorpay-signature header
 * @param webhookSecret - Webhook secret from Razorpay dashboard
 * @returns Validation result
 */
export declare function validateRazorpayWebhookSignature(webhookBody: string, webhookSignature: string, webhookSecret: string): IWebhookValidationResult;
/**
 * Verify payment data completeness before processing
 * Ensures all required fields are present and valid
 *
 * @param verificationData - Payment verification data from frontend
 * @returns Object with isValid flag and error message if invalid
 */
export declare function verifyPaymentDataCompleteness(verificationData: IPaymentVerificationData): {
    isValid: boolean;
    error?: string;
};
/**
 * Convert amount from rupees to paise (smallest currency unit)
 * Razorpay requires amounts in paise (1 rupee = 100 paise)
 *
 * @param amountInRupees - Amount in rupees
 * @returns Amount in paise
 */
export declare function convertToPaise(amountInRupees: number): number;
/**
 * Convert amount from paise to rupees
 *
 * @param amountInPaise - Amount in paise
 * @returns Amount in rupees
 */
export declare function convertToRupees(amountInPaise: number): number;
/**
 * Validate Razorpay order status
 * Checks if order is in a valid state for payment processing
 *
 * @param orderStatus - Razorpay order status
 * @returns Whether the order status is valid
 */
export declare function isValidOrderStatus(orderStatus: string): boolean;
/**
 * Validate Razorpay payment status
 * Checks if payment is in a valid completed state
 *
 * @param paymentStatus - Razorpay payment status
 * @returns Whether the payment is successfully completed
 */
export declare function isPaymentSuccessful(paymentStatus: string): boolean;
/**
 * Format Razorpay error for logging and user display
 *
 * @param error - Error object from Razorpay
 * @returns Formatted error message
 */
export declare function formatRazorpayError(error: any): {
    userMessage: string;
    technicalMessage: string;
    code?: string;
};
/**
 * Check if Razorpay is properly configured
 * Validates that all required environment variables are set
 *
 * @returns Configuration validation result
 */
export declare function validateRazorpayConfiguration(): {
    isValid: boolean;
    missingVars: string[];
    warnings: string[];
};
/**
 * Generate a unique receipt ID for Razorpay order
 * Format: order_rcpt_<timestamp>_<random>
 *
 * @param orderNumber - Optional order number to include
 * @returns Unique receipt ID
 */
export declare function generateReceiptId(orderNumber?: string): string;
/**
 * Log payment verification attempt for audit purposes
 *
 * @param orderId - MongoDB order ID
 * @param userId - User ID
 * @param razorpayOrderId - Razorpay order ID
 * @param razorpayPaymentId - Razorpay payment ID
 * @param isValid - Whether signature validation passed
 */
export declare function logPaymentVerificationAttempt(orderId: string, userId: string, razorpayOrderId: string, razorpayPaymentId: string, isValid: boolean): void;
/**
 * Sanitize payment data for logging (remove sensitive information)
 *
 * @param data - Payment data object
 * @returns Sanitized data safe for logging
 */
export declare function sanitizePaymentData(data: any): any;
/**
 * Constants for Razorpay integration
 */
export declare const RAZORPAY_CONSTANTS: {
    readonly CURRENCY: "INR";
    readonly PAYMENT_CAPTURE_AUTO: 1;
    readonly PAYMENT_CAPTURE_MANUAL: 0;
    readonly MIN_AMOUNT_PAISE: 100;
    readonly MAX_AMOUNT_PAISE: 1000000000;
    readonly ORDER_STATUS: {
        readonly CREATED: "created";
        readonly ATTEMPTED: "attempted";
        readonly PAID: "paid";
    };
    readonly PAYMENT_STATUS: {
        readonly CREATED: "created";
        readonly AUTHORIZED: "authorized";
        readonly CAPTURED: "captured";
        readonly REFUNDED: "refunded";
        readonly FAILED: "failed";
    };
    readonly WEBHOOK_EVENTS: {
        readonly PAYMENT_AUTHORIZED: "payment.authorized";
        readonly PAYMENT_CAPTURED: "payment.captured";
        readonly PAYMENT_FAILED: "payment.failed";
        readonly ORDER_PAID: "order.paid";
        readonly REFUND_CREATED: "refund.created";
        readonly REFUND_PROCESSED: "refund.processed";
    };
};
declare const _default: {
    validateRazorpayPaymentSignature: typeof validateRazorpayPaymentSignature;
    validateRazorpayWebhookSignature: typeof validateRazorpayWebhookSignature;
    verifyPaymentDataCompleteness: typeof verifyPaymentDataCompleteness;
    convertToPaise: typeof convertToPaise;
    convertToRupees: typeof convertToRupees;
    isValidOrderStatus: typeof isValidOrderStatus;
    isPaymentSuccessful: typeof isPaymentSuccessful;
    formatRazorpayError: typeof formatRazorpayError;
    validateRazorpayConfiguration: typeof validateRazorpayConfiguration;
    generateReceiptId: typeof generateReceiptId;
    logPaymentVerificationAttempt: typeof logPaymentVerificationAttempt;
    sanitizePaymentData: typeof sanitizePaymentData;
    RAZORPAY_CONSTANTS: {
        readonly CURRENCY: "INR";
        readonly PAYMENT_CAPTURE_AUTO: 1;
        readonly PAYMENT_CAPTURE_MANUAL: 0;
        readonly MIN_AMOUNT_PAISE: 100;
        readonly MAX_AMOUNT_PAISE: 1000000000;
        readonly ORDER_STATUS: {
            readonly CREATED: "created";
            readonly ATTEMPTED: "attempted";
            readonly PAID: "paid";
        };
        readonly PAYMENT_STATUS: {
            readonly CREATED: "created";
            readonly AUTHORIZED: "authorized";
            readonly CAPTURED: "captured";
            readonly REFUNDED: "refunded";
            readonly FAILED: "failed";
        };
        readonly WEBHOOK_EVENTS: {
            readonly PAYMENT_AUTHORIZED: "payment.authorized";
            readonly PAYMENT_CAPTURED: "payment.captured";
            readonly PAYMENT_FAILED: "payment.failed";
            readonly ORDER_PAID: "order.paid";
            readonly REFUND_CREATED: "refund.created";
            readonly REFUND_PROCESSED: "refund.processed";
        };
    };
};
export default _default;
