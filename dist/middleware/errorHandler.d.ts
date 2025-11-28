import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    context?: string;
    originalError?: any;
    constructor(message: string, statusCode: number, context?: string, originalError?: any);
}
export declare const globalErrorHandler: (error: any, req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const withErrorLogging: (operationName: string, operation: () => Promise<any>, correlationId?: string) => () => Promise<any>;
