"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingCacheService = exports.MerchantCacheService = exports.CacheService = void 0;
class CacheService {
    // Initialize cache service
    static initialize(config) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval * 1000);
        console.log('💾 Cache service initialized');
    }
    // Get item from cache
    static get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.stats.misses++;
            return null;
        }
        // Check if expired
        if (entry.expiresAt < new Date()) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }
        // Update access info
        entry.accessCount++;
        entry.lastAccessed = new Date();
        this.stats.hits++;
        return entry.data;
    }
    // Set item in cache
    static set(key, data, ttlSeconds, tags = []) {
        const now = new Date();
        const ttl = ttlSeconds || this.config.defaultTTL;
        const expiresAt = new Date(now.getTime() + ttl * 1000);
        const entry = {
            data,
            timestamp: now,
            expiresAt,
            accessCount: 0,
            lastAccessed: now,
            tags
        };
        // Check if we need to evict entries
        if (this.cache.size >= this.config.maxEntries) {
            this.evictLRU();
        }
        this.cache.set(key, entry);
        this.stats.sets++;
    }
    // Delete item from cache
    static delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            this.stats.deletes++;
        }
        return deleted;
    }
    // Check if key exists in cache
    static has(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return false;
        // Check if expired
        if (entry.expiresAt < new Date()) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    // Clear entire cache
    static clear() {
        this.cache.clear();
        this.resetStats();
    }
    // Clear cache by tags
    static clearByTag(tag) {
        let cleared = 0;
        for (const [key, entry] of this.cache) {
            if (entry.tags.includes(tag)) {
                this.cache.delete(key);
                cleared++;
            }
        }
        return cleared;
    }
    // Get or set pattern (with callback for miss)
    static async getOrSet(key, factory, ttlSeconds, tags = []) {
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }
        const data = await factory();
        this.set(key, data, ttlSeconds, tags);
        return data;
    }
    // Batch get multiple keys
    static getBatch(keys) {
        const result = {};
        for (const key of keys) {
            result[key] = this.get(key);
        }
        return result;
    }
    // Batch set multiple key-value pairs
    static setBatch(items, ttlSeconds, tags = []) {
        for (const [key, data] of Object.entries(items)) {
            this.set(key, data, ttlSeconds, tags);
        }
    }
    // Update TTL for existing key
    static updateTTL(key, ttlSeconds) {
        const entry = this.cache.get(key);
        if (!entry)
            return false;
        entry.expiresAt = new Date(Date.now() + ttlSeconds * 1000);
        return true;
    }
    // Get cache statistics
    static getStats() {
        const entries = Array.from(this.cache.values());
        const totalEntries = entries.length;
        const totalRequests = this.stats.hits + this.stats.misses;
        const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
        let oldestEntry;
        let newestEntry;
        if (entries.length > 0) {
            oldestEntry = entries.reduce((oldest, entry) => entry.timestamp < oldest ? entry.timestamp : oldest, entries[0].timestamp);
            newestEntry = entries.reduce((newest, entry) => entry.timestamp > newest ? entry.timestamp : newest, entries[0].timestamp);
        }
        return {
            totalEntries,
            totalHits: this.stats.hits,
            totalMisses: this.stats.misses,
            hitRate: parseFloat(hitRate.toFixed(2)),
            memoryUsage: this.estimateMemoryUsage(),
            oldestEntry,
            newestEntry
        };
    }
    // Cleanup expired entries
    static cleanup() {
        const now = new Date();
        let cleaned = 0;
        for (const [key, entry] of this.cache) {
            if (entry.expiresAt < now) {
                this.cache.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
        }
    }
    // Evict least recently used entry
    static evictLRU() {
        let lruKey = null;
        let lruTime = new Date();
        for (const [key, entry] of this.cache) {
            if (entry.lastAccessed < lruTime) {
                lruTime = entry.lastAccessed;
                lruKey = key;
            }
        }
        if (lruKey) {
            this.cache.delete(lruKey);
            console.log(`🗑️ Cache eviction: removed LRU entry ${lruKey}`);
        }
    }
    // Estimate memory usage (rough calculation)
    static estimateMemoryUsage() {
        let bytes = 0;
        for (const [key, entry] of this.cache) {
            bytes += key.length * 2; // String chars are 2 bytes
            bytes += JSON.stringify(entry.data).length * 2;
            bytes += 200; // Rough estimate for entry metadata
        }
        return bytes;
    }
    // Reset statistics
    static resetStats() {
        this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
    }
    // Shutdown cache service
    static shutdown() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.clear();
        console.log('💾 Cache service shut down');
    }
}
exports.CacheService = CacheService;
CacheService.cache = new Map();
CacheService.stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
};
CacheService.cleanupInterval = null;
CacheService.config = {
    defaultTTL: 300, // 5 minutes
    maxEntries: 1000,
    cleanupInterval: 60, // 1 minute
    persistToDisk: false
};
// Specialized caching for different data types
class MerchantCacheService {
    // Cache dashboard metrics
    static async getDashboardMetrics(merchantId, factory) {
        const key = `${this.CACHE_PREFIXES.DASHBOARD_METRICS}${merchantId}`;
        return CacheService.getOrSet(key, factory, this.CACHE_TTL.DASHBOARD_METRICS, ['dashboard', 'metrics', merchantId]);
    }
    // Cache product list
    static async getProductList(merchantId, filters, factory) {
        const key = `${this.CACHE_PREFIXES.PRODUCT_LIST}${merchantId}:${this.hashFilters(filters)}`;
        return CacheService.getOrSet(key, factory, this.CACHE_TTL.PRODUCT_LIST, ['products', merchantId]);
    }
    // Cache order list
    static async getOrderList(merchantId, filters, factory) {
        const key = `${this.CACHE_PREFIXES.ORDER_LIST}${merchantId}:${this.hashFilters(filters)}`;
        return CacheService.getOrSet(key, factory, this.CACHE_TTL.ORDER_LIST, ['orders', merchantId]);
    }
    // Cache cashback list
    static async getCashbackList(merchantId, filters, factory) {
        const key = `${this.CACHE_PREFIXES.CASHBACK_LIST}${merchantId}:${this.hashFilters(filters)}`;
        return CacheService.getOrSet(key, factory, this.CACHE_TTL.CASHBACK_LIST, ['cashback', merchantId]);
    }
    // Cache merchant profile
    static async getMerchantProfile(merchantId, factory) {
        const key = `${this.CACHE_PREFIXES.MERCHANT_PROFILE}${merchantId}`;
        return CacheService.getOrSet(key, factory, this.CACHE_TTL.MERCHANT_PROFILE, ['merchant', merchantId]);
    }
    // Cache business metrics
    static async getBusinessMetrics(merchantId, factory) {
        const key = `${this.CACHE_PREFIXES.BUSINESS_METRICS}${merchantId}`;
        return CacheService.getOrSet(key, factory, this.CACHE_TTL.BUSINESS_METRICS, ['metrics', merchantId]);
    }
    // Cache time series data
    static async getTimeSeriesData(merchantId, days, factory) {
        const key = `${this.CACHE_PREFIXES.TIME_SERIES}${merchantId}:${days}`;
        return CacheService.getOrSet(key, factory, this.CACHE_TTL.TIME_SERIES, ['timeseries', merchantId]);
    }
    // Cache category performance
    static async getCategoryPerformance(merchantId, factory) {
        const key = `${this.CACHE_PREFIXES.CATEGORY_PERFORMANCE}${merchantId}`;
        return CacheService.getOrSet(key, factory, this.CACHE_TTL.CATEGORY_PERFORMANCE, ['categories', merchantId]);
    }
    // Cache customer insights
    static async getCustomerInsights(merchantId, factory) {
        const key = `${this.CACHE_PREFIXES.CUSTOMER_INSIGHTS}${merchantId}`;
        return CacheService.getOrSet(key, factory, this.CACHE_TTL.CUSTOMER_INSIGHTS, ['customers', merchantId]);
    }
    // Invalidate cache for merchant
    static invalidateMerchantCache(merchantId) {
        CacheService.clearByTag(merchantId);
    }
    // Invalidate specific data type for merchant
    static invalidateDataType(merchantId, dataType) {
        CacheService.clearByTag(dataType);
        if (dataType === 'products' || dataType === 'orders' || dataType === 'cashback') {
            // Also invalidate related metrics
            CacheService.clearByTag('metrics');
            CacheService.clearByTag('dashboard');
        }
    }
    // Hash filters for consistent cache keys
    static hashFilters(filters) {
        // Simple hash function for cache key consistency
        let hash = 0;
        for (let i = 0; i < filters.length; i++) {
            const char = filters.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
}
exports.MerchantCacheService = MerchantCacheService;
MerchantCacheService.CACHE_PREFIXES = {
    DASHBOARD_METRICS: 'dashboard_metrics:',
    PRODUCT_LIST: 'product_list:',
    ORDER_LIST: 'order_list:',
    CASHBACK_LIST: 'cashback_list:',
    MERCHANT_PROFILE: 'merchant_profile:',
    BUSINESS_METRICS: 'business_metrics:',
    TIME_SERIES: 'time_series:',
    CATEGORY_PERFORMANCE: 'category_performance:',
    CUSTOMER_INSIGHTS: 'customer_insights:'
};
MerchantCacheService.CACHE_TTL = {
    DASHBOARD_METRICS: 300, // 5 minutes
    PRODUCT_LIST: 600, // 10 minutes
    ORDER_LIST: 180, // 3 minutes
    CASHBACK_LIST: 300, // 5 minutes
    MERCHANT_PROFILE: 1800, // 30 minutes
    BUSINESS_METRICS: 600, // 10 minutes
    TIME_SERIES: 900, // 15 minutes
    CATEGORY_PERFORMANCE: 1800, // 30 minutes
    CUSTOMER_INSIGHTS: 1200 // 20 minutes
};
// Memory-efficient cache for large datasets
class StreamingCacheService {
    // Cache large dataset in chunks
    static setChunkedData(key, data, ttlSeconds) {
        const chunks = new Map();
        for (let i = 0; i < data.length; i += this.CHUNK_SIZE) {
            const chunk = data.slice(i, i + this.CHUNK_SIZE);
            const chunkIndex = Math.floor(i / this.CHUNK_SIZE);
            chunks.set(chunkIndex, chunk);
            const chunkKey = `${key}:chunk:${chunkIndex}`;
            CacheService.set(chunkKey, chunk, ttlSeconds, ['chunked', key]);
        }
        this.chunkedCache.set(key, chunks);
        // Store metadata
        const metaKey = `${key}:meta`;
        CacheService.set(metaKey, {
            totalItems: data.length,
            totalChunks: chunks.size,
            chunkSize: this.CHUNK_SIZE
        }, ttlSeconds, ['chunked', key]);
    }
    // Get chunked data with pagination
    static getChunkedData(key, page = 1, pageSize = this.CHUNK_SIZE) {
        const metaKey = `${key}:meta`;
        const meta = CacheService.get(metaKey);
        if (!meta)
            return null;
        const startChunk = Math.floor((page - 1) * pageSize / this.CHUNK_SIZE);
        const endChunk = Math.floor((page * pageSize - 1) / this.CHUNK_SIZE);
        let result = [];
        for (let chunkIndex = startChunk; chunkIndex <= endChunk; chunkIndex++) {
            const chunkKey = `${key}:chunk:${chunkIndex}`;
            const chunk = CacheService.get(chunkKey);
            if (chunk) {
                result = result.concat(chunk);
            }
        }
        // Trim to exact page size
        const startIndex = (page - 1) * pageSize % this.CHUNK_SIZE;
        const endIndex = startIndex + pageSize;
        return result.slice(startIndex, Math.min(endIndex, result.length));
    }
    // Clear chunked data
    static clearChunkedData(key) {
        CacheService.clearByTag(key);
        this.chunkedCache.delete(key);
    }
}
exports.StreamingCacheService = StreamingCacheService;
StreamingCacheService.CHUNK_SIZE = 100;
StreamingCacheService.chunkedCache = new Map();
