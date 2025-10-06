import { Request, Response } from 'express';
/**
 * GET /api/offers
 * Get offers with filters, sorting, and pagination
 */
export declare const getOffers: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/offers/featured
 * Get featured offers
 */
export declare const getFeaturedOffers: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/offers/trending
 * Get trending offers
 */
export declare const getTrendingOffers: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/offers/search
 * Search offers by query
 */
export declare const searchOffers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/offers/category/:categoryId
 * Get offers by category
 */
export declare const getOffersByCategory: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/offers/store/:storeId
 * Get offers for a specific store
 */
export declare const getOffersByStore: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/offers/:id
 * Get single offer by ID
 */
export declare const getOfferById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/offers/:id/redeem
 * Redeem an offer (authenticated users only)
 */
export declare const redeemOffer: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/offers/my-redemptions
 * Get user's offer redemptions
 */
export declare const getUserRedemptions: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/offers/:id/favorite
 * Add offer to favorites
 */
export declare const addOfferToFavorites: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * DELETE /api/offers/:id/favorite
 * Remove offer from favorites
 */
export declare const removeOfferFromFavorites: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/offers/favorites
 * Get user's favorite offers
 */
export declare const getUserFavoriteOffers: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/offers/:id/view
 * Track offer view (analytics)
 */
export declare const trackOfferView: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/offers/:id/click
 * Track offer click (analytics)
 */
export declare const trackOfferClick: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/offers/recommendations
 * Get personalized offer recommendations (optional auth)
 */
export declare const getRecommendedOffers: (req: Request, res: Response) => Promise<void>;
