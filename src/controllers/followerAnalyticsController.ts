import { Request, Response } from 'express';
import mongoose from 'mongoose';
import {
  getDetailedAnalytics,
  getGrowthMetrics,
  getCurrentFollowerCount,
  recordDailySnapshot
} from '../services/followerAnalyticsService';
import { sendSuccess, sendError } from '../utils/response';

/**
 * GET /api/stores/:storeId/followers/analytics/detailed
 * Get detailed follower analytics for a store
 */
export const getDetailedFollowerAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;

    // Validate storeId
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      sendError(res, 'Invalid store ID', 400);
      return;
    }

    // Default to last 30 days
    const start = startDate
      ? new Date(startDate as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      sendError(res, 'Invalid date format', 400);
      return;
    }

    if (start > end) {
      sendError(res, 'Start date cannot be after end date', 400);
      return;
    }

    const analytics = await getDetailedAnalytics(storeId, start, end);

    sendSuccess(res, analytics, 'Detailed analytics fetched successfully');
  } catch (error) {
    console.error('Error fetching detailed analytics:', error);
    sendError(res, 'Failed to fetch detailed analytics', 500);
  }
};

/**
 * GET /api/stores/:storeId/followers/analytics/growth
 * Get growth metrics for a store
 */
export const getFollowerGrowthMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId } = req.params;

    // Validate storeId
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      sendError(res, 'Invalid store ID', 400);
      return;
    }

    const metrics = await getGrowthMetrics(storeId);

    sendSuccess(res, metrics, 'Growth metrics fetched successfully');
  } catch (error) {
    console.error('Error fetching growth metrics:', error);
    sendError(res, 'Failed to fetch growth metrics', 500);
  }
};

/**
 * GET /api/stores/:storeId/followers/count
 * Get current follower count for a store
 */
export const getFollowerCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId } = req.params;

    // Validate storeId
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      sendError(res, 'Invalid store ID', 400);
      return;
    }

    const count = await getCurrentFollowerCount(storeId);

    sendSuccess(res, { count, storeId }, 'Follower count fetched successfully');
  } catch (error) {
    console.error('Error fetching follower count:', error);
    sendError(res, 'Failed to fetch follower count', 500);
  }
};

/**
 * POST /api/stores/:storeId/followers/analytics/snapshot
 * Manually trigger daily snapshot (admin only)
 */
export const triggerDailySnapshot = async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId } = req.params;

    // Validate storeId
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      sendError(res, 'Invalid store ID', 400);
      return;
    }

    await recordDailySnapshot(storeId);

    sendSuccess(res, { success: true }, 'Daily snapshot recorded successfully');
  } catch (error) {
    console.error('Error recording daily snapshot:', error);
    sendError(res, 'Failed to record daily snapshot', 500);
  }
};

/**
 * GET /api/stores/:storeId/followers/analytics/summary
 * Get a quick summary of follower analytics
 */
export const getFollowerAnalyticsSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeId } = req.params;

    // Validate storeId
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      sendError(res, 'Invalid store ID', 400);
      return;
    }

    const [currentCount, growthMetrics] = await Promise.all([
      getCurrentFollowerCount(storeId),
      getGrowthMetrics(storeId)
    ]);

    const summary = {
      currentFollowers: currentCount,
      weeklyGrowth: {
        new: growthMetrics.weekly.newFollowers,
        lost: growthMetrics.weekly.unfollows,
        net: growthMetrics.weekly.netGrowth,
        rate: growthMetrics.weekly.growthRate
      },
      monthlyGrowth: {
        new: growthMetrics.monthly.newFollowers,
        lost: growthMetrics.monthly.unfollows,
        net: growthMetrics.monthly.netGrowth,
        rate: growthMetrics.monthly.growthRate
      },
      engagement: {
        weeklyOrders: growthMetrics.weekly.totalOrders,
        weeklyRevenue: growthMetrics.weekly.totalRevenue,
        weeklyClicks: growthMetrics.weekly.totalClicks
      },
      exclusiveOffers: {
        weeklyViews: growthMetrics.weekly.exclusiveViews,
        weeklyRedemptions: growthMetrics.weekly.exclusiveRedemptions,
        conversionRate:
          growthMetrics.weekly.exclusiveViews > 0
            ? (
                (growthMetrics.weekly.exclusiveRedemptions /
                  growthMetrics.weekly.exclusiveViews) *
                100
              ).toFixed(2)
            : '0.00'
      }
    };

    sendSuccess(res, summary, 'Analytics summary fetched successfully');
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    sendError(res, 'Failed to fetch analytics summary', 500);
  }
};
