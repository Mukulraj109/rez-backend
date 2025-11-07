import { Request, Response } from 'express';
/**
 * GET /api/outlets
 * Get all outlets with filters
 */
export declare const getOutlets: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/outlets/:id
 * Get single outlet by ID
 */
export declare const getOutletById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/outlets/store/:storeId
 * Get all outlets for a specific store
 */
export declare const getOutletsByStore: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/outlets/nearby
 * Find nearby outlets based on location
 */
export declare const getNearbyOutlets: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/outlets/:id/opening-hours
 * Get opening hours for a specific outlet
 */
export declare const getOutletOpeningHours: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/outlets/:id/offers
 * Get offers available at a specific outlet
 */
export declare const getOutletOffers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /api/outlets/search
 * Search outlets by name or address
 */
export declare const searchOutlets: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/outlets/store/:storeId/count
 * Get count of outlets for a store
 */
export declare const getStoreOutletCount: (req: Request, res: Response) => Promise<void>;
