import { Request, Response } from 'express';
export declare const addToFavorites: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const removeFromFavorites: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const toggleFavorite: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getUserFavorites: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const isStoreFavorited: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getFavoriteStatuses: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const clearAllFavorites: (req: Request, res: Response, next: import("express").NextFunction) => void;
