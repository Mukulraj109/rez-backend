"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const followerAnalyticsController_1 = require("../controllers/followerAnalyticsController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * @route   GET /api/stores/:storeId/followers/analytics/detailed
 * @desc    Get detailed follower analytics with time series data
 * @access  Private (Store owners/admins)
 * @query   startDate, endDate (optional)
 */
router.get('/:storeId/followers/analytics/detailed', auth_1.authenticate, followerAnalyticsController_1.getDetailedFollowerAnalytics);
/**
 * @route   GET /api/stores/:storeId/followers/analytics/growth
 * @desc    Get follower growth metrics (weekly & monthly)
 * @access  Private (Store owners/admins)
 */
router.get('/:storeId/followers/analytics/growth', auth_1.authenticate, followerAnalyticsController_1.getFollowerGrowthMetrics);
/**
 * @route   GET /api/stores/:storeId/followers/analytics/summary
 * @desc    Get quick analytics summary
 * @access  Private (Store owners/admins)
 */
router.get('/:storeId/followers/analytics/summary', auth_1.authenticate, followerAnalyticsController_1.getFollowerAnalyticsSummary);
/**
 * @route   GET /api/stores/:storeId/followers/count
 * @desc    Get current follower count for a store
 * @access  Public
 */
router.get('/:storeId/followers/count', followerAnalyticsController_1.getFollowerCount);
/**
 * @route   POST /api/stores/:storeId/followers/analytics/snapshot
 * @desc    Manually trigger daily analytics snapshot
 * @access  Private (Admin only)
 */
router.post('/:storeId/followers/analytics/snapshot', auth_1.authenticate, followerAnalyticsController_1.triggerDailySnapshot);
exports.default = router;
