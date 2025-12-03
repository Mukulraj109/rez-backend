"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const walletController_1 = require("../controllers/walletController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All wallet routes require authentication
router.use(auth_1.authenticate);
/**
 * @route   GET /api/wallet/balance
 * @desc    Get user wallet balance and status
 * @access  Private
 */
router.get('/balance', walletController_1.getWalletBalance);
/**
 * @route   POST /api/wallet/credit-loyalty-points
 * @desc    Credit loyalty points to wallet as spendable coins
 * @body    { amount, source }
 * @access  Private
 */
router.post('/credit-loyalty-points', walletController_1.creditLoyaltyPoints);
/**
 * @route   GET /api/wallet/transactions
 * @desc    Get user transaction history with filters
 * @query   page, limit, type, category, status, dateFrom, dateTo, minAmount, maxAmount
 * @access  Private
 */
router.get('/transactions', walletController_1.getTransactions);
/**
 * @route   GET /api/wallet/transaction/:id
 * @desc    Get single transaction details
 * @access  Private
 */
router.get('/transaction/:id', walletController_1.getTransactionById);
/**
 * @route   GET /api/wallet/summary
 * @desc    Get transaction summary/statistics
 * @query   period (day, week, month, year)
 * @access  Private
 */
router.get('/summary', walletController_1.getTransactionSummary);
/**
 * @route   GET /api/wallet/categories
 * @desc    Get spending breakdown by categories
 * @access  Private
 */
router.get('/categories', walletController_1.getCategoriesBreakdown);
/**
 * @route   POST /api/wallet/topup
 * @desc    Add funds to wallet
 * @body    { amount, paymentMethod, paymentId }
 * @access  Private
 */
router.post('/topup', walletController_1.topupWallet);
/**
 * @route   POST /api/wallet/withdraw
 * @desc    Withdraw funds from wallet
 * @body    { amount, method, accountDetails }
 * @access  Private
 */
router.post('/withdraw', walletController_1.withdrawFunds);
/**
 * @route   POST /api/wallet/payment
 * @desc    Process payment (deduct from wallet)
 * @body    { amount, orderId, storeId, storeName, description, items }
 * @access  Private
 */
router.post('/payment', walletController_1.processPayment);
/**
 * @route   PUT /api/wallet/settings
 * @desc    Update wallet settings
 * @body    { autoTopup, autoTopupThreshold, autoTopupAmount, lowBalanceAlert, lowBalanceThreshold }
 * @access  Private
 */
router.put('/settings', walletController_1.updateWalletSettings);
/**
 * @route   POST /api/wallet/initiate-payment
 * @desc    Initiate payment gateway transaction
 * @body    { amount, currency, paymentMethod, paymentMethodId, userDetails, metadata }
 * @access  Private
 */
router.post('/initiate-payment', walletController_1.initiatePayment);
/**
 * @route   GET /api/wallet/payment-status/:paymentId
 * @desc    Check payment status
 * @access  Private
 */
router.get('/payment-status/:paymentId', walletController_1.checkPaymentStatus);
/**
 * @route   GET /api/wallet/payment-methods
 * @desc    Get available payment methods
 * @access  Private
 */
router.get('/payment-methods', walletController_1.getPaymentMethods);
/**
 * @route   POST /api/wallet/webhook/:gateway
 * @desc    Handle payment gateway webhooks
 * @access  Public (webhook endpoints)
 */
router.post('/webhook/:gateway', walletController_1.handlePaymentWebhook);
/**
 * @route   POST /api/wallet/paybill
 * @desc    Add PayBill balance (prepaid with discount)
 * @body    { amount, paymentMethod, paymentId, discountPercentage }
 * @access  Private
 */
router.post('/paybill', walletController_1.addPayBillBalance);
/**
 * @route   GET /api/wallet/paybill/balance
 * @desc    Get PayBill balance
 * @access  Private
 */
router.get('/paybill/balance', walletController_1.getPayBillBalance);
/**
 * @route   POST /api/wallet/paybill/use
 * @desc    Use PayBill balance for payment
 * @body    { amount, orderId, description }
 * @access  Private
 */
router.post('/paybill/use', walletController_1.usePayBillBalance);
/**
 * @route   GET /api/wallet/paybill/transactions
 * @desc    Get PayBill transaction history
 * @query   page, limit
 * @access  Private
 */
router.get('/paybill/transactions', walletController_1.getPayBillTransactions);
/**
 * @route   POST /api/wallet/paybill/create-payment-intent
 * @desc    Create Stripe Payment Intent for PayBill
 * @body    { amount, discountPercentage }
 * @access  Private
 */
router.post('/paybill/create-payment-intent', walletController_1.createPayBillPaymentIntent);
/**
 * @route   POST /api/wallet/paybill/confirm-payment
 * @desc    Confirm PayBill payment and add balance
 * @body    { paymentIntentId }
 * @access  Private
 */
router.post('/paybill/confirm-payment', walletController_1.confirmPayBillPayment);
/**
 * @route   POST /api/wallet/dev-topup
 * @desc    Add test funds to wallet (DEVELOPMENT ONLY)
 * @body    { amount, type: 'wallet' | 'paybill' }
 * @access  Private
 */
router.post('/dev-topup', walletController_1.devTopup);
exports.default = router;
