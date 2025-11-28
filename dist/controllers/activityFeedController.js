"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeed = getFeed;
exports.getUserActivities = getUserActivities;
exports.createActivity = createActivity;
exports.likeActivity = likeActivity;
exports.getComments = getComments;
exports.commentOnActivity = commentOnActivity;
exports.followUser = followUser;
exports.checkFollowStatus = checkFollowStatus;
exports.getFollowers = getFollowers;
exports.getFollowing = getFollowing;
exports.getFollowCounts = getFollowCounts;
exports.getSuggestedUsers = getSuggestedUsers;
exports.shareActivity = shareActivity;
exports.getActivityStats = getActivityStats;
const activityFeedService = __importStar(require("../services/activityFeedService"));
/**
 * Get activity feed for authenticated user
 * GET /api/social/feed
 */
async function getFeed(req, res) {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
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
    }
    catch (error) {
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
async function getUserActivities(req, res) {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
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
    }
    catch (error) {
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
async function createActivity(req, res) {
    try {
        const userId = req.user.id;
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
                    const socialTask = partner.tasks.find((t) => t.type === 'social');
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
            }
            catch (error) {
                console.error('❌ [SOCIAL] Error updating partner social task:', error);
            }
        }
        res.status(201).json({
            success: true,
            data: activity
        });
    }
    catch (error) {
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
async function likeActivity(req, res) {
    try {
        const userId = req.user.id;
        const { activityId } = req.params;
        const result = await activityFeedService.toggleLike(activityId, userId);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
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
async function getComments(req, res) {
    try {
        const { activityId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
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
    }
    catch (error) {
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
async function commentOnActivity(req, res) {
    try {
        const userId = req.user.id;
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
    }
    catch (error) {
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
async function followUser(req, res) {
    try {
        const followerId = req.user.id;
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
    }
    catch (error) {
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
async function checkFollowStatus(req, res) {
    try {
        const followerId = req.user.id;
        const { userId } = req.params;
        const isFollowing = await activityFeedService.isFollowing(followerId, userId);
        res.json({
            success: true,
            data: { isFollowing }
        });
    }
    catch (error) {
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
async function getFollowers(req, res) {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
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
    }
    catch (error) {
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
async function getFollowing(req, res) {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
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
    }
    catch (error) {
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
async function getFollowCounts(req, res) {
    try {
        const { userId } = req.params;
        const counts = await activityFeedService.getFollowCounts(userId);
        res.json({
            success: true,
            data: counts
        });
    }
    catch (error) {
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
async function getSuggestedUsers(req, res) {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;
        const suggestedUsers = await activityFeedService.getSuggestedUsers(userId, limit);
        res.json({
            success: true,
            data: suggestedUsers
        });
    }
    catch (error) {
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
async function shareActivity(req, res) {
    try {
        const userId = req.user.id;
        const { activityId } = req.params;
        await activityFeedService.shareActivity(activityId, userId);
        res.json({
            success: true,
            message: 'Activity shared successfully'
        });
    }
    catch (error) {
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
async function getActivityStats(req, res) {
    try {
        const { activityId } = req.params;
        const stats = await activityFeedService.getActivityStats(activityId);
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error in getActivityStats:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch activity stats'
        });
    }
}
