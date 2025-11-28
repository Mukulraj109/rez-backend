/**
 * Price Tracking Controller
 *
 * Handles price history and price alert operations:
 * - Get price history for products
 * - Create price alerts
 * - Manage price alert subscriptions
 * - Get price statistics and trends
 */
import { Request, Response } from 'express';
/**
 * Get price history for a product
 * GET /api/price-tracking/history/:productId
 */
export declare const getPriceHistory: (req: Request, res: Response) => Promise<void>;
/**
 * Get price statistics for a product
 * GET /api/price-tracking/stats/:productId
 */
export declare const getPriceStats: (req: Request, res: Response) => Promise<void>;
/**
 * Create a price alert
 * POST /api/price-tracking/alerts
 */
export declare const createPriceAlert: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get user's price alerts
 * GET /api/price-tracking/alerts/my-alerts
 */
export declare const getMyAlerts: (req: Request, res: Response) => Promise<void>;
/**
 * Check if user has active alert for product
 * GET /api/price-tracking/alerts/check/:productId
 */
export declare const checkAlert: (req: Request, res: Response) => Promise<void>;
/**
 * Cancel a price alert
 * DELETE /api/price-tracking/alerts/:alertId
 */
export declare const cancelAlert: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get alert statistics for a product (Admin/Store)
 * GET /api/price-tracking/alerts/stats/:productId
 */
export declare const getAlertStats: (req: Request, res: Response) => Promise<void>;
/**
 * Record price change (System endpoint)
 * POST /api/price-tracking/record-price
 */
export declare const recordPriceChange: (req: Request, res: Response) => Promise<void>;
/**
 * Cleanup old data (Cron job endpoint)
 * POST /api/price-tracking/cleanup
 */
export declare const cleanupOldData: (req: Request, res: Response) => Promise<void>;
