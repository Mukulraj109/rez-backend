import mongoose, { Document, Types } from 'mongoose';
import { SubscriptionTier, BillingCycle } from './Subscription';
export type DiscountType = 'percentage' | 'fixed';
export interface IPromoCodeUsage {
    user: Types.ObjectId;
    usedAt: Date;
    subscriptionId: Types.ObjectId;
    discountApplied: number;
    originalPrice: number;
    finalPrice: number;
}
export interface IPromoCodeMetadata {
    campaign?: string;
    source?: string;
    notes?: string;
}
export interface IPromoCode extends Document {
    code: string;
    description: string;
    discountType: DiscountType;
    discountValue: number;
    applicableTiers: SubscriptionTier[];
    applicableBillingCycles?: BillingCycle[];
    validFrom: Date;
    validUntil: Date;
    maxUses: number;
    maxUsesPerUser: number;
    usedCount: number;
    usedBy: IPromoCodeUsage[];
    isActive: boolean;
    metadata: IPromoCodeMetadata;
    createdBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    isValid(): boolean;
    canBeUsedBy(userId: Types.ObjectId | string): Promise<boolean>;
    incrementUsage(userId: Types.ObjectId | string, subscriptionId: Types.ObjectId | string, originalPrice: number, finalPrice: number): Promise<void>;
    calculateDiscount(originalPrice: number): number;
}
export interface IPromoCodeValidationResult {
    valid: boolean;
    message: string;
    discount?: number;
    discountedPrice?: number;
    promoCode?: IPromoCode;
}
export interface IPromoCodeModel extends mongoose.Model<IPromoCode> {
    validateCode(code: string, tier: SubscriptionTier, billingCycle: BillingCycle, userId: Types.ObjectId | string, originalPrice: number): Promise<IPromoCodeValidationResult>;
    getActivePromoCodes(tier?: SubscriptionTier, billingCycle?: BillingCycle): Promise<IPromoCode[]>;
    sanitizeCode(code: string): string;
}
export declare const PromoCode: any;
