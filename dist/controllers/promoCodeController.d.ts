import { Request, Response } from 'express';
/**
 * Validate a promo code
 * POST /api/promo-codes/validate
 * Public endpoint (requires authentication)
 */
export declare const validatePromoCode: (req: Request, res: Response) => Promise<any>;
/**
 * Get available promo codes for current user
 * GET /api/promo-codes/available
 * Protected endpoint
 */
export declare const getAvailablePromoCodes: (req: Request, res: Response) => Promise<any>;
/**
 * Create a new promo code
 * POST /api/promo-codes
 * Admin only
 */
export declare const createPromoCode: (req: Request, res: Response) => Promise<any>;
/**
 * Get all promo codes
 * GET /api/promo-codes
 * Admin only
 */
export declare const getAllPromoCodes: (req: Request, res: Response) => Promise<void>;
/**
 * Get specific promo code
 * GET /api/promo-codes/:id
 * Admin only
 */
export declare const getPromoCode: (req: Request, res: Response) => Promise<any>;
/**
 * Update promo code
 * PATCH /api/promo-codes/:id
 * Admin only
 */
export declare const updatePromoCode: (req: Request, res: Response) => Promise<any>;
/**
 * Deactivate promo code
 * DELETE /api/promo-codes/:id
 * Admin only
 */
export declare const deactivatePromoCode: (req: Request, res: Response) => Promise<any>;
/**
 * Get promo code usage statistics
 * GET /api/promo-codes/:id/usage
 * Admin only
 */
export declare const getPromoCodeUsage: (req: Request, res: Response) => Promise<any>;
/**
 * Get promo code analytics
 * GET /api/promo-codes/analytics/overview
 * Admin only
 */
export declare const getPromoCodeAnalytics: (req: Request, res: Response) => Promise<void>;
