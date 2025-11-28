"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const StockHistory_1 = require("../models/StockHistory");
const Product_1 = require("../models/Product");
class StockAuditService {
    /**
     * Log a stock change in the audit trail
     */
    async logStockChange(data) {
        try {
            console.log('📊 [STOCK AUDIT] Logging stock change:', {
                product: data.productId,
                changeType: data.changeType,
                previousStock: data.previousStock,
                newStock: data.newStock,
                changeAmount: data.newStock - data.previousStock
            });
            const historyEntry = await StockHistory_1.StockHistory.logStockChange(data);
            console.log('📊 [STOCK AUDIT] Stock change logged successfully:', historyEntry._id);
            return historyEntry;
        }
        catch (error) {
            console.error('📊 [STOCK AUDIT] Failed to log stock change:', error);
            throw new Error(`Failed to log stock change: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get stock history for a product
     */
    async getStockHistory(productId, filters = {}) {
        try {
            console.log('📊 [STOCK AUDIT] Fetching stock history for product:', productId);
            const history = await StockHistory_1.StockHistory.getProductHistory(productId.toString(), filters);
            console.log('📊 [STOCK AUDIT] Found', history.length, 'history entries');
            return history;
        }
        catch (error) {
            console.error('📊 [STOCK AUDIT] Failed to fetch stock history:', error);
            throw new Error(`Failed to fetch stock history: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get stock snapshot at a specific date
     */
    async getStockSnapshot(productId, date, variant) {
        try {
            console.log('📊 [STOCK AUDIT] Getting stock snapshot for product:', productId, 'at date:', date);
            const stock = await StockHistory_1.StockHistory.getStockSnapshot(productId.toString(), date);
            console.log('📊 [STOCK AUDIT] Stock at', date, 'was:', stock);
            return stock;
        }
        catch (error) {
            console.error('📊 [STOCK AUDIT] Failed to get stock snapshot:', error);
            throw new Error(`Failed to get stock snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Detect stock anomalies for a store
     */
    async detectAnomalies(storeId, options = {}) {
        try {
            console.log('📊 [STOCK AUDIT] Detecting anomalies for store:', storeId);
            const anomalies = await StockHistory_1.StockHistory.detectAnomalies(storeId.toString());
            console.log('📊 [STOCK AUDIT] Found', anomalies.length, 'anomalies');
            return anomalies;
        }
        catch (error) {
            console.error('📊 [STOCK AUDIT] Failed to detect anomalies:', error);
            throw new Error(`Failed to detect anomalies: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Generate stock report for a date range
     */
    async generateStockReport(storeId, startDate, endDate) {
        try {
            console.log('📊 [STOCK AUDIT] Generating stock report for store:', storeId);
            console.log('📊 [STOCK AUDIT] Date range:', startDate, 'to', endDate);
            const report = await StockHistory_1.StockHistory.generateStockReport(startDate, endDate);
            console.log('📊 [STOCK AUDIT] Report generated with', report.length, 'products');
            return report;
        }
        catch (error) {
            console.error('📊 [STOCK AUDIT] Failed to generate stock report:', error);
            throw new Error(`Failed to generate stock report: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get stock movement summary for a product
     */
    async getStockMovementSummary(productId, startDate, endDate, variant) {
        try {
            console.log('📊 [STOCK AUDIT] Getting stock movement summary for product:', productId);
            const query = {
                product: productId,
                timestamp: { $gte: startDate, $lte: endDate }
            };
            if (variant) {
                query['variant.type'] = variant.type;
                query['variant.value'] = variant.value;
            }
            const movements = await StockHistory_1.StockHistory.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: '$changeType',
                        count: { $sum: 1 },
                        totalQuantity: { $sum: '$changeAmount' }
                    }
                }
            ]);
            const totalIn = movements
                .filter(m => m.totalQuantity > 0)
                .reduce((sum, m) => sum + m.totalQuantity, 0);
            const totalOut = movements
                .filter(m => m.totalQuantity < 0)
                .reduce((sum, m) => sum + Math.abs(m.totalQuantity), 0);
            const netChange = totalIn - totalOut;
            // Get current stock
            const product = await Product_1.Product.findById(productId);
            let currentStock = 0;
            if (product) {
                if (variant && product.inventory.variants) {
                    const variantObj = product.inventory.variants.find((v) => v.type === variant.type && v.value === variant.value);
                    currentStock = variantObj?.stock || 0;
                }
                else {
                    currentStock = product.inventory.stock || 0;
                }
            }
            const formattedMovements = movements.map(m => ({
                changeType: m._id,
                count: m.count,
                totalQuantity: m.totalQuantity
            }));
            return {
                totalIn,
                totalOut,
                netChange,
                currentStock,
                movements: formattedMovements
            };
        }
        catch (error) {
            console.error('📊 [STOCK AUDIT] Failed to get stock movement summary:', error);
            throw new Error(`Failed to get stock movement summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get low stock alerts based on history
     */
    async getLowStockAlerts(storeId, threshold = 10) {
        try {
            console.log('📊 [STOCK AUDIT] Getting low stock alerts for store:', storeId);
            // Get products with low stock
            const products = await Product_1.Product.find({
                store: storeId,
                'inventory.stock': { $lte: threshold },
                'inventory.isAvailable': true,
                isActive: true
            });
            const alerts = [];
            for (const product of products) {
                // Get last 30 days of sales
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const salesHistory = await StockHistory_1.StockHistory.find({
                    product: product._id,
                    changeType: 'purchase',
                    timestamp: { $gte: thirtyDaysAgo }
                });
                const totalSold = salesHistory.reduce((sum, entry) => sum + Math.abs(entry.changeAmount), 0);
                const averageDailySales = totalSold / 30;
                const daysUntilStockOut = averageDailySales > 0 ? product.inventory.stock / averageDailySales : Infinity;
                alerts.push({
                    product,
                    currentStock: product.inventory.stock,
                    averageDailySales,
                    daysUntilStockOut,
                    recentHistory: salesHistory.slice(0, 10)
                });
            }
            return alerts.sort((a, b) => a.daysUntilStockOut - b.daysUntilStockOut);
        }
        catch (error) {
            console.error('📊 [STOCK AUDIT] Failed to get low stock alerts:', error);
            throw new Error(`Failed to get low stock alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get stock value over time
     */
    async getStockValueOverTime(storeId, startDate, endDate, interval = 'day') {
        try {
            console.log('📊 [STOCK AUDIT] Getting stock value over time for store:', storeId);
            let groupFormat;
            switch (interval) {
                case 'week':
                    groupFormat = {
                        year: { $year: '$timestamp' },
                        week: { $week: '$timestamp' }
                    };
                    break;
                case 'month':
                    groupFormat = {
                        year: { $year: '$timestamp' },
                        month: { $month: '$timestamp' }
                    };
                    break;
                default:
                    groupFormat = {
                        year: { $year: '$timestamp' },
                        month: { $month: '$timestamp' },
                        day: { $dayOfMonth: '$timestamp' }
                    };
            }
            const valueOverTime = await StockHistory_1.StockHistory.aggregate([
                {
                    $match: {
                        store: new mongoose_1.Types.ObjectId(storeId),
                        timestamp: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'product',
                        foreignField: '_id',
                        as: 'productInfo'
                    }
                },
                { $unwind: '$productInfo' },
                {
                    $group: {
                        _id: groupFormat,
                        totalStockValue: {
                            $sum: {
                                $multiply: [
                                    '$newStock',
                                    { $ifNull: ['$productInfo.pricing.selling', 0] }
                                ]
                            }
                        },
                        totalItems: { $sum: '$newStock' }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
            ]);
            return valueOverTime.map((item) => ({
                date: new Date(item._id.year, (item._id.month || 1) - 1, item._id.day || 1),
                totalStockValue: item.totalStockValue,
                totalItems: item.totalItems
            }));
        }
        catch (error) {
            console.error('📊 [STOCK AUDIT] Failed to get stock value over time:', error);
            throw new Error(`Failed to get stock value over time: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
exports.default = new StockAuditService();
