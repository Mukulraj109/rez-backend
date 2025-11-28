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
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = exports.notFoundHandler = exports.asyncHandler = exports.errorLogger = void 0;
const logger_1 = require("../config/logger");
const Sentry = __importStar(require("@sentry/node"));
const prometheus_1 = require("../config/prometheus");
const errorLogger = (err, req, res, next) => {
    // Log error with full context
    logger_1.logger.error('Error occurred', {
        correlationId: req.correlationId,
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        query: (0, logger_1.sanitizeLog)(req.query),
        body: (0, logger_1.sanitizeLog)(req.body),
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    // Report to Sentry
    if (process.env.SENTRY_DSN) {
        Sentry.captureException(err, {
            extra: {
                correlationId: req.correlationId,
                path: req.path,
                method: req.method,
                query: (0, logger_1.sanitizeLog)(req.query),
                body: (0, logger_1.sanitizeLog)(req.body),
                ip: req.ip
            }
        });
    }
    // Track error in Prometheus
    prometheus_1.errorCounter.inc({
        type: 'server',
        code: '500'
    });
    next(err);
};
exports.errorLogger = errorLogger;
// Async error handler wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// Not found error handler
const notFoundHandler = (req, res, next) => {
    logger_1.logger.warn('Route not found', {
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        ip: req.ip
    });
    prometheus_1.errorCounter.inc({
        type: 'client',
        code: '404'
    });
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
        correlationId: req.correlationId
    });
};
exports.notFoundHandler = notFoundHandler;
// Global error handler
const globalErrorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    // Log based on severity
    if (statusCode >= 500) {
        logger_1.logger.error('Server error', {
            correlationId: req.correlationId,
            error: message,
            stack: err.stack,
            statusCode
        });
    }
    else {
        logger_1.logger.warn('Client error', {
            correlationId: req.correlationId,
            error: message,
            statusCode
        });
    }
    // Send error response
    res.status(statusCode).json({
        error: err.name || 'Error',
        message,
        correlationId: req.correlationId,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};
exports.globalErrorHandler = globalErrorHandler;
