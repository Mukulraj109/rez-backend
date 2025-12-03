import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to sanitize request body
 * Applies deep sanitization to prevent XSS and injection attacks
 */
export declare const sanitizeBody: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware to sanitize query parameters
 */
export declare const sanitizeQuery: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware to sanitize URL parameters
 */
export declare const sanitizeParams: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Combined sanitization middleware for all request data
 */
export declare const sanitizeRequest: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware to prevent NoSQL injection by blacklisting dangerous operators
 */
export declare const preventNoSQLInjection: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Sanitize MongoDB query to prevent injection
 */
export declare function sanitizeMongoQuery(query: any): any;
/**
 * Validate and sanitize ObjectId
 */
export declare function sanitizeObjectId(id: string): string | null;
/**
 * Sanitize email address
 */
export declare function sanitizeEmail(email: string): string | null;
/**
 * Sanitize phone number
 */
export declare function sanitizePhoneNumber(phone: string): string | null;
/**
 * Sanitize URL
 */
export declare function sanitizeURL(url: string): string | null;
/**
 * Sanitize HTML content - removes dangerous tags while preserving basic formatting
 * Used for product descriptions, reviews, etc.
 */
export declare function sanitizeHTML(input: string): string;
/**
 * Sanitize product text fields (name, description, tags, SEO fields)
 */
export declare function sanitizeProductText(text: string, options?: {
    maxLength?: number;
    allowHTML?: boolean;
    stripTags?: boolean;
}): string;
/**
 * Sanitize product data object
 */
export declare function sanitizeProductData(productData: any): any;
/**
 * Middleware to sanitize product request data
 */
export declare const sanitizeProductRequest: (req: Request, res: Response, next: NextFunction) => void;
declare const _default: {
    sanitizeBody: (req: Request, res: Response, next: NextFunction) => void;
    sanitizeQuery: (req: Request, res: Response, next: NextFunction) => void;
    sanitizeParams: (req: Request, res: Response, next: NextFunction) => void;
    sanitizeRequest: (req: Request, res: Response, next: NextFunction) => void;
    preventNoSQLInjection: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    sanitizeMongoQuery: typeof sanitizeMongoQuery;
    sanitizeObjectId: typeof sanitizeObjectId;
    sanitizeEmail: typeof sanitizeEmail;
    sanitizePhoneNumber: typeof sanitizePhoneNumber;
    sanitizeURL: typeof sanitizeURL;
    sanitizeHTML: typeof sanitizeHTML;
    sanitizeProductText: typeof sanitizeProductText;
    sanitizeProductData: typeof sanitizeProductData;
    sanitizeProductRequest: (req: Request, res: Response, next: NextFunction) => void;
};
export default _default;
