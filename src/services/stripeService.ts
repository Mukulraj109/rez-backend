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
   * Verify webhook signature
   */
  public verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
  ): Stripe.Event {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return event;
    } catch (error: any) {
      console.error('❌ [STRIPE SERVICE] Webhook signature verification failed:', error.message);
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export default new StripeService();
