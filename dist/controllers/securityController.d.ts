import { Request, Response } from 'express';
export declare const verifyDevice: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const checkBlacklist: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const reportSuspicious: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const verifyCaptcha: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getIpInfo: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const checkMultiAccount: (req: Request, res: Response, next: import("express").NextFunction) => void;
