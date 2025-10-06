"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendServiceUnavailable = exports.sendInternalError = exports.sendTooManyRequests = exports.sendConflict = exports.sendForbidden = exports.sendUnauthorized = exports.sendValidationError = exports.sendBadRequest = exports.sendNotFound = exports.sendNoContent = exports.sendCreated = exports.sendPaginated = exports.sendError = exports.sendSuccess = void 0;
// Success response helper
const sendSuccess = (res, data, message = 'Success', statusCode = 200, meta) => {
    const response = {
        success: true,
        message,
        ...(data !== undefined && { data }),
        ...(meta && { meta: { ...meta, timestamp: new Date().toISOString() } })
    };
    return res.status(statusCode).json(response);
};
exports.sendSuccess = sendSuccess;
// Error response helper
const sendError = (res, message = 'An error occurred', statusCode = 500, errors) => {
    const response = {
        success: false,
        message,
        ...(errors && { errors }),
        meta: {
            timestamp: new Date().toISOString()
        }
    };
    return res.status(statusCode).json(response);
};
exports.sendError = sendError;
// Paginated response helper
const sendPaginated = (res, data, page, limit, total, message = 'Success') => {
    const pages = Math.ceil(total / limit);
    const response = {
        success: true,
        message,
        data,
        meta: {
            pagination: {
                page,
                limit,
                total,
                pages
            },
            timestamp: new Date().toISOString()
        }
    };
    return res.status(200).json(response);
};
exports.sendPaginated = sendPaginated;
// Created response helper
const sendCreated = (res, data, message = 'Resource created successfully') => {
    return (0, exports.sendSuccess)(res, data, message, 201);
};
exports.sendCreated = sendCreated;
// No content response helper
const sendNoContent = (res) => {
    return res.status(204).send();
};
exports.sendNoContent = sendNoContent;
// Not found response helper
const sendNotFound = (res, message = 'Resource not found') => {
    return (0, exports.sendError)(res, message, 404);
};
exports.sendNotFound = sendNotFound;
// Bad request response helper
const sendBadRequest = (res, message = 'Bad request') => {
    return (0, exports.sendError)(res, message, 400);
};
exports.sendBadRequest = sendBadRequest;
// Validation error response helper
const sendValidationError = (res, errors, message = 'Validation failed') => {
    return (0, exports.sendError)(res, message, 400, errors);
};
exports.sendValidationError = sendValidationError;
// Unauthorized response helper
const sendUnauthorized = (res, message = 'Authentication required') => {
    return (0, exports.sendError)(res, message, 401);
};
exports.sendUnauthorized = sendUnauthorized;
// Forbidden response helper
const sendForbidden = (res, message = 'Access forbidden') => {
    return (0, exports.sendError)(res, message, 403);
};
exports.sendForbidden = sendForbidden;
// Conflict response helper
const sendConflict = (res, message = 'Resource already exists') => {
    return (0, exports.sendError)(res, message, 409);
};
exports.sendConflict = sendConflict;
// Too many requests response helper
const sendTooManyRequests = (res, message = 'Too many requests') => {
    return (0, exports.sendError)(res, message, 429);
};
exports.sendTooManyRequests = sendTooManyRequests;
// Internal server error response helper
const sendInternalError = (res, message = 'Internal server error') => {
    return (0, exports.sendError)(res, message, 500);
};
exports.sendInternalError = sendInternalError;
// Service unavailable response helper
const sendServiceUnavailable = (res, message = 'Service temporarily unavailable') => {
    return (0, exports.sendError)(res, message, 503);
};
exports.sendServiceUnavailable = sendServiceUnavailable;
