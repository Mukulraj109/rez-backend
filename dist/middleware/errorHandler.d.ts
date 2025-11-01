import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode: number);
}
export declare const globalErrorHandler: (error: any, req: Request, res: Response, next: NextFunction) => any;
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
