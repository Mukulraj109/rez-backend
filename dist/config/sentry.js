"use strict";
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
exports.getCurrentTransaction = exports.startTransaction = exports.addBreadcrumb = exports.captureMessage = exports.captureException = exports.setContext = exports.setTags = exports.setRequestContext = exports.clearUserContext = exports.setUserContext = exports.sentryErrorHandler = exports.sentryTracingHandler = exports.sentryRequestHandler = exports.initSentry = void 0;
const Sentry = __importStar(require("@sentry/node"));
const logger_1 = require("./logger");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Sentry Configuration & Initialization
 * Provides comprehensive error tracking, performance monitoring, and alerting
 */
// Helper to get package version safely
function getPackageVersion() {
    try {
        const packageJsonPath = path_1.default.join(process.cwd(), 'package.json');
        if (fs_1.default.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs_1.default.readFileSync(packageJsonPath, 'utf-8'));
            return packageJson.version || '1.0.0';
        }
    }
    catch (error) {
        console.warn('Failed to read package.json version:', error);
    }
    return '1.0.0';
}
// ============================================================================
// SENTRY INITIALIZATION
// ============================================================================
const initSentry = (app) => {
    if (!process.env.SENTRY_DSN) {
        logger_1.logger.warn('Sentry DSN not configured, error tracking disabled');
        return;
    }
    try {
        Sentry.init({
            // Core Configuration
            dsn: process.env.SENTRY_DSN,
            environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
            release: process.env.SENTRY_RELEASE || getPackageVersion(),
            // Performance & Tracing
            tracesSampleRate: getTraceSampleRate(),
            profilesSampleRate: getProfilesSampleRate(),
            // Integrations for enhanced tracking
            integrations: [
                // HTTP/HTTPS integration for tracking external API calls
                new Sentry.Integrations.Http({ tracing: true }),
                // Express integration for automatic request/response tracking
                new Sentry.Integrations.Express({
                    app
                }),
                // Console integration to capture console errors/logs
                new Sentry.Integrations.Console({
                    levels: ['error', 'warn']
                }),
                // Global handlers for uncaught exceptions
                new Sentry.Integrations.OnUncaughtException(),
                new Sentry.Integrations.OnUnhandledRejection({ mode: 'strict' })
            ],
            // Ignore certain errors
            ignoreErrors: [
                // Browser extensions
                'chrome-extension://',
                'moz-extension://',
                // Low-value errors
                'Script error',
                'Network request failed',
                'NetworkError',
                'timeout',
                'Script Tag Error'
            ],
            // Data filtering & sanitization
            beforeSend: (event, hint) => sanitizeEvent(event, hint),
            beforeBreadcrumb: (breadcrumb) => sanitizeBreadcrumb(breadcrumb),
            // Request payload configuration
            maxBreadcrumbs: 100,
            maxValueLength: 1024,
            attachStacktrace: true,
            // Additional configuration
            serverName: process.env.SENTRY_SERVER_NAME || 'rez-app-backend',
            includeLocalVariables: process.env.NODE_ENV === 'development',
            enabled: process.env.NODE_ENV !== 'test'
        });
        logger_1.logger.info('Sentry initialized successfully', {
            environment: process.env.SENTRY_ENVIRONMENT,
            release: getPackageVersion(),
            dsn: maskDSN(process.env.SENTRY_DSN)
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize Sentry', error);
        // Don't throw - continue without Sentry
    }
};
exports.initSentry = initSentry;
// ============================================================================
// MIDDLEWARE EXPORTS
// ============================================================================
// Safe middleware that only runs when Sentry is configured
const createSafeMiddleware = (handler) => {
    return (req, res, next) => {
        if (!process.env.SENTRY_DSN) {
            return next();
        }
        return handler(req, res, next);
    };
};
// RequestHandler middleware must be the first middleware
exports.sentryRequestHandler = createSafeMiddleware(Sentry.Handlers.requestHandler({
    include: {
        user: true,
        request: true,
        ip: true
    }
}));
// TracingHandler middleware for performance monitoring
exports.sentryTracingHandler = createSafeMiddleware(Sentry.Handlers.tracingHandler());
// ErrorHandler middleware must be the last middleware
exports.sentryErrorHandler = createSafeMiddleware(Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
        // Capture all errors
        return true;
    }
}));
/**
 * Set user context for error tracking
 */
const setUserContext = (user) => {
    if (process.env.SENTRY_DSN) {
        Sentry.setUser({
            id: user.id,
            email: user.email,
            username: user.username,
            ip_address: user.ip
        });
        // Also set tags for better filtering
        Sentry.setTag('user_type', user.userType || 'user');
    }
};
exports.setUserContext = setUserContext;
/**
 * Clear user context
 */
const clearUserContext = () => {
    if (process.env.SENTRY_DSN) {
        Sentry.setUser(null);
    }
};
exports.clearUserContext = clearUserContext;
/**
 * Set request context with additional metadata
 */
const setRequestContext = (context) => {
    if (process.env.SENTRY_DSN) {
        Sentry.setContext('request', context);
    }
};
exports.setRequestContext = setRequestContext;
/**
 * Set additional tags for filtering and searching
 */
const setTags = (tags) => {
    if (process.env.SENTRY_DSN) {
        Object.entries(tags).forEach(([key, value]) => {
            Sentry.setTag(key, value);
        });
    }
};
exports.setTags = setTags;
/**
 * Set additional context
 */
