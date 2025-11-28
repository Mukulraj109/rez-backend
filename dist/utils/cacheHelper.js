"use strict";
/**
 * Cache Helper Utility
 *
 * Provides helper functions for generating cache keys and managing cache invalidation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheBatch = exports.CacheInvalidator = exports.CacheKeys = void 0;
exports.generateQueryCacheKey = generateQueryCacheKey;
exports.withCache = withCache;
const redisService_1 = __importDefault(require("../services/redisService"));
const redis_1 = require("../config/redis");
/**
 * Cache key generators
 */
exports.CacheKeys = {
    // Product keys
    product: (id) => `product:${id}`,
    productList: (filters) => `product:list:${filters}`,
    productsByCategory: (categorySlug, filters) => `product:category:${categorySlug}:${filters}`,
    productsByStore: (storeId, filters) => `product:store:${storeId}:${filters}`,
    productFeatured: (limit) => `product:featured:${limit}`,
    productNewArrivals: (limit) => `product:new-arrivals:${limit}`,
    productSearch: (query, filters) => `product:search:${query}:${filters}`,
    productRecommendations: (productId, limit) => `product:recommendations:${productId}:${limit}`,
    // Category keys
    categoryList: () => `category:list`,
    category: (id) => `category:${id}`,
    categoryBySlug: (slug) => `category:slug:${slug}`,
    // Store keys
    storeList: (filters) => `store:list:${filters}`,
    store: (id) => `store:${id}`,
    storeProducts: (storeId) => `store:${storeId}:products`,
    // Cart keys
    cart: (userId) => `cart:user:${userId}`,
    cartSummary: (userId) => `cart:summary:${userId}`,
    // User keys
    userProfile: (userId) => `user:${userId}:profile`,
    userOrders: (userId, filters) => `user:${userId}:orders:${filters}`,
    userWishlist: (userId) => `user:${userId}:wishlist`,
    // Offer keys
    offerList: (filters) => `offer:list:${filters}`,
    offer: (id) => `offer:${id}`,
    userOffers: (userId) => `offer:user:${userId}`,
    // Voucher keys
    voucherList: (filters) => `voucher:list:${filters}`,
    voucher: (id) => `voucher:${id}`,
    userVouchers: (userId) => `voucher:user:${userId}`,
    // Stock keys
    stock: (productId) => `stock:${productId}`,
    stockByVariant: (productId, variantType, variantValue) => `stock:${productId}:variant:${variantType}:${variantValue}`,
};
/**
 * Cache invalidation helpers
 */
