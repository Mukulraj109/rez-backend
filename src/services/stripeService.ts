import Stripe from 'stripe';

class StripeService {
  private stripe: Stripe | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeStripe();
  }

  /**
   * Initialize Stripe with secret key from environment
   */
  private initializeStripe() {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      console.warn('⚠️ [STRIPE SERVICE] STRIPE_SECRET_KEY not configured');
      this.isConfigured = false;
      return;
    }

    try {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-09-30.clover',
      });
      this.isConfigured = true;
      console.log('✅ [STRIPE SERVICE] Stripe initialized successfully');
    } catch (error: any) {
      console.error('❌ [STRIPE SERVICE] Failed to initialize Stripe:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Check if Stripe is configured
   */
  public isStripeConfigured(): boolean {
    return this.isConfigured && this.stripe !== null;
  }

  /**
   * Create a checkout session for subscription payment
   */
  public async createCheckoutSession(params: {
    subscriptionId: string;
    tier: string;
    amount: number;
    billingCycle: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }

    console.log('💳 [STRIPE SERVICE] Creating checkout session:', {
      subscriptionId: params.subscriptionId,
      tier: params.tier,
      amount: params.amount,
      billingCycle: params.billingCycle,
    });

    try {
      // Convert amount to smallest currency unit (paise for INR)
      const amountInPaise = Math.round(params.amount * 100);

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'inr',
              product_data: {
                name: `${params.tier.toUpperCase()} Subscription`,
                description: `${params.billingCycle.charAt(0).toUpperCase() + params.billingCycle.slice(1)} billing for ${params.tier.toUpperCase()} tier`,
              },
              unit_amount: amountInPaise,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: params.customerEmail,
        metadata: {
          subscriptionId: params.subscriptionId,
          tier: params.tier,
          billingCycle: params.billingCycle,
          ...params.metadata,
        },
      });

      console.log('✅ [STRIPE SERVICE] Checkout session created:', session.id);

      return session;
    } catch (error: any) {
      console.error('❌ [STRIPE SERVICE] Error creating checkout session:', error.message);
      throw new Error(`Failed to create Stripe checkout session: ${error.message}`);
    }
  }

  /**
   * Retrieve a checkout session
   */
  public async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error: any) {
      console.error('❌ [STRIPE SERVICE] Error retrieving checkout session:', error.message);
      throw new Error(`Failed to retrieve checkout session: ${error.message}`);
    }
  }

  /**
   * Create a payment intent (alternative to checkout session)
   */
  public async createPaymentIntent(params: {
    amount: number;
    currency?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const amountInSmallestUnit = Math.round(params.amount * 100);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInSmallestUnit,
        currency: params.currency || 'inr',
        metadata: params.metadata || {},
      });

      console.log('✅ [STRIPE SERVICE] Payment intent created:', paymentIntent.id);

      return paymentIntent;
    } catch (error: any) {
      console.error('❌ [STRIPE SERVICE] Error creating payment intent:', error.message);
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  }

  /**
   * Retrieve a payment intent by ID
   */
  public async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      console.log('✅ [STRIPE SERVICE] Payment intent retrieved:', paymentIntent.id);
      return paymentIntent;
    } catch (error: any) {
      console.error('❌ [STRIPE SERVICE] Error retrieving payment intent:', error.message);
      throw new Error(`Failed to retrieve payment intent: ${error.message}`);
    }
  }

  /**
   * Verify payment intent status
   * Returns true if payment is successful
   */
  public async verifyPaymentIntent(paymentIntentId: string): Promise<{
    verified: boolean;
    status: string;
    amount: number;
    currency: string;
    metadata: Record<string, string>;
  }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      console.log('🔐 [STRIPE SERVICE] Verifying payment intent:', paymentIntentId);

      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      const verified = paymentIntent.status === 'succeeded';

      console.log(
        verified
          ? '✅ [STRIPE SERVICE] Payment intent verified successfully'
          : `⚠️ [STRIPE SERVICE] Payment intent status: ${paymentIntent.status}`
      );

      return {
        verified,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convert from smallest unit to rupees
        currency: paymentIntent.currency.toUpperCase(),
        metadata: paymentIntent.metadata as Record<string, string>,
      };
    } catch (error: any) {
      console.error('❌ [STRIPE SERVICE] Error verifying payment intent:', error.message);
      throw new Error(`Failed to verify payment intent: ${error.message}`);
    }
  }

  /**
   * Verify checkout session and retrieve payment details
   */
  public async verifyCheckoutSession(sessionId: string): Promise<{
    verified: boolean;
    paymentStatus: string;
    amount: number;
    currency: string;
    metadata: Record<string, string>;
    paymentIntentId?: string;
  }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      console.log('🔐 [STRIPE SERVICE] Verifying checkout session:', sessionId);

      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      const verified = session.payment_status === 'paid';

      console.log(
        verified
          ? '✅ [STRIPE SERVICE] Checkout session verified successfully'
          : `⚠️ [STRIPE SERVICE] Payment status: ${session.payment_status}`
      );

      return {
        verified,
        paymentStatus: session.payment_status,
        amount: (session.amount_total || 0) / 100, // Convert from smallest unit to rupees
        currency: (session.currency || 'inr').toUpperCase(),
        metadata: session.metadata as Record<string, string>,
        paymentIntentId: session.payment_intent as string,
      };
    } catch (error: any) {
      console.error('❌ [STRIPE SERVICE] Error verifying checkout session:', error.message);
      throw new Error(`Failed to verify checkout session: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   */
  public verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    webhookSecret?: string
  ): Stripe.Event {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    // Use provided webhook secret or fall back to environment variable
    const secret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret) {
      throw new Error('Stripe webhook secret is not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
      console.log('✅ [STRIPE SERVICE] Webhook signature verified:', event.type);
      return event;
    } catch (error: any) {
      console.error('❌ [STRIPE SERVICE] Webhook signature verification failed:', error.message);
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }

  /**
   * Create a refund for a payment intent
   */
  public async createRefund(params: {
    paymentIntentId: string;
    amount?: number; // in smallest currency unit (paise)
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata?: Record<string, string>;
  }): Promise<Stripe.Refund> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      console.log('💸 [STRIPE SERVICE] Creating refund for payment:', params.paymentIntentId);

      const refund = await this.stripe.refunds.create({
        payment_intent: params.paymentIntentId,
        amount: params.amount,
        reason: params.reason,
        metadata: params.metadata,
      });

      console.log('✅ [STRIPE SERVICE] Refund created:', refund.id);

      return refund;
    } catch (error: any) {
      console.error('❌ [STRIPE SERVICE] Error creating refund:', error.message);
      throw new Error(`Failed to create refund: ${error.message}`);
    }
  }

  /**
   * Retrieve refund status
   */
  public async getRefundStatus(refundId: string): Promise<{
    id: string;
    status: string | null;
    amount: number;
    currency: string;
    created: number;
    reason: string | null;
  }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      console.log('🔍 [STRIPE SERVICE] Retrieving refund status:', refundId);

      const refund = await this.stripe.refunds.retrieve(refundId);

      console.log('✅ [STRIPE SERVICE] Refund status retrieved:', refund.status);

      return {
        id: refund.id,
        status: refund.status || 'unknown',
        amount: refund.amount,
        currency: refund.currency,
        created: refund.created,
        reason: refund.reason,
      };
    } catch (error: any) {
      console.error('❌ [STRIPE SERVICE] Error retrieving refund:', error.message);
      throw new Error(`Failed to retrieve refund: ${error.message}`);
    }
  }

  /**
   * Cancel a refund (if still pending)
   */
  public async cancelRefund(refundId: string): Promise<{
    id: string;
    status: string | null;
  }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      console.log('🚫 [STRIPE SERVICE] Cancelling refund:', refundId);

      const refund = await this.stripe.refunds.cancel(refundId);

      console.log('✅ [STRIPE SERVICE] Refund cancelled:', refund.id);

      return {
        id: refund.id,
        status: refund.status || 'unknown',
      };
    } catch (error: any) {
      console.error('❌ [STRIPE SERVICE] Error cancelling refund:', error.message);
      throw new Error(`Failed to cancel refund: ${error.message}`);
    }
  }

  /**
   * Handle Stripe errors with specific error codes
   */
  public handleStripeError(error: any): { message: string; code: string; statusCode: number } {
    if (error.type === 'StripeCardError') {
      // Card errors
      return {
        message: error.message || 'Card payment failed',
        code: error.code || 'card_declined',
        statusCode: 402,
      };
    } else if (error.type === 'StripeInvalidRequestError') {
      // Invalid parameters
      return {
        message: error.message || 'Invalid request to payment provider',
        code: 'invalid_request',
        statusCode: 400,
      };
    } else if (error.type === 'StripeAPIError') {
      // API errors
      return {
        message: 'Payment provider error. Please try again.',
        code: 'api_error',
        statusCode: 500,
      };
    } else if (error.type === 'StripeConnectionError') {
      // Network errors
      return {
        message: 'Network error connecting to payment provider',
        code: 'connection_error',
        statusCode: 503,
      };
    } else if (error.type === 'StripeAuthenticationError') {
      // Authentication errors
      return {
        message: 'Payment provider authentication failed',
        code: 'authentication_error',
        statusCode: 500,
      };
    } else {
      // Generic error
      return {
        message: error.message || 'Payment processing failed',
        code: 'processing_error',
        statusCode: 500,
      };
    }
  }
}

// Export singleton instance
export default new StripeService();
