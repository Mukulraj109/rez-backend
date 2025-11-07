import { Request, Response } from 'express';
/**
 * Create Razorpay order for payment
 * POST /api/payment/create-order
 */
export declare const createPaymentOrder: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Verify Razorpay payment signature
 * POST /api/payment/verify
 */
export declare const verifyPayment: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Handle Razorpay webhook events
 * POST /api/payment/webhook
 */
export declare const handleWebhook: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Get payment status for an order
 * GET /api/payment/status/:orderId
 */
export declare const getPaymentStatus: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Create Stripe Checkout Session for subscription payment
 * POST /api/payment/create-checkout-session
 */
export declare const createCheckoutSession: (req: Request, res: Response, next: import("express").NextFunction) => void;
