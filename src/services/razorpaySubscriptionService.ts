import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Subscription, ISubscription } from '../models/Subscription';
import { SubscriptionTier, BillingCycle } from '../models/Subscription';
import { User } from '../models/User';

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

// Razorpay subscription plan configuration
const RAZORPAY_PLANS = {
  premium_monthly: {
    period: 'monthly',
    interval: 1,
    amount: 9900, // ₹99 in paise
    currency: 'INR'
  },
  premium_yearly: {
    period: 'yearly',
    interval: 1,
    amount: 99900, // ₹999 in paise
    currency: 'INR'
  },
  vip_monthly: {
    period: 'monthly',
    interval: 1,
    amount: 29900, // ₹299 in paise
    currency: 'INR'
  },
  vip_yearly: {
    period: 'yearly',
    interval: 1,
    amount: 299900, // ₹2999 in paise
    currency: 'INR'
  }
};

export interface IRazorpayPlan {
  id: string;
  entity: string;
  interval: number;
  period: string;
  item: {
    id: string;
    active: boolean;
    name: string;
    description: string;
    amount: number;
    currency: string;
  };
}

export interface IRazorpaySubscription {
  id: string;
  entity: string;
  plan_id: string;
  customer_id: string;
  status: string;
  quantity: number;
  notes: any;
  charge_at: number;
  start_at: number;
  end_at: number;
  auth_attempts: number;
  total_count: number;
  paid_count: number;
  customer_notify: boolean;
  created_at: number;
  expire_by: number;
  short_url: string;
  has_scheduled_changes: boolean;
  change_scheduled_at: number | null;
  offer_id: string | null;
  remaining_count: number;
}

class RazorpaySubscriptionService {
  /**
   * Create or get Razorpay plan
   */
  async createOrGetPlan(tier: SubscriptionTier, billingCycle: BillingCycle): Promise<string> {
    try {
      if (tier === 'free') {
        throw new Error('Cannot create Razorpay plan for free tier');
      }

      const planKey = `${tier}_${billingCycle}`;
      const planConfig = RAZORPAY_PLANS[planKey as keyof typeof RAZORPAY_PLANS];

      if (!planConfig) {
        throw new Error(`Invalid plan configuration: ${planKey}`);
      }

      // In production, you would fetch existing plans and return if found
      // For now, we'll create a new plan
      const planData: any = {
        period: planConfig.period as 'daily' | 'weekly' | 'monthly' | 'yearly',
        interval: planConfig.interval,
        item: {
          name: `${tier.toUpperCase()} ${billingCycle}`,
          description: `${tier.toUpperCase()} subscription - ${billingCycle} billing`,
          amount: planConfig.amount,
          currency: planConfig.currency
        },
        notes: {
          tier,
          billingCycle
        }
      };

      // @ts-ignore - Razorpay type definition issue with plan creation
      const plan: any = await razorpay.plans.create(planData);
      return plan.id as string;
    } catch (error) {
      console.error('Error creating Razorpay plan:', error);
      throw error;
    }
  }

