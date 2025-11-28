import mongoose, { Document } from 'mongoose';
export interface ISubscriptionTier extends Document {
    tier: 'free' | 'premium' | 'vip';
    name: string;
    pricing: {
        monthly: number;
        yearly: number;
        yearlyDiscount: number;
    };
    benefits: {
        cashbackMultiplier: number;
        freeDeliveries: number;
        maxWishlists: number;
        prioritySupport: boolean;
        exclusiveDeals: boolean;
        earlyAccess: boolean;
    };
    description: string;
    features: string[];
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SubscriptionTier: mongoose.Model<ISubscriptionTier, {}, {}, {}, mongoose.Document<unknown, {}, ISubscriptionTier, {}, {}> & ISubscriptionTier & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
