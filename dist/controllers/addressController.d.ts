import { Request, Response } from 'express';
export declare const getUserAddresses: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getAddressById: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const createAddress: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const updateAddress: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const deleteAddress: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const setDefaultAddress: (req: Request, res: Response, next: import("express").NextFunction) => void;
