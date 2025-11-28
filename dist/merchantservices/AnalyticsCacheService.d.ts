/**
 * Analytics Cache Service
 *
 * Provides Redis-based caching layer for analytics queries.
 * Falls back gracefully if Redis is unavailable.
 */
export interface CacheOptions {
    ttl?: number;
    prefix?: string;
}
export declare class AnalyticsCacheService {
    private static readonly DEFAULT_TTL;
    private static readonly DEFAULT_PREFIX;
    /**
     * Get cached value or compute it if not in cache
     */
    static getOrCompute<T>(key: string, computeFn: () => Promise<T>, options?: CacheOptions): Promise<T>;
    /**
     * Get a cached value
     */
    static get<T>(key: string, options?: CacheOptions): Promise<T | null>;
    /**
     * Set a cached value
     */
    static set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean>;
    /**
     * Invalidate cache by key
     */
    static invalidate(key: string, options?: CacheOptions): Promise<boolean>;
    /**
     * Invalidate all cache keys matching a pattern
     */
    static invalidatePattern(pattern: string, options?: CacheOptions): Promise<number>;
    /**
     * Invalidate all analytics cache for a specific store
     */
    static invalidateStore(storeId: string): Promise<number>;
    /**
     * Get cache statistics
     */
    static getStats(): Promise<any>;
    /**
     * Clear all analytics cache
     */
    static clearAll(): Promise<boolean>;
    /**
     * Generate cache key for sales overview
     */
    static getSalesOverviewKey(storeId: string, startDate: Date, endDate: Date): string;
    /**
     * Generate cache key for revenue trends
     */
    static getRevenueTrendsKey(storeId: string, period: string, days: number): string;
    /**
     * Generate cache key for top products
     */
    static getTopProductsKey(storeId: string, limit: number, sortBy: string): string;
    /**
     * Generate cache key for category performance
     */
    static getCategoryPerformanceKey(storeId: string): string;
    /**
     * Generate cache key for customer insights
     */
    static getCustomerInsightsKey(storeId: string): string;
    /**
     * Generate cache key for inventory status
     */
    static getInventoryStatusKey(storeId: string): string;
    /**
     * Generate cache key for sales forecast
     */
    static getSalesForecastKey(storeId: string, days: number): string;
    /**
     * Generate cache key for stockout prediction
     */
    static getStockoutPredictionKey(productId: string): string;
    /**
     * Generate cache key for seasonal trends
     */
    static getSeasonalTrendsKey(storeId: string, type: string): string;
    /**
     * Generate cache key for demand forecast
     */
    static getDemandForecastKey(productId: string): string;
    /**
     * Check if cache is available
     */
    static isAvailable(): boolean;
    /**
     * Warm up cache for a store (pre-compute common queries)
     */
    static warmUpCache(storeId: string): Promise<void>;
    /**
     * Auto-refresh cache on new order
     */
    static onNewOrder(storeId: string): Promise<void>;
    /**
     * Auto-refresh cache on product update
     */
    static onProductUpdate(productId: string, storeId: string): Promise<void>;
}
