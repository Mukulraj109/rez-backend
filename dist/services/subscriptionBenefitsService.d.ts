import { Types } from 'mongoose';
import { ISubscription, SubscriptionTier } from '../models/Subscription';
declare class SubscriptionBenefitsService {
    /**
     * Get user's current subscription
     */
    getUserSubscription(userId: string | Types.ObjectId): Promise<ISubscription | null>;
    /**
     * Get cashback multiplier based on user's subscription tier
     */
    getCashbackMultiplier(userId: string | Types.ObjectId): Promise<number>;
    /**
     * Check if user has free delivery benefit
     */
    hasFreeDelivery(userId: string | Types.ObjectId): Promise<boolean>;
    /**
     * Check if user can access exclusive deals
     */
    canAccessExclusiveDeals(userId: string | Types.ObjectId): Promise<boolean>;
    /**
     * Check if user has priority support
     */
    hasPrioritySupport(userId: string | Types.ObjectId): Promise<boolean>;
    /**
     * Check if user has unlimited wishlists
     */
    hasUnlimitedWishlists(userId: string | Types.ObjectId): Promise<boolean>;
    /**
     * Check if user has early flash sale access
     */
    hasEarlyFlashSaleAccess(userId: string | Types.ObjectId): Promise<boolean>;
    /**
     * Check if user has personal shopper access
     */
    hasPersonalShopper(userId: string | Types.ObjectId): Promise<boolean>;
    /**
     * Check if user can access premium events
     */
    canAccessPremiumEvents(userId: string | Types.ObjectId): Promise<boolean>;
    /**
     * Check if user has concierge service
     */
    hasConciergeService(userId: string | Types.ObjectId): Promise<boolean>;
    /**
     * Apply subscription benefits to an order
     */
    applyTierBenefits(userId: string | Types.ObjectId, orderData: {
        subtotal: number;
        deliveryFee: number;
        cashbackRate: number;
    }): Promise<{
        cashbackRate: number;
        deliveryFee: number;
        totalSavings: number;
        appliedBenefits: string[];
    }>;
    /**
     * Get all benefits for a user
     */
    getUserBenefits(userId: string | Types.ObjectId): Promise<{
        tier: SubscriptionTier;
        isActive: boolean;
        benefits: any;
        usage: any;
    }>;
    /**
     * Track exclusive deal usage
     */
    trackExclusiveDealUsage(userId: string | Types.ObjectId, savingsAmount: number): Promise<void>;
    /**
     * Track cashback earned
     */
    trackCashbackEarned(userId: string | Types.ObjectId, cashbackAmount: number): Promise<void>;
    /**
     * Get subscription ROI (Return on Investment)
     */
    getSubscriptionROI(userId: string | Types.ObjectId): Promise<{
        subscriptionCost: number;
        totalSavings: number;
        netSavings: number;
        roi: number;
        roiPercentage: number;
    }>;
    /**
     * Check if user qualifies for birthday offer
     */
    qualifiesForBirthdayOffer(userId: string | Types.ObjectId): Promise<boolean>;
    /**
     * Check if user qualifies for anniversary offer
     */
    qualifiesForAnniversaryOffer(userId: string | Types.ObjectId): Promise<boolean>;
    /**
     * Reset monthly usage stats (to be run via cron job)
     */
    resetMonthlyUsageStats(): Promise<void>;
    /**
     * Get subscription value proposition for upselling
     */
    getValueProposition(userId: string | Types.ObjectId, targetTier: SubscriptionTier): Promise<{
        estimatedMonthlySavings: number;
        estimatedYearlySavings: number;
        paybackPeriod: number;
        benefits: string[];
    }>;
}
declare const _default: SubscriptionBenefitsService;
export default _default;
