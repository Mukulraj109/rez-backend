"use strict";
/**
 * Stock Socket Service
 *
 * This service manages real-time stock updates using Socket.IO.
 * It provides functions to emit stock-related events to connected clients.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLowStockThreshold = exports.getIO = exports.emitOutOfStock = exports.emitStockLow = exports.emitStockUpdate = exports.initialize = void 0;
const socket_1 = require("../types/socket");
const stockNotificationService_1 = __importDefault(require("./stockNotificationService"));
const cacheHelper_1 = require("../utils/cacheHelper");
/**
 * Stock Socket Service Class
 * Manages all stock-related real-time communications
 */
class StockSocketService {
    constructor() {
        this.io = null;
        // Stock threshold for "low stock" warning (can be configured)
        this.LOW_STOCK_THRESHOLD = 10;
    }
    /**
     * Get singleton instance of StockSocketService
     */
    static getInstance() {
        if (!StockSocketService.instance) {
            StockSocketService.instance = new StockSocketService();
        }
        return StockSocketService.instance;
    }
    /**
     * Initialize the Socket.IO server
     * @param io - Socket.IO server instance
     */
    initialize(io) {
        this.io = io;
        this.setupSocketHandlers();
        console.log('✅ Stock Socket Service initialized');
    }
    /**
     * Setup socket event handlers
     */
    setupSocketHandlers() {
        if (!this.io)
            return;
        this.io.on(socket_1.SocketEvent.CONNECTION, (socket) => {
            console.log(`📡 Client connected to stock updates: ${socket.id}`);
            // Handle client joining specific rooms
            socket.on(socket_1.SocketEvent.JOIN_ROOM, (roomName) => {
                socket.join(roomName);
                console.log(`👤 Client ${socket.id} joined room: ${roomName}`);
            });
            // Handle client leaving specific rooms
            socket.on(socket_1.SocketEvent.LEAVE_ROOM, (roomName) => {
                socket.leave(roomName);
                console.log(`👤 Client ${socket.id} left room: ${roomName}`);
            });
            socket.on(socket_1.SocketEvent.DISCONNECT, () => {
                console.log(`📡 Client disconnected from stock updates: ${socket.id}`);
            });
        });
    }
    /**
     * Emit stock update event
     * @param productId - Product ID
     * @param newStock - New stock quantity
     * @param options - Additional options
     */
    async emitStockUpdate(productId, newStock, options) {
        if (!this.io) {
            console.warn('⚠️ Socket.IO not initialized. Cannot emit stock update.');
            return;
        }
        const payload = {
            productId,
            newStock,
            storeId: options?.storeId,
            previousStock: options?.previousStock,
            timestamp: new Date(),
            reason: options?.reason,
        };
        // Emit to product-specific room
        this.io.to(socket_1.SocketRoom.product(productId)).emit(socket_1.SocketEvent.STOCK_UPDATED, payload);
        // If store is specified, also emit to store room
        if (options?.storeId) {
            this.io.to(socket_1.SocketRoom.store(options.storeId)).emit(socket_1.SocketEvent.STOCK_UPDATED, payload);
        }
        // Emit to all users room
        this.io.to(socket_1.SocketRoom.allUsers).emit(socket_1.SocketEvent.STOCK_UPDATED, payload);
        console.log(`📦 Stock updated: Product ${productId}, New Stock: ${newStock}`);
        // Invalidate stock and product cache asynchronously
        cacheHelper_1.CacheInvalidator.invalidateStock(productId).catch(error => {
            console.error(`❌ Error invalidating stock cache for product ${productId}:`, error);
        });
        // Check if stock was 0 and now is > 0 (back in stock) - trigger notifications
        const wasOutOfStock = options?.previousStock === 0;
        const isNowInStock = newStock > 0;
        if (wasOutOfStock && isNowInStock) {
            console.log(`🔔 Product ${productId} is back in stock! Notifying subscribers...`);
            // Notify subscribers asynchronously (don't await to not block socket emission)
            stockNotificationService_1.default.notifySubscribers({
                productId,
                productName: options?.productName || 'Product',
                productImage: options?.productImage || '',
                productPrice: options?.productPrice || 0,
                newStock
            }).catch(error => {
                console.error(`❌ Error notifying subscribers for product ${productId}:`, error);
            });
        }
        // Check if stock is low and emit low stock warning
        if (newStock > 0 && newStock <= this.LOW_STOCK_THRESHOLD) {
            this.emitStockLow(productId, newStock, options?.storeId, options?.productName);
        }
        // Check if stock is out and emit out of stock event
        if (newStock === 0) {
            this.emitOutOfStock(productId, options?.storeId, options?.productName);
        }
    }
    /**
     * Emit low stock warning event
     * @param productId - Product ID
     * @param currentStock - Current stock quantity
     * @param storeId - Optional store ID
     * @param productName - Optional product name
     */
    emitStockLow(productId, currentStock, storeId, productName) {
        if (!this.io) {
            console.warn('⚠️ Socket.IO not initialized. Cannot emit low stock warning.');
            return;
        }
        const payload = {
            productId,
            storeId,
            currentStock,
            threshold: this.LOW_STOCK_THRESHOLD,
            timestamp: new Date(),
            productName,
        };
        // Emit to product-specific room
        this.io.to(socket_1.SocketRoom.product(productId)).emit(socket_1.SocketEvent.STOCK_LOW, payload);
        // If store is specified, also emit to store room and merchant room
        if (storeId) {
            this.io.to(socket_1.SocketRoom.store(storeId)).emit(socket_1.SocketEvent.STOCK_LOW, payload);
            // Merchants should be notified about low stock in their stores
            this.io.to(socket_1.SocketRoom.allMerchants).emit(socket_1.SocketEvent.STOCK_LOW, payload);
        }
        console.log(`⚠️ Low stock warning: Product ${productId}, Stock: ${currentStock}`);
    }
    /**
     * Emit out of stock event
     * @param productId - Product ID
     * @param storeId - Optional store ID
     * @param productName - Optional product name
     */
    emitOutOfStock(productId, storeId, productName) {
        if (!this.io) {
            console.warn('⚠️ Socket.IO not initialized. Cannot emit out of stock event.');
            return;
        }
        const payload = {
            productId,
            storeId,
            timestamp: new Date(),
            productName,
            lastAvailable: new Date(),
        };
        // Emit to product-specific room
        this.io.to(socket_1.SocketRoom.product(productId)).emit(socket_1.SocketEvent.STOCK_OUT_OF_STOCK, payload);
        // If store is specified, also emit to store room
        if (storeId) {
            this.io.to(socket_1.SocketRoom.store(storeId)).emit(socket_1.SocketEvent.STOCK_OUT_OF_STOCK, payload);
            // Merchants should be notified about out of stock products
            this.io.to(socket_1.SocketRoom.allMerchants).emit(socket_1.SocketEvent.STOCK_OUT_OF_STOCK, payload);
        }
        // Emit to all users room
        this.io.to(socket_1.SocketRoom.allUsers).emit(socket_1.SocketEvent.STOCK_OUT_OF_STOCK, payload);
        console.log(`🚫 Out of stock: Product ${productId}`);
    }
    /**
     * Get the Socket.IO server instance
     */
    getIO() {
        return this.io;
    }
    /**
     * Set custom low stock threshold
     * @param threshold - New threshold value
     */
    setLowStockThreshold(threshold) {
        if (threshold < 0) {
            console.warn('⚠️ Invalid threshold value. Must be >= 0.');
            return;
        }
        this.LOW_STOCK_THRESHOLD = threshold;
        console.log(`✅ Low stock threshold updated to: ${threshold}`);
    }
}
// Export singleton instance methods
const stockSocketService = StockSocketService.getInstance();
exports.default = stockSocketService;
// Export individual functions for easier use
exports.initialize = stockSocketService.initialize, exports.emitStockUpdate = stockSocketService.emitStockUpdate, exports.emitStockLow = stockSocketService.emitStockLow, exports.emitOutOfStock = stockSocketService.emitOutOfStock, exports.getIO = stockSocketService.getIO, exports.setLowStockThreshold = stockSocketService.setLowStockThreshold;
