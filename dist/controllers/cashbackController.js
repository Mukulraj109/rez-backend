"use strict";
// Cashback Controller
// Handles user cashback API endpoints
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCashbackStatistics = exports.forecastCashback = exports.getCashbackCampaigns = exports.redeemCashback = exports.getExpiringSoon = exports.getPendingCashback = exports.getCashbackHistory = exports.getCashbackSummary = void 0;
const mongoose_1 = require("mongoose");
const cashbackService_1 = __importDefault(require("../services/cashbackService"));
/**
 * Get cashback summary
 * GET /api/cashback/summary
 */
const getCashbackSummary = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const summary = await cashbackService_1.default.getUserSummary(new mongoose_1.Types.ObjectId(userId));
        res.status(200).json({
            success: true,
            data: summary,
        });
    }
    catch (error) {
        console.error('❌ [CASHBACK CONTROLLER] Error getting summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get cashback summary',
            error: error.message,
        });
    }
};
exports.getCashbackSummary = getCashbackSummary;
/**
 * Get cashback history with filters
 * GET /api/cashback/history
 */
const getCashbackHistory = async (req, res) => {
    try {
        const userId = req.userId;
        const { status, source, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const filters = {};
        if (status)
            filters.status = status;
        if (source)
            filters.source = source;
        if (dateFrom)
            filters.dateFrom = new Date(dateFrom);
        if (dateTo)
            filters.dateTo = new Date(dateTo);
        const result = await cashbackService_1.default.getUserCashbackHistory(new mongoose_1.Types.ObjectId(userId), filters, Number(page), Number(limit));
        res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error('❌ [CASHBACK CONTROLLER] Error getting history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get cashback history',
            error: error.message,
        });
    }
};
exports.getCashbackHistory = getCashbackHistory;
/**
 * Get pending cashback ready for credit
 * GET /api/cashback/pending
 */
const getPendingCashback = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const cashbacks = await cashbackService_1.default.getPendingReadyForCredit(new mongoose_1.Types.ObjectId(userId));
        const totalAmount = cashbacks.reduce((sum, cb) => sum + cb.amount, 0);
        res.status(200).json({
            success: true,
            data: {
                cashbacks,
                totalAmount,
                count: cashbacks.length,
            },
        });
    }
    catch (error) {
        console.error('❌ [CASHBACK CONTROLLER] Error getting pending:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get pending cashback',
            error: error.message,
        });
    }
};
exports.getPendingCashback = getPendingCashback;
/**
 * Get expiring soon cashback
 * GET /api/cashback/expiring-soon
 */
const getExpiringSoon = async (req, res) => {
    try {
        const userId = req.userId;
        const { days = 7 } = req.query;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const cashbacks = await cashbackService_1.default.getExpiringSoon(new mongoose_1.Types.ObjectId(userId), Number(days));
        const totalAmount = cashbacks.reduce((sum, cb) => sum + cb.amount, 0);
        res.status(200).json({
            success: true,
            data: {
                cashbacks,
                totalAmount,
                count: cashbacks.length,
            },
        });
    }
    catch (error) {
        console.error('❌ [CASHBACK CONTROLLER] Error getting expiring soon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get expiring cashback',
            error: error.message,
        });
    }
};
exports.getExpiringSoon = getExpiringSoon;
/**
 * Redeem pending cashback
 * POST /api/cashback/redeem
 */
const redeemCashback = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const result = await cashbackService_1.default.redeemPendingCashback(new mongoose_1.Types.ObjectId(userId));
        if (result.count === 0) {
            res.status(400).json({
                success: false,
                message: 'No cashback available for redemption',
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: `Successfully redeemed ₹${result.totalAmount} cashback`,
            data: result,
        });
    }
    catch (error) {
        console.error('❌ [CASHBACK CONTROLLER] Error redeeming cashback:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to redeem cashback',
            error: error.message,
        });
    }
};
exports.redeemCashback = redeemCashback;
/**
 * Get active cashback campaigns
 * GET /api/cashback/campaigns
 */
const getCashbackCampaigns = async (req, res) => {
    try {
        const campaigns = await cashbackService_1.default.getActiveCampaigns();
        res.status(200).json({
            success: true,
            data: { campaigns },
        });
    }
    catch (error) {
        console.error('❌ [CASHBACK CONTROLLER] Error getting campaigns:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get cashback campaigns',
            error: error.message,
        });
    }
};
exports.getCashbackCampaigns = getCashbackCampaigns;
/**
 * Forecast cashback for cart
 * POST /api/cashback/forecast
 */
const forecastCashback = async (req, res) => {
    try {
        const { cartData } = req.body;
        if (!cartData || !cartData.items || !cartData.subtotal) {
            res.status(400).json({
                success: false,
                message: 'Cart data with items and subtotal is required',
            });
            return;
        }
        const forecast = await cashbackService_1.default.forecastCashbackForCart(cartData);
        res.status(200).json({
            success: true,
            data: forecast,
        });
    }
    catch (error) {
        console.error('❌ [CASHBACK CONTROLLER] Error forecasting cashback:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to forecast cashback',
            error: error.message,
        });
    }
};
exports.forecastCashback = forecastCashback;
/**
 * Get cashback statistics
 * GET /api/cashback/statistics
 */
const getCashbackStatistics = async (req, res) => {
    try {
        const userId = req.userId;
        const { period = 'month' } = req.query;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }
        const validPeriods = ['day', 'week', 'month', 'year'];
        if (!validPeriods.includes(period)) {
            res.status(400).json({
                success: false,
                message: 'Invalid period. Must be one of: day, week, month, year',
            });
            return;
        }
        const statistics = await cashbackService_1.default.getCashbackStatistics(new mongoose_1.Types.ObjectId(userId), period);
        res.status(200).json({
            success: true,
            data: statistics,
        });
    }
    catch (error) {
        console.error('❌ [CASHBACK CONTROLLER] Error getting statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get cashback statistics',
            error: error.message,
        });
    }
};
exports.getCashbackStatistics = getCashbackStatistics;
