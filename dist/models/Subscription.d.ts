import mongoose, { Document, Types } from 'mongoose';
export type SubscriptionTier = 'free' | 'premium' | 'vip';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial' | 'grace_period' | 'payment_failed';
export type BillingCycle = 'monthly' | 'yearly';
export interface ISubscriptionBenefits {
    cashbackMultiplier: number;
    freeDelivery: boolean;
    prioritySupport: boolean;
    exclusiveDeals: boolean;
    unlimitedWishlists: boolean;
    earlyFlashSaleAccess: boolean;
    personalShopper: boolean;
    premiumEvents: boolean;
    conciergeService: boolean;
    birthdayOffer: boolean;
    anniversaryOffer: boolean;
}
export interface ISubscriptionUsage {
    totalSavings: number;
    ordersThisMonth: number;
    ordersAllTime: number;
    cashbackEarned: number;
    deliveryFeesSaved: number;
    exclusiveDealsUsed: number;
    lastUsedAt?: Date;
}
export interface ISubscriptionPricing {
    monthly: number;
    yearly: number;
    yearlyDiscount: number;
}
export interface ISubscription extends Document {
    user: Types.ObjectId;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    billingCycle: BillingCycle;
    price: number;
    startDate: Date;
    endDate: Date;
    trialEndDate?: Date;
    autoRenew: boolean;
    paymentMethod?: string;
    razorpaySubscriptionId?: string;
    razorpayPlanId?: string;
    razorpayCustomerId?: string;
    benefits: ISubscriptionBenefits;
    usage: ISubscriptionUsage;
    cancellationDate?: Date;
    cancellationReason?: string;
    cancellationFeedback?: string;
    reactivationEligibleUntil?: Date;
    gracePeriodStartDate?: Date;
    paymentRetryCount: number;
    lastPaymentRetryDate?: Date;
    isGrandfathered: boolean;
    grandfatheredPrice?: number;
    previousTier?: SubscriptionTier;
    upgradeDate?: Date;
    downgradeScheduledFor?: Date;
    proratedCredit?: number;
    metadata?: {
        source?: string;
        campaign?: string;
        promoCode?: string;
    };
    createdAt: Date;
    updatedAt: Date;
    isActive(): boolean;
    isInTrial(): boolean;
    isInGracePeriod(): boolean;
    canUpgrade(): boolean;
    canDowngrade(): boolean;
    calculateROI(): number;
    getRemainingDays(): number;
}
export interface ISubscriptionModel extends mongoose.Model<ISubscription> {
    getTierConfig(tier: SubscriptionTier): {
        tier: SubscriptionTier;
        name: string;
        pricing: ISubscriptionPricing;
        benefits: ISubscriptionBenefits;
        description: string;
        features: string[];
    };
    calculateProratedAmount(currentTier: SubscriptionTier, newTier: SubscriptionTier, endDate: Date, billingCycle: BillingCycle): number;
}
export declare const Subscription: ISubscriptionModel;
