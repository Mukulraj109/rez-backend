import { Request, Response } from 'express';
/**
 * Get stock history for a product
 */
export declare const getProductStockHistory: (req: Request, res: Response) => Promise<void>;
/**
 * Get stock snapshot at a specific date
 */
export declare const getStockSnapshot: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Detect stock anomalies for a store
 */
export declare const detectStockAnomalies: (req: Request, res: Response) => Promise<void>;
/**
 * Generate stock report for a date range
 */
export declare const generateStockReport: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get stock movement summary for a product
 */
export declare const getStockMovementSummary: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get low stock alerts for a store
 */
export declare const getLowStockAlerts: (req: Request, res: Response) => Promise<void>;
/**
 * Get stock value over time for a store
 */
export declare const getStockValueOverTime: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
