import { Request, Response } from 'express';
/**
 * @route   GET /api/store-promo-coins
 * @desc    Get all store promo coins for the authenticated user
 * @access  Private
 */
export declare const getUserStorePromoCoins: (req: Request, res: Response) => Promise<void>;
/**
 * @route   GET /api/store-promo-coins/store/:storeId
 * @desc    Get promo coins for a specific store
 * @access  Private
 */
export declare const getStorePromoCoins: (req: Request, res: Response) => Promise<void>;
/**
 * @route   GET /api/store-promo-coins/transactions
 * @desc    Get transaction history for all store promo coins
 * @access  Private
 */
export declare const getStorePromoCoinTransactions: (req: Request, res: Response) => Promise<void>;
/**
 * @route   POST /api/store-promo-coins/use
 * @desc    Use promo coins (internal use, called during checkout)
 * @access  Private
 */
export declare const useStorePromoCoins: (req: Request, res: Response) => Promise<void>;
