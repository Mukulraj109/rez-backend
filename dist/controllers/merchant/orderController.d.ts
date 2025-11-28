import { Request, Response } from 'express';
/**
 * GET /api/merchant/orders/:id
 * Get single order by ID
 */
export declare const getMerchantOrderById: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /api/merchant/orders
 * Enhanced endpoint with advanced filters, search, and pagination
 */
export declare const getMerchantOrders: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /api/merchant/orders/analytics
 * Proper analytics endpoint (no more fallback)
 */
export declare const getMerchantOrderAnalytics: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * POST /api/merchant/orders/bulk-action
 * Bulk order operations with transaction support
 */
export declare const bulkOrderAction: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * POST /api/merchant/orders/:id/refund
 * Process order refund with Razorpay integration
 */
export declare const refundOrder: (req: Request, res: Response, next: import("express").NextFunction) => void;
