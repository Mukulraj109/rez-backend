"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const billingController_1 = require("../controllers/billingController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * @route   GET /api/billing/history
 * @desc    Get user's billing transaction history
 * @access  Private
 */
router.get('/history', auth_1.authenticate, billingController_1.getBillingHistory);
/**
 * @route   GET /api/billing/summary
 * @desc    Get billing statistics and summary
 * @access  Private
 */
router.get('/summary', auth_1.authenticate, billingController_1.getBillingSummary);
/**
 * @route   GET /api/billing/invoice/:transactionId
 * @desc    Get specific invoice details
 * @access  Private
 */
router.get('/invoice/:transactionId', auth_1.authenticate, billingController_1.getInvoice);
/**
 * @route   GET /api/billing/invoice/:transactionId/download
 * @desc    Download invoice as PDF
 * @access  Private
 */
router.get('/invoice/:transactionId/download', auth_1.authenticate, billingController_1.downloadInvoice);
exports.default = router;
