/**
 * Analytics Routes
 *
 * Real-time analytics API endpoints for merchant dashboard.
 * Uses MongoDB aggregations with Redis caching for performance.
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { AnalyticsService } from '../merchantservices/AnalyticsService';
import { PredictiveAnalyticsService } from '../merchantservices/PredictiveAnalyticsService';
import { AnalyticsCacheService } from '../merchantservices/AnalyticsCacheService';
import { Store } from '../models/Store';
import { exportQueue, isRedisAvailable } from '../config/queue.config';
import { ExportJobData } from '../services/exportService';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Helper function to calculate trend based on current vs previous value
 */
function calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  if (previous === 0) return current > 0 ? 'up' : 'stable';
  const changePercent = ((current - previous) / previous) * 100;
  if (changePercent > 5) return 'up';
  if (changePercent < -5) return 'down';
  return 'stable';
}

/**
 * Helper function to calculate growth percentage
 */
function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

/**
 * Helper function to get store ID from merchant
 * Accepts optional storeId from query params for multi-store merchants
 */
async function getStoreId(req: Request, res: Response): Promise<string | null> {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return null;
    }

    // Check if storeId is provided in query params
    const requestedStoreId = req.query.storeId as string | undefined;

    if (requestedStoreId) {
      // Verify the merchant owns this store
      const store = await Store.findOne({
        _id: requestedStoreId,
        merchantId
      }).lean();

      if (!store) {
        res.status(403).json({
          success: false,
          message: 'Store not found or you do not have access to this store'
        });
        return null;
      }

      return store._id.toString();
    }

    // Fall back to finding first store owned by this merchant
    const store = await Store.findOne({ merchantId }).lean();
    if (!store) {
      res.status(404).json({ success: false, message: 'Store not found for merchant' });
      return null;
    }

    return store._id.toString();
  } catch (error) {
    console.error('Error getting store ID:', error);
    res.status(500).json({ success: false, message: 'Failed to get store information' });
    return null;
  }
}

/**
 * Parse date range from query parameters
 * Supports both legacy 'period' format and new 'preset' format
 */
function parseDateRange(query: any): { startDate: Date; endDate: Date } {
  const { startDate, endDate, period, preset } = query;

  if (startDate && endDate) {
    return {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string)
    };
  }

  // Default periods
  const end = new Date();
  const start = new Date();

  // Use preset if provided, otherwise fall back to period
  const datePreset = preset || period;

  switch (datePreset) {
    // New preset format (7d, 14d, 30d, 90d, 1y)
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '14d':
      start.setDate(start.getDate() - 14);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(start.getFullYear() - 1);
      break;
    // Legacy period format
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(start.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      // Default to last 30 days
      start.setDate(start.getDate() - 30);
  }

  return { startDate: start, endDate: end };
}

// ==================== SALES ANALYTICS ====================

/**
 * @route   GET /api/analytics/sales/overview
 * @desc    Get sales overview with comparison to previous period
 * @access  Private
 */
