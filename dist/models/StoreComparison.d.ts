import mongoose, { Document, Model } from 'mongoose';
export interface IStoreComparison extends Document {
    _id: string;
    user: mongoose.Types.ObjectId;
    stores: mongoose.Types.ObjectId[];
    name?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface IStoreComparisonModel extends Model<IStoreComparison> {
    getUserComparisons(userId: string, page?: number, limit?: number): Promise<{
        comparisons: any[];
        pagination: {
            currentPage: number;
            totalPages: number;
            totalComparisons: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    findComparisonByStores(userId: string, storeIds: string[]): Promise<IStoreComparison | null>;
    getComparisonStats(userId: string): Promise<{
        totalComparisons: number;
        averageStoresPerComparison: number;
        mostComparedStore: any;
    }>;
}
export declare const StoreComparison: IStoreComparisonModel;
export default StoreComparison;
