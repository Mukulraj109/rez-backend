import Stripe from 'stripe';
declare class StripeService {
    private stripe;
    private isConfigured;
    constructor();
    /**
     * Initialize Stripe with secret key from environment
     */
    private initializeStripe;
    /**
     * Check if Stripe is configured
     */
    isStripeConfigured(): boolean;
    /**
     * Create a checkout session for subscription payment
     */
    createCheckoutSession(params: {
        subscriptionId: string;
        tier: string;
        amount: number;
        billingCycle: string;
        successUrl: string;
        cancelUrl: string;
        customerEmail?: string;
        metadata?: Record<string, string>;
    }): Promise<Stripe.Checkout.Session>;
    /**
     * Create a checkout session for general order payment (products, services)
     */
    createCheckoutSessionForOrder(params: {
        orderId: string;
        amount: number;
        currency?: string;
        customerEmail?: string;
        customerName?: string;
        successUrl: string;
        cancelUrl: string;
        items?: Array<{
            name: string;
            description?: string;
            amount: number;
            quantity: number;
            itemType?: 'product' | 'service' | 'event';
        }>;
        metadata?: Record<string, string>;
    }): Promise<Stripe.Checkout.Session>;
    /**
     * Retrieve a checkout session
     */
    getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session>;
    /**
     * Create a payment intent (alternative to checkout session)
     */
    createPaymentIntent(params: {
        amount: number;
        currency?: string;
        metadata?: Record<string, string>;
    }): Promise<Stripe.PaymentIntent>;
    /**
     * Retrieve a payment intent by ID
     */
    getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent>;
    /**
     * Verify payment intent status
     * Returns true if payment is successful
     */
    verifyPaymentIntent(paymentIntentId: string): Promise<{
        verified: boolean;
        status: string;
        amount: number;
        currency: string;
        metadata: Record<string, string>;
    }>;
    /**
     * Verify checkout session and retrieve payment details
     */
    verifyCheckoutSession(sessionId: string): Promise<{
        verified: boolean;
        paymentStatus: string;
        amount: number;
        currency: string;
        metadata: Record<string, string>;
        paymentIntentId?: string;
    }>;
    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: string | Buffer, signature: string, webhookSecret?: string): Stripe.Event;
    /**
     * Create a refund for a payment intent
     */
    createRefund(params: {
        paymentIntentId: string;
        amount?: number;
        reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
        metadata?: Record<string, string>;
    }): Promise<Stripe.Refund>;
    /**
     * Retrieve refund status
     */
    getRefundStatus(refundId: string): Promise<{
        id: string;
        status: string | null;
        amount: number;
        currency: string;
        created: number;
        reason: string | null;
    }>;
    /**
     * Cancel a refund (if still pending)
     */
    cancelRefund(refundId: string): Promise<{
        id: string;
        status: string | null;
    }>;
    /**
     * Handle Stripe errors with specific error codes
     */
    handleStripeError(error: any): {
        message: string;
        code: string;
        statusCode: number;
    };
}
declare const _default: StripeService;
export default _default;
