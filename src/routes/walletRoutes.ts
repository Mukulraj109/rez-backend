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
  addPayBillBalance,
  getPayBillBalance,
  usePayBillBalance,
  getPayBillTransactions,
  createPayBillPaymentIntent,
  confirmPayBillPayment,
  creditLoyaltyPoints
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
 * @route   POST /api/wallet/paybill
 * @desc    Add PayBill balance (prepaid with discount)
 * @body    { amount, paymentMethod, paymentId, discountPercentage }
 * @access  Private
 */
router.post('/paybill', addPayBillBalance);

/**
 * @route   GET /api/wallet/paybill/balance
 * @desc    Get PayBill balance
 * @access  Private
 */
router.get('/paybill/balance', getPayBillBalance);

/**
 * @route   POST /api/wallet/paybill/use
 * @desc    Use PayBill balance for payment
 * @body    { amount, orderId, description }
 * @access  Private
 */
router.post('/paybill/use', usePayBillBalance);

/**
 * @route   GET /api/wallet/paybill/transactions
 * @desc    Get PayBill transaction history
 * @query   page, limit
 * @access  Private
 */
router.get('/paybill/transactions', getPayBillTransactions);

/**
 * @route   POST /api/wallet/paybill/create-payment-intent
 * @desc    Create Stripe Payment Intent for PayBill
 * @body    { amount, discountPercentage }
 * @access  Private
 */
router.post('/paybill/create-payment-intent', createPayBillPaymentIntent);

/**
 * @route   POST /api/wallet/paybill/confirm-payment
 * @desc    Confirm PayBill payment and add balance
 * @body    { paymentIntentId }
 * @access  Private
 */
router.post('/paybill/confirm-payment', confirmPayBillPayment);

export default router;