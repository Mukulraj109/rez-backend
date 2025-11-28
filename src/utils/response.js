"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendServiceUnavailable = exports.sendInternalError = exports.sendTooManyRequests = exports.sendConflict = exports.sendForbidden = exports.sendUnauthorized = exports.sendValidationError = exports.sendBadRequest = exports.sendNotFound = exports.sendNoContent = exports.sendCreated = exports.sendPaginated = exports.sendError = exports.sendSuccess = void 0;
// Success response helper
var sendSuccess = function (res, data, message, statusCode, meta) {
    if (message === void 0) { message = 'Success'; }
    if (statusCode === void 0) { statusCode = 200; }
    var response = __assign(__assign({ success: true, message: message }, (data !== undefined && { data: data })), (meta && { meta: __assign(__assign({}, meta), { timestamp: new Date().toISOString() }) }));
    return res.status(statusCode).json(response);
};
exports.sendSuccess = sendSuccess;
// Error response helper
var sendError = function (res, message, statusCode, errors) {
    if (message === void 0) { message = 'An error occurred'; }
    if (statusCode === void 0) { statusCode = 500; }
    var response = __assign(__assign({ success: false, message: message }, (errors && { errors: errors })), { meta: {
            timestamp: new Date().toISOString()
        } });
    return res.status(statusCode).json(response);
};
exports.sendError = sendError;
// Paginated response helper
var sendPaginated = function (res, data, page, limit, total, message) {
    if (message === void 0) { message = 'Success'; }
    var pages = Math.ceil(total / limit);
    var response = {
        success: true,
        message: message,
        data: data,
        meta: {
            pagination: {
                page: page,
                limit: limit,
                total: total,
                pages: pages
            },
            timestamp: new Date().toISOString()
        }
    };
    return res.status(200).json(response);
};
exports.sendPaginated = sendPaginated;
// Created response helper
var sendCreated = function (res, data, message) {
    if (message === void 0) { message = 'Resource created successfully'; }
    return (0, exports.sendSuccess)(res, data, message, 201);
};
exports.sendCreated = sendCreated;
// No content response helper
var sendNoContent = function (res) {
    return res.status(204).send();
};
exports.sendNoContent = sendNoContent;
// Not found response helper
var sendNotFound = function (res, message) {
    if (message === void 0) { message = 'Resource not found'; }
    return (0, exports.sendError)(res, message, 404);
};
exports.sendNotFound = sendNotFound;
// Bad request response helper
var sendBadRequest = function (res, message) {
    if (message === void 0) { message = 'Bad request'; }
    return (0, exports.sendError)(res, message, 400);
};
exports.sendBadRequest = sendBadRequest;
// Validation error response helper
var sendValidationError = function (res, errors, message) {
    if (message === void 0) { message = 'Validation failed'; }
    return (0, exports.sendError)(res, message, 400, errors);
};
exports.sendValidationError = sendValidationError;
// Unauthorized response helper
var sendUnauthorized = function (res, message) {
    if (message === void 0) { message = 'Authentication required'; }
    return (0, exports.sendError)(res, message, 401);
};
exports.sendUnauthorized = sendUnauthorized;
// Forbidden response helper
var sendForbidden = function (res, message) {
    if (message === void 0) { message = 'Access forbidden'; }
    return (0, exports.sendError)(res, message, 403);
};
exports.sendForbidden = sendForbidden;
// Conflict response helper
var sendConflict = function (res, message) {
    if (message === void 0) { message = 'Resource already exists'; }
    return (0, exports.sendError)(res, message, 409);
};
exports.sendConflict = sendConflict;
// Too many requests response helper
var sendTooManyRequests = function (res, message) {
    if (message === void 0) { message = 'Too many requests'; }
    return (0, exports.sendError)(res, message, 429);
};
exports.sendTooManyRequests = sendTooManyRequests;
// Internal server error response helper
var sendInternalError = function (res, message) {
    if (message === void 0) { message = 'Internal server error'; }
    return (0, exports.sendError)(res, message, 500);
};
exports.sendInternalError = sendInternalError;
// Service unavailable response helper
var sendServiceUnavailable = function (res, message) {
    if (message === void 0) { message = 'Service temporarily unavailable'; }
    return (0, exports.sendError)(res, message, 503);
};
exports.sendServiceUnavailable = sendServiceUnavailable;
