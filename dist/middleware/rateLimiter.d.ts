declare global {
    namespace Express {
        interface Request {
            rateLimit?: {
                limit: number;
                current: number;
                remaining: number;
                resetTime: Date;
            };
        }
    }
}
export declare const generalLimiter: any;
export declare const authLimiter: any;
export declare const otpLimiter: any;
export declare const securityLimiter: any;
export declare const uploadLimiter: any;
export declare const searchLimiter: any;
export declare const strictLimiter: any;
export declare const reviewLimiter: any;
export declare const analyticsLimiter: any;
export declare const comparisonLimiter: any;
export declare const favoriteLimiter: any;
export declare const recommendationLimiter: any;
export declare const createRateLimiter: (options: {
    windowMs?: number;
    max?: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
}) => any;
