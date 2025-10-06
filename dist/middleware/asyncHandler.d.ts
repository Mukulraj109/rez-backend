import { Request, Response, NextFunction } from 'express';
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
