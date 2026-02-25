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
  confirmPayment,
  checkPaymentStatus,
  getPaymentMethods,

  creditLoyaltyPoints,
  devTopup,
  syncWalletBalance,
  refundPayment,
  getExpiringCoins,
  previewRechargeCashback,
  getScheduledDrops,
  getCoinRules
} from '../controllers/walletController';
import { authenticate } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import { requireReAuth } from '../middleware/reAuth';
import { requireWalletFeature, WALLET_FEATURES } from '../services/walletFeatureService';

const router = express.Router();

// Rate limiters for sensitive wallet operations
const walletWriteLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10, message: 'Too many wallet operations. Please try again later.' });
const walletWithdrawLimiter = createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 5, message: 'Daily withdrawal limit reached.' });
const walletRefundLimiter = createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 3, message: 'Too many refund requests.' });
const walletPaymentLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 30, message: 'Too many payment requests. Please try again later.' });
const walletCreditLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 20, message: 'Too many credit requests.' });
const walletSyncLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5, message: 'Too many sync requests.' });


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
router.post('/credit-loyalty-points', walletCreditLimiter, creditLoyaltyPoints);

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
router.post('/topup', walletWriteLimiter, topupWallet);

/**
 * @route   POST /api/wallet/withdraw
 * @desc    Withdraw funds from wallet
 * @body    { amount, method, accountDetails }
 * @access  Private
 */
router.post('/withdraw', walletWithdrawLimiter, requireReAuth(), requireWalletFeature(WALLET_FEATURES.WITHDRAWALS), withdrawFunds);

/**
 * @route   POST /api/wallet/payment
 * @desc    Process payment (deduct from wallet)
 * @body    { amount, orderId, storeId, storeName, description, items }
 * @access  Private
 */
router.post('/payment', walletPaymentLimiter, processPayment);

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
 * @route   POST /api/wallet/confirm-payment
 * @desc    Confirm payment after frontend Stripe confirmCardPayment succeeds
 * @body    { paymentIntentId }
 * @access  Private
 */
router.post('/confirm-payment', confirmPayment);

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
 * @route   POST /api/wallet/dev-topup
 * @desc    Add test funds to wallet (DEVELOPMENT ONLY)
 * @body    { amount, type: 'rez' | 'promo' | 'cashback' }
 * @access  Private (dev only)
 */
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev-topup', walletWriteLimiter, devTopup);
}

/**
 * @route   POST /api/wallet/sync-balance
 * @desc    Sync wallet balance from CoinTransaction (fixes discrepancies)
 * @access  Private
 */
router.post('/sync-balance', walletSyncLimiter, syncWalletBalance);

/**
 * @route   POST /api/wallet/refund
 * @desc    Refund a wallet payment (used when order creation fails after payment)
 * @body    { transactionId, amount, reason }
 * @access  Private
 */
router.post('/refund', walletRefundLimiter, refundPayment);

/**
 * @route   GET /api/wallet/expiring-coins
 * @desc    Get coins grouped by expiry period (this_week, this_month, next_month)
 * @access  Private
 */
router.get('/expiring-coins', getExpiringCoins);

/**
 * @route   GET /api/wallet/recharge/preview
 * @desc    Preview recharge cashback calculation before purchase
 * @query   amount
 * @access  Private
 */
router.get('/recharge/preview', previewRechargeCashback);

/**
 * @route   GET /api/wallet/scheduled-drops
 * @desc    Get upcoming coin drops and claimable rewards
 * @access  Private
 */
router.get('/scheduled-drops', getScheduledDrops);

/**
 * @route   GET /api/wallet/coin-rules
 * @desc    Get dynamic coin usage/earning rules
 * @access  Private
 */
router.get('/coin-rules', getCoinRules);

export default router;