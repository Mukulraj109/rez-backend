"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const followerStatsController_1 = require("../controllers/followerStatsController");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/stores/:storeId/followers/count
 * @desc    Get total follower count for a store
 * @access  Private (Merchant must own the store)
 */
router.get('/:storeId/followers/count', auth_1.authenticate, followerStatsController_1.getFollowerCount);
/**
 * @route   GET /api/stores/:storeId/followers/list
 * @desc    Get paginated list of followers with their details
 * @access  Private (Merchant must own the store)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20)
 */
router.get('/:storeId/followers/list', auth_1.authenticate, followerStatsController_1.getFollowersList);
/**
 * @route   GET /api/stores/:storeId/followers/analytics
 * @desc    Get follower analytics including growth rate and trends
 * @access  Private (Merchant must own the store)
 */
router.get('/:storeId/followers/analytics', auth_1.authenticate, followerStatsController_1.getFollowerAnalytics);
/**
 * @route   GET /api/stores/:storeId/followers/top
 * @desc    Get top followers by engagement (orders, reviews)
 * @access  Private (Merchant must own the store)
 * @query   limit - Number of top followers to return (default: 10)
 */
router.get('/:storeId/followers/top', auth_1.authenticate, followerStatsController_1.getTopFollowers);
exports.default = router;
