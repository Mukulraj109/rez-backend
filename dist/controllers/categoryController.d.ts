import { Request, Response } from 'express';
export declare const getCategories: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getCategoryTree: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getCategoryBySlug: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getCategoriesWithCounts: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getRootCategories: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getFeaturedCategories: (req: Request, res: Response, next: import("express").NextFunction) => void;
