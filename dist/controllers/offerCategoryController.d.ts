import { Request, Response } from 'express';
/**
 * GET /api/offer-categories
 * Get all active offer categories
 */
export declare const getOfferCategories: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/offer-categories/featured
 * Get featured categories
 */
export declare const getFeaturedCategories: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/offer-categories/parents
 * Get parent categories only
 */
export declare const getParentCategories: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/offer-categories/:slug
 * Get category by slug
 */
export declare const getOfferCategoryBySlug: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/offer-categories/:parentId/subcategories
 * Get subcategories of a parent category
 */
export declare const getSubcategories: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/offer-categories/:slug/offers
 * Get offers by category slug
 */
export declare const getOffersByCategorySlug: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
