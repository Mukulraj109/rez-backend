"use strict";
/**
 * Socket.IO Event Types and Payload Interfaces
 *
 * This file defines all Socket.IO event types and their corresponding payload structures
 * for real-time stock updates in the REZ app.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketRoom = exports.SocketEvent = void 0;
/**
 * Socket.IO Event Names
 */
var SocketEvent;
(function (SocketEvent) {
    // Stock Events
    SocketEvent["STOCK_UPDATED"] = "stock:updated";
    SocketEvent["STOCK_LOW"] = "stock:low";
    SocketEvent["STOCK_OUT_OF_STOCK"] = "stock:outofstock";
    // Notification Events
    SocketEvent["NOTIFICATION_NEW"] = "notification:new";
    SocketEvent["NOTIFICATION_READ"] = "notification:read";
    SocketEvent["NOTIFICATION_ARCHIVED"] = "notification:archived";
    SocketEvent["NOTIFICATIONS_BULK_READ"] = "notifications:bulk-read";
    SocketEvent["NOTIFICATIONS_BULK_DELETED"] = "notifications:bulk-deleted";
    SocketEvent["NOTIFICATIONS_CLEARED"] = "notifications:cleared";
    // Connection Events
    SocketEvent["CONNECTION"] = "connection";
    SocketEvent["DISCONNECT"] = "disconnect";
    // Room Events
    SocketEvent["JOIN_ROOM"] = "join-room";
    SocketEvent["LEAVE_ROOM"] = "leave-room";
})(SocketEvent || (exports.SocketEvent = SocketEvent = {}));
/**
 * Room naming conventions
 */
exports.SocketRoom = {
    // User-specific rooms
    user: (userId) => `user-${userId}`,
    // Store-specific rooms
    store: (storeId) => `store-${storeId}`,
    // Merchant-specific rooms
    merchant: (merchantId) => `merchant-${merchantId}`,
    // Product-specific rooms
    product: (productId) => `product-${productId}`,
    // Order-specific rooms
    order: (orderId) => `order-${orderId}`,
    // Global rooms
    allUsers: 'all-users',
    allMerchants: 'all-merchants',
};
