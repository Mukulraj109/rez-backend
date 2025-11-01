import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            merchantId?: string;
            merchant?: any;
        }
    }
}
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<any>;
export declare const optionalAuthMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
