import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
export declare const logger: winston.Logger;
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const sanitizeLog: (data: any) => any;
export declare const correlationIdMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const logInfo: (message: string, meta?: any, correlationId?: string) => void;
export declare const logWarn: (message: string, meta?: any, correlationId?: string) => void;
export declare const logError: (message: string, error?: any, meta?: any, correlationId?: string) => void;
export declare const logDebug: (message: string, meta?: any, correlationId?: string) => void;
export declare const createServiceLogger: (serviceName: string) => {
    info: (message: string, meta?: any, correlationId?: string) => winston.Logger;
    warn: (message: string, meta?: any, correlationId?: string) => winston.Logger;
    error: (message: string, error?: any, meta?: any, correlationId?: string) => void;
    debug: (message: string, meta?: any, correlationId?: string) => winston.Logger;
};
declare global {
    namespace Express {
        interface Request {
            correlationId?: string;
            userId?: string;
        }
    }
}
