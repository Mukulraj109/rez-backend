import { Request, Response } from 'express';
/**
 * @desc Create a Razorpay order for payment
 * @route POST /api/razorpay/create-order
 * @access Private
 */
export declare const createRazorpayOrder: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc Verify Razorpay payment and create order
 * @route POST /api/razorpay/verify-payment
 * @access Private
 */
export declare const verifyRazorpayPayment: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc Get Razorpay configuration for frontend
 * @route GET /api/razorpay/config
 * @access Private
 */
export declare const getRazorpayConfig: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc Handle Razorpay webhook events
 * @route POST /api/razorpay/webhook
 * @access Public (but verified with signature)
 */
export declare const handleRazorpayWebhook: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * @desc Create a refund for a Razorpay payment
 * @route POST /api/razorpay/refund
 * @access Private (Admin only ideally)
 */
export declare const createRazorpayRefund: (req: Request, res: Response, next: import("express").NextFunction) => void;
