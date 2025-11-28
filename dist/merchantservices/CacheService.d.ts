export interface CacheEntry<T> {
    data: T;
    timestamp: Date;
    expiresAt: Date;
    accessCount: number;
    lastAccessed: Date;
    tags: string[];
}
export interface CacheConfig {
    defaultTTL: number;
    maxEntries: number;
    cleanupInterval: number;
    persistToDisk: boolean;
}
export interface CacheStats {
    totalEntries: number;
    totalHits: number;
    totalMisses: number;
    hitRate: number;
    memoryUsage: number;
    oldestEntry?: Date;
    newestEntry?: Date;
}
export declare class CacheService {
    private static cache;
    private static stats;
    private static cleanupInterval;
    private static config;
    static initialize(config?: Partial<CacheConfig>): void;
    static get<T>(key: string): T | null;
    static set<T>(key: string, data: T, ttlSeconds?: number, tags?: string[]): void;
    static delete(key: string): boolean;
    static has(key: string): boolean;
    static clear(): void;
    static clearByTag(tag: string): number;
    static getOrSet<T>(key: string, factory: () => Promise<T> | T, ttlSeconds?: number, tags?: string[]): Promise<T>;
    static getBatch<T>(keys: string[]): Record<string, T | null>;
    static setBatch<T>(items: Record<string, T>, ttlSeconds?: number, tags?: string[]): void;
    static updateTTL(key: string, ttlSeconds: number): boolean;
    static getStats(): CacheStats;
    private static cleanup;
    private static evictLRU;
    private static estimateMemoryUsage;
    private static resetStats;
    static shutdown(): void;
}
export declare class MerchantCacheService {
    private static readonly CACHE_PREFIXES;
    private static readonly CACHE_TTL;
    static getDashboardMetrics(merchantId: string, factory: () => Promise<any>): Promise<any>;
    static getProductList(merchantId: string, filters: string, factory: () => Promise<any>): Promise<any>;
    static getOrderList(merchantId: string, filters: string, factory: () => Promise<any>): Promise<any>;
    static getCashbackList(merchantId: string, filters: string, factory: () => Promise<any>): Promise<any>;
    static getMerchantProfile(merchantId: string, factory: () => Promise<any>): Promise<any>;
    static getBusinessMetrics(merchantId: string, factory: () => Promise<any>): Promise<any>;
    static getTimeSeriesData(merchantId: string, days: number, factory: () => Promise<any>): Promise<any>;
    static getCategoryPerformance(merchantId: string, factory: () => Promise<any>): Promise<any>;
    static getCustomerInsights(merchantId: string, factory: () => Promise<any>): Promise<any>;
    static invalidateMerchantCache(merchantId: string): void;
    static invalidateDataType(merchantId: string, dataType: 'products' | 'orders' | 'cashback' | 'metrics' | 'merchant'): void;
    private static hashFilters;
}
export declare class StreamingCacheService {
    private static readonly CHUNK_SIZE;
    private static chunkedCache;
    static setChunkedData<T>(key: string, data: T[], ttlSeconds?: number): void;
    static getChunkedData<T>(key: string, page?: number, pageSize?: number): T[] | null;
    static clearChunkedData(key: string): void;
}
