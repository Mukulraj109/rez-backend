import { Request, Response, NextFunction } from 'express';
export declare const loggingMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const bodyLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const slowRequestLogger: (threshold?: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const errorRequestLogger: (req: Request, res: Response, next: NextFunction) => void;
