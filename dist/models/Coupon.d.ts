import { Document, Types } from 'mongoose';
export interface ICouponApplicableTo {
    categories: Types.ObjectId[];
    products: Types.ObjectId[];
    stores: Types.ObjectId[];
    userTiers: string[];
}
export interface ICouponUsageLimit {
    totalUsage: number;
    perUser: number;
    usedCount: number;
}
export interface ICoupon extends Document {
    couponCode: string;
    title: string;
    description: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    minOrderValue: number;
    maxDiscountCap: number;
    validFrom: Date;
    validTo: Date;
    usageLimit: ICouponUsageLimit;
    applicableTo: ICouponApplicableTo;
    autoApply: boolean;
    autoApplyPriority: number;
    status: 'active' | 'inactive' | 'expired';
    termsAndConditions: string[];
    createdBy: Types.ObjectId;
    tags: string[];
    imageUrl?: string;
    isNewlyAdded: boolean;
    isFeatured: boolean;
    viewCount: number;
    claimCount: number;
    usageCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Coupon: any;
