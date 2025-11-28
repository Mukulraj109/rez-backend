import { Request, Response } from 'express';
/**
 * Get all notifications for merchant with filters and pagination
 * Enhanced with type, status, sorting filters
 */
export declare const getMerchantNotifications: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get unread notifications only
 * Returns most recent 50 unread notifications
 */
export declare const getUnreadNotifications: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Mark multiple notifications as read
 * Bulk update operation
 */
export declare const markMultipleAsRead: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Delete multiple notifications
 * Soft delete using deletedAt timestamp
 */
export declare const deleteMultipleNotifications: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Archive a single notification
 * Sets archived flag to true
 */
export declare const archiveNotification: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Clear all notifications (soft delete)
 * Optionally filter by read status
 */
export declare const clearAllNotifications: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get archived notifications
 * With pagination support
 */
export declare const getArchivedNotifications: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Send test notification
 * For testing notification preferences and delivery
 */
export declare const sendTestNotification: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get notification preferences
 * Returns user's notification preferences
 */
export declare const getNotificationPreferences: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Update notification preferences
 * Updates user's notification preferences
 */
export declare const updateNotificationPreferences: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get single notification by ID
 * Returns detailed notification information
 */
export declare const getNotificationById: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Mark single notification as read
 * Updates read status for a specific notification
 */
export declare const markNotificationAsRead: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Delete single notification
 * Soft delete using deletedAt timestamp
 */
export declare const deleteNotification: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get notification statistics
 * Returns aggregated stats for notifications
 */
export declare const getNotificationStats: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Subscribe to email notifications
 * Enable email notifications in user preferences
 */
export declare const subscribeToEmail: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Unsubscribe from email notifications
 * Disable email notifications in user preferences
 */
export declare const unsubscribeFromEmail: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Subscribe to SMS notifications
 * Enable SMS notifications in user preferences
 */
export declare const subscribeToSMS: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Unsubscribe from SMS notifications
 * Disable SMS notifications in user preferences
 */
export declare const unsubscribeFromSMS: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get unread notifications count only
 * Fast endpoint for badge counts
 */
export declare const getUnreadCount: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Mark all notifications as read
 * Bulk operation to mark all unread notifications as read
 */
export declare const markAllAsRead: (req: Request, res: Response, next: import("express").NextFunction) => void;
