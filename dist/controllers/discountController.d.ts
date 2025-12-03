import { Request, Response } from 'express';
/**
 * GET /api/discounts
 * Get all discounts with filters
 */
export declare const getDiscounts: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/discounts/:id
 * Get single discount by ID
 */
export declare const getDiscountById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/discounts/product/:productId
 * Get available discounts for a specific product
 */
export declare const getDiscountsForProduct: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/discounts/validate
 * Validate if a discount code can be applied
 */
export declare const validateDiscount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/discounts/apply
 * Apply discount to an order (authenticated users only)
 */
export declare const applyDiscount: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/discounts/my-history
 * Get user's discount usage history (authenticated users only)
 */
export declare const getUserDiscountHistory: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/discounts/:id/analytics
 * Get analytics for a specific discount (admin only)
 */
export declare const getDiscountAnalytics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/discounts/bill-payment
 * Get available bill payment discounts
 * Supports store-specific filtering (Phase 2)
 * Returns ALL discounts (regardless of minOrderValue) - frontend handles eligibility display
 */
export declare const getBillPaymentDiscounts: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/discounts/card-offers/validate
 * Validate if a card is eligible for offers
 */
export declare const validateCardForOffers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/discounts/card-offers/apply
 * Apply a card offer to cart/order
 */
export declare const applyCardOffer: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
