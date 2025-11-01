import { Request, Response } from 'express';
/**
 * Create Razorpay order for payment
 * POST /api/payment/create-order
 */
export declare const createPaymentOrder: (req: Request, res: Response, next: Request) => void;
/**
 * Verify Razorpay payment signature
 * POST /api/payment/verify
 */
export declare const verifyPayment: (req: Request, res: Response, next: Request) => void;
/**
 * Handle Razorpay webhook events
 * POST /api/payment/webhook
 */
export declare const handleWebhook: (req: Request, res: Response, next: Request) => void;
/**
 * Get payment status for an order
 * GET /api/payment/status/:orderId
 */
export declare const getPaymentStatus: (req: Request, res: Response, next: Request) => void;
