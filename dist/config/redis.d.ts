/**
 * Redis Configuration
 *
 * Configuration settings for Redis connection and caching
 */
export interface RedisConfig {
    url: string;
    password?: string;
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
    connectTimeout: number;
    keyPrefix: string;
}
/**
 * Get Redis configuration from environment variables
 */
export declare const getRedisConfig: () => RedisConfig;
/**
 * Cache TTL (Time To Live) constants in seconds
 */
export declare const CacheTTL: {
    readonly PRODUCT_DETAIL: number;
    readonly PRODUCT_LIST: number;
    readonly PRODUCT_SEARCH: number;
    readonly PRODUCT_FEATURED: number;
    readonly PRODUCT_NEW_ARRIVALS: number;
    readonly PRODUCT_RECOMMENDATIONS: number;
    readonly CATEGORY_LIST: number;
    readonly CATEGORY_DETAIL: number;
    readonly STORE_LIST: number;
    readonly STORE_DETAIL: number;
    readonly STORE_PRODUCTS: number;
    readonly CART_DATA: number;
    readonly CART_SUMMARY: number;
    readonly USER_PROFILE: number;
    readonly USER_ORDERS: number;
    readonly OFFER_LIST: number;
    readonly VOUCHER_LIST: number;
    readonly STATIC_DATA: number;
    readonly SHORT_CACHE: 60;
};
declare const _default: {
    getRedisConfig: () => RedisConfig;
    CacheTTL: {
        readonly PRODUCT_DETAIL: number;
        readonly PRODUCT_LIST: number;
        readonly PRODUCT_SEARCH: number;
        readonly PRODUCT_FEATURED: number;
        readonly PRODUCT_NEW_ARRIVALS: number;
        readonly PRODUCT_RECOMMENDATIONS: number;
        readonly CATEGORY_LIST: number;
        readonly CATEGORY_DETAIL: number;
        readonly STORE_LIST: number;
        readonly STORE_DETAIL: number;
        readonly STORE_PRODUCTS: number;
        readonly CART_DATA: number;
        readonly CART_SUMMARY: number;
        readonly USER_PROFILE: number;
        readonly USER_ORDERS: number;
        readonly OFFER_LIST: number;
        readonly VOUCHER_LIST: number;
        readonly STATIC_DATA: number;
        readonly SHORT_CACHE: 60;
    };
};
export default _default;
