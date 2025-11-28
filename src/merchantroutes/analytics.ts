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
 */
async function getStoreId(req: Request, res: Response): Promise<string | null> {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return null;
    }

    // Find store owned by this merchant
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
 */
function parseDateRange(query: any): { startDate: Date; endDate: Date } {
  const { startDate, endDate, period } = query;

  if (startDate && endDate) {
    return {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string)
    };
  }

  // Default periods
  const end = new Date();
  const start = new Date();

  switch (period) {
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
 * @desc    Get customer insights and metrics
 * @access  Private
 */
router.get('/customers/insights', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const customerInsights = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getCustomerInsightsKey(storeId),
      () => AnalyticsService.getCustomerInsights(storeId),
      { ttl: 1800 }
    );

    // Ensure customerInsights has required fields
    const insightsData = {
      totalCustomers: customerInsights?.totalCustomers ?? 0,
      newCustomers: customerInsights?.newCustomers ?? 0,
      returningCustomers: customerInsights?.returningCustomers ?? 0,
      averageOrdersPerCustomer: customerInsights?.averageOrdersPerCustomer ?? 0,
      customerLifetimeValue: customerInsights?.customerLifetimeValue ?? 0,
      repeatCustomerRate: customerInsights?.repeatCustomerRate ?? 0,
      topCustomers: Array.isArray(customerInsights?.topCustomers) ? customerInsights.topCustomers : []
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

    const { days = '7' } = req.query;
    const daysValue = parseInt(days as string);

    const forecast = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getSalesForecastKey(storeId, daysValue),
      () => PredictiveAnalyticsService.forecastSales(storeId, daysValue),
      { ttl: 3600 } // 1 hour
    );

    // Ensure forecast has required fields - SalesForecast interface has 'forecast' array
    const forecastData: any = {
      forecast: (forecast as any)?.forecast ?? [],
      ...(forecast && typeof forecast === 'object' && !Array.isArray(forecast) ? (forecast as any) : {})
    };

    return res.status(200).json({
      success: true,
      data: forecastData
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
 * @desc    Analyze seasonal trends
 * @access  Private
 */
router.get('/trends/seasonal', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { type = 'monthly' } = req.query;
    const typeValue = type as 'monthly' | 'weekly' | 'daily';

    const seasonalTrends = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getSeasonalTrendsKey(storeId, typeValue),
      () => PredictiveAnalyticsService.analyzeSeasonalTrends(storeId, typeValue),
      { ttl: 3600 }
    );

    // Ensure seasonalTrends has required fields
    const trendsData = {
      trends: seasonalTrends?.trends ?? (Array.isArray(seasonalTrends) ? seasonalTrends : []),
      ...(seasonalTrends && typeof seasonalTrends === 'object' && !Array.isArray(seasonalTrends) ? seasonalTrends : {})
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

    return res.json({
      success: true,
      data: {
        sales: {
          totalRevenue: salesOverview.totalRevenue,
          totalOrders: salesOverview.totalOrders,
          averageOrderValue: salesOverview.averageOrderValue,
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
          returningCustomers: customerInsights.returningCustomers,
          repeatRate: customerInsights.repeatCustomerRate,
          avgLifetimeValue: customerInsights.customerLifetimeValue
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
      // All products - get low stock items and predict for each
      const inventoryStatus = await AnalyticsService.getInventoryStatus(storeId);

      // Get predictions for low stock and critical items
      const criticalProducts = [
        ...inventoryStatus.lowStockItems.slice(0, 10),
        ...inventoryStatus.outOfStockItems.slice(0, 5)
      ];

      const predictions = await Promise.all(
        criticalProducts.map(async (item) => {
          try {
            return await PredictiveAnalyticsService.predictStockout(item.productId);
          } catch (error) {
            return null;
          }
        })
      );

      const validPredictions = predictions.filter(p => p !== null);

      return res.json({
        success: true,
        data: validPredictions.sort((a, b) => {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a!.priority] - priorityOrder[b!.priority];
        })
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
        timestamp: new Date().toISOString()
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

export default router;
