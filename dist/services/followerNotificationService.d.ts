import { Types } from 'mongoose';
/**
 * Follower Notification Service
 * Manages notifications for store followers
 */
interface NotificationPayload {
    title: string;
    message: string;
    type: 'new_offer' | 'new_product' | 'price_drop' | 'back_in_stock' | 'store_update' | 'new_menu_item';
    data?: Record<string, any>;
    imageUrl?: string;
    deepLink?: string;
}
interface NotificationResult {
    sent: number;
    failed: number;
    totalFollowers: number;
}
/**
 * Get all followers of a store
 * @param storeId - Store ID
 * @returns Array of user IDs who follow the store
 */
export declare function getStoreFollowers(storeId: string | Types.ObjectId): Promise<string[]>;
/**
 * Get follower count for a store
 * @param storeId - Store ID
 * @returns Number of followers
 */
export declare function getStoreFollowerCount(storeId: string | Types.ObjectId): Promise<number>;
/**
 * Send notification to all followers of a store
 * @param storeId - Store ID
 * @param notification - Notification payload
 * @returns Result with sent/failed counts
 */
export declare function notifyFollowers(storeId: string | Types.ObjectId, notification: NotificationPayload): Promise<NotificationResult>;
/**
 * Notify followers about a new offer
 * @param storeId - Store ID
 * @param offer - Offer details
 * @returns Result with sent/failed counts
 */
export declare function notifyNewOffer(storeId: string | Types.ObjectId, offer: {
    _id: string | Types.ObjectId;
    title: string;
    description?: string;
    discount?: number;
    imageUrl?: string;
}): Promise<NotificationResult>;
/**
 * Notify followers about a new product
 * @param storeId - Store ID
 * @param product - Product details
 * @returns Result with sent/failed counts
 */
export declare function notifyNewProduct(storeId: string | Types.ObjectId, product: {
    _id: string | Types.ObjectId;
    name: string;
    description?: string;
    pricing?: {
        selling?: number;
    };
    images?: {
        url: string;
    }[];
    slug?: string;
}): Promise<NotificationResult>;
/**
 * Notify followers about a price drop
 * @param storeId - Store ID
 * @param product - Product details
 * @param oldPrice - Previous price
 * @param newPrice - New price
 * @returns Result with sent/failed counts
 */
export declare function notifyPriceDrop(storeId: string | Types.ObjectId, product: {
    _id: string | Types.ObjectId;
    name: string;
    slug?: string;
    images?: {
        url: string;
    }[];
}, oldPrice: number, newPrice: number): Promise<NotificationResult>;
/**
 * Notify followers about back in stock product
 * @param storeId - Store ID
 * @param product - Product details
 * @returns Result with sent/failed counts
 */
export declare function notifyBackInStock(storeId: string | Types.ObjectId, product: {
    _id: string | Types.ObjectId;
    name: string;
    slug?: string;
    images?: {
        url: string;
    }[];
}): Promise<NotificationResult>;
/**
 * Notify followers about a new menu item (for restaurants)
 * @param storeId - Store ID
 * @param menuItem - Menu item details
 * @returns Result with sent/failed counts
 */
export declare function notifyNewMenuItem(storeId: string | Types.ObjectId, menuItem: {
    _id: string | Types.ObjectId;
    name: string;
    description?: string;
    price?: number;
    image?: string;
}): Promise<NotificationResult>;
/**
 * Notify followers about a store update/announcement
 * @param storeId - Store ID
 * @param announcement - Announcement details
 * @returns Result with sent/failed counts
 */
export declare function notifyStoreUpdate(storeId: string | Types.ObjectId, announcement: {
    title: string;
    message: string;
    imageUrl?: string;
}): Promise<NotificationResult>;
/**
 * Send bulk notifications to multiple stores' followers
 * @param notifications - Array of store IDs with their notifications
 * @returns Array of results
 */
export declare function notifyMultipleStoreFollowers(notifications: Array<{
    storeId: string | Types.ObjectId;
    notification: NotificationPayload;
}>): Promise<NotificationResult[]>;
declare const _default: {
    getStoreFollowers: typeof getStoreFollowers;
    getStoreFollowerCount: typeof getStoreFollowerCount;
    notifyFollowers: typeof notifyFollowers;
    notifyNewOffer: typeof notifyNewOffer;
    notifyNewProduct: typeof notifyNewProduct;
    notifyPriceDrop: typeof notifyPriceDrop;
    notifyBackInStock: typeof notifyBackInStock;
    notifyNewMenuItem: typeof notifyNewMenuItem;
    notifyStoreUpdate: typeof notifyStoreUpdate;
    notifyMultipleStoreFollowers: typeof notifyMultipleStoreFollowers;
};
export default _default;
