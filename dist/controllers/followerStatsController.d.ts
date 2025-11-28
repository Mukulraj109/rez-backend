import { Request, Response } from 'express';
/**
 * @route   GET /api/stores/:storeId/followers/count
 * @desc    Get total follower count for a store
 * @access  Private (Merchant)
 */
export declare const getFollowerCount: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @route   GET /api/stores/:storeId/followers/list
 * @desc    Get paginated list of followers for a store
 * @access  Private (Merchant)
 */
export declare const getFollowersList: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @route   GET /api/stores/:storeId/followers/analytics
 * @desc    Get follower analytics for a store
 * @access  Private (Merchant)
 */
export declare const getFollowerAnalytics: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @route   GET /api/stores/:storeId/followers/top
 * @desc    Get top followers by engagement (orders placed, reviews written)
 * @access  Private (Merchant)
 */
export declare const getTopFollowers: (req: Request, res: Response, next: import("express").NextFunction) => void;