  /**
   * Create Razorpay customer
   */
  async createCustomer(userId: string, email?: string, phoneNumber?: string): Promise<string> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const customerData = {
        name: `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() || 'User',
        email: email || user.email || `user${userId}@rezapp.com`,
        contact: phoneNumber || user.phoneNumber,
        notes: {
          userId
        }
      };

      const customer = await razorpay.customers.create(customerData);
      return customer.id;
    } catch (error) {
      console.error('Error creating Razorpay customer:', error);
      throw error;
    }
  }

  /**
   * Create subscription in Razorpay
   */
  async createSubscription(
    userId: string,
    tier: SubscriptionTier,
    billingCycle: BillingCycle,
    customerId?: string
  ): Promise<IRazorpaySubscription> {
    try {
      // Get or create plan
      const planId = await this.createOrGetPlan(tier, billingCycle);

      // Get or create customer
      let razorpayCustomerId = customerId;
      if (!razorpayCustomerId) {
        razorpayCustomerId = await this.createCustomer(userId);
      }

      // Calculate trial end (7 days from now)
      const trialEnd = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);

      // Create subscription
      const subscriptionData: any = {
        plan_id: planId,
        customer_id: razorpayCustomerId,
        quantity: 1,
        total_count: billingCycle === 'monthly' ? 12 : 1, // 12 months or 1 year
        customer_notify: '1', // Fixed: Changed from number to string
        start_at: trialEnd, // Start after trial
        notes: {
          userId,
          tier,
          billingCycle
        },
        notify_info: {
          notify_email: '1',
          notify_phone: '1'
        }
      };

      const subscription: any = await razorpay.subscriptions.create(subscriptionData);
      // Fixed: Properly handle remaining_count type conversion
      return {
        ...subscription,
        remaining_count: typeof subscription.remaining_count === 'string'
          ? parseInt(subscription.remaining_count, 10)
          : subscription.remaining_count || 0
      } as IRazorpaySubscription;
    } catch (error) {
      console.error('Error creating Razorpay subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription in Razorpay
   */
  async cancelSubscription(razorpaySubscriptionId: string, cancelAtEnd: boolean = true): Promise<any> {
    try {
      // Fixed: Pass boolean directly as per Razorpay SDK
      const subscription = await razorpay.subscriptions.cancel(razorpaySubscriptionId, cancelAtEnd);
      return subscription;
    } catch (error) {
      console.error('Error cancelling Razorpay subscription:', error);
      throw error;
    }
  }

  /**
   * Pause subscription in Razorpay
   */
  async pauseSubscription(razorpaySubscriptionId: string): Promise<any> {
    try {
      const subscription = await razorpay.subscriptions.pause(razorpaySubscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error pausing Razorpay subscription:', error);
      throw error;
    }
  }

  /**
   * Resume subscription in Razorpay
   */
  async resumeSubscription(razorpaySubscriptionId: string): Promise<any> {
    try {
      const subscription = await razorpay.subscriptions.resume(razorpaySubscriptionId);
      return subscription;
    } catch (error) {
      console.error('Error resuming Razorpay subscription:', error);
      throw error;
    }
  }

  /**
   * Update subscription in Razorpay
   */
  async updateSubscription(
    razorpaySubscriptionId: string,
    updates: {
      plan_id?: string;
      quantity?: number;
      schedule_change_at?: 'now' | 'cycle_end';
    }
  ): Promise<any> {
    try {
      const subscription = await razorpay.subscriptions.update(razorpaySubscriptionId, updates);
      return subscription;
    } catch (error) {
      console.error('Error updating Razorpay subscription:', error);
      throw error;
    }
  }

  /**
   * Fetch subscription details from Razorpay
   */
  async fetchSubscription(razorpaySubscriptionId: string): Promise<IRazorpaySubscription> {
    try {
      const subscription = await razorpay.subscriptions.fetch(razorpaySubscriptionId);
      // Fixed: Convert Razorpay SDK types to our interface with proper type handling
      return {
        ...subscription,
        remaining_count: typeof subscription.remaining_count === 'string'
          ? parseInt(subscription.remaining_count, 10)
          : (typeof subscription.remaining_count === 'number' ? subscription.remaining_count : 0)
      } as IRazorpaySubscription;
    } catch (error) {
      console.error('Error fetching Razorpay subscription:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Handle subscription webhook events
   */
  async handleWebhook(event: any): Promise<void> {
    try {
      const { entity, payload } = event;

      if (entity !== 'event') {
        console.warn('Received non-event entity:', entity);
        return;
      }

      const subscriptionData = payload.subscription?.entity;
      if (!subscriptionData) {
        console.warn('No subscription data in webhook payload');
        return;
      }

      const subscription = await Subscription.findOne({
        razorpaySubscriptionId: subscriptionData.id
      });

      if (!subscription) {
        console.warn('Subscription not found for webhook:', subscriptionData.id);
        return;
      }

      // Handle different event types
      switch (event.event) {
        case 'subscription.activated':
          await this.handleSubscriptionActivated(subscription, subscriptionData);
          break;

        case 'subscription.charged':
          await this.handleSubscriptionCharged(subscription, subscriptionData, payload.payment?.entity);
          break;

        case 'subscription.cancelled':
          await this.handleSubscriptionCancelled(subscription, subscriptionData);
          break;

        case 'subscription.completed':
          await this.handleSubscriptionCompleted(subscription, subscriptionData);
          break;

        case 'subscription.paused':
          await this.handleSubscriptionPaused(subscription, subscriptionData);
          break;

        case 'subscription.resumed':
          await this.handleSubscriptionResumed(subscription, subscriptionData);
          break;

        case 'subscription.pending':
          await this.handleSubscriptionPending(subscription, subscriptionData);
          break;

        case 'subscription.halted':
          await this.handleSubscriptionHalted(subscription, subscriptionData);
          break;

        default:
          console.log('Unhandled webhook event:', event.event);
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  /**
   * Handle subscription activated event
   */
  private async handleSubscriptionActivated(subscription: ISubscription, data: any): Promise<void> {
    subscription.status = 'active';
    subscription.startDate = new Date(data.start_at * 1000);
    subscription.endDate = new Date(data.end_at * 1000);
    await subscription.save();

    console.log(`Subscription activated: ${subscription._id}`);
  }

  /**
   * Handle subscription charged event (successful payment)
   */
  private async handleSubscriptionCharged(
    subscription: ISubscription,
    subscriptionData: any,
    paymentData: any
  ): Promise<void> {
    // Update subscription status
    if (subscription.status === 'trial') {
      subscription.status = 'active';
    } else if (subscription.status === 'grace_period' || subscription.status === 'payment_failed') {
      subscription.status = 'active';
      subscription.gracePeriodStartDate = undefined;
      subscription.paymentRetryCount = 0;
    }

    // Extend end date for next billing cycle
    const now = new Date();
    const endDate = new Date(subscription.endDate);

    if (now >= endDate) {
      // Subscription has expired, extend from now
      if (subscription.billingCycle === 'monthly') {
        endDate.setMonth(now.getMonth() + 1);
      } else {
        endDate.setFullYear(now.getFullYear() + 1);
      }
      subscription.endDate = endDate;
    }

    await subscription.save();

    console.log(`Subscription charged successfully: ${subscription._id}`);
  }

  /**
   * Handle subscription cancelled event
   */
  private async handleSubscriptionCancelled(subscription: ISubscription, data: any): Promise<void> {
    subscription.status = 'cancelled';
    subscription.cancellationDate = new Date();
    await subscription.save();

    console.log(`Subscription cancelled: ${subscription._id}`);
  }

  /**
   * Handle subscription completed event
   */
  private async handleSubscriptionCompleted(subscription: ISubscription, data: any): Promise<void> {
    subscription.status = 'expired';
    await subscription.save();

    console.log(`Subscription completed: ${subscription._id}`);
  }

  /**
   * Handle subscription paused event
   */
  private async handleSubscriptionPaused(subscription: ISubscription, data: any): Promise<void> {
    // You might want to create a new status for paused subscriptions
    // For now, we'll keep it as active but add a note
    console.log(`Subscription paused: ${subscription._id}`);
  }

  /**
   * Handle subscription resumed event
   */
  private async handleSubscriptionResumed(subscription: ISubscription, data: any): Promise<void> {
    subscription.status = 'active';
    await subscription.save();

    console.log(`Subscription resumed: ${subscription._id}`);
  }

  /**
   * Handle subscription pending event (payment failed)
   */
  private async handleSubscriptionPending(subscription: ISubscription, data: any): Promise<void> {
    subscription.status = 'grace_period';
    subscription.gracePeriodStartDate = new Date();
    subscription.paymentRetryCount += 1;
    subscription.lastPaymentRetryDate = new Date();
    await subscription.save();

    console.log(`Subscription payment pending: ${subscription._id}`);
  }

  /**
   * Handle subscription halted event (payment failed multiple times)
   */
  private async handleSubscriptionHalted(subscription: ISubscription, data: any): Promise<void> {
    subscription.status = 'payment_failed';
    await subscription.save();

    console.log(`Subscription halted: ${subscription._id}`);
  }

  /**
   * Create payment link for subscription
   */
  async createPaymentLink(
    userId: string,
    tier: SubscriptionTier,
    billingCycle: BillingCycle,
    customerId?: string
  ): Promise<string> {
    try {
      const razorpaySubscription = await this.createSubscription(userId, tier, billingCycle, customerId);
      return razorpaySubscription.short_url;
    } catch (error) {
      console.error('Error creating payment link:', error);
      throw error;
    }
  }

  /**
   * Retry failed payment
   */
  async retryPayment(razorpaySubscriptionId: string): Promise<any> {
    try {
      // Fetch current subscription
      const subscription = await this.fetchSubscription(razorpaySubscriptionId);

      if (subscription.status === 'halted') {
        // Resume the subscription to retry payment
        return await this.resumeSubscription(razorpaySubscriptionId);
      }

      return subscription;
    } catch (error) {
      console.error('Error retrying payment:', error);
      throw error;
    }
  }
}

export default new RazorpaySubscriptionService();
