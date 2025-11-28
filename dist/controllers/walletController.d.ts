import { Request, Response } from 'express';
/**
 * @desc    Get user wallet balance
 * @route   GET /api/wallet/balance
 * @access  Private
 */
export declare const getWalletBalance: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Credit loyalty points to wallet
 * @route   POST /api/wallet/credit-loyalty-points
 * @access  Private
 */
export declare const creditLoyaltyPoints: (req: Request, res: Response, next: import("express").NextFunction) => void;
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
/**
 * @desc    Initiate payment gateway transaction
 * @route   POST /api/wallet/initiate-payment
 * @access  Private
 */
export declare const initiatePayment: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Check payment status
 * @route   GET /api/wallet/payment-status/:paymentId
 * @access  Private
 */
export declare const checkPaymentStatus: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Get available payment methods
 * @route   GET /api/wallet/payment-methods
 * @access  Private
 */
export declare const getPaymentMethods: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Handle payment gateway webhooks
 * @route   POST /api/wallet/webhook/:gateway
 * @access  Public
 */
export declare const handlePaymentWebhook: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Add PayBill balance (prepaid with discount)
 * @route   POST /api/wallet/paybill
 * @access  Private
 */
export declare const addPayBillBalance: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Get PayBill balance
 * @route   GET /api/wallet/paybill/balance
 * @access  Private
 */
export declare const getPayBillBalance: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Use PayBill balance for payment
 * @route   POST /api/wallet/paybill/use
 * @access  Private
 */
export declare const usePayBillBalance: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Get PayBill transaction history
 * @route   GET /api/wallet/paybill/transactions
 * @access  Private
 */
export declare const getPayBillTransactions: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Create Stripe Payment Intent for PayBill
 * @route   POST /api/wallet/paybill/create-payment-intent
 * @access  Private
 */
export declare const createPayBillPaymentIntent: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc    Confirm PayBill Payment and Add Balance
 * @route   POST /api/wallet/paybill/confirm-payment
 * @access  Private
 */
export declare const confirmPayBillPayment: (req: Request, res: Response, next: import("express").NextFunction) => void;
