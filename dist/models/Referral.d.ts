import { Document, Types } from 'mongoose';
export declare enum ReferralStatus {
    PENDING = "pending",// Referee signed up, no order yet
    REGISTERED = "registered",// Referee registered
    ACTIVE = "active",// Referee placed first order
    QUALIFIED = "qualified",// Met qualification criteria
    COMPLETED = "completed",// All rewards distributed
    EXPIRED = "expired"
}
export interface IReferralReward {
    referrerAmount: number;
    refereeDiscount: number;
    milestoneBonus?: number;
    voucherCode?: string;
    voucherType?: string;
    description?: string;
}
export interface IReferralMetadata {
    shareMethod?: string;
    sharedAt?: Date;
    signupSource?: string;
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
    refereeFirstOrder?: {
        orderId: Types.ObjectId;
        amount: number;
        completedAt: Date;
    };
    milestoneOrders?: {
        count: number;
        totalAmount: number;
        lastOrderAt?: Date;
    };
}
export interface IQualificationCriteria {
    minOrders: number;
    minSpend: number;
    timeframeDays: number;
}
export interface IReferral extends Document {
    referrer: Types.ObjectId;
    referee: Types.ObjectId;
    referralCode: string;
    status: ReferralStatus;
    tier: string;
    rewards: IReferralReward;
    referrerRewarded: boolean;
    refereeRewarded: boolean;
    milestoneRewarded: boolean;
    qualificationCriteria: IQualificationCriteria;
    completedAt?: Date;
    registeredAt?: Date;
    qualifiedAt?: Date;
    expiresAt: Date;
    metadata: IReferralMetadata;
    createdAt: Date;
    updatedAt: Date;
    isExpired(): boolean;
}
declare const Referral: any;
export default Referral;
