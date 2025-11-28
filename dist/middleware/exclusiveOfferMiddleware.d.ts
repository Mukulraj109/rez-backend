import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
/**
 * Check if user is following a store
 * @param userId - The user ID
 * @param storeId - The store ID
 * @returns Promise<boolean> - True if user follows the store
 */
export declare function isFollowingStore(userId: string | mongoose.Types.ObjectId, storeId: string | mongoose.Types.ObjectId): Promise<boolean>;
/**
 * Get all stores that a user follows
 * @param userId - The user ID
 * @returns Promise<string[]> - Array of store IDs
 */
export declare function getUserFollowedStores(userId: string | mongoose.Types.ObjectId): Promise<string[]>;
/**
 * Middleware to add follower context to requests
 * Adds req.followedStores array with store IDs user follows
 */
export declare function addFollowerContext(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Filter offers based on follower-exclusive status
 * @param offers - Array of offers
 * @param userId - User ID (optional)
 * @param followedStores - Array of store IDs user follows (optional)
 * @returns Promise<any[]> - Filtered offers
 */
export declare function filterExclusiveOffers(offers: any[], userId?: string, followedStores?: string[]): Promise<any[]>;
/**
 * Middleware to check if user can access an exclusive offer
 * Use this on single offer endpoints (e.g., GET /offers/:id)
 */
export declare function checkExclusiveOfferAccess(req: Request, res: Response, next: NextFunction): Promise<void>;
