"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.catchAsync = exports.asyncHandler = void 0;
// Async handler to catch errors in async route handlers
var asyncHandler = function (fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// Alternative async handler with explicit typing
var catchAsync = function (fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(function (error) { return next(error); });
    };
};
exports.catchAsync = catchAsync;
