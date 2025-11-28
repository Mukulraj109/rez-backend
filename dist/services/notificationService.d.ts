import { Types } from 'mongoose';
import { INotification, INotificationData } from '../models/Notification';
/**
 * Notification Service
 * Helper functions for creating and managing notifications
 */
export interface CreateNotificationOptions {
    userId: string | Types.ObjectId;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error' | 'promotional';
    category: 'order' | 'earning' | 'general' | 'promotional' | 'social' | 'security' | 'system' | 'reminder';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    data?: INotificationData;
    deliveryChannels?: ('push' | 'email' | 'sms' | 'in_app')[];
    scheduledAt?: Date;
    expiresAt?: Date;
    source?: 'system' | 'admin' | 'automated' | 'campaign';
    template?: string;
    variables?: {
        [key: string]: any;
    };
}
export declare class NotificationService {
    /**
     * Create a new notification
     * Automatically emits Socket.IO event for real-time delivery
     */
    static createNotification(options: CreateNotificationOptions): Promise<INotification>;
    /**
     * Create bulk notifications
     * Efficient batch creation for multiple users
     */
    static createBulkNotifications(userIds: (string | Types.ObjectId)[], options: Omit<CreateNotificationOptions, 'userId'>): Promise<INotification[]>;
    /**
     * Determine delivery channels based on user preferences
     */
    private static determineDeliveryChannels;
    /**
     * Emit notification to user via Socket.IO
     */
    private static emitNotificationToUser;
    /**
     * Emit updated unread count to user
     */
    static emitUnreadCount(userId: string): Promise<void>;
    /**
     * Helper: Create order notification
     */
    static notifyOrderUpdate(userId: string | Types.ObjectId, orderId: string, status: string, orderNumber?: string): Promise<INotification>;
    /**
     * Helper: Create earning notification
     */
    static notifyEarning(userId: string | Types.ObjectId, amount: number, source: string, transactionId?: string): Promise<INotification>;
    /**
     * Helper: Create promotional notification
     */
    static notifyPromotion(userId: string | Types.ObjectId, title: string, message: string, imageUrl?: string, deepLink?: string): Promise<INotification>;
    /**
     * Helper: Create security alert
     */
    static notifySecurityAlert(userId: string | Types.ObjectId, title: string, message: string, actionRequired?: boolean): Promise<INotification>;
    /**
     * Helper: Create system notification
     */
    static notifySystem(userId: string | Types.ObjectId, title: string, message: string, priority?: 'low' | 'medium' | 'high' | 'urgent'): Promise<INotification>;
    /**
     * Helper: Create reminder notification
     */
    static notifyReminder(userId: string | Types.ObjectId, title: string, message: string, scheduledAt?: Date): Promise<INotification>;
    /**
     * Get user notification preferences
     */
    static getUserPreferences(userId: string | Types.ObjectId): Promise<any>;
    /**
     * Update user notification preferences
     */
    static updateUserPreferences(userId: string | Types.ObjectId, preferences: any): Promise<any>;
    /**
     * Mark notification as read
     */
    static markAsRead(notificationId: string, userId: string): Promise<INotification | null>;
    /**
     * Delete notification (soft delete)
     */
    static deleteNotification(notificationId: string, userId: string): Promise<boolean>;
    /**
     * Get scheduled notifications ready for delivery
     */
    static processScheduledNotifications(): Promise<number>;
    /**
     * Cleanup old notifications
     */
    static cleanupOldNotifications(daysOld?: number): Promise<number>;
}
export default NotificationService;
