/**
 * Stock Notification Service
 *
 * Handles stock notification subscriptions and notifications
 * Integrates with Twilio for SMS and nodemailer for email
 */
import { IStockNotification } from '../models/StockNotification';
interface SubscribeParams {
    userId: string;
    productId: string;
    method?: 'email' | 'sms' | 'both' | 'push';
}
interface NotificationPayload {
    productId: string;
    productName: string;
    productImage: string;
    productPrice: number;
    newStock: number;
}
/**
 * Stock Notification Service Class
 */
declare class StockNotificationService {
    private static instance;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): StockNotificationService;
    /**
     * Subscribe user to product stock notifications
     */
    subscribeToProduct(params: SubscribeParams): Promise<IStockNotification>;
    /**
     * Unsubscribe user from product stock notifications
     */
    unsubscribeFromProduct(userId: string, productId: string): Promise<boolean>;
    /**
     * Get user's active subscriptions
     */
    getUserSubscriptions(userId: string, status?: 'pending' | 'sent' | 'cancelled'): Promise<IStockNotification[]>;
    /**
     * Check if user is subscribed to a product
     */
    isUserSubscribed(userId: string, productId: string): Promise<boolean>;
    /**
     * Notify all subscribers when product is back in stock
     * This is called from stockSocketService when stock is restored
     */
    notifySubscribers(payload: NotificationPayload): Promise<void>;
    /**
     * Send notification to user based on their preference
     */
    private sendNotification;
    /**
     * Send email notification
     */
    private sendEmailNotification;
    /**
     * Send SMS notification
     */
    private sendSMSNotification;
    /**
     * Delete a subscription
     */
    deleteSubscription(userId: string, notificationId: string): Promise<boolean>;
    /**
     * Clean up old sent/cancelled notifications (optional maintenance task)
     */
    cleanupOldNotifications(daysOld?: number): Promise<number>;
}
declare const stockNotificationService: StockNotificationService;
export default stockNotificationService;
export declare const subscribeToProduct: (params: SubscribeParams) => Promise<IStockNotification>, unsubscribeFromProduct: (userId: string, productId: string) => Promise<boolean>, getUserSubscriptions: (userId: string, status?: "pending" | "sent" | "cancelled") => Promise<IStockNotification[]>, isUserSubscribed: (userId: string, productId: string) => Promise<boolean>, notifySubscribers: (payload: NotificationPayload) => Promise<void>, deleteSubscription: (userId: string, notificationId: string) => Promise<boolean>, cleanupOldNotifications: (daysOld?: number) => Promise<number>;
