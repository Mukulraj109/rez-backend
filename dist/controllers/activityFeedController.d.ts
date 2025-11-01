import { Request, Response } from 'express';
/**
 * Get activity feed for authenticated user
 * GET /api/social/feed
 */
export declare function getFeed(req: Request, res: Response): Promise<void>;
/**
 * Get user's own activities
 * GET /api/social/users/:userId/activities
 */
export declare function getUserActivities(req: Request, res: Response): Promise<void>;
/**
 * Create a new activity
 * POST /api/social/activities
 */
export declare function createActivity(req: Request, res: Response): Promise<any>;
/**
 * Like/Unlike an activity
 * POST /api/social/activities/:activityId/like
 */
export declare function likeActivity(req: Request, res: Response): Promise<void>;
/**
 * Get comments for an activity
 * GET /api/social/activities/:activityId/comments
 */
export declare function getComments(req: Request, res: Response): Promise<void>;
/**
 * Comment on an activity
 * POST /api/social/activities/:activityId/comment
 */
export declare function commentOnActivity(req: Request, res: Response): Promise<any>;
/**
 * Follow/Unfollow a user
 * POST /api/social/users/:userId/follow
 */
export declare function followUser(req: Request, res: Response): Promise<any>;
/**
 * Check if following a user
 * GET /api/social/users/:userId/is-following
 */
export declare function checkFollowStatus(req: Request, res: Response): Promise<void>;
/**
 * Get user's followers
 * GET /api/social/users/:userId/followers
 */
export declare function getFollowers(req: Request, res: Response): Promise<void>;
/**
 * Get user's following list
 * GET /api/social/users/:userId/following
 */
export declare function getFollowing(req: Request, res: Response): Promise<void>;
/**
 * Get follow counts for a user
 * GET /api/social/users/:userId/follow-counts
 */
export declare function getFollowCounts(req: Request, res: Response): Promise<void>;
/**
 * Get suggested users to follow
 * GET /api/social/suggested-users
 */
export declare function getSuggestedUsers(req: Request, res: Response): Promise<void>;
/**
 * Share an activity
 * POST /api/social/activities/:activityId/share
 */
export declare function shareActivity(req: Request, res: Response): Promise<void>;
/**
 * Get activity statistics
 * GET /api/social/activities/:activityId/stats
 */
export declare function getActivityStats(req: Request, res: Response): Promise<void>;
