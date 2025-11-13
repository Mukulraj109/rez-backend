"use strict";
/**
 * Price Tracking Controller
 *
 * Handles price history and price alert operations:
 * - Get price history for products
 * - Create price alerts
 * - Manage price alert subscriptions
 * - Get price statistics and trends
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldData = exports.recordPriceChange = exports.getAlertStats = exports.cancelAlert = exports.checkAlert = exports.getMyAlerts = exports.createPriceAlert = exports.getPriceStats = exports.getPriceHistory = void 0;
const PriceHistory_1 = __importDefault(require("../models/PriceHistory"));
const PriceAlert_1 = __importDefault(require("../models/PriceAlert"));
const Product_1 = require("../models/Product");
/**
 * Get price history for a product
 * GET /api/price-tracking/history/:productId
 */
const getPriceHistory = async (req, res) => {
    try {
        const { productId } = req.params;
        const { variantId, limit = '30', startDate, endDate } = req.query;
        console.log('📊 [PriceTracking] Fetching price history:', { productId, variantId });
        const history = await PriceHistory_1.default.getProductHistory(productId, variantId, {
            limit: parseInt(limit),
            startDate: startDate,
            endDate: endDate,
        });
        res.json({
            success: true,
            data: {
                history,
                count: history.length,
            },
        });
    }
    catch (error) {
        console.error('❌ [PriceTracking] Get history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch price history',
            error: error.message,
        });
    }
};
exports.getPriceHistory = getPriceHistory;
/**
 * Get price statistics for a product
 * GET /api/price-tracking/stats/:productId
 */
const getPriceStats = async (req, res) => {
    try {
        const { productId } = req.params;
        const { variantId, days = '30' } = req.query;
        console.log('📈 [PriceTracking] Fetching price stats:', { productId, variantId, days });
        const [latest, lowest, highest, average, trend] = await Promise.all([
            PriceHistory_1.default.getLatestPrice(productId, variantId),
            PriceHistory_1.default.getLowestPrice(productId, variantId, parseInt(days)),
            PriceHistory_1.default.getHighestPrice(productId, variantId, parseInt(days)),
            PriceHistory_1.default.getAveragePrice(productId, variantId, parseInt(days)),
            PriceHistory_1.default.getPriceTrend(productId, variantId, parseInt(days)),
        ]);
        res.json({
            success: true,
            data: {
                latest: latest?.price,
                lowest: lowest?.price,
                highest: highest?.price,
                average: average
                    ? {
                        salePrice: Math.round(average.avgPrice),
                        basePrice: Math.round(average.avgBasePrice),
                    }
                    : null,
                trend,
                period: `${days} days`,
            },
        });
    }
    catch (error) {
        console.error('❌ [PriceTracking] Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch price statistics',
            error: error.message,
        });
    }
};
exports.getPriceStats = getPriceStats;
/**
 * Create a price alert
 * POST /api/price-tracking/alerts
 */
const createPriceAlert = async (req, res) => {
    try {
        const { productId, variantId, alertType, targetPrice, percentageDrop, notificationMethod, contact, } = req.body;
        const userId = req.user._id;
        // Validation
        if (!productId || !alertType) {
            return res.status(400).json({
                success: false,
                message: 'Product ID and alert type are required',
            });
        }
        // Check if product exists
        const product = await Product_1.Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }
        // Check if user already has an active alert
        const hasActive = await PriceAlert_1.default.hasActiveAlert(userId, productId, variantId);
        if (hasActive) {
            return res.status(409).json({
                success: false,
                message: 'You already have an active price alert for this product',
            });
        }
        // Get current price
        let currentPrice = 0;
        if (variantId && product.inventory?.variants) {
            const variant = product.inventory.variants.find((v) => v._id.toString() === variantId);
            if (variant) {
                currentPrice = variant.pricing?.salePrice || variant.pricing?.basePrice || 0;
            }
        }
        else {
            currentPrice = product.pricing?.salePrice || product.pricing?.basePrice || 0;
        }
        // Create alert
        const alert = new PriceAlert_1.default({
            userId,
            productId,
            variantId: variantId || null,
            alertType,
            targetPrice: alertType === 'target_price' ? targetPrice : undefined,
            percentageDrop: alertType === 'percentage_drop' ? percentageDrop : undefined,
            currentPriceAtCreation: currentPrice,
            notificationMethod: notificationMethod || ['push'],
            contact: {
                email: contact?.email || req.user.email,
                phone: contact?.phone || req.user.phone,
            },
            metadata: {
                productName: product.name,
                productImage: product.images?.[0]?.url || product.images?.[0],
                variantAttributes: variantId
                    ? product.inventory?.variants?.find((v) => v._id.toString() === variantId)?.attributes
                    : null,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
            },
        });
        await alert.save();
        console.log('🔔 [PriceAlert] Created alert:', {
            userId,
            productId,
            alertType,
            targetPrice,
            percentageDrop,
        });
        res.status(201).json({
            success: true,
            message: 'Price alert created successfully',
            data: {
                alertId: alert._id,
                expiresAt: alert.expiresAt,
                daysUntilExpiration: alert.daysUntilExpiration,
            },
        });
    }
    catch (error) {
        console.error('❌ [PriceAlert] Create error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create price alert',
            error: error.message,
        });
    }
};
exports.createPriceAlert = createPriceAlert;
/**
 * Get user's price alerts
 * GET /api/price-tracking/alerts/my-alerts
 */
