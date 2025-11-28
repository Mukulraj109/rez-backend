"use strict";
/**
 * Predictive Analytics Service
 *
 * Provides sales forecasting, demand prediction, and trend analysis
 * using simple statistical methods (moving averages, linear regression).
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictiveAnalyticsService = void 0;
const Order_1 = require("../models/Order");
const Product_1 = require("../models/Product");
const mongoose_1 = require("mongoose");
const stats = __importStar(require("simple-statistics"));
class PredictiveAnalyticsService {
    /**
     * Forecast sales for the next N days
     */
    static async forecastSales(storeId, days = 7) {
        // Get historical data (last 90 days for better accuracy)
        const historicalDays = Math.max(days * 3, 90);
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - historicalDays);
        const historicalData = await Order_1.Order.aggregate([
            {
                $match: {
                    'items.store': new mongoose_1.Types.ObjectId(storeId),
                    createdAt: { $gte: startDate, $lte: endDate },
                    status: { $nin: ['cancelled', 'refunded'] }
                }
            },
            {
                $unwind: '$items'
            },
            {
                $match: {
                    'items.store': new mongoose_1.Types.ObjectId(storeId)
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    revenue: { $sum: '$items.subtotal' },
                    orders: { $addToSet: '$_id' }
                }
            },
            {
                $project: {
                    _id: 0,
                    date: '$_id',
                    revenue: { $round: ['$revenue', 2] },
                    orders: { $size: '$orders' }
                }
            },
            {
                $sort: { date: 1 }
            }
        ]);
        // Fill missing days with zero
        const filledData = this.fillMissingDays(historicalData, startDate, endDate);
        // Extract revenue and orders arrays for forecasting
        const revenues = filledData.map(d => d.revenue);
        const orderCounts = filledData.map(d => d.orders);
        // Calculate trend using linear regression
        const revenuePoints = revenues.map((r, i) => [i, r]);
        const orderPoints = orderCounts.map((o, i) => [i, o]);
        const revenueLine = stats.linearRegression(revenuePoints);
        const orderLine = stats.linearRegression(orderPoints);
        // Generate forecasts
        const forecasts = [];
        const lastIndex = revenues.length - 1;
        for (let i = 1; i <= days; i++) {
            const futureIndex = lastIndex + i;
            const predictedRevenue = stats.linearRegressionLine(revenueLine)(futureIndex);
            const predictedOrders = Math.round(stats.linearRegressionLine(orderLine)(futureIndex));
            // Calculate standard deviation for confidence interval
            const revenueStdDev = stats.standardDeviation(revenues);
            const confidenceInterval = revenueStdDev * 1.96; // 95% confidence
            const forecastDate = new Date(endDate);
            forecastDate.setDate(forecastDate.getDate() + i);
            forecasts.push({
                date: forecastDate.toISOString().split('T')[0],
                predictedRevenue: Math.max(0, Math.round(predictedRevenue * 100) / 100),
                predictedOrders: Math.max(0, predictedOrders),
                confidenceLower: Math.max(0, Math.round((predictedRevenue - confidenceInterval) * 100) / 100),
                confidenceUpper: Math.round((predictedRevenue + confidenceInterval) * 100) / 100
            });
        }
        const totalPredictedRevenue = forecasts.reduce((sum, f) => sum + f.predictedRevenue, 0);
        const averageDailyRevenue = totalPredictedRevenue / days;
        // Determine trend
        const recentAvg = stats.mean(revenues.slice(-7));
        const olderAvg = stats.mean(revenues.slice(0, 7));
        let trend = 'stable';
        if (recentAvg > olderAvg * 1.1)
            trend = 'increasing';
        else if (recentAvg < olderAvg * 0.9)
            trend = 'decreasing';
        // Calculate accuracy using MAPE (Mean Absolute Percentage Error) on last week
        const lastWeekActual = revenues.slice(-7);
        const lastWeekPredictions = lastWeekActual.map((_, i) => {
            const idx = revenues.length - 7 + i;
            return stats.linearRegressionLine(revenueLine)(idx);
        });
        const mape = this.calculateMAPE(lastWeekActual, lastWeekPredictions);
        const accuracy = Math.max(0, 100 - mape);
        return {
            forecastDays: days,
            historical: filledData,
            forecast: forecasts,
            totalPredictedRevenue: Math.round(totalPredictedRevenue * 100) / 100,
            averageDailyRevenue: Math.round(averageDailyRevenue * 100) / 100,
            trend,
            accuracy: Math.round(accuracy * 100) / 100
        };
    }
    /**
     * Predict when a product will run out of stock
     */
    static async predictStockout(productId) {
        const product = await Product_1.Product.findById(productId).lean();
        if (!product) {
            throw new Error('Product not found');
        }
        // Get sales data for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const salesData = await Order_1.Order.aggregate([
            {
                $match: {
                    'items.product': new mongoose_1.Types.ObjectId(productId),
                    createdAt: { $gte: thirtyDaysAgo },
                    status: { $nin: ['cancelled', 'refunded'] }
                }
            },
            {
                $unwind: '$items'
            },
            {
                $match: {
                    'items.product': new mongoose_1.Types.ObjectId(productId)
                }
            },
            {
                $group: {
                    _id: null,
                    totalQuantity: { $sum: '$items.quantity' }
                }
            }
        ]);
        const totalSold = salesData[0]?.totalQuantity || 0;
        const dailyAverageSales = totalSold / 30;
        const currentStock = product.inventory.unlimited ? Infinity : product.inventory.stock;
        let predictedStockoutDate = null;
        let daysUntilStockout = null;
        if (!product.inventory.unlimited && dailyAverageSales > 0) {
            daysUntilStockout = Math.ceil(currentStock / dailyAverageSales);
            predictedStockoutDate = new Date();
            predictedStockoutDate.setDate(predictedStockoutDate.getDate() + daysUntilStockout);
        }
        // Calculate recommended reorder quantity (Economic Order Quantity approximation)
        const monthlyDemand = dailyAverageSales * 30;
        const recommendedReorderQuantity = Math.ceil(monthlyDemand * 1.5); // 1.5 months supply
        // Reorder point (when to reorder)
        const leadTimeDays = 7; // Assume 7 days lead time
        const reorderPoint = Math.ceil(dailyAverageSales * leadTimeDays);
        let recommendedReorderDate = null;
        if (daysUntilStockout !== null) {
            const daysUntilReorderPoint = Math.ceil((currentStock - reorderPoint) / dailyAverageSales);
            if (daysUntilReorderPoint > 0) {
                recommendedReorderDate = new Date();
                recommendedReorderDate.setDate(recommendedReorderDate.getDate() + daysUntilReorderPoint);
            }
            else {
                recommendedReorderDate = new Date(); // Reorder now
            }
        }
        // Determine priority
        let priority = 'low';
        if (daysUntilStockout !== null) {
            if (daysUntilStockout <= 3)
                priority = 'critical';
            else if (daysUntilStockout <= 7)
                priority = 'high';
            else if (daysUntilStockout <= 14)
                priority = 'medium';
        }
        return {
            productId: productId,
            productName: product.name,
            currentStock,
            dailyAverageSales: Math.round(dailyAverageSales * 100) / 100,
            predictedStockoutDate,
            daysUntilStockout,
            recommendedReorderQuantity,
            recommendedReorderDate,
            priority
        };
    }
    /**
     * Analyze seasonal trends
     */
    static async analyzeSeasonalTrends(storeId, type = 'monthly') {
        const endDate = new Date();
        const startDate = new Date();
        // Set lookback period based on type
        switch (type) {
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
        let groupFormat;
        let periodName = '';
        switch (type) {
            case 'monthly':
                groupFormat = { $month: '$createdAt' };
                periodName = 'month';
                break;
            case 'weekly':
                groupFormat = { $dayOfWeek: '$createdAt' };
                periodName = 'dayOfWeek';
                break;
            case 'daily':
                groupFormat = { $hour: '$createdAt' };
                periodName = 'hour';
                break;
        }
        const trendData = await Order_1.Order.aggregate([
            {
                $match: {
                    'items.store': new mongoose_1.Types.ObjectId(storeId),
                    createdAt: { $gte: startDate, $lte: endDate },
                    status: { $nin: ['cancelled', 'refunded'] }
                }
            },
            {
                $unwind: '$items'
            },
            {
                $match: {
                    'items.store': new mongoose_1.Types.ObjectId(storeId)
                }
            },
            {
                $group: {
                    _id: groupFormat,
                    revenue: { $sum: '$items.subtotal' },
                    orders: { $addToSet: '$_id' },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    period: '$_id',
                    averageRevenue: { $round: ['$revenue', 2] },
                    averageOrders: { $size: '$orders' }
                }
            },
            {
                $sort: { period: 1 }
            }
        ]);
        // Calculate seasonal index
        const avgRevenue = trendData.length > 0
            ? trendData.reduce((sum, d) => sum + d.averageRevenue, 0) / trendData.length
            : 1;
        const trends = trendData.map(d => ({
            period: this.getPeriodName(d.period, type),
            averageRevenue: d.averageRevenue,
            averageOrders: d.averageOrders,
            index: Math.round((d.averageRevenue / avgRevenue) * 100) / 100
        }));
        // Generate insights
        const insights = [];
        const sortedByRevenue = [...trends].sort((a, b) => b.averageRevenue - a.averageRevenue);
        if (sortedByRevenue.length > 0) {
            insights.push(`Peak period: ${sortedByRevenue[0].period} with ${sortedByRevenue[0].averageRevenue.toFixed(2)} average revenue`);
            if (sortedByRevenue.length > 1) {
                insights.push(`Lowest period: ${sortedByRevenue[sortedByRevenue.length - 1].period} with ${sortedByRevenue[sortedByRevenue.length - 1].averageRevenue.toFixed(2)} average revenue`);
            }
            const highPerformers = trends.filter(t => t.index >= 1.2);
            if (highPerformers.length > 0) {
                insights.push(`${highPerformers.length} high-performing periods (20%+ above average)`);
            }
            const lowPerformers = trends.filter(t => t.index <= 0.8);
            if (lowPerformers.length > 0) {
                insights.push(`${lowPerformers.length} low-performing periods (20%+ below average)`);
            }
        }
        return {
            period: periodName,
            type,
            trends,
            insights
        };
    }
    /**
     * Forecast demand for a specific product
     */
    static async forecastDemand(productId) {
        const product = await Product_1.Product.findById(productId).lean();
        if (!product) {
            throw new Error('Product not found');
        }
        // Get sales history (last 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const salesByWeek = await Order_1.Order.aggregate([
            {
                $match: {
                    'items.product': new mongoose_1.Types.ObjectId(productId),
                    createdAt: { $gte: ninetyDaysAgo },
                    status: { $nin: ['cancelled', 'refunded'] }
                }
            },
            {
                $unwind: '$items'
            },
            {
                $match: {
                    'items.product': new mongoose_1.Types.ObjectId(productId)
                }
            },
            {
                $group: {
                    _id: {
                        $week: '$createdAt'
                    },
                    quantity: { $sum: '$items.quantity' }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);
        const weeklySales = salesByWeek.map(s => s.quantity);
        const avgWeeklySales = weeklySales.length > 0 ? stats.mean(weeklySales) : 0;
        // Use exponential smoothing for next week prediction
        const alpha = 0.3; // Smoothing factor
        let nextWeekDemand = avgWeeklySales;
        if (weeklySales.length > 0) {
            nextWeekDemand = weeklySales[weeklySales.length - 1];
            for (let i = weeklySales.length - 2; i >= 0; i--) {
                nextWeekDemand = alpha * weeklySales[i] + (1 - alpha) * nextWeekDemand;
            }
        }
        // Monthly demand (4 weeks)
        const nextMonthDemand = nextWeekDemand * 4;
        // Recommended stock (2 months supply + safety stock)
        const safetyStock = Math.ceil(stats.standardDeviation(weeklySales) * 2);
        const recommendedStock = Math.ceil(nextMonthDemand * 2 + safetyStock);
        // Reorder point (1 week demand + safety stock)
        const reorderPoint = Math.ceil(nextWeekDemand + safetyStock);
        // Economic Order Quantity (simplified)
        const economicOrderQuantity = Math.ceil(Math.sqrt(2 * nextMonthDemand * 100 / 5)); // Simplified EOQ formula
        return {
            productId,
            productName: product.name,
            currentStock: product.inventory.unlimited ? 0 : product.inventory.stock,
            nextWeekDemand: Math.ceil(nextWeekDemand),
            nextMonthDemand: Math.ceil(nextMonthDemand),
            recommendedStock,
            reorderPoint,
            economicOrderQuantity
        };
    }
    /**
     * Helper: Fill missing days with zero values
     */
    static fillMissingDays(data, startDate, endDate) {
        const dataMap = new Map(data.map(d => [d.date, d]));
        const filled = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            filled.push(dataMap.get(dateStr) || { date: dateStr, revenue: 0, orders: 0 });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return filled;
    }
    /**
     * Helper: Calculate Mean Absolute Percentage Error
     */
    static calculateMAPE(actual, predicted) {
        if (actual.length !== predicted.length || actual.length === 0) {
            return 100;
        }
        let sum = 0;
        let count = 0;
        for (let i = 0; i < actual.length; i++) {
            if (actual[i] !== 0) {
                sum += Math.abs((actual[i] - predicted[i]) / actual[i]);
                count++;
            }
        }
        return count > 0 ? (sum / count) * 100 : 100;
    }
    /**
     * Helper: Get period name
     */
    static getPeriodName(period, type) {
        switch (type) {
            case 'monthly':
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return months[period - 1] || `Month ${period}`;
            case 'weekly':
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                return days[period - 1] || `Day ${period}`;
            case 'daily':
                return `${period}:00`;
            default:
                return `Period ${period}`;
        }
    }
}
exports.PredictiveAnalyticsService = PredictiveAnalyticsService;
