"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessMetricsService = void 0;
const MerchantProduct_1 = require("../models/MerchantProduct");
const MerchantOrder_1 = require("../models/MerchantOrder");
const Cashback_1 = require("../models/Cashback");
class BusinessMetricsService {
    static async getDashboardMetrics(merchantId) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        // Get all data
        const [orders, monthlyOrdersResult, lastMonthOrdersResult, products, cashbackRequests] = await Promise.all([
            MerchantOrder_1.OrderModel.findByMerchantId(merchantId),
            MerchantOrder_1.OrderModel.search({ merchantId, dateRange: { start: startOfMonth, end: now } }),
            MerchantOrder_1.OrderModel.search({ merchantId, dateRange: { start: startOfLastMonth, end: endOfLastMonth } }),
            MerchantProduct_1.ProductModel.findByMerchantId(merchantId),
            Cashback_1.CashbackModel.findByMerchantId(merchantId)
        ]);
        const monthlyOrders = monthlyOrdersResult.orders;
        const lastMonthOrders = lastMonthOrdersResult.orders;
        // Calculate revenue metrics
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + order.total, 0);
        const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + order.total, 0);
        const revenueGrowth = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
        const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
        // Calculate order metrics
        const totalOrders = orders.length;
        const ordersGrowth = lastMonthOrders.length > 0 ? ((monthlyOrders.length - lastMonthOrders.length) / lastMonthOrders.length) * 100 : 0;
        const pendingOrders = orders.filter(order => order.status === 'pending').length;
        const completedOrders = orders.filter(order => order.status === 'delivered').length;
        const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;
        // Calculate product metrics
        const totalProducts = products.length;
        const activeProducts = products.filter(product => product.status === 'active').length;
        const lowStockProducts = products.filter(product => product.inventory.trackInventory &&
            product.inventory.stock <= product.inventory.lowStockThreshold).length;
        // Calculate top selling products
        const productSales = new Map();
        orders.forEach(order => {
            order.items.forEach(item => {
                const existing = productSales.get(item.productId) || { name: item.productName, totalSold: 0, revenue: 0 };
                existing.totalSold += item.quantity;
                existing.revenue += item.total;
                productSales.set(item.productId, existing);
            });
        });
        const topSellingProducts = Array.from(productSales.entries())
            .map(([productId, data]) => ({ productId, ...data }))
            .sort((a, b) => b.totalSold - a.totalSold)
            .slice(0, 5);
        // Calculate customer metrics
        const uniqueCustomers = new Set(orders.map(order => order.customerId));
        const monthlyUniqueCustomers = new Set(monthlyOrders.map(order => order.customerId));
        const lastMonthUniqueCustomers = new Set(lastMonthOrders.map(order => order.customerId));
        const totalCustomers = uniqueCustomers.size;
        const monthlyCustomers = monthlyUniqueCustomers.size;
        const customerGrowth = lastMonthUniqueCustomers.size > 0 ?
            ((monthlyCustomers - lastMonthUniqueCustomers.size) / lastMonthUniqueCustomers.size) * 100 : 0;
        // Calculate returning customers (customers with more than one order)
        const customerOrderCounts = new Map();
        orders.forEach(order => {
            customerOrderCounts.set(order.customerId, (customerOrderCounts.get(order.customerId) || 0) + 1);
        });
        const returningCustomers = Array.from(customerOrderCounts.values()).filter(count => count > 1).length;
        // Calculate cashback metrics
        const paidCashback = cashbackRequests.filter(req => req.status === 'paid');
        const monthlyPaidCashback = paidCashback.filter(req => req.paidAt && req.paidAt >= startOfMonth);
        const pendingCashbackRequests = cashbackRequests.filter(req => req.status === 'pending');
        const totalCashbackPaid = paidCashback.reduce((sum, req) => sum + (req.approvedAmount || req.requestedAmount), 0);
        const monthlyCashbackPaid = monthlyPaidCashback.reduce((sum, req) => sum + (req.approvedAmount || req.requestedAmount), 0);
        const pendingCashback = pendingCashbackRequests.reduce((sum, req) => sum + req.requestedAmount, 0);
        const cashbackROI = totalCashbackPaid > 0 ? (totalRevenue / totalCashbackPaid) * 100 : 0;
        // Calculate performance metrics
        const completedOrdersWithTimes = orders.filter(order => order.status === 'delivered' && order.createdAt && order.updatedAt);
        const averageOrderProcessingTime = completedOrdersWithTimes.length > 0 ?
            completedOrdersWithTimes.reduce((sum, order) => {
                const processingTime = (order.updatedAt.getTime() - order.createdAt.getTime()) / (1000 * 60 * 60);
                return sum + processingTime;
            }, 0) / completedOrdersWithTimes.length : 0;
        // Mock some metrics (would be calculated from real data in production)
        const customerSatisfactionScore = 4.5; // Would come from reviews/ratings
        const inventoryTurnover = totalRevenue > 0 ? totalRevenue / (products.length * 100) : 0; // Simplified calculation
        const totalCost = orders.reduce((sum, order) => sum + (order.total * 0.7), 0); // Assuming 70% cost ratio
        const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
        return {
            // Revenue Metrics
            totalRevenue,
            monthlyRevenue,
            revenueGrowth,
            averageOrderValue,
            // Order Metrics
            totalOrders,
            monthlyOrders: monthlyOrders.length,
            ordersGrowth,
            pendingOrders,
            completedOrders,
            cancelledOrders,
            // Product Metrics
            totalProducts,
            activeProducts,
            lowStockProducts,
            topSellingProducts,
            // Customer Metrics
            totalCustomers,
            monthlyCustomers,
            customerGrowth,
            returningCustomers,
            // Cashback Metrics
            totalCashbackPaid,
            monthlyCashbackPaid,
            pendingCashback,
            cashbackROI,
            // Performance Metrics
            averageOrderProcessingTime,
            customerSatisfactionScore,
            inventoryTurnover,
            profitMargin
        };
    }
    static async getTimeSeriesData(merchantId, days = 30) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);
        const ordersResult = await MerchantOrder_1.OrderModel.search({
            merchantId,
            dateRange: { start: startDate, end: endDate }
        });
        const orders = ordersResult.orders;
        const cashbackResult = await Cashback_1.CashbackModel.search({
            merchantId,
            dateRange: { start: startDate, end: endDate }
        });
        const cashbackRequests = cashbackResult.requests;
        // Group data by day
        const dataByDay = new Map();
        // Initialize all days
        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateKey = date.toISOString().split('T')[0];
            dataByDay.set(dateKey, {
                revenue: 0,
                orders: 0,
                customers: new Set(),
                cashback: 0
            });
        }
        // Aggregate orders
        orders.forEach(order => {
            const dateKey = order.createdAt.toISOString().split('T')[0];
            const dayData = dataByDay.get(dateKey);
            if (dayData) {
                dayData.revenue += order.total;
                dayData.orders += 1;
                dayData.customers.add(order.customerId);
            }
        });
        // Aggregate cashback
        cashbackRequests.forEach(request => {
            if (request.status === 'paid' && request.paidAt) {
                const dateKey = request.paidAt.toISOString().split('T')[0];
                const dayData = dataByDay.get(dateKey);
                if (dayData) {
                    dayData.cashback += request.approvedAmount || request.requestedAmount;
                }
            }
        });
        // Convert to array
        return Array.from(dataByDay.entries())
            .map(([date, data]) => ({
            date,
            revenue: data.revenue,
            orders: data.orders,
            customers: data.customers.size,
            cashback: data.cashback
        }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }
    static async getCategoryPerformance(merchantId) {
        const products = await MerchantProduct_1.ProductModel.findByMerchantId(merchantId);
        const orders = await MerchantOrder_1.OrderModel.findByMerchantId(merchantId);
        // Calculate current month and last month data
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        const thisMonthOrdersList = orders.filter(order => order.createdAt >= startOfMonth);
        const lastMonthOrdersList = orders.filter(order => order.createdAt >= startOfLastMonth && order.createdAt <= endOfLastMonth);
        // Group products by category
        const categoriesMap = new Map();
        products.forEach(product => {
            if (!categoriesMap.has(product.category)) {
                categoriesMap.set(product.category, {
                    categoryName: product.category,
                    productIds: new Set()
                });
            }
            categoriesMap.get(product.category).productIds.add(product.id);
        });
        // Calculate performance for each category
        const categoryPerformance = [];
        categoriesMap.forEach((categoryData, categoryId) => {
            const categoryProductIds = categoryData.productIds;
            // Calculate revenue and orders for this month
            let thisMonthRevenue = 0;
            let thisMonthOrders = 0;
            let lastMonthRevenue = 0;
            let lastMonthOrders = 0;
            thisMonthOrdersList.forEach(order => {
                order.items.forEach(item => {
                    if (categoryProductIds.has(item.productId)) {
                        thisMonthRevenue += item.total;
                        thisMonthOrders += 1;
                    }
                });
            });
            lastMonthOrdersList.forEach(order => {
                order.items.forEach(item => {
                    if (categoryProductIds.has(item.productId)) {
                        lastMonthRevenue += item.total;
                        lastMonthOrders += 1;
                    }
                });
            });
            // Calculate total revenue and orders
            let totalRevenue = 0;
            let totalOrders = 0;
            orders.forEach(order => {
                order.items.forEach(item => {
                    if (categoryProductIds.has(item.productId)) {
                        totalRevenue += item.total;
                        totalOrders += 1;
                    }
                });
            });
            const growth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
            categoryPerformance.push({
                categoryId,
                categoryName: categoryData.categoryName,
                revenue: totalRevenue,
                orders: totalOrders,
                products: categoryProductIds.size,
                growth
            });
        });
        return categoryPerformance.sort((a, b) => b.revenue - a.revenue);
    }
    static async getCustomerInsights(merchantId) {
        const orders = await MerchantOrder_1.OrderModel.findByMerchantId(merchantId);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        // Group orders by customer
        const customerData = new Map();
        orders.forEach(order => {
            const existing = customerData.get(order.customerId) || {
                name: order.customerName,
                totalSpent: 0,
                orderCount: 0,
                firstOrderDate: order.createdAt
            };
            existing.totalSpent += order.total;
            existing.orderCount += 1;
            if (order.createdAt < existing.firstOrderDate) {
                existing.firstOrderDate = order.createdAt;
            }
            customerData.set(order.customerId, existing);
        });
        // Calculate metrics
        const newCustomers = Array.from(customerData.values())
            .filter(customer => customer.firstOrderDate >= startOfMonth).length;
        const returningCustomers = Array.from(customerData.values())
            .filter(customer => customer.orderCount > 1).length;
        const totalCustomers = customerData.size;
        const totalRevenue = Array.from(customerData.values())
            .reduce((sum, customer) => sum + customer.totalSpent, 0);
        const customerLifetimeValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
        const averageOrdersPerCustomer = totalCustomers > 0 ?
            Array.from(customerData.values()).reduce((sum, customer) => sum + customer.orderCount, 0) / totalCustomers : 0;
        // Get top customers
        const topCustomers = Array.from(customerData.entries())
            .map(([customerId, data]) => ({
            customerId,
            name: data.name,
            totalSpent: data.totalSpent,
            orderCount: data.orderCount
        }))
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10);
        return {
            newCustomers,
            returningCustomers,
            customerLifetimeValue,
            averageOrdersPerCustomer,
            topCustomers
        };
    }
    static async getBusinessInsights(merchantId) {
        const metrics = await this.getDashboardMetrics(merchantId);
        const categoryPerformance = await this.getCategoryPerformance(merchantId);
        const customerInsights = await this.getCustomerInsights(merchantId);
        const insights = [];
        const recommendations = [];
        const alerts = [];
        // Generate insights based on metrics
        if (metrics.revenueGrowth > 10) {
            insights.push(`Revenue is growing strongly at ${metrics.revenueGrowth.toFixed(1)}% this month`);
        }
        else if (metrics.revenueGrowth < -5) {
            alerts.push(`Revenue declined by ${Math.abs(metrics.revenueGrowth).toFixed(1)}% this month`);
            recommendations.push('Consider running promotions or reviewing product pricing');
        }
        if (metrics.lowStockProducts > 0) {
            alerts.push(`${metrics.lowStockProducts} products are running low on stock`);
            recommendations.push('Restock low inventory items to avoid stockouts');
        }
        if (metrics.pendingOrders > 10) {
            alerts.push(`${metrics.pendingOrders} orders are pending processing`);
            recommendations.push('Process pending orders quickly to improve customer satisfaction');
        }
        if (metrics.customerGrowth > 15) {
            insights.push(`Customer base is growing rapidly at ${metrics.customerGrowth.toFixed(1)}% this month`);
        }
        if (metrics.averageOrderValue < 50) {
            recommendations.push('Consider upselling or bundling products to increase average order value');
        }
        if (metrics.profitMargin < 20) {
            recommendations.push('Review cost structure and pricing to improve profit margins');
        }
        // Category insights
        const topCategory = categoryPerformance[0];
        if (topCategory) {
            insights.push(`${topCategory.categoryName} is your top performing category with $${topCategory.revenue.toFixed(2)} revenue`);
        }
        // Customer insights
        if (customerInsights.averageOrdersPerCustomer < 2) {
            recommendations.push('Focus on customer retention strategies to increase repeat purchases');
        }
        return { insights, recommendations, alerts };
    }
}
exports.BusinessMetricsService = BusinessMetricsService;
