"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allSecurityHeaders = exports.productionSecurityHeaders = exports.corsPreflightHeaders = exports.rateLimitHeaders = exports.apiSecurityHeaders = exports.customSecurityHeaders = exports.securityHeaders = void 0;
const helmet_1 = __importDefault(require("helmet"));
/**
 * Enhanced Security Headers Configuration
 * Implements comprehensive HTTP security headers
 */
/**
 * Helmet.js configuration with strict security headers
 */
exports.securityHeaders = (0, helmet_1.default)({
    // Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React/CSS-in-JS
            imgSrc: ["'self'", "data:", "https:", "blob:"], // Allow external images and data URIs
            fontSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "https://api.cloudinary.com", "https://res.cloudinary.com"],
            mediaSrc: ["'self'", "https:", "blob:"],
            objectSrc: ["'none'"],
            frameSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        },
        reportOnly: process.env.NODE_ENV === 'development' // Report-only mode in development
    },
    // HTTP Strict Transport Security (HSTS)
    hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true
    },
    // Prevent clickjacking
    frameguard: {
        action: 'deny'
    },
    // Prevent MIME type sniffing
    noSniff: true,
    // XSS Protection (legacy header, but still useful)
    xssFilter: true,
    // Hide X-Powered-By header
    hidePoweredBy: true,
    // DNS Prefetch Control
    dnsPrefetchControl: {
        allow: false
    },
    // Referrer Policy
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    },
    // Permissions Policy (formerly Feature Policy)
    permittedCrossDomainPolicies: {
        permittedPolicies: 'none'
    },
    // Cross-Origin policies
    crossOriginEmbedderPolicy: false, // Disabled for API compatibility
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
});
/**
 * Custom security headers middleware
 * Adds additional headers not covered by helmet
 */
const customSecurityHeaders = (req, res, next) => {
    // Prevent caching of sensitive data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Permissions Policy (Feature Policy)
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    // Server header (hide server information)
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    // CORS headers (handled by cors middleware but adding for completeness)
    if (process.env.CORS_ORIGIN) {
        res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    next();
};
exports.customSecurityHeaders = customSecurityHeaders;
/**
 * API-specific security headers
 * Lighter headers for API endpoints
 */
const apiSecurityHeaders = (req, res, next) => {
    // Disable caching for API responses
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    // Basic security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    // API-specific headers
    res.setHeader('X-API-Version', process.env.API_VERSION || 'v1');
    res.setHeader('X-Response-Time', Date.now().toString());
    next();
};
exports.apiSecurityHeaders = apiSecurityHeaders;
/**
 * Rate limit headers
 * Adds rate limit information to response headers
 */
const rateLimitHeaders = (req, res, next) => {
    if (req.rateLimit) {
        res.setHeader('X-RateLimit-Limit', req.rateLimit.limit.toString());
        res.setHeader('X-RateLimit-Remaining', req.rateLimit.remaining.toString());
        res.setHeader('X-RateLimit-Reset', req.rateLimit.resetTime.toISOString());
    }
    next();
};
exports.rateLimitHeaders = rateLimitHeaders;
/**
 * CORS preflight headers
 */
const corsPreflightHeaders = (req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    }
    next();
};
exports.corsPreflightHeaders = corsPreflightHeaders;
/**
 * Production-only strict headers
 */
const productionSecurityHeaders = (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        // Strict Transport Security
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        // Expect-CT (Certificate Transparency)
        res.setHeader('Expect-CT', 'max-age=86400, enforce');
        // Additional production headers
        res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    }
    next();
};
exports.productionSecurityHeaders = productionSecurityHeaders;
/**
 * Combined security headers middleware
 * Applies all security headers in correct order
 */
exports.allSecurityHeaders = [
    exports.securityHeaders,
    exports.customSecurityHeaders,
    exports.corsPreflightHeaders,
    exports.productionSecurityHeaders
];
exports.default = {
    securityHeaders: exports.securityHeaders,
    customSecurityHeaders: exports.customSecurityHeaders,
    apiSecurityHeaders: exports.apiSecurityHeaders,
    rateLimitHeaders: exports.rateLimitHeaders,
    corsPreflightHeaders: exports.corsPreflightHeaders,
    productionSecurityHeaders: exports.productionSecurityHeaders,
    allSecurityHeaders: exports.allSecurityHeaders
};
