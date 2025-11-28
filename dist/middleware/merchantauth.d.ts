import { Request, Response, NextFunction } from 'express';
import { IMerchantUser } from '../models/MerchantUser';
declare global {
    namespace Express {
        interface Request {
            merchantId?: string;
            merchant?: any;
            merchantUser?: IMerchantUser;
        }
    }
}
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const optionalAuthMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
