import { Request, Response } from 'express';
export declare const getProducts: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getProductById: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getProductsByCategory: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getProductsByStore: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getFeaturedProducts: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getNewArrivals: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const searchProducts: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getRecommendations: (req: Request, res: Response, next: import("express").NextFunction) => void;
