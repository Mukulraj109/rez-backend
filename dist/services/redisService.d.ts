/**
 * Redis Service
 *
 * Singleton service for Redis connection management and caching operations.
 * Provides graceful degradation if Redis is unavailable.
 */
/**
 * Redis Service Class
 * Manages Redis connection and provides caching methods
 */
declare class RedisService {
    private static instance;
    private client;
    private config;
    private isConnected;
    private isEnabled;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): RedisService;
    /**
     * Connect to Redis server
     */
    connect(): Promise<void>;
    /**
     * Disconnect from Redis server
     */
    disconnect(): Promise<void>;
    /**
     * Check if Redis is enabled and connected
     */
    isReady(): boolean;
    /**
     * Get a value from cache
     * @param key - Cache key
     * @returns Cached value or null
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set a value in cache
     * @param key - Cache key
     * @param value - Value to cache
     * @param ttl - Time to live in seconds (optional)
     */
    set<T>(key: string, value: T, ttl?: number): Promise<boolean>;
    /**
     * Delete a key from cache
     * @param key - Cache key
     */
    del(key: string): Promise<boolean>;
    /**
     * Delete multiple keys matching a pattern
     * @param pattern - Key pattern (e.g., "product:*")
     */
    delPattern(pattern: string): Promise<number>;
    /**
     * Flush all cache data
     */
    flush(): Promise<boolean>;
    /**
     * Get multiple values from cache
     * @param keys - Array of cache keys
     * @returns Object with key-value pairs
     */
    getMultiple<T>(keys: string[]): Promise<Record<string, T | null>>;
    /**
     * Set multiple key-value pairs
     * @param entries - Object with key-value pairs
     * @param ttl - Time to live in seconds (optional, applies to all)
     */
    setMultiple<T>(entries: Record<string, T>, ttl?: number): Promise<boolean>;
    /**
     * Check if a key exists in cache
     * @param key - Cache key
     */
    exists(key: string): Promise<boolean>;
    /**
     * Set expiration time for a key
     * @param key - Cache key
     * @param ttl - Time to live in seconds
     */
    expire(key: string, ttl: number): Promise<boolean>;
    /**
     * Increment a numeric value in cache
     * @param key - Cache key
     * @param amount - Amount to increment (default: 1)
     */
    incr(key: string, amount?: number): Promise<number | null>;
    /**
     * Decrement a numeric value in cache
     * @param key - Cache key
     * @param amount - Amount to decrement (default: 1)
     */
    decr(key: string, amount?: number): Promise<number | null>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<any>;
    /**
     * Get prefixed key
     * @param key - Original key
     * @returns Prefixed key
     */
    private getPrefixedKey;
    /**
     * Parse Redis INFO command output
     * @param info - INFO command output
     * @returns Parsed info object
     */
    private parseRedisInfo;
}
declare const redisService: RedisService;
export default redisService;
export declare const connect: () => Promise<void>, disconnect: () => Promise<void>, isReady: () => boolean, get: <T>(key: string) => Promise<T | null>, set: <T>(key: string, value: T, ttl?: number) => Promise<boolean>, del: (key: string) => Promise<boolean>, delPattern: (pattern: string) => Promise<number>, flush: () => Promise<boolean>, getMultiple: <T>(keys: string[]) => Promise<Record<string, T | null>>, setMultiple: <T>(entries: Record<string, T>, ttl?: number) => Promise<boolean>, exists: (key: string) => Promise<boolean>, expire: (key: string, ttl: number) => Promise<boolean>, incr: (key: string, amount?: number) => Promise<number | null>, decr: (key: string, amount?: number) => Promise<number | null>, getStats: () => Promise<any>;
