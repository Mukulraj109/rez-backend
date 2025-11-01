import { Request, Response } from 'express';
/**
 * Get all available coupons (public)
 * GET /api/user/coupons
 */
export declare const getAvailableCoupons: (req: Request, res: Response) => Promise<void>;
/**
 * Get featured/trending coupons
 * GET /api/user/coupons/featured
 */
export declare const getFeaturedCoupons: (req: Request, res: Response) => Promise<void>;
/**
 * Get user's claimed coupons
 * GET /api/user/coupons/my-coupons
 */
export declare const getMyCoupons: (req: Request, res: Response) => Promise<void>;
/**
 * Claim a coupon
 * POST /api/user/coupons/:id/claim
 */
export declare const claimCoupon: (req: Request, res: Response) => Promise<void>;
/**
 * Validate coupon for cart
 * POST /api/user/coupons/validate
 * Body: { couponCode: string, cartData: CartData }
 */
export declare const validateCoupon: (req: Request, res: Response) => Promise<void>;
/**
 * Get best coupon for cart
 * POST /api/user/coupons/best-offer
 * Body: { cartData: CartData }
 */
export declare const getBestOffer: (req: Request, res: Response) => Promise<void>;
/**
 * Remove claimed coupon (only if not used)
 * DELETE /api/user/coupons/:id
 */
export declare const removeCoupon: (req: Request, res: Response) => Promise<void>;
/**
 * Search coupons
 * GET /api/user/coupons/search?q=query
 */
export declare const searchCoupons: (req: Request, res: Response) => Promise<void>;
/**
 * Get coupon details
 * GET /api/user/coupons/:id
 */
export declare const getCouponDetails: (req: Request, res: Response) => Promise<void>;
