import mongoose, { Document, Model } from 'mongoose';
export interface IStoreAnalytics extends Document {
    _id: string;
    store: mongoose.Types.ObjectId;
    user?: mongoose.Types.ObjectId;
    eventType: 'view' | 'search' | 'favorite' | 'unfavorite' | 'compare' | 'review' | 'click' | 'share';
    eventData?: {
        searchQuery?: string;
        category?: string;
        source?: string;
        referrer?: string;
        userAgent?: string;
        location?: {
            coordinates: [number, number];
            address?: string;
        };
        metadata?: any;
    };
    timestamp: Date;
    sessionId?: string;
    ipAddress?: string;
    createdAt: Date;
}
export interface IStoreAnalyticsModel extends Model<IStoreAnalytics> {
    trackEvent(data: {
        storeId: string;
        userId?: string;
        eventType: 'view' | 'search' | 'favorite' | 'unfavorite' | 'compare' | 'review' | 'click' | 'share';
        eventData?: any;
        sessionId?: string;
        ipAddress?: string;
    }): Promise<IStoreAnalytics>;
    getStoreAnalytics(storeId: string, options?: {
        startDate?: Date;
        endDate?: Date;
        eventType?: string;
        groupBy?: 'hour' | 'day' | 'week' | 'month';
    }): Promise<any[]>;
    getPopularStores(options?: {
        startDate?: Date;
        endDate?: Date;
        eventType?: string;
        limit?: number;
    }): Promise<any[]>;
    getUserAnalytics(userId: string, options?: {
        startDate?: Date;
        endDate?: Date;
        eventType?: string;
    }): Promise<any[]>;
}
export declare const StoreAnalytics: any;
export default StoreAnalytics;
