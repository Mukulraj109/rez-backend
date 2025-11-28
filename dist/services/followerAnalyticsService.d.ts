import mongoose from 'mongoose';
/**
 * Record daily analytics snapshot for a store
 * Should be called daily via cron job
 */
export declare function recordDailySnapshot(storeId: string | mongoose.Types.ObjectId): Promise<void>;
/**
 * Record a new follow event
 */
export declare function recordNewFollow(storeId: string | mongoose.Types.ObjectId): Promise<void>;
/**
 * Record an unfollow event
 */
export declare function recordUnfollow(storeId: string | mongoose.Types.ObjectId): Promise<void>;
/**
 * Record click from a follower
 */
export declare function recordFollowerClick(storeId: string | mongoose.Types.ObjectId): Promise<void>;
/**
 * Record order from follower
 */
export declare function recordFollowerOrder(storeId: string | mongoose.Types.ObjectId, orderAmount: number): Promise<void>;
/**
 * Record exclusive offer view by follower
 */
export declare function recordExclusiveOfferView(storeId: string | mongoose.Types.ObjectId): Promise<void>;
/**
 * Record exclusive offer redemption by follower
 */
export declare function recordExclusiveOfferRedemption(storeId: string | mongoose.Types.ObjectId): Promise<void>;
/**
 * Get analytics for a date range
 */
export declare function getAnalytics(storeId: string | mongoose.Types.ObjectId, startDate: Date, endDate: Date): Promise<any[]>;
/**
 * Get growth metrics (weekly and monthly)
 */
export declare function getGrowthMetrics(storeId: string | mongoose.Types.ObjectId): Promise<any>;
/**
 * Get detailed analytics summary
 */
export declare function getDetailedAnalytics(storeId: string | mongoose.Types.ObjectId, startDate: Date, endDate: Date): Promise<any>;
/**
 * Get current follower count for a store
 */
export declare function getCurrentFollowerCount(storeId: string | mongoose.Types.ObjectId): Promise<number>;
