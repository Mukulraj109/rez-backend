"use strict";
/**
 * Redis Configuration
 *
 * Configuration settings for Redis connection and caching
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheTTL = exports.getRedisConfig = void 0;
/**
 * Get Redis configuration from environment variables
 */
const getRedisConfig = () => {
    return {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
        enabled: process.env.CACHE_ENABLED !== 'false', // Default to true
        maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
        retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000', 10),
        connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'rez:',
    };
};
exports.getRedisConfig = getRedisConfig;
/**
 * Cache TTL (Time To Live) constants in seconds
 */
exports.CacheTTL = {
    // Product caching
    PRODUCT_DETAIL: 60 * 60, // 1 hour
    PRODUCT_LIST: 30 * 60, // 30 minutes
    PRODUCT_SEARCH: 15 * 60, // 15 minutes
    PRODUCT_FEATURED: 60 * 60, // 1 hour
    PRODUCT_NEW_ARRIVALS: 30 * 60, // 30 minutes
    PRODUCT_RECOMMENDATIONS: 30 * 60, // 30 minutes
    // Category caching
    CATEGORY_LIST: 60 * 60, // 1 hour
    CATEGORY_DETAIL: 60 * 60, // 1 hour
    // Store caching
    STORE_LIST: 30 * 60, // 30 minutes
    STORE_DETAIL: 60 * 60, // 1 hour
    STORE_PRODUCTS: 30 * 60, // 30 minutes
    // Cart caching
    CART_DATA: 5 * 60, // 5 minutes
    CART_SUMMARY: 3 * 60, // 3 minutes
    // User caching
    USER_PROFILE: 30 * 60, // 30 minutes
    USER_ORDERS: 10 * 60, // 10 minutes
    // Offers and vouchers
    OFFER_LIST: 30 * 60, // 30 minutes
    VOUCHER_LIST: 30 * 60, // 30 minutes
    // Static data
    STATIC_DATA: 60 * 60 * 24, // 24 hours
    // Very short-lived cache
    SHORT_CACHE: 60, // 1 minute
};
exports.default = {
    getRedisConfig: exports.getRedisConfig,
    CacheTTL: exports.CacheTTL,
};
