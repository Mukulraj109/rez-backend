/**
 * Cache Middleware
 *
 * Middleware for automatic response caching on GET requests
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Cache middleware configuration options
 */
interface CacheOptions {
    ttl?: number;
    keyPrefix?: string;
    keyGenerator?: (req: Request) => string;
    condition?: (req: Request) => boolean;
    addCacheHeaders?: boolean;
}
/**
 * Create cache middleware for GET requests
 *
 * @param options - Cache configuration options
 * @returns Express middleware function
 */
export declare function cacheMiddleware(options?: CacheOptions): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Middleware to add Cache-Control headers for client-side caching
 */
export declare function cacheControlMiddleware(maxAge?: number): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware to prevent caching
 */
export declare function noCacheMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Create a custom cache key generator based on request params
 */
export declare function createKeyGenerator(...params: string[]): (req: Request) => string;
/**
 * Cache invalidation middleware
 * Automatically invalidate cache on write operations (POST, PUT, DELETE, PATCH)
 */
export declare function cacheInvalidationMiddleware(patternGenerator: (req: Request) => string | string[]): (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    cacheMiddleware: typeof cacheMiddleware;
    cacheControlMiddleware: typeof cacheControlMiddleware;
    noCacheMiddleware: typeof noCacheMiddleware;
    createKeyGenerator: typeof createKeyGenerator;
    cacheInvalidationMiddleware: typeof cacheInvalidationMiddleware;
};
export default _default;
