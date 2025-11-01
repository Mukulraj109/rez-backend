import { Document, Types } from 'mongoose';
export declare enum ActivityType {
    ORDER = "ORDER",
    CASHBACK = "CASHBACK",
    REVIEW = "REVIEW",
    VIDEO = "VIDEO",
    PROJECT = "PROJECT",
    VOUCHER = "VOUCHER",
    OFFER = "OFFER",
    REFERRAL = "REFERRAL",
    WALLET = "WALLET",
    ACHIEVEMENT = "ACHIEVEMENT"
}
export interface IActivity extends Document {
    user: Types.ObjectId;
    type: ActivityType;
    title: string;
    description?: string;
    amount?: number;
    icon: string;
    color: string;
    relatedEntity?: {
        id: Types.ObjectId;
        type: string;
    };
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
export declare const getActivityTypeDefaults: (type: ActivityType) => {
    icon: string;
    color: string;
};
export declare const Activity: any;
