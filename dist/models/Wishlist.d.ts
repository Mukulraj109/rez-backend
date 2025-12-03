import mongoose, { Document, Types } from 'mongoose';
export interface IDiscountSnapshot {
    discountId: Types.ObjectId;
    name: string;
    description?: string;
    type: 'percentage' | 'fixed' | 'flat';
    value: number;
    minOrderValue?: number;
    maxDiscount?: number;
    validFrom?: Date;
    validUntil?: Date;
    storeId: Types.ObjectId;
    storeName?: string;
    productId?: Types.ObjectId;
    productName?: string;
    savedAt: Date;
}
export interface IWishlistItem {
    _id?: Types.ObjectId;
    itemType: 'Product' | 'Store' | 'Video' | 'Discount';
    itemId: Types.ObjectId;
    addedAt: Date;
    priority: 'low' | 'medium' | 'high';
    notes?: string;
    priceWhenAdded?: number;
    notifyOnPriceChange: boolean;
    notifyOnAvailability: boolean;
    targetPrice?: number;
    tags: string[];
    discountSnapshot?: IDiscountSnapshot;
}
export interface IWishlistSharing {
    isPublic: boolean;
    shareCode?: string;
    sharedWith: Types.ObjectId[];
    allowCopying: boolean;
    allowComments: boolean;
    sharedAt?: Date;
}
export interface IWishlistAnalytics {
    totalViews: number;
    totalShares: number;
    conversionRate: number;
    avgTimeToConversion: number;
    popularCategories: {
        [category: string]: number;
    };
    priceRangeAnalysis: {
        min: number;
        max: number;
        avg: number;
        median: number;
    };
    monthlyStats: {
        month: number;
        year: number;
        itemsAdded: number;
        itemsPurchased: number;
        itemsRemoved: number;
    }[];
}
export interface IWishlist extends Document {
    user: Types.ObjectId;
    name: string;
    description?: string;
    items: IWishlistItem[];
    category: 'personal' | 'gift' | 'business' | 'event' | 'custom';
    isDefault: boolean;
    isPublic: boolean;
    sharing: IWishlistSharing;
    analytics: IWishlistAnalytics;
    totalValue: number;
    availableItems: number;
    priceChangeAlerts: boolean;
    stockAlerts: boolean;
    createdAt: Date;
    updatedAt: Date;
    addItem(itemType: string, itemId: string, options?: any): Promise<void>;
    removeItem(itemType: string, itemId: string): Promise<void>;
    updateItem(itemType: string, itemId: string, updates: any): Promise<void>;
    calculateTotalValue(): Promise<number>;
    generateShareCode(): string;
    moveItem(itemId: string, targetWishlistId: string): Promise<void>;
    getItemsByCategory(): Promise<any>;
    checkPriceChanges(): Promise<void>;
    getRecommendations(): Promise<any[]>;
}
export declare const Wishlist: mongoose.Model<IWishlist, {}, {}, {}, mongoose.Document<unknown, {}, IWishlist, {}, {}> & IWishlist & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
