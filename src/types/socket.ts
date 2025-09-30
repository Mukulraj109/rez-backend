/**
 * Socket.IO Event Types and Payload Interfaces
 *
 * This file defines all Socket.IO event types and their corresponding payload structures
 * for real-time stock updates in the REZ app.
 */

/**
 * Socket.IO Event Names
 */
export enum SocketEvent {
  // Stock Events
  STOCK_UPDATED = 'stock:updated',
  STOCK_LOW = 'stock:low',
  STOCK_OUT_OF_STOCK = 'stock:outofstock',

  // Connection Events
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',

  // Room Events
  JOIN_ROOM = 'join-room',
  LEAVE_ROOM = 'leave-room',
}

/**
 * Payload for stock:updated event
 * Emitted when a product's stock quantity is updated
 */
export interface StockUpdatedPayload {
  productId: string;
  storeId?: string;
  newStock: number;
  previousStock?: number;
  timestamp: Date;
  reason?: 'purchase' | 'restock' | 'adjustment' | 'return';
}

/**
 * Payload for stock:low event
 * Emitted when a product's stock falls below a certain threshold
 */
export interface StockLowPayload {
  productId: string;
  storeId?: string;
  currentStock: number;
  threshold: number;
  timestamp: Date;
  productName?: string;
}

/**
 * Payload for stock:outofstock event
 * Emitted when a product goes out of stock
 */
export interface StockOutOfStockPayload {
  productId: string;
  storeId?: string;
  timestamp: Date;
  productName?: string;
  lastAvailable?: Date;
}

/**
 * Room naming conventions
 */
export const SocketRoom = {
  // User-specific rooms
  user: (userId: string) => `user-${userId}`,

  // Store-specific rooms
  store: (storeId: string) => `store-${storeId}`,

  // Merchant-specific rooms
  merchant: (merchantId: string) => `merchant-${merchantId}`,

  // Product-specific rooms
  product: (productId: string) => `product-${productId}`,

  // Global rooms
  allUsers: 'all-users',
  allMerchants: 'all-merchants',
} as const;

/**
 * Socket error types
 */
export interface SocketError {
  message: string;
  code?: string;
  timestamp: Date;
}

/**
 * Generic success response for socket events
 */
export interface SocketSuccessResponse {
  success: boolean;
  message: string;
  data?: any;
}