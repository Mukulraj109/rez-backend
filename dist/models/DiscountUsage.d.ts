import { Document, Types, Model } from 'mongoose';
export interface IDiscountUsage extends Document {
    _id: Types.ObjectId;
    discount: Types.ObjectId;
    user: Types.ObjectId;
    order: Types.ObjectId;
    discountAmount: number;
    orderValue: number;
    usedAt: Date;
    metadata: {
        discountCode?: string;
        discountType?: string;
        originalDiscountValue?: number;
    };
}
export interface IDiscountUsageModel extends Model<IDiscountUsage> {
    getUserHistory(userId: Types.ObjectId, limit?: number): Promise<any[]>;
    getDiscountAnalytics(discountId: Types.ObjectId): Promise<{
        totalUsed: number;
        totalDiscountAmount: number;
        totalOrderValue: number;
        uniqueUsersCount: number;
        avgDiscountAmount: number;
        avgOrderValue: number;
    }>;
}
declare const DiscountUsage: any;
export default DiscountUsage;
