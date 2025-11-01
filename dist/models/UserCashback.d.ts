import { Document, Types } from 'mongoose';
export interface ICashbackMetadata {
    orderAmount: number;
    productCategories: string[];
    storeId?: Types.ObjectId;
    storeName?: string;
    campaignId?: Types.ObjectId;
    campaignName?: string;
    bonusMultiplier?: number;
}
export interface IUserCashback extends Document {
    user: Types.ObjectId;
    order?: Types.ObjectId;
    amount: number;
    cashbackRate: number;
    source: 'order' | 'referral' | 'promotion' | 'special_offer' | 'bonus' | 'signup';
    status: 'pending' | 'credited' | 'expired' | 'cancelled';
    earnedDate: Date;
    creditedDate?: Date;
    expiryDate: Date;
    description: string;
    transaction?: Types.ObjectId;
    metadata: ICashbackMetadata;
    pendingDays: number;
    isRedeemed: boolean;
    redeemedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const UserCashback: any;
