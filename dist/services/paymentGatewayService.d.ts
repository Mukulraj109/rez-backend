export interface PaymentGatewayConfig {
    stripe: {
        secretKey: string;
        publishableKey: string;
        webhookSecret: string;
    };
    razorpay: {
        keyId: string;
        keySecret: string;
        webhookSecret: string;
    };
    paypal: {
        clientId: string;
        clientSecret: string;
        mode: 'sandbox' | 'live';
        webhookId: string;
    };
}
export interface PaymentRequestData {
    amount: number;
    currency: string;
    paymentMethod: 'stripe' | 'razorpay' | 'paypal';
    paymentMethodType: 'card' | 'upi' | 'wallet' | 'netbanking';
    userDetails: {
        name: string;
        email: string;
        phone?: string;
    };
    metadata?: Record<string, any>;
    returnUrl?: string;
    cancelUrl?: string;
}
export interface PaymentResponseData {
    paymentId: string;
    orderId: string;
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    paymentUrl?: string;
    qrCode?: string;
    upiId?: string;
    expiryTime?: string;
    transactionId?: string;
    completedAt?: string;
    gatewayResponse?: any;
    gateway: 'stripe' | 'razorpay' | 'paypal';
}
declare class PaymentGatewayService {
    private stripe?;
    private razorpay?;
    private config;
    constructor();
    /**
     * Initiate payment with the specified gateway
     */
    initiatePayment(paymentData: PaymentRequestData, userId: string): Promise<PaymentResponseData>;
    /**
     * Initiate Stripe payment
     */
    private initiateStripePayment;
    /**
     * Initiate Razorpay payment
     */
    private initiateRazorpayPayment;
    /**
     * Initiate PayPal payment (Not implemented yet)
     */
    private initiatePayPalPayment;
    /**
     * Check payment status
     */
    checkPaymentStatus(paymentId: string, gateway: string, userId: string): Promise<PaymentResponseData>;
    /**
     * Check Stripe payment status
     */
    private checkStripePaymentStatus;
    /**
     * Check Razorpay payment status
     */
    private checkRazorpayPaymentStatus;
    /**
     * Check PayPal payment status (Not implemented yet)
     */
    private checkPayPalPaymentStatus;
    /**
     * Handle webhook from payment gateway
     */
    handleWebhook(gateway: string, payload: any, signature: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Verify Stripe webhook signature
     */
    private verifyStripeWebhook;
    /**
     * Verify Razorpay webhook signature
     */
    private verifyRazorpayWebhook;
    /**
     * Verify PayPal webhook signature (Not implemented yet)
     */
    private verifyPayPalWebhook;
    /**
     * Process webhook payload
     */
    private processWebhook;
    /**
     * Process Stripe webhook
     */
    private processStripeWebhook;
    /**
     * Process Razorpay webhook
     */
    private processRazorpayWebhook;
    /**
     * Process PayPal webhook
     */
    private processPayPalWebhook;
    /**
     * Update payment record from webhook
     */
    private updatePaymentFromWebhook;
    /**
     * Update booking status from payment intent
     */
    private updateBookingStatusFromPayment;
    /**
     * Save payment record to database
     */
    private savePaymentRecord;
    /**
     * Update payment record in database
     */
    private updatePaymentRecord;
    /**
     * Map Stripe status to our status
     */
    private mapStripeStatus;
    /**
     * Map Razorpay status to our status
     */
    private mapRazorpayStatus;
    /**
     * Map PayPal status to our status
     */
    private mapPayPalStatus;
    /**
     * Get available payment methods for a gateway
     */
    getAvailablePaymentMethods(gateway: string): string[];
    /**
     * Get supported currencies for a gateway
     */
    getSupportedCurrencies(gateway: string): string[];
}
declare const paymentGatewayService: PaymentGatewayService;
export default paymentGatewayService;
