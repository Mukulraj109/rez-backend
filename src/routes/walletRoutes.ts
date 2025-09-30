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
  getCategoriesBreakdown
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

export default router;