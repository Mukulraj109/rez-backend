import { Request, Response } from 'express';
export declare const getStoreReviews: (req: Request, res: Response, next: Request) => void;
export declare const createReview: (req: Request, res: Response, next: Request) => void;
export declare const updateReview: (req: Request, res: Response, next: Request) => void;
export declare const deleteReview: (req: Request, res: Response, next: Request) => void;
export declare const markReviewHelpful: (req: Request, res: Response, next: Request) => void;
export declare const getUserReviews: (req: Request, res: Response, next: Request) => void;
export declare const canUserReviewStore: (req: Request, res: Response, next: Request) => void;
