import { Request, Response } from 'express';
import * as activityFeedService from '../services/activityFeedService';

/**
 * Get activity feed for authenticated user
 * GET /api/social/feed
 */
export async function getFeed(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const activities = await activityFeedService.getActivityFeed(userId, page, limit);

    res.json({
      success: true,
      data: activities,
      pagination: {
        page,
        limit,
        hasMore: activities.length === limit
      }
    });
  } catch (error: any) {
    console.error('Error in getFeed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch activity feed'
    });
  }
}

/**
 * Get user's own activities
 * GET /api/social/users/:userId/activities
 */
export async function getUserActivities(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const activities = await activityFeedService.getUserActivities(userId, page, limit);

    res.json({
      success: true,
      data: activities,
      pagination: {
        page,
        limit,
        hasMore: activities.length === limit
      }
    });
  } catch (error: any) {
    console.error('Error in getUserActivities:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch user activities'
    });
  }
}

/**
 * Create a new activity
 * POST /api/social/activities
 */
export async function createActivity(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { type, title, description, amount, icon, color, relatedEntity, metadata } = req.body;

    if (!type || !title) {
      return res.status(400).json({
        success: false,
        error: 'Type and title are required'
      });
    }

    const activity = await activityFeedService.createSocialActivity(userId, type, {
      title,
      description,
      amount,
      icon,
      color,
      relatedEntity,
      metadata
    });

    // Update partner social task progress if activity type is 'share'
    if (type === 'share' || metadata?.action === 'share') {
      try {
        const Partner = require('../models/Partner').default;
        const partner = await Partner.findOne({ userId });
        
        if (partner) {
          const socialTask = partner.tasks.find((t: any) => t.type === 'social');
          if (socialTask && socialTask.progress.current < socialTask.progress.target) {
            socialTask.progress.current += 1;
            
            if (socialTask.progress.current >= socialTask.progress.target) {
              socialTask.completed = true;
              socialTask.completedAt = new Date();
            }
            
            await partner.save();
            console.log('✅ [SOCIAL] Partner social task updated:', socialTask.progress.current, '/', socialTask.progress.target);
          }
        }
      } catch (error) {
        console.error('❌ [SOCIAL] Error updating partner social task:', error);
      }
    }

    res.status(201).json({
      success: true,
      data: activity
    });
  } catch (error: any) {
    console.error('Error in createActivity:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create activity'
    });
  }
}

/**
 * Like/Unlike an activity
 * POST /api/social/activities/:activityId/like
 */
export async function likeActivity(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { activityId } = req.params;

    const result = await activityFeedService.toggleLike(activityId, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error in likeActivity:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to like activity'
    });
  }
}

/**
 * Get comments for an activity
 * GET /api/social/activities/:activityId/comments
 */
export async function getComments(req: Request, res: Response) {
  try {
    const { activityId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const comments = await activityFeedService.getActivityComments(activityId, page, limit);

    res.json({
      success: true,
      data: comments,
      pagination: {
        page,
        limit,
        hasMore: comments.length === limit
      }
    });
  } catch (error: any) {
    console.error('Error in getComments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch comments'
    });
  }
}

/**
 * Comment on an activity
 * POST /api/social/activities/:activityId/comment
 */
export async function commentOnActivity(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { activityId } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment cannot be empty'
      });
    }

    const interaction = await activityFeedService.addComment(activityId, userId, comment);

    res.status(201).json({
      success: true,
      data: interaction
    });
  } catch (error: any) {
    console.error('Error in commentOnActivity:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add comment'
    });
  }
}

/**
 * Follow/Unfollow a user
 * POST /api/social/users/:userId/follow
 */
export async function followUser(req: Request, res: Response) {
  try {
    const followerId = req.user!.id;
    const { userId } = req.params;

    if (followerId === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot follow yourself'
      });
    }

    const result = await activityFeedService.toggleFollow(followerId, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error in followUser:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to follow/unfollow user'
    });
  }
}

/**
 * Check if following a user
 * GET /api/social/users/:userId/is-following
 */
export async function checkFollowStatus(req: Request, res: Response) {
  try {
    const followerId = req.user!.id;
    const { userId } = req.params;

    const isFollowing = await activityFeedService.isFollowing(followerId, userId);

    res.json({
      success: true,
      data: { isFollowing }
    });
  } catch (error: any) {
    console.error('Error in checkFollowStatus:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check follow status'
    });
  }
}

/**
 * Get user's followers
 * GET /api/social/users/:userId/followers
 */
export async function getFollowers(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const followers = await activityFeedService.getFollowers(userId, page, limit);

    res.json({
      success: true,
      data: followers,
      pagination: {
        page,
        limit,
        hasMore: followers.length === limit
      }
    });
  } catch (error: any) {
    console.error('Error in getFollowers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch followers'
    });
  }
}

/**
 * Get user's following list
 * GET /api/social/users/:userId/following
 */
export async function getFollowing(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const following = await activityFeedService.getFollowing(userId, page, limit);

    res.json({
      success: true,
      data: following,
      pagination: {
        page,
        limit,
        hasMore: following.length === limit
      }
    });
  } catch (error: any) {
    console.error('Error in getFollowing:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch following list'
    });
  }
}

/**
 * Get follow counts for a user
 * GET /api/social/users/:userId/follow-counts
 */
export async function getFollowCounts(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const counts = await activityFeedService.getFollowCounts(userId);

    res.json({
      success: true,
      data: counts
    });
  } catch (error: any) {
    console.error('Error in getFollowCounts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch follow counts'
    });
  }
}

/**
 * Get suggested users to follow
 * GET /api/social/suggested-users
 */
export async function getSuggestedUsers(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;

    const suggestedUsers = await activityFeedService.getSuggestedUsers(userId, limit);

    res.json({
      success: true,
      data: suggestedUsers
    });
  } catch (error: any) {
    console.error('Error in getSuggestedUsers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch suggested users'
    });
  }
}

/**
 * Share an activity
 * POST /api/social/activities/:activityId/share
 */
export async function shareActivity(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { activityId } = req.params;

    await activityFeedService.shareActivity(activityId, userId);

    res.json({
      success: true,
      message: 'Activity shared successfully'
    });
  } catch (error: any) {
    console.error('Error in shareActivity:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to share activity'
    });
  }
}

/**
 * Get activity statistics
 * GET /api/social/activities/:activityId/stats
 */
export async function getActivityStats(req: Request, res: Response) {
  try {
    const { activityId } = req.params;

    const stats = await activityFeedService.getActivityStats(activityId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error in getActivityStats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch activity stats'
    });
  }
}
