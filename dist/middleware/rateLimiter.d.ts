import { Request, Response, NextFunction } from 'express';
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
export declare const generalLimiter: (req: Request, res: Response, next: NextFunction) => void;
export declare const authLimiter: (req: Request, res: Response, next: NextFunction) => void;
export declare const otpLimiter: (req: Request, res: Response, next: NextFunction) => void;
export declare const securityLimiter: (req: Request, res: Response, next: NextFunction) => void;
export declare const uploadLimiter: (req: Request, res: Response, next: NextFunction) => void;
export declare const searchLimiter: (req: Request, res: Response, next: NextFunction) => void;
export declare const strictLimiter: (req: Request, res: Response, next: NextFunction) => void;
export declare const reviewLimiter: (req: Request, res: Response, next: NextFunction) => void;
export declare const analyticsLimiter: (req: Request, res: Response, next: NextFunction) => void;
export declare const comparisonLimiter: (req: Request, res: Response, next: NextFunction) => void;
export declare const favoriteLimiter: (req: Request, res: Response, next: NextFunction) => void;
export declare const recommendationLimiter: (req: Request, res: Response, next: NextFunction) => void;
export declare const createRateLimiter: (options: {
    windowMs?: number;
    max?: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
}) => (req: Request, res: Response, next: NextFunction) => void;
