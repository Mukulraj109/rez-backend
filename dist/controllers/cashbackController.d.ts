import { Request, Response } from 'express';
/**
 * Get cashback summary
 * GET /api/cashback/summary
 */
export declare const getCashbackSummary: (req: Request, res: Response) => Promise<void>;
/**
 * Get cashback history with filters
 * GET /api/cashback/history
 */
export declare const getCashbackHistory: (req: Request, res: Response) => Promise<void>;
/**
 * Get pending cashback ready for credit
 * GET /api/cashback/pending
 */
export declare const getPendingCashback: (req: Request, res: Response) => Promise<void>;
/**
 * Get expiring soon cashback
 * GET /api/cashback/expiring-soon
 */
export declare const getExpiringSoon: (req: Request, res: Response) => Promise<void>;
/**
 * Redeem pending cashback
 * POST /api/cashback/redeem
 */
export declare const redeemCashback: (req: Request, res: Response) => Promise<void>;
/**
 * Get active cashback campaigns
 * GET /api/cashback/campaigns
 */
export declare const getCashbackCampaigns: (req: Request, res: Response) => Promise<void>;
/**
 * Forecast cashback for cart
 * POST /api/cashback/forecast
 */
export declare const forecastCashback: (req: Request, res: Response) => Promise<void>;
/**
 * Get cashback statistics
 * GET /api/cashback/statistics
 */
export declare const getCashbackStatistics: (req: Request, res: Response) => Promise<void>;
