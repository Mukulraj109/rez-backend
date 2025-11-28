import { Request, Response } from 'express';
/**
 * GET /api/vouchers/brands
 * Get all voucher brands with filters
 */
export declare const getVoucherBrands: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/vouchers/brands/:id
 * Get single voucher brand by ID
 */
export declare const getVoucherBrandById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/vouchers/brands/featured
 * Get featured voucher brands
 */
export declare const getFeaturedBrands: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/vouchers/brands/newly-added
 * Get newly added voucher brands
 */
export declare const getNewlyAddedBrands: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/vouchers/categories
 * Get voucher categories (distinct)
 */
export declare const getVoucherCategories: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/vouchers/purchase
 * Purchase a voucher (authenticated users only)
 */
export declare const purchaseVoucher: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/vouchers/my-vouchers
 * Get user's purchased vouchers
 */
export declare const getUserVouchers: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/vouchers/my-vouchers/:id
 * Get single user voucher by ID
 */
export declare const getUserVoucherById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/vouchers/:id/use
 * Mark voucher as used
 */
export declare const useVoucher: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/vouchers/brands/:id/track-view
 * Track brand view (analytics)
 */
export declare const trackBrandView: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/vouchers/hero-carousel
 * Get hero carousel items for online voucher page
 */
export declare const getHeroCarousel: (req: Request, res: Response) => Promise<void>;
