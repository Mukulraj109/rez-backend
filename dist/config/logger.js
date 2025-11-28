"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServiceLogger = exports.logDebug = exports.logError = exports.logWarn = exports.logInfo = exports.correlationIdMiddleware = exports.sanitizeLog = exports.requestLogger = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const { combine, timestamp, printf, colorize, errors, json } = winston_1.default.format;
// Ensure logs directory exists
const logsDir = path_1.default.join(process.cwd(), 'logs');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
// Custom log format for development
const devFormat = printf(({ level, message, timestamp, correlationId, service, ...metadata }) => {
    let msg = `${timestamp} [${level}]${correlationId ? ` [${correlationId}]` : ''}`;
    if (service) {
        msg += ` [${service}]`;
    }
    msg += `: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});
// Production JSON format
const prodFormat = json();
// Create logger
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: {
        service: 'user-backend',
        environment: process.env.NODE_ENV || 'development'
    },
    format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), process.env.NODE_ENV === 'production' ? prodFormat : devFormat),
    transports: [
        // Console transport
        new winston_1.default.transports.Console({
            format: process.env.NODE_ENV === 'production'
                ? json()
                : combine(colorize(), devFormat),
            level: process.env.LOG_LEVEL || 'info'
        })
    ],
    exceptionHandlers: [
        new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(logsDir, 'exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d',
            format: json()
        })
    ],
    rejectionHandlers: [
        new winston_daily_rotate_file_1.default({
            filename: path_1.default.join(logsDir, 'rejections-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d',
            format: json()
        })
    ]
});
// Add file transports in production
if (process.env.NODE_ENV === 'production') {
    // Combined logs
    exports.logger.add(new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logsDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: json()
    }));
    // Error logs
    exports.logger.add(new winston_daily_rotate_file_1.default({
        level: 'error',
        filename: path_1.default.join(logsDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: json()
    }));
    // Warning logs
    exports.logger.add(new winston_daily_rotate_file_1.default({
        level: 'warn',
        filename: path_1.default.join(logsDir, 'warn-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: json()
    }));
}
// Development file logging
if (process.env.LOG_FILES === 'true' && process.env.NODE_ENV !== 'production') {
    exports.logger.add(new winston_daily_rotate_file_1.default({
        filename: path_1.default.join(logsDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '7d',
        format: devFormat
    }));
    exports.logger.add(new winston_daily_rotate_file_1.default({
        level: 'error',
        filename: path_1.default.join(logsDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: devFormat
    }));
}
// Create request logger middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? 'warn' : 'info';
        exports.logger.log(level, `${req.method} ${req.originalUrl}`, {
            method: req.method,
            path: req.path,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            contentLength: res.getHeader('content-length'),
            ip: req.ip,
            userAgent: req.get('user-agent'),
            correlationId: req.correlationId,
            userId: req.userId
        });
    });
    next();
};
exports.requestLogger = requestLogger;
// Helper to sanitize sensitive data from logs
const sanitizeLog = (data) => {
    if (!data)
        return data;
    const sensitiveFields = [
        'password', 'token', 'accessToken', 'refreshToken', 'authorization',
        'cookie', 'pan', 'cvv', 'cvc', 'pin', 'accountNumber', 'bankAccount',
        'creditCard', 'debitCard', 'cardNumber', 'routingNumber', 'socialSecurity',
        'apiKey', 'secret', 'apiSecret', 'privateKey', 'secretKey', 'passphrase'
    ];
    const sanitizeObj = (obj) => {
        if (obj === null || obj === undefined)
            return obj;
        if (typeof obj !== 'object')
            return obj;
        if (Array.isArray(obj)) {
            return obj.map(sanitizeObj);
        }
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
                sanitized[key] = '***REDACTED***';
            }
            else if (typeof value === 'object') {
                sanitized[key] = sanitizeObj(value);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    };
    return sanitizeObj(data);
};
exports.sanitizeLog = sanitizeLog;
// Correlation ID middleware
const correlationIdMiddleware = (req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] ||
        req.headers['x-request-id'] ||
        req.headers['x-trace-id'] ||
        `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
};
exports.correlationIdMiddleware = correlationIdMiddleware;
// Context-aware logging helpers
const logInfo = (message, meta, correlationId) => {
    exports.logger.info(message, { ...meta, correlationId });
};
exports.logInfo = logInfo;
const logWarn = (message, meta, correlationId) => {
    exports.logger.warn(message, { ...meta, correlationId });
};
exports.logWarn = logWarn;
const logError = (message, error, meta, correlationId) => {
    const errorMeta = {
        ...meta,
        correlationId,
        ...(error instanceof Error && {
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack
        })
    };
    exports.logger.error(message, errorMeta);
};
exports.logError = logError;
const logDebug = (message, meta, correlationId) => {
    exports.logger.debug(message, { ...meta, correlationId });
};
exports.logDebug = logDebug;
// Service-specific loggers
const createServiceLogger = (serviceName) => {
    return {
        info: (message, meta, correlationId) => exports.logger.info(message, { service: serviceName, ...meta, correlationId }),
        warn: (message, meta, correlationId) => exports.logger.warn(message, { service: serviceName, ...meta, correlationId }),
        error: (message, error, meta, correlationId) => {
            const errorMeta = {
                service: serviceName,
                ...meta,
                correlationId,
                ...(error instanceof Error && {
                    errorName: error.name,
                    errorMessage: error.message,
                    errorStack: error.stack
                })
            };
            exports.logger.error(message, errorMeta);
        },
        debug: (message, meta, correlationId) => exports.logger.debug(message, { service: serviceName, ...meta, correlationId })
    };
};
exports.createServiceLogger = createServiceLogger;
