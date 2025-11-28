import mongoose, { Document } from 'mongoose';
/**
 * Search History Interface
 * Tracks user search queries for personalization and analytics
 */
export interface ISearchHistory extends Document {
    user: mongoose.Types.ObjectId;
    query: string;
    type: 'product' | 'store' | 'general';
    resultCount: number;
    clicked: boolean;
    filters?: {
        category?: string;
        minPrice?: number;
        maxPrice?: number;
        rating?: number;
        location?: string;
        tags?: string[];
    };
    clickedItem?: {
        id: mongoose.Types.ObjectId;
        type: 'product' | 'store';
    };
    createdAt: Date;
}
export declare const SearchHistory: mongoose.Model<ISearchHistory, {}, {}, {}, mongoose.Document<unknown, {}, ISearchHistory, {}, {}> & ISearchHistory & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
