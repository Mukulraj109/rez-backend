import mongoose, { Document, Types } from 'mongoose';
export interface IProductAnalytics extends Document {
    product: Types.ObjectId;
    user?: Types.ObjectId;
    views: {
        total: number;
        unique: number;
        lastViewed: Date;
    };
    purchases: {
        total: number;
        revenue: number;
        avgOrderValue: number;
    };
    cartAdditions: number;
    cartRemovals: number;
    wishlistAdds: number;
    shares: number;
    reviews: number;
    conversionRate: number;
    bounceRate: number;
    avgTimeOnPage: number;
    relatedProductClicks: number;
    searchAppearances: number;
    searchClicks: number;
    searchPosition: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ProductAnalytics: mongoose.Model<any, {}, {}, {}, any, any>;
