import { Request, Response } from 'express';
export declare const getProjects: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getProjectById: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getProjectsByCategory: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getFeaturedProjects: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const toggleProjectLike: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const addProjectComment: (req: Request, res: Response, next: import("express").NextFunction) => void;
