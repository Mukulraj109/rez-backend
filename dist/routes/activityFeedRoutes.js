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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const controller = __importStar(require("../controllers/activityFeedController"));
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticate);
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
exports.default = router;
