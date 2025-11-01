import { Request, Response } from 'express';
export declare const submitPost: (req: Request, res: Response, next: Request) => void;
export declare const getUserPosts: (req: Request, res: Response, next: Request) => void;
export declare const getUserEarnings: (req: Request, res: Response, next: Request) => void;
export declare const getPostById: (req: Request, res: Response, next: Request) => void;
export declare const updatePostStatus: (req: Request, res: Response, next: Request) => void;
export declare const deletePost: (req: Request, res: Response, next: Request) => void;
export declare const getPlatformStats: (req: Request, res: Response, next: Request) => void;
