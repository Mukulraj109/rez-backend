"use strict";
/**
 * Price Tracking Routes
 *
 * Routes for price history and price alerts
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const priceTrackingController = __importStar(require("../controllers/priceTrackingController"));
const auth_1 = require("../middleware/auth");
// ============================================
// PRICE HISTORY ROUTES
// ============================================
/**
 * @route   GET /api/price-tracking/history/:productId
 * @desc    Get price history for a product
 * @access  Public
 */
router.get('/history/:productId', priceTrackingController.getPriceHistory);
/**
 * @route   GET /api/price-tracking/stats/:productId
 * @desc    Get price statistics for a product
 * @access  Public
 */
router.get('/stats/:productId', priceTrackingController.getPriceStats);
/**
 * @route   POST /api/price-tracking/record-price
 * @desc    Record a price change (System endpoint)
 * @access  Private (System/Admin)
 */
router.post('/record-price', auth_1.protect, priceTrackingController.recordPriceChange);
// ============================================
// PRICE ALERT ROUTES
// ============================================
/**
 * @route   POST /api/price-tracking/alerts
 * @desc    Create a price alert
 * @access  Private
 */
router.post('/alerts', auth_1.protect, priceTrackingController.createPriceAlert);
/**
 * @route   GET /api/price-tracking/alerts/my-alerts
 * @desc    Get user's price alerts
 * @access  Private
 */
router.get('/alerts/my-alerts', auth_1.protect, priceTrackingController.getMyAlerts);
/**
 * @route   GET /api/price-tracking/alerts/check/:productId
 * @desc    Check if user has active alert for product
 * @access  Private
 */
router.get('/alerts/check/:productId', auth_1.protect, priceTrackingController.checkAlert);
/**
 * @route   DELETE /api/price-tracking/alerts/:alertId
 * @desc    Cancel a price alert
 * @access  Private
 */
router.delete('/alerts/:alertId', auth_1.protect, priceTrackingController.cancelAlert);
/**
 * @route   GET /api/price-tracking/alerts/stats/:productId
 * @desc    Get alert statistics for a product
 * @access  Private (Admin/Store)
 */
router.get('/alerts/stats/:productId', auth_1.protect, priceTrackingController.getAlertStats);
// ============================================
// MAINTENANCE ROUTES
// ============================================
/**
 * @route   POST /api/price-tracking/cleanup
 * @desc    Cleanup old price history and expire alerts (Cron job)
 * @access  Private (System/Admin)
 */
router.post('/cleanup', auth_1.protect, priceTrackingController.cleanupOldData);
exports.default = router;
