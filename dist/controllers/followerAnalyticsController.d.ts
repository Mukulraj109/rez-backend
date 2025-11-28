import { Request, Response } from 'express';
/**
 * GET /api/stores/:storeId/followers/analytics/detailed
 * Get detailed follower analytics for a store
 */
export declare const getDetailedFollowerAnalytics: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/stores/:storeId/followers/analytics/growth
 * Get growth metrics for a store
 */
export declare const getFollowerGrowthMetrics: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/stores/:storeId/followers/count
 * Get current follower count for a store
 */
export declare const getFollowerCount: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/stores/:storeId/followers/analytics/snapshot
 * Manually trigger daily snapshot (admin only)
 */
export declare const triggerDailySnapshot: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/stores/:storeId/followers/analytics/summary
 * Get a quick summary of follower analytics
 */
export declare const getFollowerAnalyticsSummary: (req: Request, res: Response) => Promise<void>;