class CacheInvalidator {
    /**
     * Invalidate all product-related cache
     */
    static async invalidateProduct(productId) {
        console.log(`🗑️ Invalidating cache for product: ${productId}`);
        await Promise.all([
            // Delete specific product cache
            redisService_1.default.del(exports.CacheKeys.product(productId)),
            // Delete product list caches (with different filters)
            redisService_1.default.delPattern('product:list:*'),
            // Delete featured and new arrivals (as they might include this product)
            redisService_1.default.delPattern('product:featured:*'),
            redisService_1.default.delPattern('product:new-arrivals:*'),
            // Delete search results (as they might include this product)
            redisService_1.default.delPattern('product:search:*'),
            // Delete recommendations
            redisService_1.default.delPattern(`product:recommendations:${productId}:*`),
            // Delete stock cache
            redisService_1.default.del(exports.CacheKeys.stock(productId)),
            redisService_1.default.delPattern(`stock:${productId}:variant:*`),
        ]);
    }
    /**
     * Invalidate product list caches
     */
    static async invalidateProductLists() {
        console.log('🗑️ Invalidating all product list caches');
        await Promise.all([
            redisService_1.default.delPattern('product:list:*'),
            redisService_1.default.delPattern('product:featured:*'),
            redisService_1.default.delPattern('product:new-arrivals:*'),
            redisService_1.default.delPattern('product:search:*'),
        ]);
    }
    /**
     * Invalidate category-related cache
     */
    static async invalidateCategory(categoryId, categorySlug) {
        console.log(`🗑️ Invalidating cache for category: ${categoryId}`);
        await Promise.all([
            redisService_1.default.del(exports.CacheKeys.category(categoryId)),
            categorySlug ? redisService_1.default.del(exports.CacheKeys.categoryBySlug(categorySlug)) : Promise.resolve(),
            redisService_1.default.del(exports.CacheKeys.categoryList()),
            redisService_1.default.delPattern(`product:category:*`),
        ]);
    }
    /**
     * Invalidate store-related cache
     */
    static async invalidateStore(storeId) {
        console.log(`🗑️ Invalidating cache for store: ${storeId}`);
        await Promise.all([
            redisService_1.default.del(exports.CacheKeys.store(storeId)),
            redisService_1.default.del(exports.CacheKeys.storeProducts(storeId)),
            redisService_1.default.delPattern(`product:store:${storeId}:*`),
            redisService_1.default.delPattern('store:list:*'),
        ]);
    }
    /**
     * Invalidate cart cache for a user
     */
    static async invalidateCart(userId) {
        console.log(`🗑️ Invalidating cache for user cart: ${userId}`);
        await Promise.all([
            redisService_1.default.del(exports.CacheKeys.cart(userId)),
            redisService_1.default.del(exports.CacheKeys.cartSummary(userId)),
        ]);
    }
    /**
     * Invalidate stock cache for a product
     */
    static async invalidateStock(productId) {
        console.log(`🗑️ Invalidating stock cache for product: ${productId}`);
        await Promise.all([
            redisService_1.default.del(exports.CacheKeys.stock(productId)),
            redisService_1.default.delPattern(`stock:${productId}:variant:*`),
            // Also invalidate the product cache since it contains stock info
            redisService_1.default.del(exports.CacheKeys.product(productId)),
        ]);
    }
    /**
     * Update stock cache atomically
     */
    static async updateStockCache(productId, newStock, ttl = redis_1.CacheTTL.SHORT_CACHE) {
        console.log(`💾 Updating stock cache for product ${productId}: ${newStock}`);
        await redisService_1.default.set(exports.CacheKeys.stock(productId), newStock, ttl);
    }
    /**
     * Update variant stock cache atomically
     */
    static async updateVariantStockCache(productId, variantType, variantValue, newStock, ttl = redis_1.CacheTTL.SHORT_CACHE) {
        console.log(`💾 Updating variant stock cache for product ${productId}: ${variantType}=${variantValue}, stock=${newStock}`);
        await redisService_1.default.set(exports.CacheKeys.stockByVariant(productId, variantType, variantValue), newStock, ttl);
    }
    /**
     * Invalidate user-related cache
     */
    static async invalidateUser(userId) {
        console.log(`🗑️ Invalidating cache for user: ${userId}`);
        await Promise.all([
            redisService_1.default.del(exports.CacheKeys.userProfile(userId)),
            redisService_1.default.delPattern(`user:${userId}:orders:*`),
            redisService_1.default.del(exports.CacheKeys.userWishlist(userId)),
            redisService_1.default.del(exports.CacheKeys.cart(userId)),
            redisService_1.default.del(exports.CacheKeys.cartSummary(userId)),
            redisService_1.default.del(exports.CacheKeys.userOffers(userId)),
            redisService_1.default.del(exports.CacheKeys.userVouchers(userId)),
        ]);
    }
    /**
     * Invalidate offer cache
     */
    static async invalidateOffer(offerId) {
        console.log(`🗑️ Invalidating cache for offer: ${offerId}`);
        await Promise.all([
            redisService_1.default.del(exports.CacheKeys.offer(offerId)),
            redisService_1.default.delPattern('offer:list:*'),
            redisService_1.default.delPattern('offer:user:*'),
        ]);
    }
    /**
     * Invalidate voucher cache
     */
    static async invalidateVoucher(voucherId) {
        console.log(`🗑️ Invalidating cache for voucher: ${voucherId}`);
        await Promise.all([
            redisService_1.default.del(exports.CacheKeys.voucher(voucherId)),
            redisService_1.default.delPattern('voucher:list:*'),
            redisService_1.default.delPattern('voucher:user:*'),
        ]);
    }
}
exports.CacheInvalidator = CacheInvalidator;
/**
 * Generate cache key from query parameters
 */
function generateQueryCacheKey(params) {
    // Sort keys to ensure consistent cache keys regardless of parameter order
    const sortedParams = Object.keys(params)
        .sort()
        .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
    }, {});
    return JSON.stringify(sortedParams);
}
/**
 * Wrap a function with caching
 */
async function withCache(cacheKey, ttl, fetchFunction) {
    // Try to get from cache first
    const cached = await redisService_1.default.get(cacheKey);
    if (cached !== null) {
        return cached;
    }
    // If not in cache, fetch the data
    const data = await fetchFunction();
    // Store in cache (don't await to avoid blocking)
    redisService_1.default.set(cacheKey, data, ttl).catch((err) => {
        console.error(`Failed to cache data for key ${cacheKey}:`, err);
    });
    return data;
}
/**
 * Batch cache operations
 */
class CacheBatch {
    constructor() {
        this.operations = [];
    }
    /**
     * Add a cache operation to the batch
     */
    add(operation) {
        this.operations.push(operation);
    }
    /**
     * Execute all operations in parallel
     */
    async execute() {
        await Promise.all(this.operations.map((op) => op()));
        this.operations = [];
    }
}
exports.CacheBatch = CacheBatch;
exports.default = {
    CacheKeys: exports.CacheKeys,
    CacheInvalidator,
    generateQueryCacheKey,
    withCache,
    CacheBatch,
};