const getMyAlerts = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = '1', limit = '20', status } = req.query;
        const alerts = await PriceAlert_1.default.getUserAlerts(userId, {
            page: parseInt(page),
            limit: parseInt(limit),
            status: status,
        });
        // Count total for pagination
        const query = { userId };
        if (status)
            query.status = status;
        const total = await PriceAlert_1.default.countDocuments(query);
        res.json({
            success: true,
            data: {
                alerts,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit)),
                },
            },
        });
    }
    catch (error) {
        console.error('❌ [PriceAlert] Get alerts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch alerts',
            error: error.message,
        });
    }
};
exports.getMyAlerts = getMyAlerts;
/**
 * Check if user has active alert for product
 * GET /api/price-tracking/alerts/check/:productId
 */
const checkAlert = async (req, res) => {
    try {
        const { productId } = req.params;
        const { variantId } = req.query;
        const userId = req.user._id;
        const hasActive = await PriceAlert_1.default.hasActiveAlert(userId, productId, variantId || null);
        res.json({
            success: true,
            data: {
                hasActiveAlert: hasActive,
            },
        });
    }
    catch (error) {
        console.error('❌ [PriceAlert] Check alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check alert status',
            error: error.message,
        });
    }
};
exports.checkAlert = checkAlert;
/**
 * Cancel a price alert
 * DELETE /api/price-tracking/alerts/:alertId
 */
const cancelAlert = async (req, res) => {
    try {
        const { alertId } = req.params;
        const userId = req.user._id;
        const alert = await PriceAlert_1.default.findOne({
            _id: alertId,
            userId,
        });
        if (!alert) {
            return res.status(404).json({
                success: false,
                message: 'Alert not found',
            });
        }
        if (alert.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel alert with status: ${alert.status}`,
            });
        }
        await alert.cancel();
        console.log('🔕 [PriceAlert] Alert cancelled:', alertId);
        res.json({
            success: true,
            message: 'Alert cancelled successfully',
        });
    }
    catch (error) {
        console.error('❌ [PriceAlert] Cancel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel alert',
            error: error.message,
        });
    }
};
exports.cancelAlert = cancelAlert;
/**
 * Get alert statistics for a product (Admin/Store)
 * GET /api/price-tracking/alerts/stats/:productId
 */
const getAlertStats = async (req, res) => {
    try {
        const { productId } = req.params;
        // TODO: Add authorization check (admin or store owner)
        const stats = await PriceAlert_1.default.getProductStats(productId);
        res.json({
            success: true,
            data: stats,
        });
    }
    catch (error) {
        console.error('❌ [PriceAlert] Stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch alert statistics',
            error: error.message,
        });
    }
};
exports.getAlertStats = getAlertStats;
/**
 * Record price change (System endpoint)
 * POST /api/price-tracking/record-price
 */
const recordPriceChange = async (req, res) => {
    try {
        const { productId, variantId, price, source = 'system' } = req.body;
        console.log('📊 [PriceTracking] Recording price change:', { productId, variantId, price });
        // Record price in history
        const history = await PriceHistory_1.default.recordPriceChange({
            productId,
            variantId,
            price,
            source,
        });
        // Check and trigger price alerts if price decreased
        let triggeredAlerts = [];
        if (history.changeType === 'decrease') {
            triggeredAlerts = await PriceAlert_1.default.checkAndTriggerAlerts(productId, variantId, price.salePrice);
        }
        res.json({
            success: true,
            message: 'Price change recorded',
            data: {
                historyId: history._id,
                changeType: history.changeType,
                changeAmount: history.changeAmount,
                triggeredAlerts: triggeredAlerts.length,
            },
        });
    }
    catch (error) {
        console.error('❌ [PriceTracking] Record price error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record price change',
            error: error.message,
        });
    }
};
exports.recordPriceChange = recordPriceChange;
/**
 * Cleanup old data (Cron job endpoint)
 * POST /api/price-tracking/cleanup
 */
const cleanupOldData = async (req, res) => {
    try {
        const [historyCleanup, alertsExpired] = await Promise.all([
            PriceHistory_1.default.cleanupOldHistory(90), // Keep 90 days
            PriceAlert_1.default.expireOldAlerts(),
        ]);
        console.log('🧹 [PriceTracking] Cleanup complete:', {
            historyDeleted: historyCleanup,
            alertsExpired,
        });
        res.json({
            success: true,
            message: 'Cleanup completed',
            data: {
                historyDeleted: historyCleanup,
                alertsExpired,
            },
        });
    }
    catch (error) {
        console.error('❌ [PriceTracking] Cleanup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup',
            error: error.message,
        });
    }
};
exports.cleanupOldData = cleanupOldData;
