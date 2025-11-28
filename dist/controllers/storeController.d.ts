import { Request, Response } from 'express';
export declare const getStores: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getStoreById: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getStoreProducts: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getNearbyStores: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getFeaturedStores: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const searchStores: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getStoresByCategory: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getStoreOperatingStatus: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const searchStoresByCategory: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const searchStoresByDeliveryTime: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const advancedStoreSearch: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getStoreCategories: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getTrendingStores: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get follower count for a store
 * GET /api/stores/:storeId/followers/count
 */
export declare const getStoreFollowerCount: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get all followers of a store (Admin/Merchant only)
 * GET /api/stores/:storeId/followers
 */
export declare const getStoreFollowers: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Send custom notification to all followers
 * POST /api/stores/:storeId/notify-followers
 * Body: { title, message, imageUrl?, deepLink? }
 */
export declare const sendFollowerNotification: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Notify followers about a new offer
 * POST /api/stores/:storeId/notify-offer
 * Body: { offerId, title, description?, discount?, imageUrl? }
 */
export declare const notifyNewOffer: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Notify followers about a new product
 * POST /api/stores/:storeId/notify-product
 * Body: { productId }
 */
export declare const notifyNewProduct: (req: Request, res: Response, next: import("express").NextFunction) => void;
