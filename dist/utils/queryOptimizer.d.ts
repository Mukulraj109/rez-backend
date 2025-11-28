/**
 * Query Optimization Utilities
 *
 * Helper functions to optimize MongoDB queries
 */
import { Query, Document } from 'mongoose';
/**
 * Apply .lean() to query for read-only operations
 * This returns plain JavaScript objects instead of Mongoose documents
 * ~5-10x faster for read operations
 */
export declare function optimizeReadQuery<T extends Document>(query: Query<T[], T>): Query<any[], T>;
/**
 * Apply field projection to limit returned fields
 */
export declare function selectFields<T extends Document>(query: Query<T[], T>, fields: string[]): Query<T[], T>;
/**
 * Apply both lean and projection
 */
export declare function optimizeAndProject<T extends Document>(query: Query<T[], T>, fields?: string[]): Query<any[], T>;
/**
 * Add query hints for index usage
 */
export declare function hintIndex<T extends Document>(query: Query<T[], T>, indexSpec: any): Query<T[], T>;
/**
 * Example optimized queries
 */
export declare const queryExamples: {
    /**
     * Optimized product list query
     */
    getProducts: (ProductModel: any, merchantId: string, page?: number, limit?: number) => any;
    /**
     * Optimized order list query
     */
    getOrders: (OrderModel: any, merchantId: string, status?: string) => any;
    /**
     * Optimized aggregation for analytics
     */
    getAnalytics: (OrderModel: any, merchantId: string, startDate: Date, endDate: Date) => any;
};
/**
 * Query performance tips
 */
export declare const performanceTips: {
    DO: string[];
    DONT: string[];
};
