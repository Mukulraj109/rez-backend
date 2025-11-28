import { Request, Response } from 'express';
export declare const createConsultation: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getUserConsultations: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getConsultation: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getStoreConsultations: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const cancelConsultation: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const checkAvailability: (req: Request, res: Response, next: import("express").NextFunction) => void;
