"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stockController_1 = require("../controllers/stockController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticate);
/**
 * @route   GET /api/stock/history/:productId
 * @desc    Get stock history for a product
 * @access  Private
 * @query   variantType, variantValue, startDate, endDate, changeTypes, limit, skip
 */
router.get('/history/:productId', stockController_1.getProductStockHistory);
/**
 * @route   GET /api/stock/snapshot/:productId
 * @desc    Get stock snapshot at a specific date
 * @access  Private
 * @query   date (required), variantType, variantValue
 */
router.get('/snapshot/:productId', stockController_1.getStockSnapshot);
/**
 * @route   GET /api/stock/anomalies/:storeId
 * @desc    Detect stock anomalies for a store
 * @access  Private
 * @query   days, threshold
 */
router.get('/anomalies/:storeId', stockController_1.detectStockAnomalies);
/**
 * @route   GET /api/stock/report/:storeId
 * @desc    Generate stock report for a date range
 * @access  Private
 * @query   startDate (required), endDate (required)
 */
router.get('/report/:storeId', stockController_1.generateStockReport);
/**
 * @route   GET /api/stock/movement/:productId
 * @desc    Get stock movement summary for a product
 * @access  Private
 * @query   startDate (required), endDate (required), variantType, variantValue
 */
router.get('/movement/:productId', stockController_1.getStockMovementSummary);
/**
 * @route   GET /api/stock/alerts/:storeId
 * @desc    Get low stock alerts for a store
 * @access  Private
 * @query   threshold (default: 10)
 */
router.get('/alerts/:storeId', stockController_1.getLowStockAlerts);
/**
 * @route   GET /api/stock/value/:storeId
 * @desc    Get stock value over time for a store
 * @access  Private
 * @query   startDate (required), endDate (required), interval (day/week/month)
 */
router.get('/value/:storeId', stockController_1.getStockValueOverTime);
exports.default = router;