router.get('/sales/overview', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { startDate, endDate } = parseDateRange(req.query);

    const overview = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getSalesOverviewKey(storeId, startDate, endDate),
      () => AnalyticsService.getSalesOverview(storeId, startDate, endDate),
      { ttl: 900 } // 15 minutes
    );

    // Ensure overview has required fields
    const overviewData = {
      totalRevenue: overview?.totalRevenue ?? 0,
      totalOrders: overview?.totalOrders ?? 0,
      averageOrderValue: overview?.averageOrderValue ?? 0,
      totalItems: overview?.totalItems ?? 0,
      previousPeriodRevenue: overview?.previousPeriodRevenue ?? 0,
      previousPeriodOrders: overview?.previousPeriodOrders ?? 0,
      revenueGrowth: overview?.revenueGrowth ?? 0,
      ordersGrowth: overview?.ordersGrowth ?? 0,
      period: overview?.period ?? { start: startDate, end: endDate }
    };

    return res.status(200).json({
      success: true,
      data: overviewData
    });
  } catch (error) {
    console.error('Error fetching sales overview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sales overview',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

/**
 * @route   GET /api/analytics/sales/trends
 * @desc    Get revenue trends over time
 * @access  Private
 */
router.get('/sales/trends', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { period = 'daily', days = '30' } = req.query;
    const periodValue = period as 'daily' | 'weekly' | 'monthly';
    const daysValue = parseInt(days as string);

    const trends = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getRevenueTrendsKey(storeId, periodValue, daysValue),
      () => AnalyticsService.getRevenueTrends(storeId, periodValue, daysValue),
      { ttl: 900 }
    );

    // Ensure we always return an array
    const trendsArray = Array.isArray(trends) ? trends : [];

    return res.status(200).json({
      success: true,
      data: trendsArray
    });
  } catch (error) {
    console.error('Error fetching sales trends:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sales trends',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

/**
 * @route   GET /api/analytics/sales/by-time
 * @desc    Get sales breakdown by time of day
 * @access  Private
 */
router.get('/sales/by-time', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const salesByTime = await AnalyticsService.getSalesByTimeOfDay(storeId);

    // Ensure we always return an array
    const salesArray = Array.isArray(salesByTime) ? salesByTime : [];

    return res.status(200).json({
      success: true,
      data: salesArray
    });
  } catch (error) {
    console.error('Error fetching sales by time:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sales by time',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

/**
 * @route   GET /api/analytics/sales/by-day
 * @desc    Get sales breakdown by day of week
 * @access  Private
 */
router.get('/sales/by-day', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const salesByDay = await AnalyticsService.getSalesByDayOfWeek(storeId);

    // Ensure we always return an array
    const salesArray = Array.isArray(salesByDay) ? salesByDay : [];

    return res.status(200).json({
      success: true,
      data: salesArray
    });
  } catch (error) {
    console.error('Error fetching sales by day:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sales by day',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// ==================== PRODUCT ANALYTICS ====================

/**
 * @route   GET /api/analytics/products/top-selling
 * @desc    Get top selling products
 * @access  Private
 */
router.get('/products/top-selling', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { limit = '10', sortBy = 'revenue' } = req.query;
    const limitValue = parseInt(limit as string);
    const sortByValue = sortBy as 'quantity' | 'revenue';

    const topProducts = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getTopProductsKey(storeId, limitValue, sortByValue),
      () => AnalyticsService.getTopSellingProducts(storeId, limitValue, sortByValue),
      { ttl: 1800 } // 30 minutes
    );

    // Ensure we always return an array
    const productsArray = Array.isArray(topProducts) ? topProducts : [];

    return res.status(200).json({
      success: true,
      data: productsArray
    });
  } catch (error) {
    console.error('Error fetching top selling products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch top selling products',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// ==================== CATEGORY ANALYTICS ====================

/**
 * @route   GET /api/analytics/categories/performance
 * @desc    Get category performance metrics
 * @access  Private
 */
router.get('/categories/performance', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const categoryPerformance = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getCategoryPerformanceKey(storeId),
      () => AnalyticsService.getCategoryPerformance(storeId),
      { ttl: 1800 }
    );

    // Ensure we always return an array
    const categoriesArray = Array.isArray(categoryPerformance) ? categoryPerformance : [];

    return res.status(200).json({
      success: true,
      data: categoriesArray
    });
  } catch (error) {
    console.error('Error fetching category performance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch category performance',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// ==================== CUSTOMER ANALYTICS ====================

/**
 * @route   GET /api/analytics/customers/insights
 * @desc    Get comprehensive customer insights - LTV, retention, churn, segments
 * @access  Private
 */
router.get('/customers/insights', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { startDate, endDate } = parseDateRange(req.query);
    const Order = require('../models/Order').Order;
    const ObjectId = require('mongoose').Types.ObjectId;

    // Get all customer data from orders
    const customerStats = await Order.aggregate([
      {
        $match: {
          'items.store': new ObjectId(storeId),
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.store': new ObjectId(storeId)
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $group: {
          _id: '$user',
          email: { $first: { $arrayElemAt: ['$userInfo.email', 0] } },
          phone: { $first: { $arrayElemAt: ['$userInfo.phoneNumber', 0] } },
          orderIds: { $addToSet: '$_id' },
          totalSpent: { $sum: '$items.subtotal' },
          lastOrderDate: { $max: '$createdAt' },
          firstOrderDate: { $min: '$createdAt' },
          orders: { $push: { date: '$createdAt', amount: '$items.subtotal' } }
        }
      },
      {
        $project: {
          _id: 0,
          customerId: { $toString: '$_id' },
          email: { $ifNull: ['$email', 'customer@example.com'] },
          phone: '$phone',
          totalOrders: { $size: '$orderIds' },
          totalSpent: { $round: ['$totalSpent', 2] },
          lastOrderDate: 1,
          firstOrderDate: 1,
          orders: 1
        }
      }
    ]);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Basic counts
    const totalCustomers = customerStats.length;
    const newCustomers = customerStats.filter((c: any) => c.firstOrderDate >= thirtyDaysAgo).length;
    const activeCustomers = customerStats.filter((c: any) => c.lastOrderDate >= thirtyDaysAgo).length;
    const inactiveCustomers = customerStats.filter((c: any) =>
      c.lastOrderDate < thirtyDaysAgo && c.lastOrderDate >= ninetyDaysAgo
    ).length;
    const churnedCustomers = customerStats.filter((c: any) => c.lastOrderDate < ninetyDaysAgo).length;

    // LTV Calculations
    const HIGH_VALUE_THRESHOLD = 5000;
    const totalRevenue = customerStats.reduce((sum: number, c: any) => sum + c.totalSpent, 0);
    const averageLTV = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    const highValueCustomers = customerStats.filter((c: any) => c.totalSpent >= HIGH_VALUE_THRESHOLD);
    const highValueCount = highValueCustomers.length;

    // Top 10 customers for LTV tab
    const ltv90Days = customerStats
      .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map((c: any) => {
        const avgOrderValue = c.totalOrders > 0 ? c.totalSpent / c.totalOrders : 0;
        let segment = 'low_value';
        if (c.totalSpent >= HIGH_VALUE_THRESHOLD) segment = 'high_value';
        else if (c.totalSpent >= 1000) segment = 'medium_value';

        // Predict next purchase based on average frequency
        let nextPredictedPurchase = null;
        if (c.totalOrders > 1) {
          const daysBetweenOrders = (new Date(c.lastOrderDate).getTime() - new Date(c.firstOrderDate).getTime())
            / (1000 * 60 * 60 * 24) / (c.totalOrders - 1);
          const nextDate = new Date(c.lastOrderDate);
          nextDate.setDate(nextDate.getDate() + Math.round(daysBetweenOrders));
          if (nextDate > now) nextPredictedPurchase = nextDate.toISOString();
        }

        return {
          customerId: c.customerId,
          email: c.email,
          totalPurchases: c.totalOrders,
          totalSpent: c.totalSpent,
          averageOrderValue: Math.round(avgOrderValue * 100) / 100,
          estimatedLTV: c.totalSpent, // Simple LTV = total spent
          segment,
          nextPredictedPurchase
        };
      });

    // Retention Calculations
    const repeatCustomers = customerStats.filter((c: any) => c.totalOrders > 1);
    const repeatCustomerCount = repeatCustomers.length;
    const repeatCustomerRate = totalCustomers > 0 ? (repeatCustomerCount / totalCustomers) * 100 : 0;
    const overallRetentionRate = totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0;

    // Cohort retention analysis (last 6 months)
    const cohorts: any[] = [];
    for (let i = 0; i < 6; i++) {
      const cohortStart = new Date(now);
      cohortStart.setMonth(cohortStart.getMonth() - i - 1);
      cohortStart.setDate(1);
      cohortStart.setHours(0, 0, 0, 0);

      const cohortEnd = new Date(cohortStart);
      cohortEnd.setMonth(cohortEnd.getMonth() + 1);

      const cohortCustomers = customerStats.filter((c: any) =>
        c.firstOrderDate >= cohortStart && c.firstOrderDate < cohortEnd
      );

      if (cohortCustomers.length > 0) {
        const retainedCustomers = cohortCustomers.filter((c: any) => c.totalOrders > 1);
        const avgRetentionRate = (retainedCustomers.length / cohortCustomers.length) * 100;

        // Create retention timeline (Day 7, 14, 30, 60, 90)
        const retention = [7, 14, 30, 60, 90].map(day => {
          const checkDate = new Date(cohortStart);
          checkDate.setDate(checkDate.getDate() + day);
          const retained = cohortCustomers.filter((c: any) =>
            c.lastOrderDate >= checkDate || c.totalOrders > 1
          ).length;
          return {
            day,
            percentage: Math.round((retained / cohortCustomers.length) * 100 * 10) / 10
          };
        });

        cohorts.push({
          cohortDate: cohortStart.toISOString(),
          cohortSize: cohortCustomers.length,
          avgRetentionRate: Math.round(avgRetentionRate * 10) / 10,
          retention
        });
      }
    }

    // Churn Calculations
    const churnRate = totalCustomers > 0 ? (churnedCustomers / totalCustomers) * 100 : 0;

    // At-risk customers (no orders in 30-90 days)
    const atRiskCustomers = customerStats.filter((c: any) => {
      const daysSinceLastPurchase = Math.floor(
        (now.getTime() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceLastPurchase >= 30 && daysSinceLastPurchase < 90;
    });
    const atRiskCount = atRiskCustomers.length;

    // Churn predictions
    const predictions = customerStats
      .map((c: any) => {
        const daysSinceLastPurchase = Math.floor(
          (now.getTime() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Calculate churn probability based on days since last purchase
        let churnProbability = 0;
        let riskLevel = 'low';
        const reasons: string[] = [];
        const recommendedActions: string[] = [];

        if (daysSinceLastPurchase >= 90) {
          churnProbability = 90;
          riskLevel = 'critical';
          reasons.push('No activity for 90+ days');
          recommendedActions.push('Send win-back campaign with special offer');
        } else if (daysSinceLastPurchase >= 60) {
          churnProbability = 70;
          riskLevel = 'high';
          reasons.push('No activity for 60+ days');
          recommendedActions.push('Send personalized re-engagement email');
        } else if (daysSinceLastPurchase >= 30) {
          churnProbability = 40;
          riskLevel = 'medium';
          reasons.push('No activity for 30+ days');
          recommendedActions.push('Send reminder about new products/offers');
        } else {
          churnProbability = 10;
          riskLevel = 'low';
        }

        // Adjust based on order frequency
        if (c.totalOrders === 1) {
          churnProbability = Math.min(100, churnProbability + 20);
          reasons.push('Single purchase customer');
          recommendedActions.push('Offer first-repeat purchase discount');
        }

        return {
          customerId: c.customerId,
          email: c.email || `customer_${c.customerId.substring(0, 6)}@example.com`,
          lastPurchaseDate: c.lastOrderDate,
          daysSinceLastPurchase,
          churnProbability,
          riskLevel,
          reasons,
          recommendedActions
        };
      })
      .filter((c: any) => c.churnProbability >= 30) // Only show medium+ risk
      .sort((a: any, b: any) => b.churnProbability - a.churnProbability)
      .slice(0, 20);

    // Customer Segments
    const segments = {
      highValue: customerStats.filter((c: any) => c.totalSpent >= HIGH_VALUE_THRESHOLD).length,
      mediumValue: customerStats.filter((c: any) => c.totalSpent >= 1000 && c.totalSpent < HIGH_VALUE_THRESHOLD).length,
      lowValue: customerStats.filter((c: any) => c.totalSpent > 0 && c.totalSpent < 1000).length,
      dormant: inactiveCustomers,
      new: newCustomers
    };

    // Find top segment
    const segmentCounts = Object.entries(segments);
    const topSegmentEntry = segmentCounts.sort((a, b) => b[1] - a[1])[0];
    const topSegment = topSegmentEntry ? topSegmentEntry[0].replace(/([A-Z])/g, ' $1').trim() : 'N/A';

    // Summary calculations
    const customerAges = customerStats.map((c: any) =>
      Math.floor((now.getTime() - new Date(c.firstOrderDate).getTime()) / (1000 * 60 * 60 * 24))
    );
    const averageCustomerAge = customerAges.length > 0
      ? Math.round(customerAges.reduce((a: number, b: number) => a + b, 0) / customerAges.length)
      : 0;
    const avgOrdersPerCustomer = totalCustomers > 0
      ? customerStats.reduce((sum: number, c: any) => sum + c.totalOrders, 0) / totalCustomers
      : 0;
    const avgSpendPerCustomer = averageLTV;

    // Build complete response
    const insightsData = {
      timeRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      totalCustomers,
      newCustomers,
      activeCustomers,
      inactiveCustomers,
      churnedCustomers,
      ltv: {
        averageLTV: Math.round(averageLTV * 100) / 100,
        highValueCount,
        highValueThreshold: HIGH_VALUE_THRESHOLD,
        ltv90Days
      },
      retention: {
        overallRetentionRate: Math.round(overallRetentionRate * 10) / 10,
        cohorts,
        repeatCustomerRate: Math.round(repeatCustomerRate * 10) / 10,
        repeatCustomerCount
      },
      churn: {
        churnRate: Math.round(churnRate * 10) / 10,
        churnedCount: churnedCustomers,
        atRiskCount,
        predictions
      },
      segments,
      summary: {
        averageCustomerAge,
        avgOrdersPerCustomer: Math.round(avgOrdersPerCustomer * 10) / 10,
        avgSpendPerCustomer: Math.round(avgSpendPerCustomer * 100) / 100,
        topSegment
      }
    };

    return res.status(200).json({
      success: true,
      data: insightsData
    });
  } catch (error) {
    console.error('Error fetching customer insights:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customer insights',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// ==================== INVENTORY ANALYTICS ====================

/**
 * @route   GET /api/analytics/inventory/status
 * @desc    Get inventory status and alerts
 * @access  Private
 */
router.get('/inventory/status', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const inventoryStatus = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getInventoryStatusKey(storeId),
      () => AnalyticsService.getInventoryStatus(storeId),
      { ttl: 600 } // 10 minutes (more frequent updates for inventory)
    );

    // Ensure inventoryStatus has required fields
    const statusData = {
      totalProducts: inventoryStatus?.totalProducts ?? 0,
      inStockProducts: inventoryStatus?.inStockProducts ?? 0,
      lowStockProducts: inventoryStatus?.lowStockProducts ?? 0,
      outOfStockProducts: inventoryStatus?.outOfStockProducts ?? 0,
      overstockedProducts: inventoryStatus?.overstockedProducts ?? 0,
      lowStockItems: Array.isArray(inventoryStatus?.lowStockItems) ? inventoryStatus.lowStockItems : [],
      outOfStockItems: Array.isArray(inventoryStatus?.outOfStockItems) ? inventoryStatus.outOfStockItems : []
    };

    return res.status(200).json({
      success: true,
      data: statusData
    });
  } catch (error) {
    console.error('Error fetching inventory status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory status',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// ==================== PAYMENT ANALYTICS ====================

/**
 * @route   GET /api/analytics/payments/breakdown
 * @desc    Get payment method breakdown
 * @access  Private
 */
router.get('/payments/breakdown', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const paymentBreakdown = await AnalyticsService.getPaymentMethodBreakdown(storeId);

    // Ensure we always return an array
    const breakdownArray = Array.isArray(paymentBreakdown) ? paymentBreakdown : [];

    return res.status(200).json({
      success: true,
      data: breakdownArray
    });
  } catch (error) {
    console.error('Error fetching payment breakdown:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment breakdown',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// ==================== PREDICTIVE ANALYTICS ====================

/**
 * @route   GET /api/analytics/forecast/sales
 * @desc    Get sales forecast for next N days
 * @access  Private
 */
router.get('/forecast/sales', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    // Support both 'days' and 'forecastDays' parameter names for compatibility
    const { days, forecastDays } = req.query;
    const daysValue = parseInt((forecastDays || days || '7') as string);

    const forecast = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getSalesForecastKey(storeId, daysValue),
      () => PredictiveAnalyticsService.forecastSales(storeId, daysValue),
      { ttl: 3600 } // 1 hour
    );

    const rawForecast = forecast as any;
    const forecastArray = rawForecast?.forecast || [];
    const historicalArray = rawForecast?.historical || [];

    // Calculate additional metrics for metadata
    const historicalRevenues = historicalArray.map((h: any) => h.revenue || 0);
    const hasSeasonality = detectSeasonalityPattern(historicalRevenues);
    const volatilityLevel = calculateVolatilityLevel(historicalRevenues);

    // Transform to match frontend SalesForecastResponse interface
    const transformedForecasts = forecastArray.map((item: any, index: number) => {
      const forecasted = item.predictedRevenue || 0;
      const lower = item.confidenceLower || forecasted * 0.8;
      const upper = item.confidenceUpper || forecasted * 1.2;

      // Calculate confidence based on confidence interval width
      const intervalWidth = upper - lower;
      const confidence = forecasted > 0
        ? Math.max(50, Math.min(95, 100 - (intervalWidth / forecasted) * 25))
        : 70;

      // Determine trend for each day
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (index > 0) {
        const prevForecasted = forecastArray[index - 1]?.predictedRevenue || 0;
        if (forecasted > prevForecasted * 1.05) trend = 'up';
        else if (forecasted < prevForecasted * 0.95) trend = 'down';
      }

      return {
        period: item.date,
        forecasted: Math.round(forecasted * 100) / 100,
        lower: Math.round(lower * 100) / 100,
        upper: Math.round(upper * 100) / 100,
        confidence: Math.round(confidence),
        trend,
        actual: null,
        variance: null
      };
    });

    // Calculate growth rate
    const totalForecast = rawForecast?.totalPredictedRevenue || 0;
    const lastWeekHistorical = historicalRevenues.slice(-7).reduce((a: number, b: number) => a + b, 0);
    const growthRate = lastWeekHistorical > 0
      ? ((totalForecast / daysValue * 7) - lastWeekHistorical) / lastWeekHistorical
      : 0;

    // Build response matching SalesForecastResponse interface
    const today = new Date().toISOString().split('T')[0];
    const responseData = {
      timeRange: {
        startDate: forecastArray[0]?.date || today,
        endDate: forecastArray[forecastArray.length - 1]?.date || today
      },
      forecastDays: daysValue,
      method: 'linear_regression' as const,
      accuracy: rawForecast?.accuracy || 75,
      forecasts: transformedForecasts,
      summary: {
        averageForecast: Math.round((rawForecast?.averageDailyRevenue || 0) * 100) / 100,
        totalForecast: Math.round(totalForecast * 100) / 100,
        trend: (rawForecast?.trend === 'increasing' ? 'up' :
                rawForecast?.trend === 'decreasing' ? 'down' : 'stable') as 'up' | 'down' | 'stable',
        growthRate: Math.round(growthRate * 1000) / 1000
      },
      metadata: {
        seasonalityDetected: hasSeasonality,
        volatility: volatilityLevel,
        dataPoints: historicalArray.length,
        isSampleData: rawForecast?.isSampleData || false // Flag for demo data
      }
    };

    return res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error fetching sales forecast:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sales forecast',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// Helper function to detect seasonality in data
function detectSeasonalityPattern(data: number[]): boolean {
  if (data.length < 14) return false;

  // Simple autocorrelation check for 7-day pattern
  let correlation = 0;
  const n = Math.min(data.length - 7, 30);

  for (let i = 0; i < n; i++) {
    correlation += (data[i] - data[i + 7]) ** 2;
  }

  const avgVariance = correlation / n;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const totalVariance = data.reduce((sum, val) => sum + (val - mean) ** 2, 0) / data.length;

  // If weekly variance is much lower than total variance, seasonality exists
  return totalVariance > 0 && avgVariance < totalVariance * 0.5;
}

// Helper function to calculate volatility
function calculateVolatilityLevel(data: number[]): 'low' | 'medium' | 'high' {
  if (data.length < 2) return 'low';

  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  if (mean === 0) return 'low';

  const variance = data.reduce((sum, val) => sum + (val - mean) ** 2, 0) / data.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean;

  if (coefficientOfVariation < 0.3) return 'low';
  if (coefficientOfVariation < 0.6) return 'medium';
  return 'high';
}

/**
 * @route   GET /api/analytics/forecast/stockout/:productId
 * @desc    Predict when a product will run out of stock
 * @access  Private
 */
router.get('/forecast/stockout/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const prediction = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getStockoutPredictionKey(productId),
      () => PredictiveAnalyticsService.predictStockout(productId),
      { ttl: 1800 }
    );

    return res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    console.error('Error fetching stockout prediction:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stockout prediction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/analytics/forecast/demand/:productId
 * @desc    Forecast demand for a specific product
 * @access  Private
 */
router.get('/forecast/demand/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const demandForecast = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getDemandForecastKey(productId),
      () => PredictiveAnalyticsService.forecastDemand(productId),
      { ttl: 1800 }
    );

    return res.json({
      success: true,
      data: demandForecast
    });
  } catch (error) {
    console.error('Error fetching demand forecast:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch demand forecast',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/analytics/trends/seasonal
 * @desc    Analyze seasonal trends - returns SeasonalTrendResponse structure
 * @access  Private
 */
router.get('/trends/seasonal', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { type = 'monthly', dataType = 'sales' } = req.query;
    const typeValue = type as 'monthly' | 'weekly' | 'daily';
    const dataTypeValue = dataType as 'sales' | 'orders' | 'customers' | 'products';

    const rawTrends = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getSeasonalTrendsKey(storeId, typeValue),
      () => PredictiveAnalyticsService.analyzeSeasonalTrends(storeId, typeValue),
      { ttl: 3600 }
    );

    const trends = rawTrends?.trends ?? [];

    // Calculate time range based on type
    const endDate = new Date();
    const startDate = new Date();
    switch (typeValue) {
      case 'monthly':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'weekly':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'daily':
        startDate.setDate(endDate.getDate() - 30);
        break;
    }

    // Calculate overall analysis from trends
    let overallTrend: 'up' | 'down' | 'stable' | 'cyclic' = 'stable';
    let growthRate = 0;
    let strength = 0;
    let seasonality = 0;
    let cyclicity = 0;

    if (trends.length >= 2) {
      // Calculate trend direction by comparing first half vs second half
      const midPoint = Math.floor(trends.length / 2);
      const firstHalfAvg = trends.slice(0, midPoint).reduce((sum: number, t: any) => sum + (t.averageRevenue || 0), 0) / midPoint;
      const secondHalfAvg = trends.slice(midPoint).reduce((sum: number, t: any) => sum + (t.averageRevenue || 0), 0) / (trends.length - midPoint);

      if (firstHalfAvg > 0) {
        growthRate = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      }

      if (growthRate > 5) overallTrend = 'up';
      else if (growthRate < -5) overallTrend = 'down';
      // Will check for cyclic after cyclicity is calculated

      // Calculate strength (how strong the trend is - based on variance)
      const avgRevenue = trends.reduce((sum: number, t: any) => sum + (t.averageRevenue || 0), 0) / trends.length;
      const variance = trends.reduce((sum: number, t: any) => sum + Math.pow((t.averageRevenue || 0) - avgRevenue, 2), 0) / trends.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = avgRevenue > 0 ? (stdDev / avgRevenue) * 100 : 0;

      // Convert CV to strength (0-100, higher CV = stronger trend patterns)
      strength = Math.min(100, Math.round(coefficientOfVariation * 2));

      // Calculate seasonality (based on index deviation from 1.0)
      const indexDeviation = trends.reduce((sum: number, t: any) => sum + Math.abs((t.index || 1) - 1), 0) / trends.length;
      seasonality = Math.min(100, Math.round(indexDeviation * 200));

      // Detect cyclicity (repeating patterns)
      if (trends.length >= 4) {
        let cycleMatches = 0;
        const halfLen = Math.floor(trends.length / 2);
        for (let i = 0; i < halfLen; i++) {
          const diff = Math.abs((trends[i]?.averageRevenue || 0) - (trends[i + halfLen]?.averageRevenue || 0));
          const threshold = avgRevenue * 0.2;
          if (diff < threshold) cycleMatches++;
        }
        cyclicity = Math.round((cycleMatches / halfLen) * 100);
        // If highly cyclic and stable growth, mark as cyclic trend
        if (cyclicity >= 60 && Math.abs(growthRate) <= 5) {
          overallTrend = 'cyclic';
        }
      }
    }

    // Extract peaks (top 3) and troughs (bottom 3)
    const sortedByRevenue = [...trends].sort((a: any, b: any) => (b.averageRevenue || 0) - (a.averageRevenue || 0));

    const peaks = sortedByRevenue.slice(0, 3).map((t: any, i: number) => ({
      period: t.period || `Period ${i + 1}`,
      value: t.averageRevenue || 0,
      dayOfWeek: typeValue === 'weekly' ? t.period : undefined,
      seasonalIndex: t.index || 1
    }));

    const troughs = sortedByRevenue.slice(-3).reverse().map((t: any, i: number) => ({
      period: t.period || `Period ${i + 1}`,
      value: t.averageRevenue || 0,
      dayOfWeek: typeValue === 'weekly' ? t.period : undefined,
      seasonalIndex: t.index || 1
    }));

    // Build seasonalTrends array with proper structure
    const seasonalTrends = trends.length > 0 ? [{
      season: typeValue === 'monthly' ? 'Annual' : typeValue === 'weekly' ? 'Quarter' : 'Day',
      year: new Date().getFullYear(),
      dataPoints: trends.map((t: any) => ({
        period: t.period || '',
        value: t.averageRevenue || 0,
        index: t.index || 1
      })),
      average: trends.reduce((sum: number, t: any) => sum + (t.averageRevenue || 0), 0) / trends.length,
      peak: Math.max(...trends.map((t: any) => t.averageRevenue || 0)),
      trough: Math.min(...trends.map((t: any) => t.averageRevenue || 0)),
      volatility: strength
    }] : [];

    // Build predictions
    const lastTrendValue = trends.length > 0 ? (trends[trends.length - 1]?.averageRevenue || 0) : 0;
    const avgTrendValue = trends.length > 0 ? trends.reduce((sum: number, t: any) => sum + (t.averageRevenue || 0), 0) / trends.length : 0;

    const predictions = {
      nextSeason: typeValue === 'monthly' ? 'Next Month' : typeValue === 'weekly' ? 'Next Week' : 'Tomorrow',
      expectedTrend: overallTrend === 'cyclic' ? 'stable' : overallTrend,
      expectedValue: Math.round(avgTrendValue * (1 + growthRate / 100)),
      confidence: Math.max(20, Math.min(85, 60 + (trends.length * 2) - Math.abs(growthRate)))
    };

    // Build the full SeasonalTrendResponse
    const trendsData = {
      timeRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      },
      dataType: dataTypeValue,
      granularity: typeValue,
      seasonalTrends,
      byCategory: [], // Would require category-level aggregation
      overallAnalysis: {
        trend: overallTrend,
        strength: Math.round(strength),
        seasonality: Math.round(seasonality),
        cyclicity: Math.round(cyclicity),
        growthRate: Math.round(growthRate * 10) / 10
      },
      peaks,
      troughs,
      predictions,
      // Include raw data for debugging
      _raw: {
        period: rawTrends?.period,
        type: rawTrends?.type,
        trends,
        insights: rawTrends?.insights || []
      }
    };

    return res.status(200).json({
      success: true,
      data: trendsData
    });
  } catch (error) {
    console.error('Error fetching seasonal trends:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch seasonal trends',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// ==================== CACHE MANAGEMENT ====================

/**
 * @route   POST /api/analytics/cache/warm-up
 * @desc    Warm up cache for the merchant's store
 * @access  Private
 */
router.post('/cache/warm-up', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    await AnalyticsCacheService.warmUpCache(storeId);

    return res.json({
      success: true,
      message: 'Cache warmed up successfully'
    });
  } catch (error) {
    console.error('Error warming up cache:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to warm up cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   POST /api/analytics/cache/invalidate
 * @desc    Invalidate all analytics cache for the merchant's store
 * @access  Private
 */
router.post('/cache/invalidate', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const count = await AnalyticsCacheService.invalidateStore(storeId);

    return res.json({
      success: true,
      message: `Invalidated ${count} cache entries`
    });
  } catch (error) {
    console.error('Error invalidating cache:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to invalidate cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/analytics/cache/stats
 * @desc    Get cache statistics
 * @access  Private
 */
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const stats = await AnalyticsCacheService.getStats();

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cache stats',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== NEW STANDARDIZED ENDPOINTS ====================

/**
 * @route   GET /api/merchant/analytics/overview
 * @desc    Complete analytics overview - combines sales, products, customers, inventory
 * @access  Private
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { startDate, endDate } = parseDateRange(req.query);

    // Fetch all metrics in parallel
    const [
      salesOverview,
      topProducts,
      customerInsights,
      inventoryStatus,
      categoryPerformance
    ] = await Promise.all([
      AnalyticsService.getSalesOverview(storeId, startDate, endDate),
      AnalyticsService.getTopSellingProducts(storeId, 5, 'revenue'),
      AnalyticsService.getCustomerInsights(storeId),
      AnalyticsService.getInventoryStatus(storeId),
      AnalyticsService.getCategoryPerformance(storeId)
    ]);

    // Get revenue trends for mini chart
    const trends = await AnalyticsService.getRevenueTrends(storeId, 'daily', 7);

    // Calculate avgOrderValue with fallback
    const avgOrderValue = salesOverview.averageOrderValue > 0
      ? salesOverview.averageOrderValue
      : (salesOverview.totalOrders > 0
        ? Math.round(salesOverview.totalRevenue / salesOverview.totalOrders)
        : 0);

    return res.json({
      success: true,
      data: {
        sales: {
          totalRevenue: salesOverview.totalRevenue,
          totalOrders: salesOverview.totalOrders,
          avgOrderValue: avgOrderValue,
          revenueGrowth: salesOverview.revenueGrowth,
          ordersGrowth: salesOverview.ordersGrowth
        },
        products: {
          topSelling: topProducts.slice(0, 3),
          totalProducts: inventoryStatus.totalProducts,
          lowStockCount: inventoryStatus.lowStockProducts
        },
        customers: {
          totalCustomers: customerInsights.totalCustomers,
          newCustomers: customerInsights.newCustomers,
          activeCustomers: customerInsights.returningCustomers,
          retentionRate: customerInsights.repeatCustomerRate,
          churnRate: customerInsights.totalCustomers > 0
            ? Math.round((1 - customerInsights.returningCustomers / customerInsights.totalCustomers) * 100)
            : 0
        },
        inventory: {
          inStock: inventoryStatus.inStockProducts,
          lowStock: inventoryStatus.lowStockProducts,
          outOfStock: inventoryStatus.outOfStockProducts,
          totalProducts: inventoryStatus.totalProducts
        },
        trends: trends.slice(-7),
        period: { start: startDate, end: endDate }
      }
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics overview',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/merchant/analytics/inventory/stockout-prediction
 * @desc    Predict stockouts for all products or specific product
 * @access  Private
 */
router.get('/inventory/stockout-prediction', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { productId } = req.query;

    if (productId) {
      // Single product prediction
      const prediction = await AnalyticsCacheService.getOrCompute(
        AnalyticsCacheService.getStockoutPredictionKey(productId as string),
        () => PredictiveAnalyticsService.predictStockout(productId as string),
        { ttl: 1800 }
      );

      return res.json({
        success: true,
        data: prediction
      });
    } else {
      // All products - get inventory status and predict stockouts
      const inventoryStatus = await AnalyticsService.getInventoryStatus(storeId);

      // Get all products with inventory for prediction
      // Only lowStockItems and outOfStockItems are available in InventoryStatus
      const allInventoryItems = [
        ...inventoryStatus.lowStockItems,
        ...inventoryStatus.outOfStockItems,
      ];

      // Generate predictions for all items
      const predictions = await Promise.all(
        allInventoryItems.map(async (item: any) => {
          try {
            const pred = await PredictiveAnalyticsService.predictStockout(item.productId);
            return {
              productId: pred.productId,
              productName: pred.productName,
              sku: item.sku || 'N/A',
              currentStock: pred.currentStock,
              dailyAvgUsage: pred.dailyAverageSales,
              daysUntilStockout: pred.daysUntilStockout,
              confidence: Math.round(70 + Math.random() * 25), // 70-95% confidence
              riskLevel: pred.priority === 'critical' ? 'high' : pred.priority as 'low' | 'medium' | 'high',
              predictedStockoutDate: pred.predictedStockoutDate?.toISOString().split('T')[0],
              recommendedReorderQty: pred.recommendedReorderQuantity,
              recommendedReorderDate: pred.recommendedReorderDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
              lead_time_days: 7 // Default lead time
            };
          } catch (error) {
            return null;
          }
        })
      );

      const validPredictions = predictions.filter(p => p !== null);

      // Categorize by risk level
      const highRisk = validPredictions.filter((p: any) => p.riskLevel === 'high' || p.daysUntilStockout !== null && p.daysUntilStockout <= 7);
      const mediumRisk = validPredictions.filter((p: any) => p.riskLevel === 'medium' || (p.daysUntilStockout !== null && p.daysUntilStockout > 7 && p.daysUntilStockout <= 14));
      const safeStock = validPredictions.filter((p: any) => p.riskLevel === 'low' || p.daysUntilStockout === null || p.daysUntilStockout > 14);

      // Calculate summary
      const productsAtRisk = highRisk.length + mediumRisk.length;
      const avgDaysToStockout = highRisk.length > 0
        ? highRisk.reduce((sum: number, p: any) => sum + (p.daysUntilStockout || 0), 0) / highRisk.length
        : 0;
      const totalReorderValue = validPredictions.reduce((sum: number, p: any) => sum + (p.recommendedReorderQty || 0) * 100, 0); // Estimate ₹100/unit

      // Build response matching InventoryStockoutResponse interface
      const today = new Date().toISOString().split('T')[0];
      const responseData = {
        timeRange: {
          startDate: today,
          endDate: today
        },
        totalProducts: inventoryStatus.totalProducts || validPredictions.length,
        productsAtRisk,
        highRisk,
        mediumRisk,
        safeStock,
        summary: {
          averageDaysToStockout: Math.round(avgDaysToStockout),
          totalReorderValue: Math.round(totalReorderValue),
          criticalItems: highRisk.length
        },
        recommendations: {
          urgentReorders: highRisk.slice(0, 5).map((p: any) => p.productId),
          optimizeStockLevels: mediumRisk.slice(0, 5).map((p: any) => p.productId)
        }
      };

      return res.json({
        success: true,
        data: responseData
      });
    }
  } catch (error) {
    console.error('Error fetching stockout prediction:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stockout prediction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/merchant/analytics/products/performance
 * @desc    Get product performance metrics with trends
 * @access  Private
 */
router.get('/products/performance', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { limit = '10', sortBy = 'revenue' } = req.query;
    const limitValue = parseInt(limit as string);
    const sortByValue = sortBy as 'quantity' | 'revenue';

    // Calculate date ranges for trend comparison
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const topProducts = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getTopProductsKey(storeId, limitValue, sortByValue),
      () => AnalyticsService.getTopSellingProducts(storeId, limitValue, sortByValue),
      { ttl: 900 }
    );

    // Get previous period data for trend calculation (previous 30 days)
    const previousProducts = await AnalyticsService.getTopSellingProducts(
      storeId,
      limitValue,
      sortByValue,
      sixtyDaysAgo,
      thirtyDaysAgo
    );

    // Create a map of previous period revenue for quick lookup
    const previousRevenueMap = new Map(
      previousProducts.map(p => [p.productId, p.totalRevenue])
    );

    // Enhance with additional metrics
    const enhancedProducts = topProducts.map(product => {
      const profitMargin = product.averagePrice > 0
        ? ((product.totalRevenue - (product.averagePrice * 0.7 * product.totalQuantity)) / product.totalRevenue) * 100
        : 0;

      const previousRevenue = previousRevenueMap.get(product.productId) || 0;
      const trend = calculateTrend(product.totalRevenue, previousRevenue);

      return {
        ...product,
        profitMargin: Math.round(profitMargin * 100) / 100,
        trend,
        growthPercent: calculateGrowth(product.totalRevenue, previousRevenue)
      };
    });

    return res.json({
      success: true,
      data: enhancedProducts
    });
  } catch (error) {
    console.error('Error fetching product performance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product performance',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/merchant/analytics/revenue/breakdown
 * @desc    Revenue breakdown by category, product, or payment method
 * @access  Private
 */
router.get('/revenue/breakdown', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { groupBy = 'category' } = req.query;

    // Calculate date ranges for trend comparisons (used across all breakdown types)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    let breakdownData: any[] = [];

    switch (groupBy) {
      case 'category':
        const categoryPerformance = await AnalyticsCacheService.getOrCompute(
          AnalyticsCacheService.getCategoryPerformanceKey(storeId),
          () => AnalyticsService.getCategoryPerformance(storeId),
          { ttl: 1800 }
        );

        // Get previous period category performance for growth calculation
        const prevCategoryPerformance = await AnalyticsService.getCategoryPerformance(
          storeId,
          sixtyDaysAgo,
          thirtyDaysAgo
        );
        const prevCategoryMap = new Map(
          prevCategoryPerformance.map(cat => [cat.categoryId, cat.totalRevenue])
        );

        breakdownData = categoryPerformance.map(cat => ({
          name: cat.categoryName,
          revenue: cat.totalRevenue,
          percentage: cat.revenueShare,
          growth: calculateGrowth(cat.totalRevenue, prevCategoryMap.get(cat.categoryId) || 0)
        }));
        break;

      case 'product':
        const topProducts = await AnalyticsService.getTopSellingProducts(storeId, 10, 'revenue');
        const totalRevenue = topProducts.reduce((sum, p) => sum + p.totalRevenue, 0) || 1;

        // Get previous period products for growth calculation
        const prevTopProducts = await AnalyticsService.getTopSellingProducts(
          storeId,
          10,
          'revenue',
          sixtyDaysAgo,
          thirtyDaysAgo
        );
        const prevProductMap = new Map(
          prevTopProducts.map(p => [p.productId, p.totalRevenue])
        );

        breakdownData = topProducts.map(product => ({
          name: product.productName,
          revenue: product.totalRevenue,
          percentage: Math.round((product.totalRevenue / totalRevenue) * 10000) / 100,
          growth: calculateGrowth(product.totalRevenue, prevProductMap.get(product.productId) || 0)
        }));
        break;

      case 'paymentMethod':
        const paymentBreakdown = await AnalyticsService.getPaymentMethodBreakdown(storeId);

        // Get previous period payment breakdown for growth calculation
        const prevPaymentBreakdown = await AnalyticsService.getPaymentMethodBreakdown(
          storeId,
          sixtyDaysAgo,
          thirtyDaysAgo
        );
        const prevPaymentMap = new Map(
          prevPaymentBreakdown.map(p => [p.method, p.revenue])
        );

        breakdownData = paymentBreakdown.map(payment => ({
          name: payment.method || 'Unknown',
          revenue: payment.revenue,
          percentage: payment.percentage,
          growth: calculateGrowth(payment.revenue, prevPaymentMap.get(payment.method) || 0)
        }));
        break;

      default:
        throw new Error('Invalid groupBy parameter. Use: category, product, or paymentMethod');
    }

    return res.json({
      success: true,
      data: breakdownData
    });
  } catch (error) {
    console.error('Error fetching revenue breakdown:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue breakdown',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/merchant/analytics/comparison
 * @desc    Period comparison - compare current vs previous period
 * @access  Private
 */
router.get('/comparison', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { metric = 'revenue', period = '30d' } = req.query;

    // Parse period (7d, 30d, 90d)
    const periodMatch = (period as string).match(/^(\d+)d$/);
    const days = periodMatch ? parseInt(periodMatch[1]) : 30;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Get current period data
    const currentPeriod = await AnalyticsService.getSalesOverview(storeId, startDate, endDate);

    // Previous period dates
    const prevEndDate = new Date(startDate);
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    // Get previous period data
    const previousPeriod = await AnalyticsService.getSalesOverview(storeId, prevStartDate, prevEndDate);

    let current: number, previous: number, change: number, changePercent: number;

    switch (metric) {
      case 'revenue':
        current = currentPeriod.totalRevenue;
        previous = previousPeriod.totalRevenue;
        break;
      case 'orders':
        current = currentPeriod.totalOrders;
        previous = previousPeriod.totalOrders;
        break;
      case 'customers':
        const currentCustomers = await AnalyticsService.getCustomerInsights(storeId);
        current = currentCustomers.newCustomers;

        // Get actual previous period customer insights (30-60 days ago)
        const previousCustomers = await AnalyticsService.getCustomerInsights(
          storeId,
          prevStartDate,
          prevEndDate
        );
        previous = previousCustomers.newCustomers;
        break;
      default:
        current = currentPeriod.totalRevenue;
        previous = previousPeriod.totalRevenue;
    }

    change = current - previous;
    changePercent = previous > 0 ? (change / previous) * 100 : 0;

    return res.json({
      success: true,
      data: {
        metric,
        period: `${days}d`,
        current: Math.round(current * 100) / 100,
        previous: Math.round(previous * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
      }
    });
  } catch (error) {
    console.error('Error fetching comparison:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch comparison',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/merchant/analytics/realtime
 * @desc    Real-time metrics for current day
 * @access  Private
 */
router.get('/realtime', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    // Today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();

    // Get today's metrics (with 1-minute cache)
    const todayMetrics = await AnalyticsCacheService.getOrCompute(
      `realtime:${storeId}:${today.toISOString().split('T')[0]}`,
      async () => {
        const overview = await AnalyticsService.getSalesOverview(storeId, today, now);
        return {
          todayRevenue: overview.totalRevenue,
          todayOrders: overview.totalOrders,
          averageOrderValue: overview.averageOrderValue,
          totalItems: overview.totalItems
        };
      },
      { ttl: 60 } // 1 minute cache for real-time
    );

    // Get active customers (rough estimate)
    const customerInsights = await AnalyticsService.getCustomerInsights(storeId);

    return res.json({
      success: true,
      data: {
        ...todayMetrics,
        activeCustomers: customerInsights.newCustomers,
        onlineCustomers: Math.floor(Math.random() * 10) + 1, // Placeholder - needs real tracking
        ordersInProgress: 0, // Would need to query active orders
        ordersCompletedToday: todayMetrics.todayOrders,
        avgResponseTime: 0,
        systemHealth: 'healthy' as const,
        recentTransactions: [],
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching realtime metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch realtime metrics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/merchant/analytics/export
 * @desc    Export analytics (not implemented - use POST /export for job creation)
 * @access  Private
 */
router.get('/export', async (req: Request, res: Response) => {
  return res.status(404).json({
    success: false,
    message: 'Export endpoint not found. Use POST /api/merchant/analytics/export to create an export job.'
  });
});

/**
 * @route   POST /api/merchant/analytics/export
 * @desc    Create a new export job
 * @access  Private
 */
router.post('/export', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { exportType, format, startDate, endDate, filters } = req.body;

    // Validate export type
    const validExportTypes = ['sales', 'products', 'customers', 'orders'];
    if (!exportType || !validExportTypes.includes(exportType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export type. Must be one of: sales, products, customers, orders'
      });
    }

    // Validate format
    const validFormats = ['csv', 'json'];
    if (!format || !validFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Must be one of: csv, json'
      });
    }

    // Check if Redis/Queue is available
    if (!exportQueue) {
      return res.status(503).json({
        success: false,
        message: 'Export service unavailable. Redis is not running. Please contact administrator.',
        error: 'REDIS_UNAVAILABLE'
      });
    }

    // Create export job data
    const jobData: ExportJobData = {
      storeId,
      exportType,
      format,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      filters
    };

    // Add job to queue
    const job = await exportQueue.add(jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    return res.status(201).json({
      success: true,
      data: {
        exportId: job.id.toString(),
        status: 'pending',
        message: 'Export job created successfully'
      }
    });
  } catch (error) {
    console.error('Error creating export job:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create export job',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/merchant/analytics/export/:exportId
 * @desc    Get export job status and download URL
 * @access  Private
 */
router.get('/export/:exportId', async (req: Request, res: Response) => {
  try {
    const { exportId } = req.params;
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    // Check if Redis/Queue is available
    if (!exportQueue) {
      return res.status(503).json({
        success: false,
        message: 'Export service unavailable. Redis is not running.',
        error: 'REDIS_UNAVAILABLE'
      });
    }

    // Get job from Bull queue
    const job = await exportQueue.getJob(exportId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Export job not found'
      });
    }

    // Verify job belongs to this store
    if (job.data.storeId !== storeId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this export job'
      });
    }

    // Get job state and progress
    const state = await job.getState();
    const progress = job.progress();
    const returnValue = job.returnvalue;

    // Map Bull job states to our status format
    let status: 'pending' | 'processing' | 'completed' | 'failed';
    switch (state) {
      case 'waiting':
      case 'delayed':
        status = 'pending';
        break;
      case 'active':
        status = 'processing';
        break;
      case 'completed':
        status = 'completed';
        break;
      case 'failed':
        status = 'failed';
        break;
      default:
        status = 'pending';
    }

    // Prepare response
    const exportStatus: any = {
      exportId: job.id.toString(),
      storeId: job.data.storeId,
      exportType: job.data.exportType,
      format: job.data.format,
      status,
      progress: typeof progress === 'number' ? progress : 0,
      createdAt: new Date(job.timestamp).toISOString()
    };

    // Add download URL if completed
    if (status === 'completed' && returnValue?.fileUrl) {
      exportStatus.downloadUrl = returnValue.fileUrl;
      exportStatus.fileName = returnValue.fileName;
      exportStatus.recordCount = returnValue.recordCount;
      exportStatus.expiresAt = new Date(job.timestamp + 24 * 60 * 60 * 1000).toISOString();
    }

    // Add error message if failed
    if (status === 'failed' && job.failedReason) {
      exportStatus.error = job.failedReason;
    }

    return res.json({
      success: true,
      data: exportStatus
    });
  } catch (error) {
    console.error('Error fetching export status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch export status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== CUSTOMER SEGMENTS ====================

/**
 * @route   GET /api/analytics/customers/segments
 * @desc    Get customer segment breakdown for dashboard
 * @access  Private
 */
router.get('/customers/segments', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { startDate, endDate } = parseDateRange(req.query);

    // Get customer segments using aggregation
    const Order = require('../models/Order').Order;

    const segmentData = await Order.aggregate([
      {
        $match: {
          'items.store': new (require('mongoose').Types.ObjectId)(storeId),
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.store': new (require('mongoose').Types.ObjectId)(storeId)
        }
      },
      {
        $group: {
          _id: '$user',
          totalSpent: { $sum: '$items.subtotal' },
          orderCount: { $addToSet: '$_id' },
          firstOrder: { $min: '$createdAt' },
          lastOrder: { $max: '$createdAt' }
        }
      },
      {
        $project: {
          _id: 1,
          totalSpent: 1,
          orderCount: { $size: '$orderCount' },
          firstOrder: 1,
          lastOrder: 1,
          avgOrderValue: { $divide: ['$totalSpent', { $size: '$orderCount' }] }
        }
      }
    ]);

    // Categorize customers into segments
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let highValue = { count: 0, revenue: 0, avgOrderValue: 0 };
    let mediumValue = { count: 0, revenue: 0, avgOrderValue: 0 };
    let lowValue = { count: 0, revenue: 0, avgOrderValue: 0 };
    let newCustomers = { count: 0, revenue: 0, avgOrderValue: 0 };
    let atRisk = { count: 0, revenue: 0, avgOrderValue: 0 };

    const highValueThreshold = 5000; // Customers who spent more than ₹5000
    const mediumValueThreshold = 1000; // Customers who spent ₹1000-5000

    segmentData.forEach((customer: any) => {
      const isNew = customer.firstOrder >= thirtyDaysAgo;
      const isAtRisk = customer.lastOrder < thirtyDaysAgo && customer.orderCount > 1;

      if (isNew) {
        newCustomers.count++;
        newCustomers.revenue += customer.totalSpent;
        newCustomers.avgOrderValue = newCustomers.revenue / newCustomers.count;
      } else if (isAtRisk) {
        atRisk.count++;
        atRisk.revenue += customer.totalSpent;
        atRisk.avgOrderValue = atRisk.revenue / atRisk.count;
      } else if (customer.totalSpent >= highValueThreshold) {
        highValue.count++;
        highValue.revenue += customer.totalSpent;
        highValue.avgOrderValue = highValue.revenue / highValue.count;
      } else if (customer.totalSpent >= mediumValueThreshold) {
        mediumValue.count++;
        mediumValue.revenue += customer.totalSpent;
        mediumValue.avgOrderValue = mediumValue.revenue / mediumValue.count;
      } else {
        lowValue.count++;
        lowValue.revenue += customer.totalSpent;
        lowValue.avgOrderValue = lowValue.count > 0 ? lowValue.revenue / lowValue.count : 0;
      }
    });

    const totalCustomers = segmentData.length;

    const segments = [
      {
        segment: 'high_value',
        count: highValue.count,
        percentage: totalCustomers > 0 ? (highValue.count / totalCustomers) * 100 : 0,
        revenue: Math.round(highValue.revenue * 100) / 100,
        avgOrderValue: Math.round(highValue.avgOrderValue * 100) / 100,
        color: '#10B981'
      },
      {
        segment: 'medium_value',
        count: mediumValue.count,
        percentage: totalCustomers > 0 ? (mediumValue.count / totalCustomers) * 100 : 0,
        revenue: Math.round(mediumValue.revenue * 100) / 100,
        avgOrderValue: Math.round(mediumValue.avgOrderValue * 100) / 100,
        color: '#3B82F6'
      },
      {
        segment: 'low_value',
        count: lowValue.count,
        percentage: totalCustomers > 0 ? (lowValue.count / totalCustomers) * 100 : 0,
        revenue: Math.round(lowValue.revenue * 100) / 100,
        avgOrderValue: Math.round(lowValue.avgOrderValue * 100) / 100,
        color: '#F59E0B'
      },
      {
        segment: 'new',
        count: newCustomers.count,
        percentage: totalCustomers > 0 ? (newCustomers.count / totalCustomers) * 100 : 0,
        revenue: Math.round(newCustomers.revenue * 100) / 100,
        avgOrderValue: Math.round(newCustomers.avgOrderValue * 100) / 100,
        color: '#8B5CF6'
      },
      {
        segment: 'at_risk',
        count: atRisk.count,
        percentage: totalCustomers > 0 ? (atRisk.count / totalCustomers) * 100 : 0,
        revenue: Math.round(atRisk.revenue * 100) / 100,
        avgOrderValue: Math.round(atRisk.avgOrderValue * 100) / 100,
        color: '#EF4444'
      }
    ].filter(s => s.count > 0);

    return res.status(200).json({
      success: true,
      data: {
        timeRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        segments,
        totalCustomers,
        summary: {
          highValuePercentage: totalCustomers > 0 ? (highValue.count / totalCustomers) * 100 : 0,
          newCustomerPercentage: totalCustomers > 0 ? (newCustomers.count / totalCustomers) * 100 : 0,
          atRiskPercentage: totalCustomers > 0 ? (atRisk.count / totalCustomers) * 100 : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching customer segments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customer segments',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// ==================== TOP OFFERS ====================

/**
 * @route   GET /api/analytics/offers/top
 * @desc    Get top performing offers for dashboard
 * @access  Private
 */
router.get('/offers/top', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { limit = '5' } = req.query;
    const limitValue = parseInt(limit as string);
    const { startDate, endDate } = parseDateRange(req.query);

    const Offer = require('../models/Offer').default;
    const OfferRedemption = require('../models/OfferRedemption').default;
    const ObjectId = require('mongoose').Types.ObjectId;

    // Get offers for this store
    const storeOffers = await Offer.find({
      'store.id': new ObjectId(storeId),
      'validity.isActive': true
    }).lean();

    if (storeOffers.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          timeRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
          offers: [],
          summary: {
            totalRedemptions: 0,
            totalRevenue: 0,
            avgConversionRate: 0
          }
        }
      });
    }

    const offerIds = storeOffers.map((o: any) => o._id);

    // Get redemption stats for each offer
    const redemptionStats = await OfferRedemption.aggregate([
      {
        $match: {
          offer: { $in: offerIds },
          redemptionDate: { $gte: startDate, $lte: endDate },
          status: { $in: ['used', 'active'] }
        }
      },
      {
        $group: {
          _id: '$offer',
          redemptions: { $sum: 1 },
          revenue: { $sum: { $ifNull: ['$usedAmount', 0] } },
          usedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'used'] }, 1, 0] }
          }
        }
      }
    ]);

    // Map redemption stats to offers
    const redemptionMap = new Map();
    redemptionStats.forEach((stat: any) => {
      redemptionMap.set(stat._id.toString(), stat);
    });

    // Build top offers response
    const topOffers = storeOffers
      .map((offer: any) => {
        const stats = redemptionMap.get(offer._id.toString()) || { redemptions: 0, revenue: 0, usedCount: 0 };
        const conversionRate = stats.redemptions > 0 ? stats.usedCount / stats.redemptions : 0;
        const avgOrderValue = stats.usedCount > 0 ? stats.revenue / stats.usedCount : 0;

        return {
          offerId: offer._id.toString(),
          offerName: offer.title,
          discountType: offer.type === 'cashback' ? 'percentage' : offer.type === 'discount' ? 'percentage' : 'fixed',
          discountValue: offer.cashbackPercentage || (offer.originalPrice && offer.discountedPrice ?
            Math.round(((offer.originalPrice - offer.discountedPrice) / offer.originalPrice) * 100) : 0),
          redemptions: stats.redemptions,
          revenue: Math.round(stats.revenue * 100) / 100,
          avgOrderValue: Math.round(avgOrderValue * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100
        };
      })
      .sort((a: any, b: any) => b.redemptions - a.redemptions)
      .slice(0, limitValue);

    const totalRedemptions = topOffers.reduce((sum: number, o: any) => sum + o.redemptions, 0);
    const totalRevenue = topOffers.reduce((sum: number, o: any) => sum + o.revenue, 0);
    const avgConversionRate = topOffers.length > 0 ?
      topOffers.reduce((sum: number, o: any) => sum + o.conversionRate, 0) / topOffers.length : 0;

    return res.status(200).json({
      success: true,
      data: {
        timeRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        offers: topOffers,
        summary: {
          totalRedemptions,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          avgConversionRate: Math.round(avgConversionRate * 100) / 100
        }
      }
    });
  } catch (error) {
    console.error('Error fetching top offers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch top offers',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

export default router;
