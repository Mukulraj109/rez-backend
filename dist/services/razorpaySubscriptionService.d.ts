import { SubscriptionTier, BillingCycle } from '../models/Subscription';
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
declare class RazorpaySubscriptionService {
    /**
     * Create or get Razorpay plan
     */
    createOrGetPlan(tier: SubscriptionTier, billingCycle: BillingCycle): Promise<string>;
    /**
     * Create Razorpay customer
     */
    createCustomer(userId: string, email?: string, phoneNumber?: string): Promise<string>;
    /**
     * Create subscription in Razorpay
     */
    createSubscription(userId: string, tier: SubscriptionTier, billingCycle: BillingCycle, customerId?: string): Promise<IRazorpaySubscription>;
    /**
     * Cancel subscription in Razorpay
     */
    cancelSubscription(razorpaySubscriptionId: string, cancelAtEnd?: boolean): Promise<any>;
    /**
     * Pause subscription in Razorpay
     */
    pauseSubscription(razorpaySubscriptionId: string): Promise<any>;
    /**
     * Resume subscription in Razorpay
     */
    resumeSubscription(razorpaySubscriptionId: string): Promise<any>;
    /**
     * Update subscription in Razorpay
     */
    updateSubscription(razorpaySubscriptionId: string, updates: {
        plan_id?: string;
        quantity?: number;
        schedule_change_at?: 'now' | 'cycle_end';
    }): Promise<any>;
    /**
     * Fetch subscription details from Razorpay
     */
    fetchSubscription(razorpaySubscriptionId: string): Promise<IRazorpaySubscription>;
    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
    /**
     * Handle subscription webhook events
     */
    handleWebhook(event: any): Promise<void>;
    /**
     * Handle subscription activated event
     */
    private handleSubscriptionActivated;
    /**
     * Handle subscription charged event (successful payment)
     */
    private handleSubscriptionCharged;
    /**
     * Handle subscription cancelled event
     */
    private handleSubscriptionCancelled;
    /**
     * Handle subscription completed event
     */
    private handleSubscriptionCompleted;
    /**
     * Handle subscription paused event
     */
    private handleSubscriptionPaused;
    /**
     * Handle subscription resumed event
     */
    private handleSubscriptionResumed;
    /**
     * Handle subscription pending event (payment failed)
     */
    private handleSubscriptionPending;
    /**
     * Handle subscription halted event (payment failed multiple times)
     */
    private handleSubscriptionHalted;
    /**
     * Create payment link for subscription
     */
    createPaymentLink(userId: string, tier: SubscriptionTier, billingCycle: BillingCycle, customerId?: string): Promise<string>;
    /**
     * Retry failed payment
     */
    retryPayment(razorpaySubscriptionId: string): Promise<any>;
}
declare const _default: RazorpaySubscriptionService;
export default _default;
