import { Request, Response } from 'express';
export declare const getUserPaymentMethods: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getPaymentMethodById: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const createPaymentMethod: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const updatePaymentMethod: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const deletePaymentMethod: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const setDefaultPaymentMethod: (req: Request, res: Response, next: import("express").NextFunction) => void;
