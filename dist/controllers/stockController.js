"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStockValueOverTime = exports.getLowStockAlerts = exports.getStockMovementSummary = exports.generateStockReport = exports.detectStockAnomalies = exports.getStockSnapshot = exports.getProductStockHistory = void 0;
const stockAuditService_1 = __importDefault(require("../services/stockAuditService"));
/**
 * Get stock history for a product
 */
const getProductStockHistory = async (req, res) => {
    try {
        const { productId } = req.params;
        const { variantType, variantValue, startDate, endDate, changeTypes, limit, skip } = req.query;
        const filters = {};
        if (variantType && variantValue) {
            filters.variant = {
                type: variantType,
                value: variantValue
            };
        }
        if (startDate) {
            filters.startDate = new Date(startDate);
        }
        if (endDate) {
            filters.endDate = new Date(endDate);
        }
        if (changeTypes) {
            filters.changeTypes = changeTypes.split(',');
        }
        if (limit) {
            filters.limit = parseInt(limit);
        }
        if (skip) {
            filters.skip = parseInt(skip);
        }
        const history = await stockAuditService_1.default.getStockHistory(productId, filters);
        res.json({
            success: true,
            data: history,
            count: history.length
        });
    }
    catch (error) {
        console.error('Error fetching product stock history:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch stock history'
        });
    }
};
exports.getProductStockHistory = getProductStockHistory;
/**
 * Get stock snapshot at a specific date
 */
const getStockSnapshot = async (req, res) => {
    try {
        const { productId } = req.params;
        const { date, variantType, variantValue } = req.query;
        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Date parameter is required'
            });
        }
        const snapshotDate = new Date(date);
        let variant;
        if (variantType && variantValue) {
            variant = {
                type: variantType,
                value: variantValue
            };
        }
        const stock = await stockAuditService_1.default.getStockSnapshot(productId, snapshotDate, variant);
        res.json({
            success: true,
            data: {
                productId,
                date: snapshotDate,
                variant,
                stock
            }
        });
    }
    catch (error) {
        console.error('Error fetching stock snapshot:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch stock snapshot'
        });
    }
};
exports.getStockSnapshot = getStockSnapshot;
/**
 * Detect stock anomalies for a store
 */
const detectStockAnomalies = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { days, threshold } = req.query;
        const options = {};
        if (days) {
            options.days = parseInt(days);
        }
        if (threshold) {
            options.threshold = parseInt(threshold);
        }
        const anomalies = await stockAuditService_1.default.detectAnomalies(storeId, options);
        res.json({
            success: true,
            data: anomalies,
            count: anomalies.length
        });
    }
    catch (error) {
        console.error('Error detecting stock anomalies:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to detect anomalies'
        });
    }
};
exports.detectStockAnomalies = detectStockAnomalies;
/**
 * Generate stock report for a date range
 */
const generateStockReport = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        const report = await stockAuditService_1.default.generateStockReport(storeId, start, end);
        res.json({
            success: true,
            data: {
                storeId,
                startDate: start,
                endDate: end,
                report
            }
        });
    }
    catch (error) {
        console.error('Error generating stock report:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to generate stock report'
        });
    }
};
exports.generateStockReport = generateStockReport;
/**
 * Get stock movement summary for a product
 */
const getStockMovementSummary = async (req, res) => {
    try {
        const { productId } = req.params;
        const { startDate, endDate, variantType, variantValue } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        let variant;
        if (variantType && variantValue) {
            variant = {
                type: variantType,
                value: variantValue
            };
        }
        const summary = await stockAuditService_1.default.getStockMovementSummary(productId, start, end, variant);
        res.json({
            success: true,
            data: summary
        });
    }
    catch (error) {
        console.error('Error fetching stock movement summary:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch stock movement summary'
        });
    }
};
exports.getStockMovementSummary = getStockMovementSummary;
/**
 * Get low stock alerts for a store
 */
const getLowStockAlerts = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { threshold } = req.query;
        const alertThreshold = threshold ? parseInt(threshold) : 10;
        const alerts = await stockAuditService_1.default.getLowStockAlerts(storeId, alertThreshold);
        res.json({
            success: true,
            data: alerts,
            count: alerts.length
        });
    }
    catch (error) {
        console.error('Error fetching low stock alerts:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch low stock alerts'
        });
    }
};
exports.getLowStockAlerts = getLowStockAlerts;
/**
 * Get stock value over time for a store
 */
const getStockValueOverTime = async (req, res) => {
    try {
        const { storeId } = req.params;
        const { startDate, endDate, interval } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date and end date are required'
            });
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        const timeInterval = interval || 'day';
        const valueOverTime = await stockAuditService_1.default.getStockValueOverTime(storeId, start, end, timeInterval);
        res.json({
            success: true,
            data: {
                storeId,
                startDate: start,
                endDate: end,
                interval: timeInterval,
                data: valueOverTime
            }
        });
    }
    catch (error) {
        console.error('Error fetching stock value over time:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch stock value over time'
        });
    }
};
exports.getStockValueOverTime = getStockValueOverTime;
