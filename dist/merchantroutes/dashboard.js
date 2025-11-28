"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const merchantauth_1 = require("../middleware/merchantauth");
const BusinessMetrics_1 = require("../merchantservices/BusinessMetrics");
const ExportService_1 = require("../merchantservices/ExportService");
const ReportService_1 = require("../merchantservices/ReportService");
const MerchantProduct_1 = require("../models/MerchantProduct");
const MerchantOrder_1 = require("../models/MerchantOrder");
const Cashback_1 = require("../models/Cashback");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(merchantauth_1.authMiddleware);
// ==================== MAIN DASHBOARD ENDPOINT ====================
// @route   GET /api/merchant/dashboard
// @desc    Complete dashboard overview with all essential data
// @access  Private
router.get('/', async (req, res) => {
    try {
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(400).json({ success: false, message: 'Merchant ID required' });
        }
        // Get optional storeId from query parameter
        const storeId = req.query.storeId;
        // Get all dashboard data in parallel for performance
        const [metrics, recentActivity, topProducts, lowStockAlerts, salesChart] = await Promise.all([
            BusinessMetrics_1.BusinessMetricsService.getDashboardMetrics(merchantId, storeId),
            getRecentActivity(merchantId, 10, storeId),
            getTopProducts(merchantId, 5, storeId),
            getLowStockProducts(merchantId, 10, storeId),
            BusinessMetrics_1.BusinessMetricsService.getTimeSeriesData(merchantId, 30, storeId)
        ]);
        // Calculate growth percentages for metrics
        const metricsWithGrowth = {
            totalRevenue: {
                value: metrics.totalRevenue,
                change: metrics.revenueGrowth,
                trend: metrics.revenueGrowth >= 0 ? 'up' : 'down',
                period: 'vs last month'
            },
            totalOrders: {
                value: metrics.totalOrders,
                change: metrics.ordersGrowth,
                trend: metrics.ordersGrowth >= 0 ? 'up' : 'down',
                period: 'vs last month'
            },
            totalProducts: {
                value: metrics.totalProducts,
                change: 0,
                trend: 'neutral',
                period: 'total active'
            },
            totalCustomers: {
                value: metrics.totalCustomers,
                change: metrics.customerGrowth,
                trend: metrics.customerGrowth >= 0 ? 'up' : 'down',
                period: 'vs last month'
            }
        };
        return res.json({
            success: true,
            data: {
                metrics: metricsWithGrowth,
                recentActivity,
                topProducts,
                lowStockAlerts,
                salesChart: salesChart.map(day => ({
                    date: day.date,
                    revenue: day.revenue,
                    orders: day.orders,
                    items: day.items // Actual item count from order items
                }))
            }
        });
    }
    catch (error) {
        console.error('Error fetching dashboard overview:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard overview',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   GET /api/merchant/dashboard/metrics
// @desc    Get metric cards with trend data
// @access  Private
router.get('/metrics', async (req, res) => {
    try {
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(400).json({ success: false, message: 'Merchant ID required' });
        }
        const storeId = req.query.storeId;
        const metrics = await BusinessMetrics_1.BusinessMetricsService.getDashboardMetrics(merchantId, storeId);
        // Format metrics for card display with trends
        const metricCards = {
            revenue: {
                value: metrics.totalRevenue,
                change: metrics.revenueGrowth,
                trend: metrics.revenueGrowth >= 0 ? 'up' : 'down',
                period: 'vs last month',
                label: 'Total Revenue',
                icon: 'currency'
            },
            orders: {
                value: metrics.totalOrders,
                change: metrics.ordersGrowth,
                trend: metrics.ordersGrowth >= 0 ? 'up' : 'down',
                period: 'vs last month',
                label: 'Total Orders',
                icon: 'shopping-cart'
            },
            products: {
                value: metrics.totalProducts,
                change: 0,
                trend: 'neutral',
                period: 'active products',
                label: 'Products',
                icon: 'package'
            },
            customers: {
                value: metrics.totalCustomers,
                change: metrics.customerGrowth,
                trend: metrics.customerGrowth >= 0 ? 'up' : 'down',
                period: 'vs last month',
                label: 'Customers',
                icon: 'users'
            },
            avgOrderValue: {
                value: metrics.averageOrderValue,
                change: 0,
                trend: 'neutral',
                period: 'average',
                label: 'Avg Order Value',
                icon: 'dollar-sign'
            },
            conversionRate: {
                value: metrics.completedOrders > 0 ? (metrics.completedOrders / metrics.totalOrders) * 100 : 0,
                change: 0,
                trend: 'neutral',
                period: 'completion rate',
                label: 'Conversion Rate',
                icon: 'trending-up'
            }
        };
        return res.json({
            success: true,
            data: metricCards
        });
    }
    catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard metrics',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// @route   GET /api/merchant/dashboard/activity
// @desc    Get recent activity feed (orders, products, team changes)
// @access  Private
router.get('/activity', async (req, res) => {
    try {
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(400).json({ success: false, message: 'Merchant ID required' });
        }
        const { limit = '20' } = req.query;
        const activity = await getRecentActivity(merchantId, parseInt(limit));
        // Ensure we always return an array
        const activityArray = Array.isArray(activity) ? activity : [];
        return res.status(200).json({
            success: true,
            data: activityArray
        });
    }
    catch (error) {
        console.error('Error fetching activity feed:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch activity feed',
            ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
        });
    }
});
// @route   GET /api/merchant/dashboard/top-products
// @desc    Get best selling products
// @access  Private
router.get('/top-products', async (req, res) => {
    try {
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(400).json({ success: false, message: 'Merchant ID required' });
        }
        const { period = '30d', sortBy = 'revenue', limit = '10' } = req.query;
        // Parse period to days
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
        const topProducts = await getTopProductsByPeriod(merchantId, days, sortBy, parseInt(limit));
        // Ensure we always return an array
        const productsArray = Array.isArray(topProducts) ? topProducts : [];
        return res.status(200).json({
            success: true,
            data: productsArray
        });
    }
    catch (error) {
        console.error('Error fetching top products:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch top products',
            ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
        });
    }
});
// @route   GET /api/merchant/dashboard/sales-data
// @desc    Get chart data for dashboard (daily/weekly/monthly sales)
// @access  Private
router.get('/sales-data', async (req, res) => {
    try {
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(400).json({ success: false, message: 'Merchant ID required' });
        }
        const { period = '30d', granularity = 'day' } = req.query;
        // Parse period to days
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
        const salesData = await getSalesChartData(merchantId, days, granularity);
        // Ensure we always return an array
        const salesArray = Array.isArray(salesData) ? salesData : [];
        return res.status(200).json({
            success: true,
            data: salesArray
        });
    }
    catch (error) {
        console.error('Error fetching sales data:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch sales data',
            ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
        });
    }
});
// @route   GET /api/merchant/dashboard/low-stock
// @desc    Get products below inventory threshold
// @access  Private
router.get('/low-stock', async (req, res) => {
    try {
        const merchantId = req.merchantId;
        if (!merchantId) {
            return res.status(400).json({ success: false, message: 'Merchant ID required' });
        }
        const { threshold = '10' } = req.query;
        const lowStockProducts = await getLowStockProducts(merchantId, parseInt(threshold));
        // Ensure we always return an array
        const productsArray = Array.isArray(lowStockProducts) ? lowStockProducts : [];
        return res.status(200).json({
            success: true,
            data: productsArray
        });
    }
    catch (error) {
        console.error('Error fetching low stock products:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch low stock products',
            ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
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
        const [totalProducts, totalOrders, pendingOrders, totalCashback] = await Promise.all([
            MerchantProduct_1.ProductModel.countByMerchant(merchantId),
            MerchantOrder_1.OrderModel.countByMerchant(merchantId),
            MerchantOrder_1.OrderModel.countByStatus(merchantId, 'pending'),
            Cashback_1.CashbackModel.getMetrics(merchantId)
        ]);
        // Get recent activity
        const recentOrdersResult = await MerchantOrder_1.OrderModel.search({
            merchantId,
            sortBy: 'created',
            sortOrder: 'desc',
            limit: 5
        });
        const recentOrders = recentOrdersResult.orders;
        const recentProductsResult = await MerchantProduct_1.ProductModel.search({
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
                    orders: recentOrders.map((order) => ({
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
    }
    catch (error) {
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
        const { days = '30', storeId } = req.query;
        const timeSeriesData = await BusinessMetrics_1.BusinessMetricsService.getTimeSeriesData(merchantId, parseInt(days), storeId);
        return res.json({
            success: true,
            data: timeSeriesData
        });
    }
    catch (error) {
        console.error('Error fetching time series data:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch time series data',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Removed duplicate /top-products endpoint - see line 193 for the new version
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
        const recentOrdersResult = await MerchantOrder_1.OrderModel.search({
            merchantId,
            sortBy: 'created',
            sortOrder: 'desc',
            limit: parseInt(limit)
        });
        const recentOrders = recentOrdersResult.orders.map((order) => ({
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
    }
    catch (error) {
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
        const days = parseInt(timeframe);
        const timeSeriesData = await BusinessMetrics_1.BusinessMetricsService.getTimeSeriesData(merchantId, days);
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
    }
    catch (error) {
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
        const { period = '30', type = 'overview', storeId } = req.query;
        const days = parseInt(period);
        const storeIdParam = storeId;
        if (type === 'overview') {
            const [metrics, timeSeriesData, categoryPerformance] = await Promise.all([
                BusinessMetrics_1.BusinessMetricsService.getDashboardMetrics(merchantId, storeIdParam),
                BusinessMetrics_1.BusinessMetricsService.getTimeSeriesData(merchantId, days, storeIdParam),
                BusinessMetrics_1.BusinessMetricsService.getCategoryPerformance(merchantId, storeIdParam)
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
        const metrics = await BusinessMetrics_1.BusinessMetricsService.getDashboardMetrics(merchantId, storeIdParam);
        return res.json({
            success: true,
            data: metrics
        });
    }
    catch (error) {
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
        const storeId = req.query.storeId;
        const categoryPerformance = await BusinessMetrics_1.BusinessMetricsService.getCategoryPerformance(merchantId, storeId);
        return res.json({
            success: true,
            data: categoryPerformance
        });
    }
    catch (error) {
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
        const storeId = req.query.storeId;
        const customerInsights = await BusinessMetrics_1.BusinessMetricsService.getCustomerInsights(merchantId, storeId);
        return res.json({
            success: true,
            data: customerInsights
        });
    }
    catch (error) {
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
        const storeId = req.query.storeId;
        const insights = await BusinessMetrics_1.BusinessMetricsService.getBusinessInsights(merchantId, storeId);
        return res.json({
            success: true,
            data: insights
        });
    }
    catch (error) {
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
        const lowStockProducts = await MerchantProduct_1.ProductModel.findLowStock(merchantId);
        const pendingOrders = await MerchantOrder_1.OrderModel.findByStatus(merchantId, 'pending');
        const pendingCashbackResult = await Cashback_1.CashbackModel.search({ merchantId, status: 'pending', flaggedOnly: true });
        const pendingCashback = pendingCashbackResult.requests || [];
        const recentOrdersResult = await MerchantOrder_1.OrderModel.search({ merchantId, sortBy: 'created', sortOrder: 'desc', limit: 10 });
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
        const recentOrdersToday = recentOrders.filter((order) => {
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
    }
    catch (error) {
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
        const { period = '30', storeId } = req.query;
        const days = parseInt(period);
        const storeIdParam = storeId;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);
        // Get performance data
        const [metrics, timeSeriesData, categoryPerformance] = await Promise.all([
            BusinessMetrics_1.BusinessMetricsService.getDashboardMetrics(merchantId, storeIdParam),
            BusinessMetrics_1.BusinessMetricsService.getTimeSeriesData(merchantId, days, storeIdParam),
            BusinessMetrics_1.BusinessMetricsService.getCategoryPerformance(merchantId, storeIdParam)
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
    }
    catch (error) {
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
            MerchantProduct_1.ProductModel.createSampleProducts(merchantId),
            MerchantOrder_1.OrderModel.createSampleOrders(merchantId),
            Cashback_1.CashbackModel.createSampleRequests(merchantId)
        ]);
        return res.json({
            success: true,
            message: 'Sample dashboard data generated successfully'
        });
    }
    catch (error) {
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
        if (global.realTimeService) {
            const stats = global.realTimeService.getConnectionStats();
            return res.json({
                success: true,
                data: stats
            });
        }
        else {
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
    }
    catch (error) {
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
        if (global.realTimeService) {
            global.realTimeService.broadcastSystemNotification({
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
    }
    catch (error) {
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
        if (global.realTimeService) {
            await global.realTimeService.sendLiveChartData(merchantId, period);
        }
        return res.json({
            success: true,
            message: 'Live chart data sent successfully'
        });
    }
    catch (error) {
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
        const { format = 'csv', sections = ['dashboard', 'orders', 'products', 'cashback', 'analytics'], startDate, endDate, includeCharts = false } = req.body;
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
        const exportResult = await ExportService_1.ExportService.exportDashboardData(merchantId, options);
        res.setHeader('Content-Type', exportResult.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
        return res.send(exportResult.data);
    }
    catch (error) {
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
        const { format = 'csv', startDate, endDate, status } = req.body;
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
        const exportResult = await ExportService_1.ExportService.exportOrders(merchantId, options);
        res.setHeader('Content-Type', exportResult.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
        return res.send(exportResult.data);
    }
    catch (error) {
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
        const reportData = await ExportService_1.ExportService.generateScheduledReport(merchantId, type);
        return res.json({
            success: true,
            data: reportData
        });
    }
    catch (error) {
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
        const schedules = ReportService_1.ReportService.getSchedulesByMerchant(merchantId);
        return res.json({
            success: true,
            data: schedules
        });
    }
    catch (error) {
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
        const schedule = ReportService_1.ReportService.createSchedule({
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
    }
    catch (error) {
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
        const schedule = ReportService_1.ReportService.updateSchedule(id, updates);
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
    }
    catch (error) {
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
        const deleted = ReportService_1.ReportService.deleteSchedule(id);
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
    }
    catch (error) {
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
        const history = ReportService_1.ReportService.getHistoryByMerchant(merchantId, parseInt(limit));
        return res.json({
            success: true,
            data: history
        });
    }
    catch (error) {
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
        const statistics = ReportService_1.ReportService.getReportStatistics(merchantId);
        return res.json({
            success: true,
            data: statistics
        });
    }
    catch (error) {
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
        const upcoming = ReportService_1.ReportService.getUpcomingReports(merchantId, parseInt(days));
        return res.json({
            success: true,
            data: upcoming
        });
    }
    catch (error) {
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
        const historyEntry = await ReportService_1.ReportService.generateAdHocReport(merchantId, reportConfig);
        return res.json({
            success: true,
            data: historyEntry,
            message: 'Ad-hoc report generated successfully'
        });
    }
    catch (error) {
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
        const historyEntry = await ReportService_1.ReportService.triggerScheduledReport(scheduleId);
        return res.json({
            success: true,
            data: historyEntry,
            message: 'Scheduled report triggered successfully'
        });
    }
    catch (error) {
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
        ReportService_1.ReportService.createSampleSchedules(merchantId);
        return res.json({
            success: true,
            message: 'Sample report schedules created successfully'
        });
    }
    catch (error) {
        console.error('Error creating sample schedules:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create sample schedules',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// ==================== HELPER FUNCTIONS ====================
/**
 * Get recent activity feed combining orders, products, and other actions
 */
async function getRecentActivity(merchantId, limit = 20, storeId) {
    try {
        const activity = [];
        // Get recent orders (orders don't have storeId, so we get all orders for now)
        // TODO: Filter orders by products' storeId in future enhancement
        const recentOrdersResult = await MerchantOrder_1.OrderModel.search({
            merchantId,
            sortBy: 'created',
            sortOrder: 'desc',
            limit: limit
        });
        const recentOrders = recentOrdersResult.orders;
        // Get recent products (filtered by storeId if provided)
        const productSearchParams = {
            merchantId,
            sortBy: 'created',
            sortOrder: 'desc',
            limit: Math.floor(limit / 2)
        };
        const recentProductsResult = await MerchantProduct_1.ProductModel.search(productSearchParams);
        let recentProducts = recentProductsResult.products;
        // Filter products by storeId if provided
        if (storeId) {
            recentProducts = recentProducts.filter((product) => product.storeId && product.storeId.toString() === storeId);
        }
        // Format orders as activity
        recentOrders.forEach((order) => {
            activity.push({
                id: `order-${order.id}`,
                type: 'order',
                action: order.status === 'pending' ? 'New Order Received' : `Order ${order.status}`,
                description: `Order #${order.orderNumber} from ${order.customerName}`,
                timestamp: order.createdAt,
                user: order.customerName,
                icon: 'shopping-cart',
                metadata: {
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    total: order.total,
                    status: order.status
                }
            });
        });
        // Format products as activity
        recentProducts.forEach((product) => {
            activity.push({
                id: `product-${product.id}`,
                type: 'product',
                action: 'Product Created',
                description: `Added "${product.name}" to catalog`,
                timestamp: product.createdAt,
                user: 'Merchant',
                icon: 'package',
                metadata: {
                    productId: product.id,
                    productName: product.name,
                    price: product.price,
                    status: product.status
                }
            });
        });
        // Sort by timestamp descending and limit
        return activity
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);
    }
    catch (error) {
        console.error('Error getting recent activity:', error);
        return [];
    }
}
/**
 * Get top products for a specific period
 */
async function getTopProducts(merchantId, limit = 5, storeId) {
    try {
        const metrics = await BusinessMetrics_1.BusinessMetricsService.getDashboardMetrics(merchantId, storeId);
        return metrics.topSellingProducts.slice(0, limit).map(product => ({
            id: product.productId,
            name: product.name,
            revenue: product.revenue,
            quantity: product.totalSold,
            growth: 0 // Would need historical data to calculate
        }));
    }
    catch (error) {
        console.error('Error getting top products:', error);
        return [];
    }
}
/**
 * Get top products by period with sorting options
 */
async function getTopProductsByPeriod(merchantId, days, sortBy, limit) {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);
        // Get orders in the period
        const ordersResult = await MerchantOrder_1.OrderModel.search({
            merchantId,
            dateRange: { start: startDate, end: endDate }
        });
        const orders = ordersResult.orders;
        // Calculate product performance
        const productStats = new Map();
        orders.forEach(order => {
            order.items.forEach(item => {
                const existing = productStats.get(item.productId) || {
                    name: item.productName,
                    revenue: 0,
                    quantity: 0,
                    category: '',
                    image: null
                };
                existing.revenue += item.total;
                existing.quantity += item.quantity;
                productStats.set(item.productId, existing);
            });
        });
        // Convert to array and sort
        let topProducts = Array.from(productStats.entries()).map(([productId, stats]) => ({
            id: productId,
            name: stats.name,
            revenue: stats.revenue,
            quantity: stats.quantity,
            growth: 0,
            category: stats.category,
            image: stats.image
        }));
        // Sort based on criteria
        if (sortBy === 'quantity') {
            topProducts.sort((a, b) => b.quantity - a.quantity);
        }
        else {
            topProducts.sort((a, b) => b.revenue - a.revenue);
        }
        return topProducts.slice(0, limit);
    }
    catch (error) {
        console.error('Error getting top products by period:', error);
        return [];
    }
}
/**
 * Get sales chart data with granularity support
 */
async function getSalesChartData(merchantId, days, granularity) {
    try {
        const timeSeriesData = await BusinessMetrics_1.BusinessMetricsService.getTimeSeriesData(merchantId, days);
        // If granularity is 'day', return as-is
        if (granularity === 'day') {
            return timeSeriesData.map(day => ({
                date: day.date,
                revenue: day.revenue,
                orders: day.orders,
                items: day.items // Actual item count from order items
            }));
        }
        // For week/month granularity, aggregate data
        const aggregated = [];
        let currentPeriod = null;
        let periodStart = null;
        timeSeriesData.forEach((day, index) => {
            const date = new Date(day.date);
            if (granularity === 'week') {
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
                const weekKey = weekStart.toISOString().split('T')[0];
                if (!currentPeriod || currentPeriod.date !== weekKey) {
                    if (currentPeriod)
                        aggregated.push(currentPeriod);
                    currentPeriod = {
                        date: weekKey,
                        revenue: 0,
                        orders: 0,
                        items: 0
                    };
                }
            }
            else if (granularity === 'month') {
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
                if (!currentPeriod || currentPeriod.date !== monthKey) {
                    if (currentPeriod)
                        aggregated.push(currentPeriod);
                    currentPeriod = {
                        date: monthKey,
                        revenue: 0,
                        orders: 0,
                        items: 0
                    };
                }
            }
            if (currentPeriod) {
                currentPeriod.revenue += day.revenue;
                currentPeriod.orders += day.orders;
                currentPeriod.items += day.items; // Accumulate actual item counts
            }
        });
        if (currentPeriod)
            aggregated.push(currentPeriod);
        return aggregated;
    }
    catch (error) {
        console.error('Error getting sales chart data:', error);
        return [];
    }
}
/**
 * Get low stock products below threshold
 */
async function getLowStockProducts(merchantId, threshold = 10, storeId) {
    try {
        const products = await MerchantProduct_1.ProductModel.findByMerchantId(merchantId, storeId);
        return products
            .filter(product => product.inventory.trackInventory &&
            product.inventory.stock <= threshold)
            .map(product => ({
            id: product.id,
            name: product.name,
            currentStock: product.inventory.stock,
            sku: product.sku,
            reorderPoint: product.inventory.lowStockThreshold,
            category: product.category,
            image: product.images?.[0]?.url || null,
            status: product.status
        }))
            .sort((a, b) => a.currentStock - b.currentStock);
    }
    catch (error) {
        console.error('Error getting low stock products:', error);
        return [];
    }
}
exports.default = router;
