/**
 * Cache Helper Utility
 *
 * Provides helper functions for generating cache keys and managing cache invalidation
 */
/**
 * Cache key generators
 */
export declare const CacheKeys: {
    product: (id: string) => string;
    productList: (filters: string) => string;
    productsByCategory: (categorySlug: string, filters: string) => string;
    productsByStore: (storeId: string, filters: string) => string;
    productFeatured: (limit: number) => string;
    productNewArrivals: (limit: number) => string;
    productSearch: (query: string, filters: string) => string;
    productRecommendations: (productId: string, limit: number) => string;
    categoryList: () => string;
    category: (id: string) => string;
    categoryBySlug: (slug: string) => string;
    storeList: (filters: string) => string;
    store: (id: string) => string;
    storeProducts: (storeId: string) => string;
    cart: (userId: string) => string;
    cartSummary: (userId: string) => string;
    userProfile: (userId: string) => string;
    userOrders: (userId: string, filters: string) => string;
    userWishlist: (userId: string) => string;
    offerList: (filters: string) => string;
    offer: (id: string) => string;
    userOffers: (userId: string) => string;
    voucherList: (filters: string) => string;
    voucher: (id: string) => string;
    userVouchers: (userId: string) => string;
    stock: (productId: string) => string;
    stockByVariant: (productId: string, variantType: string, variantValue: string) => string;
};
/**
 * Cache invalidation helpers
 */
export declare class CacheInvalidator {
    /**
     * Invalidate all product-related cache
     */
    static invalidateProduct(productId: string): Promise<void>;
    /**
     * Invalidate product list caches
     */
    static invalidateProductLists(): Promise<void>;
    /**
     * Invalidate category-related cache
     */
    static invalidateCategory(categoryId: string, categorySlug?: string): Promise<void>;
    /**
     * Invalidate store-related cache
     */
    static invalidateStore(storeId: string): Promise<void>;
    /**
     * Invalidate cart cache for a user
     */
    static invalidateCart(userId: string): Promise<void>;
    /**
     * Invalidate stock cache for a product
     */
    static invalidateStock(productId: string): Promise<void>;
    /**
     * Update stock cache atomically
     */
    static updateStockCache(productId: string, newStock: number, ttl?: number): Promise<void>;
    /**
     * Update variant stock cache atomically
     */
    static updateVariantStockCache(productId: string, variantType: string, variantValue: string, newStock: number, ttl?: number): Promise<void>;
    /**
     * Invalidate user-related cache
     */
    static invalidateUser(userId: string): Promise<void>;
    /**
     * Invalidate offer cache
     */
    static invalidateOffer(offerId: string): Promise<void>;
    /**
     * Invalidate voucher cache
     */
    static invalidateVoucher(voucherId: string): Promise<void>;
}
/**
 * Generate cache key from query parameters
 */
export declare function generateQueryCacheKey(params: Record<string, any>): string;
/**
 * Wrap a function with caching
 */
export declare function withCache<T>(cacheKey: string, ttl: number, fetchFunction: () => Promise<T>): Promise<T>;
/**
 * Batch cache operations
 */
export declare class CacheBatch {
    private operations;
    /**
     * Add a cache operation to the batch
     */
    add(operation: () => Promise<any>): void;
    /**
     * Execute all operations in parallel
     */
    execute(): Promise<void>;
}
declare const _default: {
    CacheKeys: {
        product: (id: string) => string;
        productList: (filters: string) => string;
        productsByCategory: (categorySlug: string, filters: string) => string;
        productsByStore: (storeId: string, filters: string) => string;
        productFeatured: (limit: number) => string;
        productNewArrivals: (limit: number) => string;
        productSearch: (query: string, filters: string) => string;
        productRecommendations: (productId: string, limit: number) => string;
        categoryList: () => string;
        category: (id: string) => string;
        categoryBySlug: (slug: string) => string;
        storeList: (filters: string) => string;
        store: (id: string) => string;
        storeProducts: (storeId: string) => string;
        cart: (userId: string) => string;
        cartSummary: (userId: string) => string;
        userProfile: (userId: string) => string;
        userOrders: (userId: string, filters: string) => string;
        userWishlist: (userId: string) => string;
        offerList: (filters: string) => string;
        offer: (id: string) => string;
        userOffers: (userId: string) => string;
        voucherList: (filters: string) => string;
        voucher: (id: string) => string;
        userVouchers: (userId: string) => string;
        stock: (productId: string) => string;
        stockByVariant: (productId: string, variantType: string, variantValue: string) => string;
    };
    CacheInvalidator: typeof CacheInvalidator;
    generateQueryCacheKey: typeof generateQueryCacheKey;
    withCache: typeof withCache;
    CacheBatch: typeof CacheBatch;
};
export default _default;
