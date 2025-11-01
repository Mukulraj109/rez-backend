import { Document, Types, Model } from 'mongoose';
export interface IStoreVoucher extends Document {
    _id: Types.ObjectId;
    code: string;
    store: Types.ObjectId;
    name: string;
    description?: string;
    type: 'store_visit' | 'first_purchase' | 'referral' | 'promotional';
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minBillAmount: number;
    maxDiscountAmount?: number;
    validFrom: Date;
    validUntil: Date;
    restrictions: {
        isOfflineOnly: boolean;
        notValidAboveStoreDiscount: boolean;
        singleVoucherPerBill: boolean;
        minItemCount?: number;
        maxItemCount?: number;
        excludedProducts?: Types.ObjectId[];
    };
    usageLimit: number;
    usedCount: number;
    usageLimitPerUser?: number;
    isActive: boolean;
    metadata: {
        displayText?: string;
        badgeText?: string;
        backgroundColor?: string;
    };
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    calculateDiscount(billAmount: number): number;
    canUserRedeem(userId: Types.ObjectId): Promise<{
        can: boolean;
        reason?: string;
    }>;
}
export interface IStoreVoucherModel extends Model<IStoreVoucher> {
    generateUniqueCode(prefix?: string): Promise<string>;
    findAvailableForStore(storeId: Types.ObjectId, userId?: Types.ObjectId): Promise<IStoreVoucher[]>;
}
declare const StoreVoucher: any;
export default StoreVoucher;
