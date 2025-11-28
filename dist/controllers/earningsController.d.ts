import { Request, Response } from 'express';
/**
 * Get user's complete earnings summary
 * GET /api/earnings/summary
 * @returns Total earnings with breakdown by source (projects, referrals, shareAndEarn, spin)
 */
export declare const getEarningsSummary: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get user's project statistics
 * GET /api/earnings/project-stats
 * @returns Project status counts (completeNow, inReview, completed)
 */
export declare const getProjectStats: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get user's earning notifications
 * GET /api/earnings/notifications
 * @returns List of notifications related to earnings
 */
export declare const getNotifications: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Mark notification as read
 * PATCH /api/earnings/notifications/:id/read
 * @returns Success message
 */
export declare const markNotificationAsRead: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get user's referral information
 * GET /api/earnings/referral-info
 * @returns Referral stats and referral link
 */
export declare const getReferralInfo: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get user's earnings history
 * GET /api/earnings/history
 * @returns List of earnings transactions with summary
 */
export declare const getEarningsHistory: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Withdraw earnings
 * POST /api/earnings/withdraw
 * @returns Withdrawal transaction details
 */
export declare const withdrawEarnings: (req: Request, res: Response, next: import("express").NextFunction) => void;
