"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCorsConfiguration = exports.dynamicCors = exports.publicCorsMiddleware = exports.corsMiddleware = exports.getCorsOptions = exports.publicApiCorsOptions = exports.developmentCorsOptions = exports.strictCorsOptions = void 0;
const cors_1 = __importDefault(require("cors"));
/**
 * CORS Configuration with Environment-based Whitelist
 * Implements strict CORS policy for production security
 */
// Parse allowed origins from environment variable
const getAllowedOrigins = () => {
    const corsOrigin = process.env.CORS_ORIGIN || '';
    if (corsOrigin === '*') {
        console.warn('⚠️ CORS is set to allow all origins - NOT recommended for production!');
        return ['*'];
    }
    // Split by comma and trim whitespace
    const origins = corsOrigin
        .split(',')
        .map(origin => origin.trim())
        .filter(origin => origin.length > 0);
    // Default allowed origins for development
    const defaultOrigins = [
        'http://localhost:3000',
        'http://localhost:19006',
        'http://localhost:19000',
        'http://localhost:8081'
    ];
    // In development, merge with defaults
    if (process.env.NODE_ENV === 'development') {
        const combined = [...new Set([...origins, ...defaultOrigins])];
        console.log('🔧 CORS allowed origins (development):', combined);
        return combined;
    }
    // In production, use only configured origins
    if (origins.length === 0) {
        console.error('❌ No CORS origins configured for production!');
        throw new Error('CORS_ORIGIN environment variable must be set in production');
    }
    console.log('🔒 CORS allowed origins (production):', origins);
    return origins;
};
// Get allowed origins
const allowedOrigins = getAllowedOrigins();
/**
 * CORS origin validation function
 */
const corsOriginValidator = (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
        return callback(null, true);
    }
    // Check if origin is in whitelist
    if (allowedOrigins.includes('*')) {
        return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
        return callback(null, true);
    }
    // Check for dynamic patterns (e.g., *.example.com)
    const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (allowedOrigin.includes('*')) {
            const pattern = allowedOrigin.replace('*', '.*');
            const regex = new RegExp(`^${pattern}$`);
            return regex.test(origin);
        }
        return false;
    });
    if (isAllowed) {
        return callback(null, true);
    }
    // Origin not allowed
    console.warn(`🚫 CORS blocked request from origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
};
/**
 * Strict CORS options for production
 */
exports.strictCorsOptions = {
    origin: corsOriginValidator,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
        'Accept',
        'Origin'
    ],
    exposedHeaders: [
        'X-Total-Count',
        'X-Page-Count',
        'X-Current-Page',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset'
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200,
    preflightContinue: false
};
/**
 * Relaxed CORS options for development
 */
exports.developmentCorsOptions = {
    origin: corsOriginValidator,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: '*',
    exposedHeaders: '*',
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 200,
    preflightContinue: false
};
/**
 * Public API CORS (no credentials, wider access)
 */
exports.publicApiCorsOptions = {
    origin: corsOriginValidator,
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    credentials: false,
    maxAge: 86400,
    optionsSuccessStatus: 200
};
/**
 * Get appropriate CORS configuration based on environment
 */
const getCorsOptions = () => {
    const env = process.env.NODE_ENV || 'development';
    switch (env) {
        case 'production':
            return exports.strictCorsOptions;
        case 'staging':
            return exports.strictCorsOptions;
        case 'development':
        case 'test':
            return exports.developmentCorsOptions;
        default:
            return exports.developmentCorsOptions;
    }
};
exports.getCorsOptions = getCorsOptions;
/**
 * CORS middleware with environment-aware configuration
 */
exports.corsMiddleware = (0, cors_1.default)((0, exports.getCorsOptions)());
/**
 * Public API CORS middleware (for public endpoints)
 */
exports.publicCorsMiddleware = (0, cors_1.default)(exports.publicApiCorsOptions);
/**
 * Dynamic CORS middleware for specific routes
 */
const dynamicCors = (customOrigins) => {
    const origins = customOrigins || allowedOrigins;
    return (0, cors_1.default)({
        origin: (origin, callback) => {
            if (!origin || origins.includes('*') || origins.includes(origin || '')) {
                callback(null, true);
            }
            else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true,
        maxAge: 86400
    });
};
exports.dynamicCors = dynamicCors;
/**
 * Validate CORS configuration on startup
 */
const validateCorsConfiguration = () => {
    if (process.env.NODE_ENV === 'production') {
        if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN === '*') {
            console.error('❌ CRITICAL: CORS_ORIGIN not properly configured for production!');
            console.error('   Please set CORS_ORIGIN to a comma-separated list of allowed origins');
            throw new Error('Invalid CORS configuration for production');
        }
        if (!allowedOrigins.every(origin => origin.startsWith('https://'))) {
            console.warn('⚠️ WARNING: Some CORS origins are not using HTTPS in production');
        }
    }
    console.log('✅ CORS configuration validated');
};
exports.validateCorsConfiguration = validateCorsConfiguration;
exports.default = {
    corsMiddleware: exports.corsMiddleware,
    publicCorsMiddleware: exports.publicCorsMiddleware,
    dynamicCors: exports.dynamicCors,
    strictCorsOptions: exports.strictCorsOptions,
    developmentCorsOptions: exports.developmentCorsOptions,
    publicApiCorsOptions: exports.publicApiCorsOptions,
    getCorsOptions: exports.getCorsOptions,
    validateCorsConfiguration: exports.validateCorsConfiguration
};
