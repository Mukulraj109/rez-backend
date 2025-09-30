/**
 * Cache Helper Utility
 *
 * Provides helper functions for generating cache keys and managing cache invalidation
 */

import redisService from '../services/redisService';
import { CacheTTL } from '../config/redis';

/**
 * Cache key generators
 */
export const CacheKeys = {
  // Product keys
  product: (id: string) => `product:${id}`,
  productList: (filters: string) => `product:list:${filters}`,
  productsByCategory: (categorySlug: string, filters: string) => `product:category:${categorySlug}:${filters}`,
  productsByStore: (storeId: string, filters: string) => `product:store:${storeId}:${filters}`,
  productFeatured: (limit: number) => `product:featured:${limit}`,
  productNewArrivals: (limit: number) => `product:new-arrivals:${limit}`,
  productSearch: (query: string, filters: string) => `product:search:${query}:${filters}`,
  productRecommendations: (productId: string, limit: number) => `product:recommendations:${productId}:${limit}`,

  // Category keys
  categoryList: () => `category:list`,
  category: (id: string) => `category:${id}`,
  categoryBySlug: (slug: string) => `category:slug:${slug}`,

  // Store keys
  storeList: (filters: string) => `store:list:${filters}`,
  store: (id: string) => `store:${id}`,
  storeProducts: (storeId: string) => `store:${storeId}:products`,

  // Cart keys
  cart: (userId: string) => `cart:user:${userId}`,
  cartSummary: (userId: string) => `cart:summary:${userId}`,

  // User keys
  userProfile: (userId: string) => `user:${userId}:profile`,
  userOrders: (userId: string, filters: string) => `user:${userId}:orders:${filters}`,
  userWishlist: (userId: string) => `user:${userId}:wishlist`,

  // Offer keys
  offerList: (filters: string) => `offer:list:${filters}`,
  offer: (id: string) => `offer:${id}`,
  userOffers: (userId: string) => `offer:user:${userId}`,

  // Voucher keys
  voucherList: (filters: string) => `voucher:list:${filters}`,
  voucher: (id: string) => `voucher:${id}`,
  userVouchers: (userId: string) => `voucher:user:${userId}`,

  // Stock keys
  stock: (productId: string) => `stock:${productId}`,
  stockByVariant: (productId: string, variantType: string, variantValue: string) =>
    `stock:${productId}:variant:${variantType}:${variantValue}`,
};

/**
 * Cache invalidation helpers
 */
export class CacheInvalidator {
  /**
   * Invalidate all product-related cache
   */
  static async invalidateProduct(productId: string): Promise<void> {
    console.log(`🗑️ Invalidating cache for product: ${productId}`);

    await Promise.all([
      // Delete specific product cache
      redisService.del(CacheKeys.product(productId)),

      // Delete product list caches (with different filters)
      redisService.delPattern('product:list:*'),

      // Delete featured and new arrivals (as they might include this product)
      redisService.delPattern('product:featured:*'),
      redisService.delPattern('product:new-arrivals:*'),

      // Delete search results (as they might include this product)
      redisService.delPattern('product:search:*'),

      // Delete recommendations
      redisService.delPattern(`product:recommendations:${productId}:*`),

      // Delete stock cache
      redisService.del(CacheKeys.stock(productId)),
      redisService.delPattern(`stock:${productId}:variant:*`),
    ]);
  }

  /**
   * Invalidate product list caches
   */
  static async invalidateProductLists(): Promise<void> {
    console.log('🗑️ Invalidating all product list caches');

    await Promise.all([
      redisService.delPattern('product:list:*'),
      redisService.delPattern('product:featured:*'),
      redisService.delPattern('product:new-arrivals:*'),
      redisService.delPattern('product:search:*'),
    ]);
  }

  /**
   * Invalidate category-related cache
   */
  static async invalidateCategory(categoryId: string, categorySlug?: string): Promise<void> {
    console.log(`🗑️ Invalidating cache for category: ${categoryId}`);

    await Promise.all([
      redisService.del(CacheKeys.category(categoryId)),
      categorySlug ? redisService.del(CacheKeys.categoryBySlug(categorySlug)) : Promise.resolve(),
      redisService.del(CacheKeys.categoryList()),
      redisService.delPattern(`product:category:*`),
    ]);
  }

  /**
   * Invalidate store-related cache
   */
  static async invalidateStore(storeId: string): Promise<void> {
    console.log(`🗑️ Invalidating cache for store: ${storeId}`);

    await Promise.all([
      redisService.del(CacheKeys.store(storeId)),
      redisService.del(CacheKeys.storeProducts(storeId)),
      redisService.delPattern(`product:store:${storeId}:*`),
      redisService.delPattern('store:list:*'),
    ]);
  }

