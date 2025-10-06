import { Request, Response } from 'express';
/**
 * @desc    Get user wallet balance
 * @route   GET /api/wallet/balance
 * @access  Private
 */
export declare const getWalletBalance: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Get transaction history
 * @route   GET /api/wallet/transactions
 * @access  Private
 */
export declare const getTransactions: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Get single transaction details
 * @route   GET /api/wallet/transaction/:id
 * @access  Private
 */
export declare const getTransactionById: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Topup wallet
 * @route   POST /api/wallet/topup
 * @access  Private
 */
export declare const topupWallet: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Withdraw from wallet
 * @route   POST /api/wallet/withdraw
 * @access  Private
 */
export declare const withdrawFunds: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Process payment (deduct from wallet)
 * @route   POST /api/wallet/payment
 * @access  Private
 */
export declare const processPayment: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Get transaction summary/statistics
 * @route   GET /api/wallet/summary
 * @access  Private
 */
export declare const getTransactionSummary: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Update wallet settings
 * @route   PUT /api/wallet/settings
 * @access  Private
 */
export declare const updateWalletSettings: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Get wallet transaction categories breakdown
 * @route   GET /api/wallet/categories
 * @access  Private
 */
export declare const getCategoriesBreakdown: (req: Request, res: Response, next: import("express").NextFunction) => void;
