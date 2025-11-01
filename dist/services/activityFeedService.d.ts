/**
 * Get activity feed for user (activities from people they follow)
 */
export declare function getActivityFeed(userId: string, page?: number, limit?: number): Promise<any[]>;
/**
 * Get user's own activities (for profile page)
 */
export declare function getUserActivities(userId: string, page?: number, limit?: number): Promise<any[]>;
/**
 * Create activity for social feed
 */
export declare function createSocialActivity(userId: string, type: string, data: {
    title: string;
    description?: string;
    amount?: number;
    icon?: string;
    color?: string;
    relatedEntity?: {
        id: string;
        type: string;
    };
    metadata?: Record<string, any>;
}): Promise<any>;
/**
 * Like/Unlike activity
 */
export declare function toggleLike(activityId: string, userId: string): Promise<{
    liked: boolean;
    likesCount: number;
}>;
/**
 * Get likes count for activity
 */
export declare function getLikesCount(activityId: string): Promise<number>;
/**
 * Get comments for activity
 */
export declare function getActivityComments(activityId: string, page?: number, limit?: number): Promise<any[]>;
/**
 * Add comment to activity
 */
export declare function addComment(activityId: string, userId: string, comment: string): Promise<any>;
/**
 * Follow/Unfollow user
 */
export declare function toggleFollow(followerId: string, followingId: string): Promise<{
    following: boolean;
    followersCount: number;
}>;
/**
 * Check if user is following another user
 */
export declare function isFollowing(followerId: string, followingId: string): Promise<boolean>;
/**
 * Get user's followers
 */
export declare function getFollowers(userId: string, page?: number, limit?: number): Promise<any[]>;
/**
 * Get user's following list
 */
export declare function getFollowing(userId: string, page?: number, limit?: number): Promise<any[]>;
/**
 * Get follower/following counts for user
 */
export declare function getFollowCounts(userId: string): Promise<{
    followersCount: number;
    followingCount: number;
}>;
/**
 * Get suggested users to follow (users with most followers that current user doesn't follow)
 */
export declare function getSuggestedUsers(userId: string, limit?: number): Promise<any[]>;
/**
 * Share activity
 */
export declare function shareActivity(activityId: string, userId: string): Promise<void>;
/**
 * Get activity statistics
 */
export declare function getActivityStats(activityId: string): Promise<{
    likes: number;
    comments: number;
    shares: number;
}>;
