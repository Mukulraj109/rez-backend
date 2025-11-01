"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.globalErrorHandler = exports.AppError = void 0;
const response_1 = require("../utils/response");
// Custom error class
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
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
    console.error('❌ Validation Error Details:', JSON.stringify(errors, null, 2));
    const message = errors.length > 0
        ? `Validation failed: ${errors.map((e) => `${e.field} - ${e.message}`).join(', ')}`
        : 'Validation failed';
    return new AppError(message, 400);
};
// Handle Mongoose duplicate key errors
const handleDuplicateKeyError = (error) => {
    const field = Object.keys(error.keyValue)[0];
    return new AppError(`${field} already exists`, 409);
};
// Handle Mongoose cast errors
const handleCastError = (error) => {
    return new AppError(`Invalid ${error.path}: ${error.value}`, 400);
};
// Handle JWT errors
const handleJWTError = () => {
    return new AppError('Invalid token. Please log in again', 401);
};
const handleJWTExpiredError = () => {
    return new AppError('Token expired. Please log in again', 401);
};
// Global error handling middleware
const globalErrorHandler = (error, req, res, next) => {
    let err = { ...error };
    err.message = error.message;
    console.error('Error:', error);
    // Mongoose validation error
    if (error.name === 'ValidationError') {
        err = handleValidationError(error);
    }
    // Mongoose duplicate key error
    if (error.code === 11000) {
        err = handleDuplicateKeyError(error);
    }
    // Mongoose cast error
    if (error.name === 'CastError') {
        err = handleCastError(error);
    }
    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        err = handleJWTError();
    }
    if (error.name === 'TokenExpiredError') {
        err = handleJWTExpiredError();
    }
    // Send error response
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : 'Something went wrong';
    if (process.env.NODE_ENV === 'development') {
        return res.status(statusCode).json({
            success: false,
            error: err,
            message: err.message,
            stack: err.stack
        });
    }
    // Production error response
    if (err.isOperational) {
        return (0, response_1.sendError)(res, message, statusCode);
    }
    // Programming or other unknown error: don't leak error details
    console.error('ERROR:', err);
    return (0, response_1.sendInternalError)(res, 'Something went wrong');
};
exports.globalErrorHandler = globalErrorHandler;
// 404 handler for undefined routes
const notFoundHandler = (req, res, next) => {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
