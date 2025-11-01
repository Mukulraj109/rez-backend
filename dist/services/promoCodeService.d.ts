import { Types } from 'mongoose';
import { SubscriptionTier, BillingCycle } from '../models/Subscription';
/**
 * Get subscription price based on tier and billing cycle
 */
export declare const getSubscriptionPrice: (tier: SubscriptionTier, billingCycle: BillingCycle) => number;
/**
 * Validate a promo code for a subscription
 */
export declare const validatePromoCode: (code: string, tier: SubscriptionTier, billingCycle: BillingCycle, userId: Types.ObjectId | string) => Promise<{
    valid: boolean;
    discount?: number;
    finalPrice?: number;
    message?: string;
    promoCode?: any;
}>;
/**
 * Apply promo code to a subscription
 * This increments the usage count and records the usage
 */
export declare const applyPromoCode: (code: string, tier: SubscriptionTier, billingCycle: BillingCycle, userId: Types.ObjectId | string, subscriptionId: Types.ObjectId | string) => Promise<{
    success: boolean;
    discount?: number;
    finalPrice?: number;
    message?: string;
}>;
/**
 * Get all active promo codes (admin only)
 */
export declare const getActivePromoCodes: (tier?: SubscriptionTier, billingCycle?: BillingCycle) => Promise<any[]>;
/**
 * Check if a user has used a promo code
 */
export declare const hasUserUsedPromoCode: (code: string, userId: Types.ObjectId | string) => Promise<boolean>;
/**
 * Get promo code usage statistics
 */
export declare const getPromoCodeStats: (code: string) => Promise<any>;
/**
 * Create a new promo code (admin only)
 */
export declare const createPromoCode: (promoData: {
    code: string;
    description: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    applicableTiers: SubscriptionTier[];
    applicableBillingCycles?: BillingCycle[];
    validFrom: Date;
    validUntil: Date;
    maxUses: number;
    maxUsesPerUser: number;
    metadata?: {
        campaign?: string;
        source?: string;
        notes?: string;
    };
    createdBy?: Types.ObjectId | string;
}) => Promise<any>;
/**
 * Deactivate a promo code (admin only)
 */
export declare const deactivatePromoCode: (code: string) => Promise<boolean>;
declare const _default: {
    validatePromoCode: (code: string, tier: SubscriptionTier, billingCycle: BillingCycle, userId: Types.ObjectId | string) => Promise<{
        valid: boolean;
        discount?: number;
        finalPrice?: number;
        message?: string;
        promoCode?: any;
    }>;
    applyPromoCode: (code: string, tier: SubscriptionTier, billingCycle: BillingCycle, userId: Types.ObjectId | string, subscriptionId: Types.ObjectId | string) => Promise<{
        success: boolean;
        discount?: number;
        finalPrice?: number;
        message?: string;
    }>;
    getActivePromoCodes: (tier?: SubscriptionTier, billingCycle?: BillingCycle) => Promise<any[]>;
    hasUserUsedPromoCode: (code: string, userId: Types.ObjectId | string) => Promise<boolean>;
    getPromoCodeStats: (code: string) => Promise<any>;
    createPromoCode: (promoData: {
        code: string;
        description: string;
        discountType: "percentage" | "fixed";
        discountValue: number;
        applicableTiers: SubscriptionTier[];
        applicableBillingCycles?: BillingCycle[];
        validFrom: Date;
        validUntil: Date;
        maxUses: number;
        maxUsesPerUser: number;
        metadata?: {
            campaign?: string;
            source?: string;
            notes?: string;
        };
        createdBy?: Types.ObjectId | string;
    }) => Promise<any>;
    deactivatePromoCode: (code: string) => Promise<boolean>;
    getSubscriptionPrice: (tier: SubscriptionTier, billingCycle: BillingCycle) => number;
};
export default _default;
