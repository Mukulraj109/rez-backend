import cors, { CorsOptions } from 'cors';
/**
 * Strict CORS options for production
 */
export declare const strictCorsOptions: CorsOptions;
/**
 * Relaxed CORS options for development
 */
export declare const developmentCorsOptions: CorsOptions;
/**
 * Public API CORS (no credentials, wider access)
 */
export declare const publicApiCorsOptions: CorsOptions;
/**
 * Get appropriate CORS configuration based on environment
 */
export declare const getCorsOptions: () => CorsOptions;
/**
 * CORS middleware with environment-aware configuration
 */
export declare const corsMiddleware: (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
/**
 * Public API CORS middleware (for public endpoints)
 */
export declare const publicCorsMiddleware: (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
/**
 * Dynamic CORS middleware for specific routes
 */
export declare const dynamicCors: (customOrigins?: string[]) => (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
/**
 * Validate CORS configuration on startup
 */
export declare const validateCorsConfiguration: () => void;
declare const _default: {
    corsMiddleware: (req: cors.CorsRequest, res: {
        statusCode?: number | undefined;
        setHeader(key: string, value: string): any;
        end(): any;
    }, next: (err?: any) => any) => void;
    publicCorsMiddleware: (req: cors.CorsRequest, res: {
        statusCode?: number | undefined;
        setHeader(key: string, value: string): any;
        end(): any;
    }, next: (err?: any) => any) => void;
    dynamicCors: (customOrigins?: string[]) => (req: cors.CorsRequest, res: {
        statusCode?: number | undefined;
        setHeader(key: string, value: string): any;
        end(): any;
    }, next: (err?: any) => any) => void;
    strictCorsOptions: cors.CorsOptions;
    developmentCorsOptions: cors.CorsOptions;
    publicApiCorsOptions: cors.CorsOptions;
    getCorsOptions: () => CorsOptions;
    validateCorsConfiguration: () => void;
};
export default _default;