  /**
   * Invalidate cart cache for a user
   */
  static async invalidateCart(userId: string): Promise<void> {
    console.log(`🗑️ Invalidating cache for user cart: ${userId}`);

    await Promise.all([
      redisService.del(CacheKeys.cart(userId)),
      redisService.del(CacheKeys.cartSummary(userId)),
    ]);
  }

  /**
   * Invalidate stock cache for a product
   */
  static async invalidateStock(productId: string): Promise<void> {
    console.log(`🗑️ Invalidating stock cache for product: ${productId}`);

    await Promise.all([
      redisService.del(CacheKeys.stock(productId)),
      redisService.delPattern(`stock:${productId}:variant:*`),

      // Also invalidate the product cache since it contains stock info
      redisService.del(CacheKeys.product(productId)),
    ]);
  }

  /**
   * Update stock cache atomically
   */
  static async updateStockCache(productId: string, newStock: number, ttl: number = CacheTTL.SHORT_CACHE): Promise<void> {
    console.log(`💾 Updating stock cache for product ${productId}: ${newStock}`);

    await redisService.set(CacheKeys.stock(productId), newStock, ttl);
  }

  /**
   * Update variant stock cache atomically
   */
  static async updateVariantStockCache(
    productId: string,
    variantType: string,
    variantValue: string,
    newStock: number,
    ttl: number = CacheTTL.SHORT_CACHE
  ): Promise<void> {
    console.log(`💾 Updating variant stock cache for product ${productId}: ${variantType}=${variantValue}, stock=${newStock}`);

    await redisService.set(CacheKeys.stockByVariant(productId, variantType, variantValue), newStock, ttl);
  }

  /**
   * Invalidate user-related cache
   */
  static async invalidateUser(userId: string): Promise<void> {
    console.log(`🗑️ Invalidating cache for user: ${userId}`);

    await Promise.all([
      redisService.del(CacheKeys.userProfile(userId)),
      redisService.delPattern(`user:${userId}:orders:*`),
      redisService.del(CacheKeys.userWishlist(userId)),
      redisService.del(CacheKeys.cart(userId)),
      redisService.del(CacheKeys.cartSummary(userId)),
      redisService.del(CacheKeys.userOffers(userId)),
      redisService.del(CacheKeys.userVouchers(userId)),
    ]);
  }

  /**
   * Invalidate offer cache
   */
  static async invalidateOffer(offerId: string): Promise<void> {
    console.log(`🗑️ Invalidating cache for offer: ${offerId}`);

    await Promise.all([
      redisService.del(CacheKeys.offer(offerId)),
      redisService.delPattern('offer:list:*'),
      redisService.delPattern('offer:user:*'),
    ]);
  }

  /**
   * Invalidate voucher cache
   */
  static async invalidateVoucher(voucherId: string): Promise<void> {
    console.log(`🗑️ Invalidating cache for voucher: ${voucherId}`);

    await Promise.all([
      redisService.del(CacheKeys.voucher(voucherId)),
      redisService.delPattern('voucher:list:*'),
      redisService.delPattern('voucher:user:*'),
    ]);
  }
}

/**
 * Generate cache key from query parameters
 */
export function generateQueryCacheKey(params: Record<string, any>): string {
  // Sort keys to ensure consistent cache keys regardless of parameter order
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

  return JSON.stringify(sortedParams);
}

/**
 * Wrap a function with caching
 */
export async function withCache<T>(
  cacheKey: string,
  ttl: number,
  fetchFunction: () => Promise<T>
): Promise<T> {
  // Try to get from cache first
  const cached = await redisService.get<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // If not in cache, fetch the data
  const data = await fetchFunction();

  // Store in cache (don't await to avoid blocking)
  redisService.set(cacheKey, data, ttl).catch((err) => {
    console.error(`Failed to cache data for key ${cacheKey}:`, err);
  });

  return data;
}

/**
 * Batch cache operations
 */
export class CacheBatch {
  private operations: Array<() => Promise<any>> = [];

  /**
   * Add a cache operation to the batch
   */
  add(operation: () => Promise<any>): void {
    this.operations.push(operation);
  }

  /**
   * Execute all operations in parallel
   */
  async execute(): Promise<void> {
    await Promise.all(this.operations.map((op) => op()));
    this.operations = [];
  }
}

export default {
  CacheKeys,
  CacheInvalidator,
  generateQueryCacheKey,
  withCache,
  CacheBatch,
};