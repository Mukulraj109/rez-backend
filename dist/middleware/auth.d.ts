import { Request, Response, NextFunction } from 'express';
interface JWTPayload {
    userId: string;
    role: string;
    iat: number;
    exp: number;
}
export declare const generateToken: (userId: string, role?: string) => string;
export declare const generateRefreshToken: (userId: string) => string;
export declare const verifyToken: (token: string) => JWTPayload;
export declare const verifyRefreshToken: (token: string) => JWTPayload;
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const requireStoreOwnerOrAdmin: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const requireAuth: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const protect: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export {};
