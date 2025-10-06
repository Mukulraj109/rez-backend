declare global {
    namespace Express {
        interface Request {
            rateLimit?: {
                limit: number;
                current: number;
                remaining: number;
                resetTime: Date;
            };
        }
    }
}
export declare const generalLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const authLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const otpLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const securityLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const uploadLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const searchLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const strictLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const reviewLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const analyticsLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const comparisonLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const favoriteLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const recommendationLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const createRateLimiter: (options: {
    windowMs?: number;
    max?: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
}) => import("express-rate-limit").RateLimitRequestHandler;
