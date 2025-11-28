/**
 * Socket.IO Event Types and Payload Interfaces
 *
 * This file defines all Socket.IO event types and their corresponding payload structures
 * for real-time stock updates in the REZ app.
 */
/**
 * Socket.IO Event Names
 */
export declare enum SocketEvent {
    STOCK_UPDATED = "stock:updated",
    STOCK_LOW = "stock:low",
    STOCK_OUT_OF_STOCK = "stock:outofstock",
    NOTIFICATION_NEW = "notification:new",
    NOTIFICATION_READ = "notification:read",
    NOTIFICATION_ARCHIVED = "notification:archived",
    NOTIFICATIONS_BULK_READ = "notifications:bulk-read",
    NOTIFICATIONS_BULK_DELETED = "notifications:bulk-deleted",
    NOTIFICATIONS_CLEARED = "notifications:cleared",
    CONNECTION = "connection",
    DISCONNECT = "disconnect",
    JOIN_ROOM = "join-room",
    LEAVE_ROOM = "leave-room"
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
export declare const SocketRoom: {
    readonly user: (userId: string) => string;
    readonly store: (storeId: string) => string;
    readonly merchant: (merchantId: string) => string;
    readonly product: (productId: string) => string;
    readonly order: (orderId: string) => string;
    readonly allUsers: "all-users";
    readonly allMerchants: "all-merchants";
};
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
/**
 * Payload for notification:new event
 * Emitted when a new notification is created
 */
export interface NotificationNewPayload {
    notification: any;
    timestamp: Date;
}
/**
 * Payload for notification:read event
 * Emitted when a notification is marked as read
 */
export interface NotificationReadPayload {
    notificationId: string;
    timestamp: Date;
}
/**
 * Payload for notification:archived event
 * Emitted when a notification is archived
 */
export interface NotificationArchivedPayload {
    notificationId: string;
    timestamp: Date;
}
/**
 * Payload for notifications:bulk-read event
 * Emitted when multiple notifications are marked as read
 */
export interface NotificationsBulkReadPayload {
    notificationIds: string[];
    updated: number;
    unreadCount: number;
    timestamp: Date;
}
/**
 * Payload for notifications:bulk-deleted event
 * Emitted when multiple notifications are deleted
 */
export interface NotificationsBulkDeletedPayload {
    notificationIds: string[];
    deleted: number;
    timestamp: Date;
}
/**
 * Payload for notifications:cleared event
 * Emitted when all notifications are cleared
 */
export interface NotificationsClearedPayload {
    cleared: number;
    onlyRead: boolean;
    timestamp: Date;
}
