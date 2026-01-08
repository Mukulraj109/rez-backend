import express from 'express';
import {
  getWalletBalance,
  getTransactions,
  getTransactionById,
  topupWallet,
  withdrawFunds,
  processPayment,
  getTransactionSummary,
  updateWalletSettings,
  getCategoriesBreakdown,
  initiatePayment,
  checkPaymentStatus,
  getPaymentMethods,
  handlePaymentWebhook,
  creditLoyaltyPoints,
  devTopup,
  syncWalletBalance
} from '../controllers/walletController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All wallet routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/wallet/balance
 * @desc    Get user wallet balance and status
 * @access  Private
 */
router.get('/balance', getWalletBalance);

/**
 * @route   POST /api/wallet/credit-loyalty-points
 * @desc    Credit loyalty points to wallet as spendable coins
 * @body    { amount, source }
 * @access  Private
 */
router.post('/credit-loyalty-points', creditLoyaltyPoints);

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get user transaction history with filters
 * @query   page, limit, type, category, status, dateFrom, dateTo, minAmount, maxAmount
 * @access  Private
 */
router.get('/transactions', getTransactions);

/**
 * @route   GET /api/wallet/transaction/:id
 * @desc    Get single transaction details
 * @access  Private
 */
router.get('/transaction/:id', getTransactionById);

/**
 * @route   GET /api/wallet/summary
 * @desc    Get transaction summary/statistics
 * @query   period (day, week, month, year)
 * @access  Private
 */
router.get('/summary', getTransactionSummary);

/**
 * @route   GET /api/wallet/categories
 * @desc    Get spending breakdown by categories
 * @access  Private
 */
router.get('/categories', getCategoriesBreakdown);

/**
 * @route   POST /api/wallet/topup
 * @desc    Add funds to wallet
 * @body    { amount, paymentMethod, paymentId }
 * @access  Private
 */
router.post('/topup', topupWallet);

/**
 * @route   POST /api/wallet/withdraw
 * @desc    Withdraw funds from wallet
 * @body    { amount, method, accountDetails }
 * @access  Private
 */
router.post('/withdraw', withdrawFunds);

/**
 * @route   POST /api/wallet/payment
 * @desc    Process payment (deduct from wallet)
 * @body    { amount, orderId, storeId, storeName, description, items }
 * @access  Private
 */
router.post('/payment', processPayment);

/**
 * @route   PUT /api/wallet/settings
 * @desc    Update wallet settings
 * @body    { autoTopup, autoTopupThreshold, autoTopupAmount, lowBalanceAlert, lowBalanceThreshold }
 * @access  Private
 */
router.put('/settings', updateWalletSettings);

/**
 * @route   POST /api/wallet/initiate-payment
 * @desc    Initiate payment gateway transaction
 * @body    { amount, currency, paymentMethod, paymentMethodId, userDetails, metadata }
 * @access  Private
 */
router.post('/initiate-payment', initiatePayment);

/**
 * @route   GET /api/wallet/payment-status/:paymentId
 * @desc    Check payment status
 * @access  Private
 */
router.get('/payment-status/:paymentId', checkPaymentStatus);

/**
 * @route   GET /api/wallet/payment-methods
 * @desc    Get available payment methods
 * @access  Private
 */
router.get('/payment-methods', getPaymentMethods);

/**
 * @route   POST /api/wallet/webhook/:gateway
 * @desc    Handle payment gateway webhooks
 * @access  Public (webhook endpoints)
 */
router.post('/webhook/:gateway', handlePaymentWebhook);

/**
 * @route   POST /api/wallet/dev-topup
 * @desc    Add test funds to wallet (DEVELOPMENT ONLY)
 * @body    { amount, type: 'rez' | 'promo' | 'cashback' }
 * @access  Private
 */
router.post('/dev-topup', devTopup);

/**
 * @route   POST /api/wallet/sync-balance
 * @desc    Sync wallet balance from CoinTransaction (fixes discrepancies)
 * @access  Private
 */
router.post('/sync-balance', syncWalletBalance);

export default router;