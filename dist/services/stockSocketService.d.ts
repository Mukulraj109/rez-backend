/**
 * Stock Socket Service
 *
 * This service manages real-time stock updates using Socket.IO.
 * It provides functions to emit stock-related events to connected clients.
 */
import { Server as SocketIOServer } from 'socket.io';
/**
 * Stock Socket Service Class
 * Manages all stock-related real-time communications
 */
declare class StockSocketService {
    private io;
    private static instance;
    private readonly LOW_STOCK_THRESHOLD;
    private constructor();
    /**
     * Get singleton instance of StockSocketService
     */
    static getInstance(): StockSocketService;
    /**
     * Initialize the Socket.IO server
     * @param io - Socket.IO server instance
     */
    initialize(io: SocketIOServer): void;
    /**
     * Setup socket event handlers
     */
    private setupSocketHandlers;
    /**
     * Emit stock update event
     * @param productId - Product ID
     * @param newStock - New stock quantity
     * @param options - Additional options
     */
    emitStockUpdate(productId: string, newStock: number, options?: {
        storeId?: string;
        previousStock?: number;
        reason?: 'purchase' | 'restock' | 'adjustment' | 'return';
        productName?: string;
        productImage?: string;
        productPrice?: number;
    }): Promise<void>;
    /**
     * Emit low stock warning event
     * @param productId - Product ID
     * @param currentStock - Current stock quantity
     * @param storeId - Optional store ID
     * @param productName - Optional product name
     */
    emitStockLow(productId: string, currentStock: number, storeId?: string, productName?: string): void;
    /**
     * Emit out of stock event
     * @param productId - Product ID
     * @param storeId - Optional store ID
     * @param productName - Optional product name
     */
    emitOutOfStock(productId: string, storeId?: string, productName?: string): void;
    /**
     * Get the Socket.IO server instance
     */
    getIO(): SocketIOServer | null;
    /**
     * Set custom low stock threshold
     * @param threshold - New threshold value
     */
    setLowStockThreshold(threshold: number): void;
}
declare const stockSocketService: StockSocketService;
export default stockSocketService;
export declare const initialize: (io: SocketIOServer) => void, emitStockUpdate: (productId: string, newStock: number, options?: {
    storeId?: string;
    previousStock?: number;
    reason?: "purchase" | "restock" | "adjustment" | "return";
    productName?: string;
    productImage?: string;
    productPrice?: number;
}) => Promise<void>, emitStockLow: (productId: string, currentStock: number, storeId?: string, productName?: string) => void, emitOutOfStock: (productId: string, storeId?: string, productName?: string) => void, getIO: () => SocketIOServer | null, setLowStockThreshold: (threshold: number) => void;
