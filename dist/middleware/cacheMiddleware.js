"use strict";
/**
 * Cache Middleware
 *
 * Middleware for automatic response caching on GET requests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheMiddleware = cacheMiddleware;
exports.cacheControlMiddleware = cacheControlMiddleware;
exports.noCacheMiddleware = noCacheMiddleware;
exports.createKeyGenerator = createKeyGenerator;
exports.cacheInvalidationMiddleware = cacheInvalidationMiddleware;
const redisService_1 = __importDefault(require("../services/redisService"));
const redis_1 = require("../config/redis");
const cacheHelper_1 = require("../utils/cacheHelper");
/**
 * Create cache middleware for GET requests
 *
 * @param options - Cache configuration options
 * @returns Express middleware function
 */
function cacheMiddleware(options = {}) {
    const { ttl = redis_1.CacheTTL.SHORT_CACHE, keyPrefix = 'response', keyGenerator, condition, addCacheHeaders = true, } = options;
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }
        // Check if Redis is ready
        if (!redisService_1.default.isReady()) {
            return next();
        }
        // Check condition if provided
        if (condition && !condition(req)) {
            return next();
        }
        // Skip cache for authenticated requests (unless specifically allowed)
        // This prevents caching user-specific data
        if (req.userId && !options.condition) {
            return next();
        }
        try {
            // Generate cache key
            const cacheKey = keyGenerator
                ? `${keyPrefix}:${keyGenerator(req)}`
                : generateCacheKey(req, keyPrefix);
            // Try to get from cache
            const cachedResponse = await redisService_1.default.get(cacheKey);
            if (cachedResponse) {
                console.log(`📦 Cache HIT (middleware): ${cacheKey}`);
                // Add cache headers
                if (addCacheHeaders) {
                    res.setHeader('X-Cache', 'HIT');
                    res.setHeader('X-Cache-Key', cacheKey);
                }
                // Return cached response
                return res.status(200).json(cachedResponse);
            }
            console.log(`📦 Cache MISS (middleware): ${cacheKey}`);
            // Store original json method
            const originalJson = res.json.bind(res);
            // Override json method to cache the response
            res.json = function (data) {
                // Only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    // Cache the response asynchronously (don't block the response)
                    redisService_1.default.set(cacheKey, data, ttl).catch((err) => {
                        console.error(`Failed to cache response for key ${cacheKey}:`, err);
                    });
                }
                // Add cache headers
                if (addCacheHeaders) {
                    res.setHeader('X-Cache', 'MISS');
                    res.setHeader('X-Cache-Key', cacheKey);
                }
                // Call original json method
                return originalJson(data);
            };
            next();
        }
        catch (error) {
            console.error('Cache middleware error:', error);
            // Continue without caching on error
            next();
        }
    };
}
/**
 * Generate cache key from request
 */
function generateCacheKey(req, prefix) {
    const path = req.path;
    const query = (0, cacheHelper_1.generateQueryCacheKey)(req.query);
    return `${prefix}:${path}:${query}`;
}
/**
 * Middleware to add Cache-Control headers for client-side caching
 */
function cacheControlMiddleware(maxAge = 60) {
    return (req, res, next) => {
        // Only add cache control for GET requests
        if (req.method === 'GET') {
            res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
        }
        next();
    };
}
/**
 * Middleware to prevent caching
 */
function noCacheMiddleware() {
    return (req, res, next) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        next();
    };
}
/**
 * Create a custom cache key generator based on request params
 */
function createKeyGenerator(...params) {
    return (req) => {
        const parts = params.map((param) => {
            // Check params first
            if (req.params[param]) {
                return `${param}:${req.params[param]}`;
            }
            // Then check query
            if (req.query[param]) {
                return `${param}:${req.query[param]}`;
            }
            // Then check body
            if (req.body && req.body[param]) {
                return `${param}:${req.body[param]}`;
            }
            return '';
        });
        return parts.filter(Boolean).join(':');
    };
}
/**
 * Cache invalidation middleware
 * Automatically invalidate cache on write operations (POST, PUT, DELETE, PATCH)
 */
function cacheInvalidationMiddleware(patternGenerator) {
    return async (req, res, next) => {
        // Only invalidate on write operations
        if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
            return next();
        }
        // Store original json method
        const originalJson = res.json.bind(res);
        // Override json method to invalidate cache after successful response
        res.json = function (data) {
            // Only invalidate on successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Invalidate cache asynchronously (don't block the response)
                const patterns = patternGenerator(req);
                const patternArray = Array.isArray(patterns) ? patterns : [patterns];
                Promise.all(patternArray.map((pattern) => redisService_1.default.delPattern(pattern))).catch((err) => {
                    console.error('Failed to invalidate cache:', err);
                });
            }
            // Call original json method
            return originalJson(data);
        };
        next();
    };
}
exports.default = {
    cacheMiddleware,
    cacheControlMiddleware,
    noCacheMiddleware,
    createKeyGenerator,
    cacheInvalidationMiddleware,
};
