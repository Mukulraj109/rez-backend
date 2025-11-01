import { Document, Types, Model } from 'mongoose';
export interface IStorePromoCoin extends Document {
    user: Types.ObjectId;
    store: Types.ObjectId;
    amount: number;
    earned: number;
    used: number;
    pending: number;
    transactions: Array<{
        type: 'earned' | 'used' | 'expired' | 'refunded';
        amount: number;
        orderId?: Types.ObjectId;
        description: string;
        date: Date;
    }>;
    lastEarnedAt?: Date;
    lastUsedAt?: Date;
    expiryDate?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface IStorePromoCoinModel extends Model<IStorePromoCoin> {
    getUserStoreCoins(userId: Types.ObjectId, storeId?: Types.ObjectId): Promise<IStorePromoCoin[]>;
    earnCoins(userId: Types.ObjectId, storeId: Types.ObjectId, amount: number, orderId: Types.ObjectId): Promise<IStorePromoCoin>;
    useCoins(userId: Types.ObjectId, storeId: Types.ObjectId, amount: number, orderId: Types.ObjectId): Promise<IStorePromoCoin>;
    getAvailableCoins(userId: Types.ObjectId, storeId: Types.ObjectId): Promise<number>;
}
export declare const StorePromoCoin: any;
