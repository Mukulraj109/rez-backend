import { Document, Types, Model } from 'mongoose';
export interface IDiscount extends Document {
    _id: Types.ObjectId;
    code?: string;
    name: string;
    description?: string;
    type: 'percentage' | 'fixed';
    value: number;
    minOrderValue: number;
    maxDiscountAmount?: number;
    applicableOn: 'bill_payment' | 'all' | 'specific_products' | 'specific_categories';
    applicableProducts?: Types.ObjectId[];
    applicableCategories?: Types.ObjectId[];
    validFrom: Date;
    validUntil: Date;
    usageLimit?: number;
    usageLimitPerUser?: number;
    usedCount: number;
    isActive: boolean;
    priority: number;
    restrictions: {
        minItemCount?: number;
        maxItemCount?: number;
        newUsersOnly?: boolean;
        excludedProducts?: Types.ObjectId[];
        excludedCategories?: Types.ObjectId[];
        isOfflineOnly?: boolean;
        notValidAboveStoreDiscount?: boolean;
        singleVoucherPerBill?: boolean;
    };
    metadata: {
        displayText?: string;
        icon?: string;
        backgroundColor?: string;
    };
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    calculateDiscount(orderValue: number): number;
    canUserUse(userId: Types.ObjectId): Promise<{
        can: boolean;
        reason?: string;
    }>;
}
export interface IDiscountModel extends Model<IDiscount> {
    findAvailableForUser(userId: Types.ObjectId, orderValue: number, productIds?: Types.ObjectId[], categoryIds?: Types.ObjectId[]): Promise<IDiscount[]>;
}
declare const Discount: any;
export default Discount;
