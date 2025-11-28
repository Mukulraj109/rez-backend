import { Request, Response } from 'express';
/**
 * Subscribe to product stock notifications
 * POST /api/stock-notifications/subscribe
 */
export declare const subscribeToStockNotification: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Unsubscribe from product stock notifications
 * POST /api/stock-notifications/unsubscribe
 */
export declare const unsubscribeFromStockNotification: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get user's stock notification subscriptions
 * GET /api/stock-notifications/my-subscriptions
 */
export declare const getMyStockSubscriptions: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Check if user is subscribed to a product
 * GET /api/stock-notifications/check/:productId
 */
export declare const checkStockSubscription: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Delete a stock notification subscription
 * DELETE /api/stock-notifications/:notificationId
 */
export declare const deleteStockSubscription: (req: Request, res: Response, next: import("express").NextFunction) => void;
