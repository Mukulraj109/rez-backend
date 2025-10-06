"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStockSubscription = exports.checkStockSubscription = exports.getMyStockSubscriptions = exports.unsubscribeFromStockNotification = exports.subscribeToStockNotification = void 0;
const stockNotificationService_1 = __importDefault(require("../services/stockNotificationService"));
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const errorHandler_1 = require("../middleware/errorHandler");
/**
 * Subscribe to product stock notifications
 * POST /api/stock-notifications/subscribe
 */
exports.subscribeToStockNotification = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { productId, method = 'push' } = req.body;
    if (!productId) {
        return (0, response_1.sendError)(res, 'Product ID is required', 400);
    }
    try {
        const subscription = await stockNotificationService_1.default.subscribeToProduct({
            userId,
            productId,
            method
        });
        (0, response_1.sendSuccess)(res, {
            subscription,
            message: "You'll be notified when this product is back in stock"
        }, 'Subscribed successfully', 201);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Product not found') {
                return (0, response_1.sendNotFound)(res, 'Product not found');
            }
            if (error.message === 'User not found') {
                return (0, response_1.sendNotFound)(res, 'User not found');
            }
        }
        throw new errorHandler_1.AppError('Failed to subscribe to stock notification', 500);
    }
});
/**
 * Unsubscribe from product stock notifications
 * POST /api/stock-notifications/unsubscribe
 */
exports.unsubscribeFromStockNotification = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { productId } = req.body;
    if (!productId) {
        return (0, response_1.sendError)(res, 'Product ID is required', 400);
    }
    try {
        const success = await stockNotificationService_1.default.unsubscribeFromProduct(userId, productId);
        if (!success) {
            return (0, response_1.sendNotFound)(res, 'No active subscription found');
        }
        (0, response_1.sendSuccess)(res, null, 'Unsubscribed from stock notifications successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to unsubscribe from stock notification', 500);
    }
});
/**
 * Get user's stock notification subscriptions
 * GET /api/stock-notifications/my-subscriptions
 */
exports.getMyStockSubscriptions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { status } = req.query;
    try {
        const subscriptions = await stockNotificationService_1.default.getUserSubscriptions(userId, status);
        (0, response_1.sendSuccess)(res, {
            subscriptions,
            total: subscriptions.length
        }, 'Subscriptions retrieved successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to retrieve subscriptions', 500);
    }
});
/**
 * Check if user is subscribed to a product
 * GET /api/stock-notifications/check/:productId
 */
exports.checkStockSubscription = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { productId } = req.params;
    if (!productId) {
        return (0, response_1.sendError)(res, 'Product ID is required', 400);
    }
    try {
        const isSubscribed = await stockNotificationService_1.default.isUserSubscribed(userId, productId);
        (0, response_1.sendSuccess)(res, { isSubscribed }, 'Subscription status retrieved');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to check subscription status', 500);
    }
});
/**
 * Delete a stock notification subscription
 * DELETE /api/stock-notifications/:notificationId
 */
exports.deleteStockSubscription = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { notificationId } = req.params;
    if (!notificationId) {
        return (0, response_1.sendError)(res, 'Notification ID is required', 400);
    }
    try {
        const success = await stockNotificationService_1.default.deleteSubscription(userId, notificationId);
        if (!success) {
            return (0, response_1.sendNotFound)(res, 'Subscription not found');
        }
        (0, response_1.sendSuccess)(res, null, 'Subscription deleted successfully');
    }
    catch (error) {
        throw new errorHandler_1.AppError('Failed to delete subscription', 500);
    }
});
