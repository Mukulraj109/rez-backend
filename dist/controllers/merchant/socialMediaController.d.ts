import { Request, Response } from 'express';
/**
 * GET /api/merchant/social-media-posts
 * List social media posts for merchant's store(s)
 */
export declare const listSocialMediaPosts: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /api/merchant/social-media-posts/stats
 * Get social media verification statistics for merchant
 */
export declare const getSocialMediaStats: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * GET /api/merchant/social-media-posts/:postId
 * Get single social media post details
 */
export declare const getSocialMediaPost: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /api/merchant/social-media-posts/:postId/approve
 * Approve a social media post and credit REZ coins to user
 */
export declare const approveSocialMediaPost: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * PUT /api/merchant/social-media-posts/:postId/reject
 * Reject a social media post with reason
 */
export declare const rejectSocialMediaPost: (req: Request, res: Response, next: import("express").NextFunction) => void;
