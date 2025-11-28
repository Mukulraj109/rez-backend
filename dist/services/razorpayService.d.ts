/**
 * Create a Razorpay order
 */
export declare function createRazorpayOrder(amount: number, // Amount in rupees
receipt: string, notes?: Record<string, any>): Promise<{
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
}>;
/**
 * Verify Razorpay payment signature
 * This is critical for security - always verify payment on server side
 */
export declare function verifyRazorpaySignature(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string): boolean;
/**
 * Fetch payment details from Razorpay
 */
export declare function fetchPaymentDetails(paymentId: string): Promise<import("razorpay/dist/types/payments").Payments.RazorpayPayment>;
/**
 * Refund a payment
 */
export declare function createRefund(paymentId: string, amount?: number, // Amount in rupees (optional, defaults to full refund)
notes?: Record<string, any>): Promise<import("razorpay/dist/types/refunds").Refunds.RazorpayRefund>;
/**
 * Get Razorpay configuration for frontend
 * (Only sends safe, public information)
 */
export declare function getRazorpayConfigForFrontend(): {
    keyId: string;
    currency: string;
    checkout: {
        name: string;
        description: string;
        image: string;
        theme: {
            color: string;
        };
    };
    isTestMode: boolean;
};
/**
 * Validate webhook signature (for webhook endpoints)
 */
export declare function validateWebhookSignature(webhookBody: string, webhookSignature: string): boolean;
/**
 * Create a Razorpay payout (for cashback payments)
 */
export declare function createRazorpayPayout(params: {
    amount: number;
    currency?: string;
    accountNumber: string;
    ifsc: string;
    name: string;
    purpose: string;
    reference: string;
}): Promise<{
    id: string;
    entity: string;
    amount: number;
    currency: string;
    status: string;
    purpose: string;
    utr?: string;
    mode: string;
    reference_id: string;
    narration?: string;
    created_at: number;
}>;
/**
 * Alias for createRefund - used by merchant order controller
 */
export declare const createRazorpayRefund: typeof createRefund;
export declare const razorpayService: {
    createOrder: typeof createRazorpayOrder;
    verifySignature: typeof verifyRazorpaySignature;
    fetchPaymentDetails: typeof fetchPaymentDetails;
    createRefund: typeof createRefund;
    createRazorpayRefund: typeof createRefund;
    createPayout: typeof createRazorpayPayout;
    getConfigForFrontend: typeof getRazorpayConfigForFrontend;
    validateWebhookSignature: typeof validateWebhookSignature;
};
