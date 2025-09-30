import { Router } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { BusinessMetricsService } from '../merchantservices/BusinessMetrics';
import { ExportService } from '../merchantservices/ExportService';
import { ReportService } from '../merchantservices/ReportService';
import { ProductModel } from '../models/MerchantProduct';
import { OrderModel } from '../models/MerchantOrder';
import { CashbackModel } from '../models/Cashback';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// @route   GET /api/dashboard/metrics
// @desc    Get comprehensive dashboard metrics
// @access  Private
router.get('/metrics', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const metrics = await BusinessMetricsService.getDashboardMetrics(merchantId);

    return res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard metrics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview with key stats
// @access  Private
router.get('/overview', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    
    // Get basic counts for quick overview
    const [
      totalProducts,
      totalOrders,
      pendingOrders,
      totalCashback
    ] = await Promise.all([
      ProductModel.countByMerchant(merchantId),
      OrderModel.countByMerchant(merchantId),
      OrderModel.countByStatus(merchantId, 'pending'),
      CashbackModel.getMetrics(merchantId)
    ]);

    // Get recent activity
    const recentOrdersResult = await OrderModel.search({
      merchantId,
      sortBy: 'created',
      sortOrder: 'desc',
      limit: 5
    });
    const recentOrders = recentOrdersResult.orders;

    const recentProductsResult = await ProductModel.search({
      merchantId,
      sortBy: 'created',
      sortOrder: 'desc',
      limit: 5
    });
    const recentProducts = recentProductsResult.products;

    return res.json({
      success: true,
      data: {
        quickStats: {
          totalProducts,
          totalOrders,
          pendingOrders,
          pendingCashback: totalCashback.totalPendingRequests
        },
        recentActivity: {
          orders: recentOrders.map((order: any) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            total: order.total,
            status: order.status,
            createdAt: order.createdAt
          })),
          products: recentProducts.map(product => ({
            id: product.id,
            name: product.name,
            price: product.price,
            status: product.status,
            stock: product.inventory.stock,
            createdAt: product.createdAt
          }))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard overview',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/timeseries
// @desc    Get time series data for charts
// @access  Private
router.get('/timeseries', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { days = '30' } = req.query;
    
    const timeSeriesData = await BusinessMetricsService.getTimeSeriesData(
      merchantId, 
      parseInt(days as string)
    );

    return res.json({
      success: true,
      data: timeSeriesData
    });
  } catch (error) {
    console.error('Error fetching time series data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch time series data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/top-products
// @desc    Get top performing products
// @access  Private
router.get('/top-products', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { limit = '10' } = req.query;
    
    // Get top products by price (since sales data isn't available yet)
    const topProductsResult = await ProductModel.search({
      merchantId,
      sortBy: 'price',
      sortOrder: 'desc',
      limit: parseInt(limit as string)
    });
    
    const topProducts = topProductsResult.products.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      sales: 0, // TODO: Add sales tracking to product model
      revenue: 0, // TODO: Calculate from actual order data
      category: product.category,
      image: product.images?.[0]?.url || null,
      status: product.status,
      stock: product.inventory.stock
    }));

    return res.json({
      success: true,
      data: topProducts
    });
  } catch (error) {
    console.error('Error fetching top products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch top products',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/recent-orders
// @desc    Get recent orders for dashboard
// @access  Private
router.get('/recent-orders', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { limit = '10' } = req.query;
    
    // Get recent orders
    const recentOrdersResult = await OrderModel.search({
      merchantId,
      sortBy: 'created',
      sortOrder: 'desc',
      limit: parseInt(limit as string)
    });
    
    const recentOrders = recentOrdersResult.orders.map((order: any) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      total: order.total,
      status: order.status,
      items: order.items?.length || 0,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));

    return res.json({
      success: true,
      data: recentOrders
    });
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch recent orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/revenue
// @desc    Get revenue analytics data
// @access  Private
router.get('/revenue', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { timeframe = '30' } = req.query;
    
    const days = parseInt(timeframe as string);
    const timeSeriesData = await BusinessMetricsService.getTimeSeriesData(merchantId, days);
    
    // Calculate revenue analytics
    const totalRevenue = timeSeriesData.reduce((sum, day) => sum + day.revenue, 0);
    const averageDailyRevenue = totalRevenue / timeSeriesData.length;
    
    // Calculate growth compared to previous period
    const firstHalf = timeSeriesData.slice(0, Math.floor(timeSeriesData.length / 2));
    const secondHalf = timeSeriesData.slice(Math.floor(timeSeriesData.length / 2));
    
    const firstHalfRevenue = firstHalf.reduce((sum, day) => sum + day.revenue, 0);
    const secondHalfRevenue = secondHalf.reduce((sum, day) => sum + day.revenue, 0);
    const growthPercentage = firstHalfRevenue > 0 ? 
      ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 : 0;

    return res.json({
      success: true,
      data: {
        totalRevenue,
        averageDailyRevenue,
        growthPercentage,
        timeSeriesData,
        timeframe: days
      }
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/analytics
// @desc    Get dashboard analytics data
// @access  Private
router.get('/analytics', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { period = '30', type = 'overview' } = req.query;
    
    const days = parseInt(period as string);
    
    if (type === 'overview') {
      const [metrics, timeSeriesData, categoryPerformance] = await Promise.all([
        BusinessMetricsService.getDashboardMetrics(merchantId),
        BusinessMetricsService.getTimeSeriesData(merchantId, days),
        BusinessMetricsService.getCategoryPerformance(merchantId)
      ]);

      return res.json({
        success: true,
        data: {
          summary: {
            totalRevenue: metrics.totalRevenue,
            totalOrders: metrics.totalOrders,
            averageOrderValue: metrics.averageOrderValue,
            customerCount: metrics.totalCustomers
          },
          timeSeriesData,
          topCategories: categoryPerformance.slice(0, 5),
          period: days
        }
      });
    }

    // Default to basic metrics
    const metrics = await BusinessMetricsService.getDashboardMetrics(merchantId);
    return res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/categories
// @desc    Get category performance data
// @access  Private
router.get('/categories', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const categoryPerformance = await BusinessMetricsService.getCategoryPerformance(merchantId);

    return res.json({
      success: true,
      data: categoryPerformance
    });
  } catch (error) {
    console.error('Error fetching category performance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch category performance',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/customers
// @desc    Get customer insights
// @access  Private
router.get('/customers', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const customerInsights = await BusinessMetricsService.getCustomerInsights(merchantId);

    return res.json({
      success: true,
      data: customerInsights
    });
  } catch (error) {
    console.error('Error fetching customer insights:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customer insights',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/insights
// @desc    Get AI-powered business insights and recommendations
// @access  Private
router.get('/insights', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const insights = await BusinessMetricsService.getBusinessInsights(merchantId);

    return res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error fetching business insights:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch business insights',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/notifications
// @desc    Get dashboard notifications and alerts
// @access  Private
router.get('/notifications', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    
    // Get various alerts and notifications
    const lowStockProducts = await ProductModel.findLowStock(merchantId);
    const pendingOrders = await OrderModel.findByStatus(merchantId, 'pending');
    const pendingCashbackResult = await CashbackModel.search({ merchantId, status: 'pending', flaggedOnly: true });
    const pendingCashback = pendingCashbackResult.requests || [];
    const recentOrdersResult = await OrderModel.search({ merchantId, sortBy: 'created', sortOrder: 'desc', limit: 10 });
    const recentOrders = recentOrdersResult.orders;

    const notifications = [];

    // Low stock alerts
    if (lowStockProducts.length > 0) {
      notifications.push({
        id: 'low_stock',
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${lowStockProducts.length} product(s) are running low on stock`,
        count: lowStockProducts.length,
        action: 'View Products',
        link: '/products?filter=low_stock',
        createdAt: new Date()
      });
    }

    // Pending orders
    if (pendingOrders.length > 0) {
      notifications.push({
        id: 'pending_orders',
        type: 'info',
        title: 'Pending Orders',
        message: `${pendingOrders.length} order(s) require processing`,
        count: pendingOrders.length,
        action: 'Process Orders',
        link: '/orders?filter=pending',
        createdAt: new Date()
      });
    }

    // High-risk cashback requests
    if (pendingCashback.length > 0) {
      notifications.push({
        id: 'high_risk_cashback',
        type: 'error',
        title: 'High-Risk Cashback',
        message: `${pendingCashback.length} cashback request(s) flagged for review`,
        count: pendingCashback.length,
        action: 'Review Requests',
        link: '/cashback?filter=flagged',
        createdAt: new Date()
      });
    }

    // Recent activity summary
    const recentOrdersToday = recentOrders.filter((order: any) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return order.createdAt >= today;
    });

    if (recentOrdersToday.length > 0) {
      notifications.push({
        id: 'new_orders',
        type: 'success',
        title: 'New Orders Today',
        message: `${recentOrdersToday.length} new order(s) received today`,
        count: recentOrdersToday.length,
        action: 'View Orders',
        link: '/orders?filter=today',
        createdAt: new Date()
      });
    }

    return res.json({
      success: true,
      data: {
        notifications,
        unreadCount: notifications.length
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/performance
// @desc    Get detailed performance analytics
// @access  Private
router.get('/performance', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { period = '30' } = req.query;
    
    const days = parseInt(period as string);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Get performance data
    const [
      metrics,
      timeSeriesData,
      categoryPerformance
    ] = await Promise.all([
      BusinessMetricsService.getDashboardMetrics(merchantId),
      BusinessMetricsService.getTimeSeriesData(merchantId, days),
      BusinessMetricsService.getCategoryPerformance(merchantId)
    ]);

    // Calculate performance trends
    const firstHalf = timeSeriesData.slice(0, Math.floor(timeSeriesData.length / 2));
    const secondHalf = timeSeriesData.slice(Math.floor(timeSeriesData.length / 2));

    const firstHalfAvgRevenue = firstHalf.reduce((sum, day) => sum + day.revenue, 0) / firstHalf.length;
    const secondHalfAvgRevenue = secondHalf.reduce((sum, day) => sum + day.revenue, 0) / secondHalf.length;
    
    const revenueTrend = firstHalfAvgRevenue > 0 ? 
      ((secondHalfAvgRevenue - firstHalfAvgRevenue) / firstHalfAvgRevenue) * 100 : 0;

    const firstHalfAvgOrders = firstHalf.reduce((sum, day) => sum + day.orders, 0) / firstHalf.length;
    const secondHalfAvgOrders = secondHalf.reduce((sum, day) => sum + day.orders, 0) / secondHalf.length;
    
    const ordersTrend = firstHalfAvgOrders > 0 ? 
      ((secondHalfAvgOrders - firstHalfAvgOrders) / firstHalfAvgOrders) * 100 : 0;

    return res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: metrics.totalRevenue,
          totalOrders: metrics.totalOrders,
          averageOrderValue: metrics.averageOrderValue,
          profitMargin: metrics.profitMargin,
          customerSatisfactionScore: metrics.customerSatisfactionScore
        },
        trends: {
          revenueTrend,
          ordersTrend,
          period: days
        },
        topCategories: categoryPerformance.slice(0, 5),
        timeSeriesData,
        performanceIndicators: {
          revenueTarget: metrics.monthlyRevenue / (new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100, // Projected monthly revenue
          orderProcessingTime: metrics.averageOrderProcessingTime,
          stockTurnover: metrics.inventoryTurnover,
          customerRetention: (metrics.returningCustomers / metrics.totalCustomers) * 100
        }
      }
    });
  } catch (error) {
    console.error('Error fetching performance data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch performance data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/dashboard/sample-data
// @desc    Generate sample dashboard data for testing
// @access  Private
router.post('/sample-data', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    
    // Generate sample data across all models
    await Promise.all([
      ProductModel.createSampleProducts(merchantId),
      OrderModel.createSampleOrders(merchantId),
      CashbackModel.createSampleRequests(merchantId)
    ]);

    return res.json({
      success: true,
      message: 'Sample dashboard data generated successfully'
    });
  } catch (error) {
    console.error('Error generating sample data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate sample data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/realtime/stats
// @desc    Get real-time connection statistics
// @access  Private
router.get('/realtime/stats', async (req, res) => {
  try {
    if ((global as any).realTimeService) {
      const stats = (global as any).realTimeService.getConnectionStats();
      return res.json({
        success: true,
        data: stats
      });
    } else {
      return res.json({
        success: true,
        data: {
          totalConnections: 0,
          totalRooms: 0,
          merchantDashboards: 0,
          activeSubscriptions: {
            metrics: 0,
            orders: 0,
            cashback: 0
          }
        }
      });
    }
  } catch (error) {
    console.error('Error fetching real-time stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time stats',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/dashboard/realtime/broadcast
// @desc    Broadcast system notification to all or specific merchants
// @access  Private
router.post('/realtime/broadcast', async (req, res) => {
  try {
    const { type, title, message, merchantIds } = req.body;
    
    if (!type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Type, title, and message are required'
      });
    }

    if ((global as any).realTimeService) {
      (global as any).realTimeService.broadcastSystemNotification({
        type,
        title,
        message,
        merchantIds
      });
    }

    return res.json({
      success: true,
      message: 'Notification broadcasted successfully'
    });
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to broadcast notification',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/dashboard/realtime/chart-data
// @desc    Send live chart data to specific merchant
// @access  Private
router.post('/realtime/chart-data/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { period = 24 } = req.body;

    if ((global as any).realTimeService) {
      await (global as any).realTimeService.sendLiveChartData(merchantId, period);
    }

    return res.json({
      success: true,
      message: 'Live chart data sent successfully'
    });
  } catch (error) {
    console.error('Error sending live chart data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send live chart data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/dashboard/export
// @desc    Export dashboard data in various formats
// @access  Private
router.post('/export', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { 
      format = 'csv', 
      sections = ['dashboard', 'orders', 'products', 'cashback', 'analytics'],
      startDate,
      endDate,
      includeCharts = false 
    } = req.body;

    if (!['csv', 'json', 'excel'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export format. Supported formats: csv, json, excel'
      });
    }

    const options = {
      format,
      sections,
      includeCharts,
      dateRange: startDate && endDate ? {
        start: new Date(startDate),
        end: new Date(endDate)
      } : undefined
    };

    const exportResult = await ExportService.exportDashboardData(merchantId, options);

    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    return res.send(exportResult.data);

  } catch (error) {
    console.error('Error exporting dashboard data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export dashboard data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/dashboard/export/orders
// @desc    Export orders data specifically
// @access  Private
router.post('/export/orders', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { 
      format = 'csv',
      startDate,
      endDate,
      status
    } = req.body;

    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export format. Supported formats: csv, json'
      });
    }

    const options = {
      format,
      status,
      dateRange: startDate && endDate ? {
        start: new Date(startDate),
        end: new Date(endDate)
      } : undefined
    };

    const exportResult = await ExportService.exportOrders(merchantId, options);

    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    return res.send(exportResult.data);

  } catch (error) {
    console.error('Error exporting orders data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export orders data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/export/scheduled/:type
// @desc    Generate scheduled reports (daily, weekly, monthly)
// @access  Private
router.get('/export/scheduled/:type', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { type } = req.params;

    if (!['daily', 'weekly', 'monthly'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type. Supported types: daily, weekly, monthly'
      });
    }

    const reportData = await ExportService.generateScheduledReport(
      merchantId, 
      type as 'daily' | 'weekly' | 'monthly'
    );

    return res.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    console.error('Error generating scheduled report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate scheduled report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== AUTOMATED REPORTS ENDPOINTS ====================

// @route   GET /api/dashboard/reports/schedules
// @desc    Get report schedules for merchant
// @access  Private
router.get('/reports/schedules', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const schedules = ReportService.getSchedulesByMerchant(merchantId);

    return res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching report schedules:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch report schedules',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/dashboard/reports/schedules
// @desc    Create new report schedule
// @access  Private
router.post('/reports/schedules', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { name, description, frequency, format, sections, recipients } = req.body;

    if (!name || !frequency || !format || !sections || !recipients) {
      return res.status(400).json({
        success: false,
        message: 'Name, frequency, format, sections, and recipients are required'
      });
    }

    const schedule = ReportService.createSchedule({
      merchantId,
      name,
      description,
      frequency,
      format,
      sections,
      recipients,
      isActive: true
    });

    return res.status(201).json({
      success: true,
      data: schedule,
      message: 'Report schedule created successfully'
    });
  } catch (error) {
    console.error('Error creating report schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create report schedule',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   PUT /api/dashboard/reports/schedules/:id
// @desc    Update report schedule
// @access  Private
router.put('/reports/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const schedule = ReportService.updateSchedule(id, updates);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Report schedule not found'
      });
    }

    return res.json({
      success: true,
      data: schedule,
      message: 'Report schedule updated successfully'
    });
  } catch (error) {
    console.error('Error updating report schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update report schedule',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   DELETE /api/dashboard/reports/schedules/:id
// @desc    Delete report schedule
// @access  Private
router.delete('/reports/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = ReportService.deleteSchedule(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Report schedule not found'
      });
    }

    return res.json({
      success: true,
      message: 'Report schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete report schedule',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/reports/history
// @desc    Get report generation history
// @access  Private
router.get('/reports/history', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { limit = '50' } = req.query;
    
    const history = ReportService.getHistoryByMerchant(merchantId, parseInt(limit as string));

    return res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching report history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch report history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/reports/statistics
// @desc    Get report statistics for merchant
// @access  Private
router.get('/reports/statistics', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const statistics = ReportService.getReportStatistics(merchantId);

    return res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error fetching report statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch report statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/reports/upcoming
// @desc    Get upcoming scheduled reports
// @access  Private
router.get('/reports/upcoming', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { days = '7' } = req.query;
    
    const upcoming = ReportService.getUpcomingReports(merchantId, parseInt(days as string));

    return res.json({
      success: true,
      data: upcoming
    });
  } catch (error) {
    console.error('Error fetching upcoming reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming reports',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/dashboard/reports/generate
// @desc    Generate ad-hoc report
// @access  Private
router.post('/reports/generate', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { name, format, sections, startDate, endDate, recipients } = req.body;

    if (!name || !format || !sections) {
      return res.status(400).json({
        success: false,
        message: 'Name, format, and sections are required'
      });
    }

    const reportConfig = {
      name,
      format,
      sections,
      dateRange: startDate && endDate ? {
        start: new Date(startDate),
        end: new Date(endDate)
      } : undefined,
      recipients
    };

    const historyEntry = await ReportService.generateAdHocReport(merchantId, reportConfig);

    return res.json({
      success: true,
      data: historyEntry,
      message: 'Ad-hoc report generated successfully'
    });
  } catch (error) {
    console.error('Error generating ad-hoc report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate ad-hoc report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/dashboard/reports/trigger/:scheduleId
// @desc    Manually trigger a scheduled report
// @access  Private
router.post('/reports/trigger/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    const historyEntry = await ReportService.triggerScheduledReport(scheduleId);

    return res.json({
      success: true,
      data: historyEntry,
      message: 'Scheduled report triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering scheduled report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to trigger scheduled report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/dashboard/reports/sample-schedules
// @desc    Create sample report schedules for testing
// @access  Private
router.post('/reports/sample-schedules', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    ReportService.createSampleSchedules(merchantId);

    return res.json({
      success: true,
      message: 'Sample report schedules created successfully'
    });
  } catch (error) {
    console.error('Error creating sample schedules:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create sample schedules',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;