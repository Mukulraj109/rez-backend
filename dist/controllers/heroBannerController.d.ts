import { Request, Response } from 'express';
/**
 * GET /api/hero-banners
 * Get active hero banners
 */
export declare const getActiveBanners: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/hero-banners/user
 * Get banners for specific user (with targeting)
 */
export declare const getBannersForUser: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/hero-banners/:id
 * Get single banner by ID
 */
export declare const getHeroBannerById: (req: Request, res: Response) => Promise<any>;
/**
 * POST /api/hero-banners/:id/view
 * Track banner view (analytics)
 */
export declare const trackBannerView: (req: Request, res: Response) => Promise<any>;
/**
 * POST /api/hero-banners/:id/click
 * Track banner click (analytics)
 */
export declare const trackBannerClick: (req: Request, res: Response) => Promise<any>;
/**
 * POST /api/hero-banners/:id/conversion
 * Track banner conversion (analytics)
 */
export declare const trackBannerConversion: (req: Request, res: Response) => Promise<any>;
