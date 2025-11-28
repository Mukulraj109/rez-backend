"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.catchAsync = exports.asyncHandler = void 0;
// Async handler to catch errors in async route handlers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// Alternative async handler with explicit typing
const catchAsync = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => next(error));
    };
};
exports.catchAsync = catchAsync;
