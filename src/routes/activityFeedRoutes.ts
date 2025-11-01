import express from 'express';
import { authenticate } from '../middleware/auth';
import * as controller from '../controllers/activityFeedController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ==================== FEED ROUTES ====================

/**
 * Get activity feed for authenticated user
 * @route GET /api/social/feed
 * @access Private
 * @query page: number (default: 1)
 * @query limit: number (default: 20)
 */
router.get('/feed', controller.getFeed);

// ==================== ACTIVITY ROUTES ====================

/**
 * Create a new activity
 * @route POST /api/social/activities
 * @access Private
 * @body { type, title, description?, amount?, icon?, color?, relatedEntity?, metadata? }
 */
router.post('/activities', controller.createActivity);

/**
 * Get user's activities
 * @route GET /api/social/users/:userId/activities
 * @access Private
 * @query page: number (default: 1)
 * @query limit: number (default: 20)
 */
router.get('/users/:userId/activities', controller.getUserActivities);

/**
 * Get activity statistics
 * @route GET /api/social/activities/:activityId/stats
 * @access Private
 */
router.get('/activities/:activityId/stats', controller.getActivityStats);

// ==================== INTERACTION ROUTES ====================

/**
 * Like/Unlike an activity
 * @route POST /api/social/activities/:activityId/like
 * @access Private
 */
router.post('/activities/:activityId/like', controller.likeActivity);

/**
 * Get comments for an activity
 * @route GET /api/social/activities/:activityId/comments
 * @access Private
 * @query page: number (default: 1)
 * @query limit: number (default: 20)
 */
router.get('/activities/:activityId/comments', controller.getComments);

/**
 * Comment on an activity
 * @route POST /api/social/activities/:activityId/comment
 * @access Private
 * @body { comment: string }
 */
router.post('/activities/:activityId/comment', controller.commentOnActivity);

/**
 * Share an activity
 * @route POST /api/social/activities/:activityId/share
 * @access Private
 */
router.post('/activities/:activityId/share', controller.shareActivity);

// ==================== FOLLOW ROUTES ====================

/**
 * Follow/Unfollow a user
 * @route POST /api/social/users/:userId/follow
 * @access Private
 */
router.post('/users/:userId/follow', controller.followUser);

/**
 * Check if following a user
 * @route GET /api/social/users/:userId/is-following
 * @access Private
 */
router.get('/users/:userId/is-following', controller.checkFollowStatus);

/**
 * Get user's followers
 * @route GET /api/social/users/:userId/followers
 * @access Private
 * @query page: number (default: 1)
 * @query limit: number (default: 50)
 */
router.get('/users/:userId/followers', controller.getFollowers);

/**
 * Get user's following list
 * @route GET /api/social/users/:userId/following
 * @access Private
 * @query page: number (default: 1)
 * @query limit: number (default: 50)
 */
router.get('/users/:userId/following', controller.getFollowing);

/**
 * Get follow counts for a user
 * @route GET /api/social/users/:userId/follow-counts
 * @access Private
 */
router.get('/users/:userId/follow-counts', controller.getFollowCounts);

/**
 * Get suggested users to follow
 * @route GET /api/social/suggested-users
 * @access Private
 * @query limit: number (default: 10)
 */
router.get('/suggested-users', controller.getSuggestedUsers);

export default router;
