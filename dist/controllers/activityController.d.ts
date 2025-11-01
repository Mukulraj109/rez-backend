import { Request, Response } from 'express';
export declare const getUserActivities: (req: Request, res: Response, next: Request) => void;
export declare const getActivityById: (req: Request, res: Response, next: Request) => void;
export declare const createActivity: (req: Request, res: Response, next: Request) => void;
export declare const deleteActivity: (req: Request, res: Response, next: Request) => void;
export declare const clearAllActivities: (req: Request, res: Response, next: Request) => void;
export declare const getActivitySummary: (req: Request, res: Response, next: Request) => void;
export declare const batchCreateActivities: (req: Request, res: Response, next: Request) => void;
