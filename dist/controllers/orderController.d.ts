import { Request, Response } from 'express';
export declare const createOrder: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getUserOrders: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getOrderById: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const cancelOrder: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const updateOrderStatus: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getOrderTracking: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const rateOrder: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getOrderStats: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const reorderFullOrder: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const reorderItems: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const validateReorder: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getFrequentlyOrdered: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getReorderSuggestions: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Request refund for an order (user-facing)
 * POST /api/orders/:orderId/refund-request
 */
export declare const requestRefund: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get refund history for user
 * GET /api/orders/refunds
 */
export declare const getUserRefunds: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get refund details
 * GET /api/orders/refunds/:refundId
 */
export declare const getRefundDetails: (req: Request, res: Response, next: import("express").NextFunction) => void;