const setContext = (name, context) => {
    if (process.env.SENTRY_DSN) {
        Sentry.setContext(name, context);
    }
};
exports.setContext = setContext;
// ============================================================================
// EXCEPTION & MESSAGE CAPTURE
// ============================================================================
/**
 * Capture exception with optional context
 */
const captureException = (error, context, level = 'error') => {
    if (process.env.SENTRY_DSN) {
        Sentry.captureException(error, {
            extra: context,
            level
        });
    }
    logger_1.logger.error('Exception captured', error, { context, level });
};
exports.captureException = captureException;
/**
 * Capture message with optional context
 */
const captureMessage = (message, level = 'info', context) => {
    if (process.env.SENTRY_DSN) {
        Sentry.captureMessage(message, {
            level,
            extra: context
        });
    }
    logger_1.logger.log(level, message, context);
};
exports.captureMessage = captureMessage;
// ============================================================================
// BREADCRUMB TRACKING
// ============================================================================
/**
 * Add custom breadcrumb for tracking important operations
 */
const addBreadcrumb = (message, category, level = 'info', data) => {
    if (process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb({
            message,
            category,
            level,
            data,
            timestamp: Date.now() / 1000
        });
    }
};
exports.addBreadcrumb = addBreadcrumb;
// ============================================================================
// TRANSACTION & PERFORMANCE TRACKING
// ============================================================================
/**
 * Start a transaction for performance monitoring
 */
const startTransaction = (name, op) => {
    if (process.env.SENTRY_DSN) {
        return Sentry.startTransaction({
            name,
            op,
            description: `${op} - ${name}`
        });
    }
    return null;
};
exports.startTransaction = startTransaction;
/**
 * Get current transaction
 */
const getCurrentTransaction = () => {
    return Sentry.getCurrentScope().getTransaction();
};
exports.getCurrentTransaction = getCurrentTransaction;
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Get trace sample rate based on environment
 */
function getTraceSampleRate() {
    const rate = process.env.SENTRY_TRACES_SAMPLE_RATE;
    if (rate) {
        const parsed = parseFloat(rate);
        return isNaN(parsed) ? 0.1 : Math.min(parsed, 1);
    }
    // Default: full tracing in development, 10% in production
    return process.env.NODE_ENV === 'production' ? 0.1 : 1.0;
}
/**
 * Get profiles sample rate based on environment
 */
function getProfilesSampleRate() {
    const rate = process.env.SENTRY_PROFILES_SAMPLE_RATE;
    if (rate) {
        const parsed = parseFloat(rate);
        return isNaN(parsed) ? 0 : Math.min(parsed, 1);
    }
    // Default: no profiling in production, full profiling in development
    return process.env.NODE_ENV === 'production' ? 0 : 0.1;
}
/**
 * Sanitize event to remove sensitive data
 */
function sanitizeEvent(event, hint) {
    // Filter sensitive fields
    const sensitiveFields = [
        'password',
        'token',
        'accessToken',
        'refreshToken',
        'authorization',
        'cookie',
        'pan',
        'cvv',
        'cvc',
        'pin',
        'accountNumber',
        'bankAccount',
        'creditCard',
        'debitCard',
        'cardNumber',
        'routingNumber',
        'socialSecurity',
        'apiKey',
        'secret',
        'apiSecret',
        'privateKey',
        'secretKey',
        'passphrase',
        'ssn',
        'businessNumber'
    ];
    // Sanitize request data
    if (event.request) {
        // Remove cookies
        delete event.request.cookies;
        // Remove sensitive headers
        if (event.request.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
            delete event.request.headers['x-api-key'];
        }
        // Sanitize body data
        if (event.request.data && typeof event.request.data === 'object') {
            event.request.data = sanitizeObject(event.request.data, sensitiveFields);
        }
    }
    // Sanitize extra data
    if (event.extra) {
        event.extra = sanitizeObject(event.extra, sensitiveFields);
    }
    // Sanitize contexts
    if (event.contexts) {
        Object.keys(event.contexts).forEach((key) => {
            if (event.contexts && event.contexts[key]) {
                event.contexts[key] = sanitizeObject(event.contexts[key], sensitiveFields);
            }
        });
    }
    return event;
}
/**
 * Sanitize breadcrumb to remove sensitive data
 */
function sanitizeBreadcrumb(breadcrumb) {
    const sensitiveCategories = ['http', 'fetch', 'xhr'];
    // Don't filter out breadcrumbs, but sanitize their data
    if (sensitiveCategories.includes(breadcrumb.category || '')) {
        if (breadcrumb.data) {
            breadcrumb.data = sanitizeObject(breadcrumb.data, [
                'password',
                'token',
                'authorization',
                'apiKey',
                'secret'
            ]);
        }
    }
    return breadcrumb;
}
/**
 * Recursively sanitize object to remove sensitive fields
 */
function sanitizeObject(obj, sensitiveFields) {
    if (obj === null || obj === undefined)
        return obj;
    if (typeof obj !== 'object')
        return obj;
    if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeObject(item, sensitiveFields));
    }
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
            sanitized[key] = '***REDACTED***';
        }
        else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value, sensitiveFields);
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
/**
 * Mask DSN for logging (show only domain)
 */
function maskDSN(dsn) {
    try {
        const url = new URL(dsn);
        return `${url.protocol}//${url.hostname}`;
    }
    catch {
        return '***MASKED***';
    }
}
