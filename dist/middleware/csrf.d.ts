import { Request, Response, NextFunction } from 'express';
/**
 * Generate a cryptographically secure CSRF token
 */
export declare function generateCsrfToken(): string;
/**
 * Middleware to generate and set CSRF token in cookie
 * This should be applied globally to ensure all responses include a CSRF token
 */
export declare function setCsrfToken(req: Request, res: Response, next: NextFunction): void;
/**
 * Middleware to validate CSRF token on state-changing requests
 * This should be applied to routes that modify data (POST, PUT, DELETE, PATCH)
 */
export declare function validateCsrfToken(req: Request, res: Response, next: NextFunction): void;
/**
 * Combined middleware that both sets and validates CSRF tokens
 * Use this for routes that need both functionalities
 */
export declare function csrfProtection(req: Request, res: Response, next: NextFunction): void;
/**
 * Middleware to validate CSRF for specific routes
 * This is an alias for validateCsrfToken for better readability
 */
export declare const requireCsrfToken: typeof validateCsrfToken;
/**
 * Extract CSRF token from request (for debugging/logging purposes)
 */
export declare function getCsrfToken(req: Request): {
    cookie?: string;
    header?: string;
};
/**
 * Check if a request has a valid CSRF token (without throwing errors)
 */
export declare function hasCsrfToken(req: Request): boolean;
export declare const CSRF_CONFIG: {
    TOKEN_LENGTH: number;
    COOKIE_NAME: string;
    HEADER_NAME: string;
    COOKIE_MAX_AGE: number;
    SAFE_METHODS: string[];
    EXEMPT_PATHS: string[];
};
