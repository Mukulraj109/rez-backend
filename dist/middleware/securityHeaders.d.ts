import { Request, Response, NextFunction } from 'express';
/**
 * Enhanced Security Headers Configuration
 * Implements comprehensive HTTP security headers
 */
/**
 * Helmet.js configuration with strict security headers
 */
export declare const securityHeaders: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
/**
 * Custom security headers middleware
 * Adds additional headers not covered by helmet
 */
export declare const customSecurityHeaders: (req: Request, res: Response, next: NextFunction) => void;
/**
 * API-specific security headers
 * Lighter headers for API endpoints
 */
export declare const apiSecurityHeaders: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Rate limit headers
 * Adds rate limit information to response headers
 */
export declare const rateLimitHeaders: (req: Request, res: Response, next: NextFunction) => void;
/**
 * CORS preflight headers
 */
export declare const corsPreflightHeaders: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Production-only strict headers
 */
export declare const productionSecurityHeaders: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Combined security headers middleware
 * Applies all security headers in correct order
 */
export declare const allSecurityHeaders: ((req: Request, res: Response, next: NextFunction) => void)[];
declare const _default: {
    securityHeaders: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
    customSecurityHeaders: (req: Request, res: Response, next: NextFunction) => void;
    apiSecurityHeaders: (req: Request, res: Response, next: NextFunction) => void;
    rateLimitHeaders: (req: Request, res: Response, next: NextFunction) => void;
    corsPreflightHeaders: (req: Request, res: Response, next: NextFunction) => void;
    productionSecurityHeaders: (req: Request, res: Response, next: NextFunction) => void;
    allSecurityHeaders: ((req: Request, res: Response, next: NextFunction) => void)[];
};
export default _default;
