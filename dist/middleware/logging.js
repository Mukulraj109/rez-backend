"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorRequestLogger = exports.slowRequestLogger = exports.bodyLogger = exports.loggingMiddleware = void 0;
const logger_1 = require("../config/logger");
const prometheus_1 = require("../config/prometheus");
const loggingMiddleware = (req, res, next) => {
    const start = Date.now();
    // Log request
    logger_1.logger.info(`Incoming request: ${req.method} ${req.path}`, {
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        query: (0, logger_1.sanitizeLog)(req.query),
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    // Capture response
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;
        // Log response
        logger_1.logger.info(`Request completed: ${req.method} ${req.path}`, {
            correlationId: req.correlationId,
            method: req.method,
            path: req.path,
            route,
            status: res.statusCode,
            duration: `${duration}s`,
            contentLength: res.get('content-length')
        });
        // Prometheus metrics
        prometheus_1.httpRequestCounter.inc({
            method: req.method,
            route,
            status: res.statusCode.toString()
        });
        prometheus_1.httpRequestDuration.observe({
            method: req.method,
            route,
            status: res.statusCode.toString()
        }, duration);
    });
    next();
};
exports.loggingMiddleware = loggingMiddleware;
// Request body logger (use sparingly, avoid logging sensitive data)
const bodyLogger = (req, res, next) => {
    if (req.body && Object.keys(req.body).length > 0) {
        logger_1.logger.debug('Request body', {
            correlationId: req.correlationId,
            path: req.path,
            body: (0, logger_1.sanitizeLog)(req.body)
        });
    }
    next();
};
exports.bodyLogger = bodyLogger;
// Slow request logger
const slowRequestLogger = (threshold = 1000) => {
    return (req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            if (duration > threshold) {
                logger_1.logger.warn(`Slow request detected: ${req.method} ${req.path}`, {
                    correlationId: req.correlationId,
                    method: req.method,
                    path: req.path,
                    duration: `${duration}ms`,
                    threshold: `${threshold}ms`
                });
            }
        });
        next();
    };
};
exports.slowRequestLogger = slowRequestLogger;
// Error request logger
const errorRequestLogger = (req, res, next) => {
    res.on('finish', () => {
        if (res.statusCode >= 400) {
            logger_1.logger.error(`Error request: ${req.method} ${req.path}`, {
                correlationId: req.correlationId,
                method: req.method,
                path: req.path,
                status: res.statusCode,
                ip: req.ip
            });
        }
    });
    next();
};
exports.errorRequestLogger = errorRequestLogger;
