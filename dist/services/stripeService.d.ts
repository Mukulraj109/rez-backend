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
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: string | Buffer, signature: string, webhookSecret: string): Stripe.Event;
}
declare const _default: StripeService;
export default _default;
