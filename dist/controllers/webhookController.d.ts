import { Request, Response } from 'express';
/**
 * Enhanced Razorpay Webhook Handler
 * POST /api/webhooks/razorpay
 *
 * Handles all Razorpay webhook events with:
 * - Signature verification
 * - Idempotency handling
 * - Comprehensive logging
 * - Error handling and retries
 */
export declare const handleRazorpayWebhook: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Enhanced Stripe Webhook Handler
 * POST /api/webhooks/stripe
 *
 * Handles all Stripe webhook events with:
 * - Signature verification
 * - Idempotency handling
 * - Comprehensive logging
 * - Error handling and retries
 */
export declare const handleStripeWebhook: (req: Request, res: Response, next: import("express").NextFunction) => void;
