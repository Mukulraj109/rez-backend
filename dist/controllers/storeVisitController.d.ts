import { Request, Response } from 'express';
export declare const scheduleStoreVisit: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getQueueNumber: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getUserStoreVisits: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getStoreVisit: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getStoreVisits: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const cancelStoreVisit: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getCurrentQueueStatus: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const checkStoreAvailability: (req: Request, res: Response, next: import("express").NextFunction) => void;
