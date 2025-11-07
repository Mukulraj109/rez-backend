import { Request, Response } from 'express';
/**
 * Get billing history for a user
 * GET /api/billing/history
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - skip: number (for pagination, default: 0)
 * - limit: number (for pagination, default: 20)
 */
export declare const getBillingHistory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get specific invoice details
 * GET /api/billing/invoice/:transactionId
 */
export declare const getInvoice: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Download invoice as PDF
 * GET /api/billing/invoice/:transactionId/download
 *
 * Note: This is a placeholder. In production, you would:
 * 1. Use a PDF generation library (pdfkit, puppeteer, etc.)
 * 2. Generate a proper invoice PDF with company branding
 * 3. Return the PDF as a downloadable file
 */
export declare const downloadInvoice: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get billing statistics/summary
 * GET /api/billing/summary
 */
export declare const getBillingSummary: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
