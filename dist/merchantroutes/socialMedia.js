"use strict";
// Merchant Social Media Routes
// Handles merchant verification of user-submitted social media posts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const merchantauth_1 = require("../middleware/merchantauth");
const socialMediaController_1 = require("../controllers/merchant/socialMediaController");
const router = (0, express_1.Router)();
// All routes require merchant authentication
router.use(merchantauth_1.authMiddleware);
// @route   GET /api/merchant/social-media-posts
// @desc    Get social media posts for merchant's store
// @access  Private (Merchant)
router.get('/', socialMediaController_1.listSocialMediaPosts);
// @route   GET /api/merchant/social-media-posts/stats
// @desc    Get social media verification statistics
// @access  Private (Merchant)
router.get('/stats', socialMediaController_1.getSocialMediaStats);
// @route   GET /api/merchant/social-media-posts/:postId
// @desc    Get single social media post details
// @access  Private (Merchant)
router.get('/:postId', socialMediaController_1.getSocialMediaPost);
// @route   PUT /api/merchant/social-media-posts/:postId/approve
// @desc    Approve a social media post and credit REZ coins to user
// @access  Private (Merchant)
router.put('/:postId/approve', socialMediaController_1.approveSocialMediaPost);
// @route   PUT /api/merchant/social-media-posts/:postId/reject
// @desc    Reject a social media post with reason
// @access  Private (Merchant)
router.put('/:postId/reject', socialMediaController_1.rejectSocialMediaPost);
exports.default = router;
