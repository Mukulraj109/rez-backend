import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to whitelist Razorpay IPs only
 * Extracts client IP from request and validates against Razorpay ranges
 */
export declare const razorpayIPWhitelist: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Rate limiter for webhook endpoint
 * Allows max 100 webhook requests per minute per IP
 */
export declare const webhookRateLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Middleware to validate webhook payload structure
 * Ensures all required fields are present and event type is valid
 */
export declare const validateWebhookPayload: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware to log webhook security events
 * Tracks all webhook attempts for audit purposes
 */
export declare const logWebhookSecurityEvent: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Helper function to create secure webhook error responses
 */
export declare const sendSecureWebhookError: (res: Response, statusCode: number, errorType: string, message: string, eventId?: string) => void;
/**
 * Helper function to create secure webhook success responses
 */
export declare const sendSecureWebhookSuccess: (res: Response, message: string, eventId: string) => void;
