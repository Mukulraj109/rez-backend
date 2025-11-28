"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withErrorLogging = exports.asyncHandler = exports.notFoundHandler = exports.globalErrorHandler = exports.AppError = void 0;
const response_1 = require("../utils/response");
const logger_1 = require("../config/logger");
const errorLogger = (0, logger_1.createServiceLogger)('ErrorHandler');
// Custom error class
class AppError extends Error {
    constructor(message, statusCode, context, originalError) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.context = context;
        this.originalError = originalError;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// Handle Mongoose validation errors
const handleValidationError = (error) => {
    const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message
    }));
    errorLogger.warn('Validation error', {
        errorCount: errors.length,
        fields: errors.map((e) => e.field),
        details: errors
    });
    const message = errors.length > 0
        ? `Validation failed: ${errors.map((e) => `${e.field} - ${e.message}`).join(', ')}`
        : 'Validation failed';
    return new AppError(message, 400, 'VALIDATION_ERROR', error);
};
// Handle Mongoose duplicate key errors
const handleDuplicateKeyError = (error) => {
    const field = Object.keys(error.keyValue)[0];
    errorLogger.warn('Duplicate key error', { field, value: error.keyValue[field] });
    return new AppError(`${field} already exists`, 409, 'DUPLICATE_KEY_ERROR', error);
};
// Handle Mongoose cast errors
const handleCastError = (error) => {
    errorLogger.warn('Cast error', { path: error.path, value: error.value });
    return new AppError(`Invalid ${error.path}: ${error.value}`, 400, 'CAST_ERROR', error);
};
// Handle JWT errors
const handleJWTError = () => {
    errorLogger.warn('Invalid JWT token');
    return new AppError('Invalid token. Please log in again', 401, 'JWT_INVALID');
};
const handleJWTExpiredError = () => {
    errorLogger.warn('JWT token expired');
    return new AppError('Token expired. Please log in again', 401, 'JWT_EXPIRED');
};
// Handle Twilio errors
const handleTwilioError = (error) => {
    errorLogger.error('Twilio service error', error, {
        errorCode: error.code,
        errorMessage: error.message,
        status: error.status
    });
    return new AppError('SMS service unavailable. Please try again later', 503, 'TWILIO_ERROR', error);
};
// Handle SendGrid errors
const handleSendGridError = (error) => {
    errorLogger.error('SendGrid service error', error, {
        errorCode: error.code,
        errorMessage: error.message,
        response: error.response?.body
    });
    return new AppError('Email service unavailable. Please try again later', 503, 'SENDGRID_ERROR', error);
};
// Handle Stripe errors
const handleStripeError = (error) => {
    const context = `Stripe error: ${error.code}`;
    errorLogger.error(context, error, {
        errorCode: error.code,
        errorType: error.type,
        message: error.message,
        statusCode: error.statusCode
    });
    const statusMap = {
        'card_error': 400,
        'rate_limit_error': 429,
        'authentication_error': 401,
        'api_connection_error': 503,
        'invalid_request_error': 400
    };
    const statusCode = statusMap[error.type] || 500;
    return new AppError(error.message || 'Payment processing error', statusCode, 'STRIPE_ERROR', error);
};
// Handle Razorpay errors
const handleRazorpayError = (error) => {
    errorLogger.error('Razorpay service error', error, {
        errorCode: error.code,
        errorDescription: error.description,
        source: error.source
    });
    return new AppError('Payment service error. Please try again', 503, 'RAZORPAY_ERROR', error);
};
// Handle database errors
const handleDatabaseError = (error) => {
    errorLogger.error('Database error', error, {
        name: error.name,
        message: error.message,
        code: error.code
    });
    return new AppError('Database operation failed. Please try again', 503, 'DATABASE_ERROR', error);
};
// Handle timeout errors
const handleTimeoutError = (error) => {
    errorLogger.warn('Request timeout', { message: error.message });
    return new AppError('Request timeout. Please try again', 408, 'TIMEOUT_ERROR', error);
};
// Global error handling middleware
const globalErrorHandler = (error, req, res, next) => {
    const correlationId = req.correlationId;
    const userId = req.userId;
    let err = { ...error };
    err.message = error.message;
    // Log the error with context
    errorLogger.error(`${req.method} ${req.path} - Error occurred`, error, {
        method: req.method,
        path: req.path,
        query: (0, logger_1.sanitizeLog)(req.query),
        body: (0, logger_1.sanitizeLog)(req.body),
        userId,
        correlationId,
        errorName: error.name,
        errorMessage: error.message
    }, correlationId);
    // Mongoose validation error
    if (error.name === 'ValidationError') {
        err = handleValidationError(error);
    }
    // Mongoose duplicate key error
    else if (error.code === 11000) {
        err = handleDuplicateKeyError(error);
    }
    // Mongoose cast error
    else if (error.name === 'CastError') {
        err = handleCastError(error);
    }
    // JWT errors
    else if (error.name === 'JsonWebTokenError') {
        err = handleJWTError();
    }
    else if (error.name === 'TokenExpiredError') {
        err = handleJWTExpiredError();
    }
    // External service errors
    else if (error.message && error.message.includes('Twilio')) {
        err = handleTwilioError(error);
    }
    else if (error.message && error.message.includes('SendGrid')) {
        err = handleSendGridError(error);
    }
    else if (error.type && error.type.includes('StripeInvalid')) {
        err = handleStripeError(error);
    }
    else if (error.statusCode === 400 && error.description) {
        err = handleRazorpayError(error);
    }
    else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
        err = handleDatabaseError(error);
    }
    else if (error.code === 'ETIMEDOUT' || error.message === 'timeout') {
        err = handleTimeoutError(error);
    }
    else if (!(error instanceof AppError)) {
        err = new AppError('An unexpected error occurred', 500, 'INTERNAL_SERVER_ERROR', error);
    }
    // Send error response
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : 'Something went wrong';
    // Log the response status
    if (statusCode >= 500) {
        errorLogger.error(`Error response - ${statusCode}`, null, {
            correlationId,
            statusCode,
            message,
            context: err.context
        }, correlationId);
    }
    else {
        errorLogger.warn(`Client error - ${statusCode}`, {
            correlationId,
            statusCode,
            message,
            context: err.context
        }, correlationId);
    }
    if (process.env.NODE_ENV === 'development') {
        return res.status(statusCode).json({
            success: false,
            error: {
                message: err.message,
                context: err.context,
                statusCode: err.statusCode,
                ...(err.originalError && { originalError: err.originalError.message })
            },
            stack: err.stack,
            correlationId
        });
    }
    // Production error response
    if (err.isOperational) {
        return (0, response_1.sendError)(res, message, statusCode);
    }
    // Programming or other unknown error: don't leak error details
    return (0, response_1.sendInternalError)(res, 'Something went wrong');
};
exports.globalErrorHandler = globalErrorHandler;
// 404 handler for undefined routes
const notFoundHandler = (req, res, next) => {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND');
    errorLogger.warn('Not found error', {
        method: req.method,
        path: req.originalUrl
    }, req.correlationId);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
// Async error wrapper for route handlers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            errorLogger.error('Async handler error', error, {
                correlationId: req.correlationId,
                userId: req.userId
            }, req.correlationId);
            next(error);
        });
    };
};
exports.asyncHandler = asyncHandler;
// Error boundary for critical operations
const withErrorLogging = (operationName, operation, correlationId) => {
    const operationLogger = (0, logger_1.createServiceLogger)(operationName);
    return async () => {
        try {
            operationLogger.info(`Starting operation: ${operationName}`, {}, correlationId);
            const result = await operation();
            operationLogger.info(`Successfully completed: ${operationName}`, {}, correlationId);
            return result;
        }
        catch (error) {
            operationLogger.error(`Failed operation: ${operationName}`, error, {}, correlationId);
            throw error;
        }
    };
};
exports.withErrorLogging = withErrorLogging;
