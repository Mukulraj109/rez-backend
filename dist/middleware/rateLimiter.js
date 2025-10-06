"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = exports.recommendationLimiter = exports.favoriteLimiter = exports.comparisonLimiter = exports.analyticsLimiter = exports.reviewLimiter = exports.strictLimiter = exports.searchLimiter = exports.uploadLimiter = exports.securityLimiter = exports.otpLimiter = exports.authLimiter = exports.generalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Rate limiter error response
const rateLimitErrorResponse = (req, res) => {
    const resetTime = req.rateLimit?.resetTime ?
        Math.round(req.rateLimit.resetTime.getTime() / 1000) :
        Math.round(Date.now() / 1000) + 900; // Default to 15 minutes from now
    res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
        retryAfter: resetTime
    });
};
// General API rate limiter
exports.generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: rateLimitErrorResponse,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false // Disable the `X-RateLimit-*` headers
});
// Authentication rate limiter (stricter)
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth attempts per windowMs
    message: rateLimitErrorResponse,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Don't count successful requests
});
// OTP rate limiter (adjusted for development)
exports.otpLimiter = (0, express_rate_limit_1.default)({
    windowMs: 30 * 1000, // 30 seconds (reduced for development)
    max: 3, // Allow 3 OTP requests per 30 seconds (increased for development)
    message: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Please wait 30 seconds before requesting another OTP.',
            retryAfter: 30
        });
    },
    standardHeaders: true,
    legacyHeaders: false
});
// Password/security related operations
exports.securityLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // 3 attempts per window
    message: rateLimitErrorResponse,
    standardHeaders: true,
    legacyHeaders: false
});
// File upload rate limiter
exports.uploadLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 uploads per minute
    message: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Upload limit exceeded. Please wait before uploading more files.',
            retryAfter: 60
        });
    },
    standardHeaders: true,
    legacyHeaders: false
});
// Search rate limiter
exports.searchLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 searches per minute
    message: rateLimitErrorResponse,
    standardHeaders: true,
    legacyHeaders: false
});
// Strict rate limiter for sensitive operations
exports.strictLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour
    message: rateLimitErrorResponse,
    standardHeaders: true,
    legacyHeaders: false
});
// Review rate limiter (for review operations)
exports.reviewLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 review operations per minute
    message: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many review requests. Please wait before submitting another review.',
            retryAfter: 60
        });
    },
    standardHeaders: true,
    legacyHeaders: false
});
// Analytics rate limiter
exports.analyticsLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 analytics requests per minute
    message: rateLimitErrorResponse,
    standardHeaders: true,
    legacyHeaders: false
});
// Comparison rate limiter
exports.comparisonLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 comparison operations per minute
    message: rateLimitErrorResponse,
    standardHeaders: true,
    legacyHeaders: false
});
// Favorite rate limiter
exports.favoriteLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 favorite operations per minute
    message: rateLimitErrorResponse,
    standardHeaders: true,
    legacyHeaders: false
});
// Recommendation rate limiter
exports.recommendationLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 15, // 15 recommendation requests per minute
    message: rateLimitErrorResponse,
    standardHeaders: true,
    legacyHeaders: false
});
// Create custom rate limiter
const createRateLimiter = (options) => {
    return (0, express_rate_limit_1.default)({
        windowMs: options.windowMs || 15 * 60 * 1000,
        max: options.max || 100,
        message: options.message ?
            (req, res) => {
                res.status(429).json({
                    success: false,
                    message: options.message
                });
            } :
            rateLimitErrorResponse,
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: options.skipSuccessfulRequests || false
    });
};
exports.createRateLimiter = createRateLimiter;
