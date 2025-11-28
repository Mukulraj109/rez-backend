import { Request, Response, NextFunction } from 'express';
export declare const errorLogger: (err: Error, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
export declare const globalErrorHandler: (err: any, req: Request, res: Response, next: NextFunction) => void;
