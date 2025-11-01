import { Request, Response } from 'express';
export declare const getUserAchievements: (req: Request, res: Response, next: Request) => void;
export declare const getUnlockedAchievements: (req: Request, res: Response, next: Request) => void;
export declare const getAchievementProgress: (req: Request, res: Response, next: Request) => void;
export declare const initializeUserAchievements: (req: Request, res: Response, next: Request) => void;
export declare const updateAchievementProgress: (req: Request, res: Response, next: Request) => void;
export declare const recalculateAchievements: (req: Request, res: Response, next: Request) => void;
