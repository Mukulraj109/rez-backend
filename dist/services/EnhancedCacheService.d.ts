/**
 * Enhanced Cache Service with Multi-Level Caching
 *
 * Implements a sophisticated caching strategy:
 * 1. Memory cache (L1) - Fastest, limited size
 * 2. Redis cache (L2) - Fast, distributed
 * 3. Database (L3) - Source of truth
 *
 * Features:
 * - Automatic cache invalidation
 * - Cache warming on startup
 * - Pattern-based invalidation
 * - Compression for large objects
 * - TTL management
 * - Hit/miss statistics
 */
interface CacheStats {
    memoryHits: number;
    memoryMisses: number;
    redisHits: number;
    redisMisses: number;
    databaseHits: number;
    totalRequests: number;
    hitRate: number;
    memorySize: number;
    redisConnected: boolean;
}
export declare class EnhancedCacheService {
    private static memoryCache;
    private static redisClient;
    private static stats;
    private static readonly MAX_MEMORY_ENTRIES;
    private static readonly COMPRESSION_THRESHOLD;
    private static cleanupInterval;
    /**
     * Initialize the enhanced cache service
     */
    static initialize(): Promise<void>;
    /**
     * Get value from cache (checks memory → Redis → database)
     */
    static get<T>(key: string): Promise<T | null>;
    /**
     * Set value in cache (stores in both memory and Redis)
     */
    static set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    /**
     * Get or compute value with caching
     */
    static getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T>;
    /**
     * Delete specific key from cache
     */
    static delete(key: string): Promise<void>;
    /**
     * Delete keys matching pattern
     */
    static deletePattern(pattern: string): Promise<number>;
    /**
     * Clear all cache
     */
    static clear(): Promise<void>;
    /**
     * Get cache statistics
     */
    static getStats(): CacheStats;
    /**
     * Warm up cache with frequently accessed data
     */
    private static warmUpCache;
    /**
     * Set value in memory cache with LRU eviction
     */
    private static setMemoryCache;
    /**
     * Evict least recently used entries
     */
    private static evictLRU;
    /**
     * Cleanup expired entries from memory cache
     */
    private static cleanupExpired;
    /**
     * Check if key matches pattern
     */
    private static matchesPattern;
    /**
     * Reset statistics
     */
    private static resetStats;
    /**
     * Shutdown cache service
     */
    static shutdown(): Promise<void>;
}
/**
 * Specialized cache helpers for different data types
 */
export declare class CacheHelpers {
    /**
     * Cache product data
     */
    static cacheProduct(merchantId: string, productId: string, data: any): Promise<void>;
    /**
     * Get cached product
     */
    static getCachedProduct(merchantId: string, productId: string): Promise<any>;
    /**
     * Invalidate product cache
     */
    static invalidateProduct(merchantId: string, productId?: string): Promise<void>;
    /**
     * Cache analytics data
     */
    static cacheAnalytics(merchantId: string, type: string, data: any): Promise<void>;
    /**
     * Invalidate merchant cache
     */
    static invalidateMerchant(merchantId: string): Promise<void>;
}
export {};
