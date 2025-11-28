"use strict";
/**
 * Analytics Cache Service
 *
 * Provides Redis-based caching layer for analytics queries.
 * Falls back gracefully if Redis is unavailable.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsCacheService = void 0;
const redisService_1 = __importDefault(require("../services/redisService"));
class AnalyticsCacheService {
    /**
     * Get cached value or compute it if not in cache
     */
    static async getOrCompute(key, computeFn, options = {}) {
        const { ttl = this.DEFAULT_TTL, prefix = this.DEFAULT_PREFIX } = options;
        const fullKey = `${prefix}:${key}`;
        try {
            // Try to get from cache
            const cached = await redisService_1.default.get(fullKey);
            if (cached !== null) {
                console.log(`✅ Analytics Cache HIT: ${fullKey}`);
                return cached;
            }
            console.log(`❌ Analytics Cache MISS: ${fullKey}`);
            // Compute value
            const value = await computeFn();
            // Store in cache (async, don't wait)
            redisService_1.default.set(fullKey, value, ttl).catch(err => {
                console.error(`Failed to cache ${fullKey}:`, err);
            });
            return value;
        }
        catch (error) {
            console.error(`Analytics cache error for ${fullKey}:`, error);
            // Fallback: compute without cache
            return computeFn();
        }
    }
    /**
     * Get a cached value
     */
    static async get(key, options = {}) {
        const { prefix = this.DEFAULT_PREFIX } = options;
        const fullKey = `${prefix}:${key}`;
        try {
            return await redisService_1.default.get(fullKey);
        }
        catch (error) {
            console.error(`Failed to get analytics cache ${fullKey}:`, error);
            return null;
        }
    }
    /**
     * Set a cached value
     */
    static async set(key, value, options = {}) {
        const { ttl = this.DEFAULT_TTL, prefix = this.DEFAULT_PREFIX } = options;
        const fullKey = `${prefix}:${key}`;
        try {
            return await redisService_1.default.set(fullKey, value, ttl);
        }
        catch (error) {
            console.error(`Failed to set analytics cache ${fullKey}:`, error);
            return false;
        }
    }
    /**
     * Invalidate cache by key
     */
    static async invalidate(key, options = {}) {
        const { prefix = this.DEFAULT_PREFIX } = options;
        const fullKey = `${prefix}:${key}`;
        try {
            return await redisService_1.default.del(fullKey);
        }
        catch (error) {
            console.error(`Failed to invalidate analytics cache ${fullKey}:`, error);
            return false;
        }
    }
    /**
     * Invalidate all cache keys matching a pattern
     */
    static async invalidatePattern(pattern, options = {}) {
        const { prefix = this.DEFAULT_PREFIX } = options;
        const fullPattern = `${prefix}:${pattern}`;
        try {
            return await redisService_1.default.delPattern(fullPattern);
        }
        catch (error) {
            console.error(`Failed to invalidate pattern ${fullPattern}:`, error);
            return 0;
        }
    }
    /**
     * Invalidate all analytics cache for a specific store
     */
    static async invalidateStore(storeId) {
        try {
            console.log(`🔄 Invalidating all analytics cache for store ${storeId}`);
            return await this.invalidatePattern(`*:${storeId}:*`);
        }
        catch (error) {
            console.error(`Failed to invalidate store cache ${storeId}:`, error);
            return 0;
        }
    }
    /**
     * Get cache statistics
     */
    static async getStats() {
        try {
            return await redisService_1.default.getStats();
        }
        catch (error) {
            console.error('Failed to get analytics cache stats:', error);
            return {
                enabled: false,
                connected: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Clear all analytics cache
     */
    static async clearAll() {
        try {
            console.log('🗑️ Clearing all analytics cache');
            const deletedCount = await this.invalidatePattern('*');
            return deletedCount > 0;
        }
        catch (error) {
            console.error('Failed to clear all analytics cache:', error);
            return false;
        }
    }
    /**
     * Generate cache key for sales overview
     */
    static getSalesOverviewKey(storeId, startDate, endDate) {
        return `sales:overview:${storeId}:${startDate.toISOString().split('T')[0]}:${endDate.toISOString().split('T')[0]}`;
    }
    /**
     * Generate cache key for revenue trends
     */
    static getRevenueTrendsKey(storeId, period, days) {
        return `revenue:trends:${storeId}:${period}:${days}`;
    }
    /**
     * Generate cache key for top products
     */
    static getTopProductsKey(storeId, limit, sortBy) {
        return `top:products:${storeId}:${limit}:${sortBy}`;
    }
    /**
     * Generate cache key for category performance
     */
    static getCategoryPerformanceKey(storeId) {
        return `category:performance:${storeId}`;
    }
    /**
     * Generate cache key for customer insights
     */
    static getCustomerInsightsKey(storeId) {
        return `customer:insights:${storeId}`;
    }
    /**
     * Generate cache key for inventory status
     */
    static getInventoryStatusKey(storeId) {
        return `inventory:status:${storeId}`;
    }
    /**
     * Generate cache key for sales forecast
     */
    static getSalesForecastKey(storeId, days) {
        return `forecast:sales:${storeId}:${days}`;
    }
    /**
     * Generate cache key for stockout prediction
     */
    static getStockoutPredictionKey(productId) {
        return `forecast:stockout:${productId}`;
    }
    /**
     * Generate cache key for seasonal trends
     */
    static getSeasonalTrendsKey(storeId, type) {
        return `trends:seasonal:${storeId}:${type}`;
    }
    /**
     * Generate cache key for demand forecast
     */
    static getDemandForecastKey(productId) {
        return `forecast:demand:${productId}`;
    }
    /**
     * Check if cache is available
     */
    static isAvailable() {
        return redisService_1.default.isReady();
    }
    /**
     * Warm up cache for a store (pre-compute common queries)
     */
    static async warmUpCache(storeId) {
        console.log(`🔥 Warming up analytics cache for store ${storeId}...`);
        try {
            // Import services dynamically to avoid circular dependencies
            const { AnalyticsService } = await Promise.resolve().then(() => __importStar(require('./AnalyticsService')));
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 30);
            // Pre-compute common queries
            const warmupPromises = [
                // Sales overview
                this.getOrCompute(this.getSalesOverviewKey(storeId, startDate, endDate), () => AnalyticsService.getSalesOverview(storeId, startDate, endDate), { ttl: 900 }),
                // Revenue trends
                this.getOrCompute(this.getRevenueTrendsKey(storeId, 'daily', 30), () => AnalyticsService.getRevenueTrends(storeId, 'daily', 30), { ttl: 900 }),
                // Top products
                this.getOrCompute(this.getTopProductsKey(storeId, 10, 'revenue'), () => AnalyticsService.getTopSellingProducts(storeId, 10, 'revenue'), { ttl: 1800 }),
                // Category performance
                this.getOrCompute(this.getCategoryPerformanceKey(storeId), () => AnalyticsService.getCategoryPerformance(storeId), { ttl: 1800 }),
                // Customer insights
                this.getOrCompute(this.getCustomerInsightsKey(storeId), () => AnalyticsService.getCustomerInsights(storeId), { ttl: 1800 }),
                // Inventory status
                this.getOrCompute(this.getInventoryStatusKey(storeId), () => AnalyticsService.getInventoryStatus(storeId), { ttl: 600 })
            ];
            await Promise.all(warmupPromises);
            console.log(`✅ Analytics cache warmed up for store ${storeId}`);
        }
        catch (error) {
            console.error(`Failed to warm up cache for store ${storeId}:`, error);
        }
    }
    /**
     * Auto-refresh cache on new order
     */
    static async onNewOrder(storeId) {
        console.log(`🔄 Invalidating analytics cache for store ${storeId} due to new order`);
        try {
            // Invalidate all analytics cache for this store
            await this.invalidateStore(storeId);
            // Optionally warm up cache again in background
            setImmediate(() => {
                this.warmUpCache(storeId).catch(err => {
                    console.error(`Failed to warm up cache after new order:`, err);
                });
            });
        }
        catch (error) {
            console.error(`Failed to invalidate cache on new order for store ${storeId}:`, error);
        }
    }
    /**
     * Auto-refresh cache on product update
     */
    static async onProductUpdate(productId, storeId) {
        console.log(`🔄 Invalidating product and store analytics cache due to product update`);
        try {
            // Invalidate product-specific cache
            await this.invalidate(this.getStockoutPredictionKey(productId));
            await this.invalidate(this.getDemandForecastKey(productId));
            // Invalidate store inventory cache
            await this.invalidate(this.getInventoryStatusKey(storeId));
            await this.invalidate(this.getTopProductsKey(storeId, 10, 'revenue'));
            await this.invalidate(this.getCategoryPerformanceKey(storeId));
        }
        catch (error) {
            console.error(`Failed to invalidate cache on product update:`, error);
        }
    }
}
exports.AnalyticsCacheService = AnalyticsCacheService;
AnalyticsCacheService.DEFAULT_TTL = 900; // 15 minutes
AnalyticsCacheService.DEFAULT_PREFIX = 'analytics';
