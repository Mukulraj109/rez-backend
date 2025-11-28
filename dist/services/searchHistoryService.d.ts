import mongoose from 'mongoose';
/**
 * Search History Service
 * Provides async logging of search queries without blocking API responses
 */
interface LogSearchParams {
    userId: mongoose.Types.ObjectId;
    query: string;
    type: 'product' | 'store' | 'general';
    resultCount: number;
    filters?: {
        category?: string;
        minPrice?: number;
        maxPrice?: number;
        rating?: number;
        location?: string;
        tags?: string[];
    };
}
/**
 * Log search query asynchronously
 * This function doesn't block - it fires and forgets
 */
export declare const logSearch: (params: LogSearchParams) => Promise<void>;
/**
 * Log search for products
 * Convenience wrapper for product searches
 */
export declare const logProductSearch: (userId: mongoose.Types.ObjectId, query: string, resultCount: number, filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
}) => Promise<void>;
/**
 * Log search for stores
 * Convenience wrapper for store searches
 */
export declare const logStoreSearch: (userId: mongoose.Types.ObjectId, query: string, resultCount: number, filters?: {
    category?: string;
    location?: string;
    rating?: number;
    tags?: string[];
}) => Promise<void>;
/**
 * Log general search
 * For global/multi-type searches
 */
export declare const logGeneralSearch: (userId: mongoose.Types.ObjectId, query: string, resultCount: number) => Promise<void>;
/**
 * Get user's search suggestions for autocomplete
 * Returns recent and popular searches combined
 */
export declare const getSearchSuggestions: (userId: mongoose.Types.ObjectId, type?: "product" | "store" | "general", limit?: number) => Promise<any[]>;
/**
 * Clean up old search history entries
 * Should be run as a cron job
 */
export declare const cleanupOldSearches: (daysToKeep?: number) => Promise<number>;
declare const _default: {
    logSearch: (params: LogSearchParams) => Promise<void>;
    logProductSearch: (userId: mongoose.Types.ObjectId, query: string, resultCount: number, filters?: {
        category?: string;
        minPrice?: number;
        maxPrice?: number;
        rating?: number;
    }) => Promise<void>;
    logStoreSearch: (userId: mongoose.Types.ObjectId, query: string, resultCount: number, filters?: {
        category?: string;
        location?: string;
        rating?: number;
        tags?: string[];
    }) => Promise<void>;
    logGeneralSearch: (userId: mongoose.Types.ObjectId, query: string, resultCount: number) => Promise<void>;
    getSearchSuggestions: (userId: mongoose.Types.ObjectId, type?: "product" | "store" | "general", limit?: number) => Promise<any[]>;
    cleanupOldSearches: (daysToKeep?: number) => Promise<number>;
};
export default _default;
