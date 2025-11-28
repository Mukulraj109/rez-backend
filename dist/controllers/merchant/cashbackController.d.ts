import { Request, Response } from 'express';
/**
 * GET /api/merchant/cashback
 * List all cashback requests for merchant
 */
export declare const listCashbackRequests: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /api/merchant/cashback/stats
 * Get cashback statistics (alias for metrics)
 */
export declare const getCashbackStats: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /api/merchant/cashback/:id
 * Get single cashback request with complete details including audit trail
 */
export declare const getCashbackRequest: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * POST /api/merchant/cashback
 * Create new cashback request
 */
export declare const createCashbackRequest: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /api/merchant/cashback/:id/mark-paid
 * Mark approved cashback as paid
 */
export declare const markCashbackAsPaid: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * POST /api/merchant/cashback/bulk-action
 * Bulk approve/reject cashback requests
 */
export declare const bulkCashbackAction: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * POST /api/merchant/cashback/export
 * Export cashback data to CSV/Excel
 */
export declare const exportCashbackData: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /api/merchant/cashback/analytics
 * Get cashback analytics and trends
 */
export declare const getCashbackAnalytics: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /api/merchant/cashback/metrics
 * Get enhanced cashback metrics with trends, comparisons, and processing time analytics
 */
export declare const getCashbackMetrics: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /api/merchant/cashback/pending-count
 * Get count of pending cashback approvals (cached for 5 minutes)
 */
export declare const getPendingCashbackCount: (req: Request, res: Response, next: import("express").NextFunction) => void;
