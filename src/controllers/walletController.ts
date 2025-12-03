import { Request, Response } from 'express';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { Payment } from '../models/Payment';
import { sendSuccess, sendError, sendBadRequest, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import mongoose from 'mongoose';
import activityService from '../services/activityService';
import paymentGatewayService from '../services/paymentGatewayService';
import Stripe from 'stripe';

/**
 * @desc    Get user wallet balance
 * @route   GET /api/wallet/balance
 * @access  Private
 */
export const getWalletBalance = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Get or create wallet
  let wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
  }

  if (!wallet) {
    return sendError(res, 'Failed to create wallet', 500);
  }

  sendSuccess(res, {
    balance: wallet.balance,
    coins: wallet.coins || [],
    currency: wallet.currency,
    statistics: wallet.statistics,
    limits: {
      maxBalance: wallet.limits.maxBalance,
      dailySpendLimit: wallet.limits.dailySpendLimit,
      dailySpentToday: wallet.limits.dailySpent,
      remainingToday: wallet.limits.dailySpendLimit - wallet.limits.dailySpent
    },
    status: {
      isActive: wallet.isActive,
      isFrozen: wallet.isFrozen,
      frozenReason: wallet.frozenReason
    },
    lastUpdated: wallet.updatedAt
  }, 'Wallet balance retrieved successfully');
});

/**
 * @desc    Credit loyalty points to wallet
 * @route   POST /api/wallet/credit-loyalty-points
 * @access  Private
 */
export const creditLoyaltyPoints = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { amount, source } = req.body;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  if (!amount || amount <= 0) {
    return sendBadRequest(res, 'Invalid amount');
  }

  console.log('💰 [WALLET] Crediting loyalty points:', { userId, amount, source });

  // Get or create wallet
  let wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
  }

  if (!wallet) {
    return sendError(res, 'Failed to create wallet', 500);
  }

  // Add to wasil coins (REZ coins)
  const wasilCoin = wallet.coins.find(c => c.type === 'wasil');
  if (wasilCoin) {
    wasilCoin.amount += amount;
    wasilCoin.lastUsed = new Date();
  } else {
    // If wasil coin doesn't exist, create it
    wallet.coins.push({
      type: 'wasil',
      amount: amount,
      isActive: true,
      earnedDate: new Date(),
      lastUsed: new Date()
    } as any);
  }

  // Update balances
  wallet.balance.available += amount;
  wallet.balance.total += amount;
  wallet.statistics.totalEarned += amount;

  await wallet.save();

  // Create transaction record
  try {
    await Transaction.create({
      user: userId,
      type: 'credit',
      category: 'earning',
      amount: amount,
      currency: 'RC',
      description: source?.description || 'Loyalty points credited',
      source: {
        type: source?.type || 'loyalty_sync',
        reference: source?.reference || 'system',
        description: source?.description || 'Loyalty points conversion',
        metadata: source?.metadata || {}
      },
      status: {
        current: 'completed',
        history: [{
          status: 'completed',
          timestamp: new Date(),
          reason: 'Loyalty points credited successfully'
        }]
      },
      balanceBefore: wallet.balance.available - amount,
      balanceAfter: wallet.balance.available,
      netAmount: amount,
      isReversible: false
    });

    console.log('✅ [WALLET] Transaction created for loyalty points credit');
  } catch (txError) {
    console.error('❌ [WALLET] Failed to create transaction:', txError);
    // Don't fail the whole operation if transaction creation fails
  }

  // Log activity
  try {
    await activityService.wallet.onMoneyAdded(
      new mongoose.Types.ObjectId(userId),
      amount
    );
  } catch (activityError) {
    console.error('❌ [WALLET] Failed to log activity:', activityError);
  }

  console.log('✅ [WALLET] Loyalty points credited successfully:', {
    amount,
    newBalance: wallet.balance.available,
    wasilCoins: wasilCoin?.amount
  });

  sendSuccess(res, {
    balance: wallet.balance,
    coins: wallet.coins,
    credited: amount,
    message: `${amount} loyalty points credited to your wallet`
  }, 'Loyalty points credited successfully');
});

/**
 * @desc    Get transaction history
 * @route   GET /api/wallet/transactions
 * @access  Private
 */
export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const {
    page = 1,
    limit = 20,
    type,
    category,
    status,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount
  } = req.query;

  // Build filters
  const filters: any = {};

  if (type) filters.type = type;
  if (category) filters.category = category;
  if (status) filters.status = status;

  if (dateFrom || dateTo) {
    filters.dateRange = {
      start: dateFrom ? new Date(dateFrom as string) : new Date(0),
      end: dateTo ? new Date(dateTo as string) : new Date()
    };
  }

  if (minAmount || maxAmount) {
    filters.amountRange = {
      min: minAmount ? Number(minAmount) : 0,
      max: maxAmount ? Number(maxAmount) : Number.MAX_SAFE_INTEGER
    };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const transactions = await Transaction.getUserTransactions(
    userId,
    filters,
    Number(limit),
    skip
  );

  const total = await Transaction.countDocuments({ user: userId, ...filters });
  const totalPages = Math.ceil(total / Number(limit));

  sendSuccess(res, {
    transactions,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
      hasNext: Number(page) < totalPages,
      hasPrev: Number(page) > 1
    }
  }, 'Transactions retrieved successfully');
});

/**
 * @desc    Get single transaction details
 * @route   GET /api/wallet/transaction/:id
 * @access  Private
 */
export const getTransactionById = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const transaction = await Transaction.findOne({
    _id: id,
    user: userId
  }).populate('source.reference');

  if (!transaction) {
    return sendNotFound(res, 'Transaction not found');
  }

  sendSuccess(res, { transaction }, 'Transaction details retrieved successfully');
});

/**
 * @desc    Topup wallet
 * @route   POST /api/wallet/topup
 * @access  Private
 */
export const topupWallet = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { amount, paymentMethod, paymentId } = req.body;

  console.log('💰 [TOPUP] Starting wallet topup');
  console.log('💰 [TOPUP] User ID:', userId);
  console.log('💰 [TOPUP] Amount:', amount);
  console.log('💰 [TOPUP] Payment Method:', paymentMethod);

  if (!userId) {
    console.error('❌ [TOPUP] No user ID found');
    return sendError(res, 'User not authenticated', 401);
  }

  // Validate amount
  if (!amount || amount <= 0) {
    console.error('❌ [TOPUP] Invalid amount:', amount);
    return sendBadRequest(res, 'Invalid topup amount');
  }

  // Get wallet
  console.log('🔍 [TOPUP] Finding wallet for user:', userId);
  let wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    console.log('🆕 [TOPUP] Wallet not found, creating new wallet');
    wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
  }

  if (!wallet) {
    console.error('❌ [TOPUP] Failed to create wallet');
    return sendError(res, 'Failed to create wallet', 500);
  }

  console.log('✅ [TOPUP] Wallet found/created:', wallet._id);
  console.log('💵 [TOPUP] Current balance:', wallet.balance.total);

  // Check if wallet is frozen
  if (wallet.isFrozen) {
    console.error('❌ [TOPUP] Wallet is frozen:', wallet.frozenReason);
    return sendError(res, `Wallet is frozen: ${wallet.frozenReason}`, 403);
  }

  // Check max balance limit
  if (wallet.balance.total + amount > wallet.limits.maxBalance) {
    console.error('❌ [TOPUP] Max balance limit would be exceeded');
    return sendBadRequest(res, `Maximum wallet balance limit (${wallet.limits.maxBalance} RC) would be exceeded`);
  }

  // Get current balance for transaction record
  const balanceBefore = wallet.balance.total;

  console.log('📝 [TOPUP] Creating transaction record');
  console.log('📝 [TOPUP] Wallet ID for reference:', wallet._id);
  console.log('📝 [TOPUP] Wallet ID type:', typeof wallet._id);

  // Create transaction record
  try {
    const transaction = new Transaction({
      user: new mongoose.Types.ObjectId(userId),
      type: 'credit',
      category: 'topup',
      amount: Number(amount),
      currency: wallet.currency,
      description: `Wallet topup - ${paymentMethod || 'Payment Gateway'}`,
      source: {
        type: 'topup',
        reference: new mongoose.Types.ObjectId(String(wallet._id)),
        description: `Wallet topup via ${paymentMethod || 'Payment Gateway'}`,
        metadata: {
          paymentId: paymentId || `PAY_${Date.now()}`,
          paymentMethod: paymentMethod || 'gateway'
        }
      },
      balanceBefore: Number(balanceBefore),
      balanceAfter: Number(balanceBefore) + Number(amount),
      status: {
        current: 'completed',
        history: [{
          status: 'completed',
          timestamp: new Date()
        }]
      }
    });

    console.log('💾 [TOPUP] Saving transaction');
    await transaction.save();
    console.log('✅ [TOPUP] Transaction saved:', transaction._id);

    // Add funds to wallet
    console.log('💰 [TOPUP] Adding funds to wallet');
    await wallet.addFunds(Number(amount), 'topup');
    console.log('✅ [TOPUP] Funds added, new balance:', wallet.balance.total);

    // Create activity for wallet topup
    await activityService.wallet.onMoneyAdded(
      new mongoose.Types.ObjectId(userId),
      Number(amount)
    );

    sendSuccess(res, {
      transaction,
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency
      }
    }, 'Wallet topup successful', 201);
  } catch (error) {
    console.error('❌ [TOPUP] Error creating transaction:', error);
    console.error('❌ [TOPUP] Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
});

/**
 * @desc    Withdraw from wallet
 * @route   POST /api/wallet/withdraw
 * @access  Private
 */
export const withdrawFunds = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { amount, method, accountDetails } = req.body;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Validate amount
  if (!amount || amount <= 0) {
    return sendBadRequest(res, 'Invalid withdrawal amount');
  }

  // Validate method
  if (!method || !['bank', 'upi', 'paypal'].includes(method)) {
    return sendBadRequest(res, 'Invalid withdrawal method');
  }

  // Get wallet
  const wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    return sendNotFound(res, 'Wallet not found');
  }

  // Check if wallet is frozen
  if (wallet.isFrozen) {
    return sendError(res, `Wallet is frozen: ${wallet.frozenReason}`, 403);
  }

  // Check minimum withdrawal
  if (amount < wallet.limits.minWithdrawal) {
    return sendBadRequest(res, `Minimum withdrawal amount is ${wallet.limits.minWithdrawal} RC`);
  }

  // Check if sufficient balance
  if (wallet.balance.available < amount) {
    return sendBadRequest(res, 'Insufficient wallet balance');
  }

  // Calculate fees (2% withdrawal fee)
  const fees = Math.round(amount * 0.02);
  const netAmount = amount - fees;

  const balanceBefore = wallet.balance.total;

  // Create withdrawal transaction
  const withdrawalId = `WD${Date.now()}`;
  const transaction = new Transaction({
    user: userId,
    type: 'debit',
    category: 'withdrawal',
    amount,
    currency: wallet.currency,
    description: `Wallet withdrawal via ${method}`,
    source: {
      type: 'withdrawal',
      reference: wallet._id,
      description: `Withdrawal to ${method}`,
      metadata: {
        withdrawalInfo: {
          method,
          accountDetails: accountDetails || 'Not provided',
          withdrawalId
        }
      }
    },
    balanceBefore,
    balanceAfter: balanceBefore - amount,
    fees,
    netAmount,
    status: {
      current: 'processing',
      history: [{
        status: 'processing',
        timestamp: new Date()
      }]
    }
  });

  await transaction.save();

  // Deduct from wallet
  await wallet.deductFunds(amount);

  // Update statistics
  wallet.statistics.totalWithdrawals += amount;
  await wallet.save();

  sendSuccess(res, {
    transaction,
    withdrawalId,
    netAmount,
    fees,
    wallet: {
      balance: wallet.balance,
      currency: wallet.currency
    },
    estimatedProcessingTime: '2-3 business days'
  }, 'Withdrawal request submitted successfully', 201);
});

/**
 * @desc    Process payment (deduct from wallet)
 * @route   POST /api/wallet/payment
 * @access  Private
 */
export const processPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const {
    amount,
    orderId,
    storeId,
    storeName,
    description,
    items
  } = req.body;

  console.log('💳 [PAYMENT] Starting payment processing');
  console.log('💳 [PAYMENT] User ID:', userId);
  console.log('💳 [PAYMENT] Amount:', amount);
  console.log('💳 [PAYMENT] Store:', storeName);

  if (!userId) {
    console.error('❌ [PAYMENT] No user ID found');
    return sendError(res, 'User not authenticated', 401);
  }

  // Validate amount
  if (!amount || amount <= 0) {
    console.error('❌ [PAYMENT] Invalid amount:', amount);
    return sendBadRequest(res, 'Invalid payment amount');
  }

  // Get wallet
  console.log('🔍 [PAYMENT] Finding wallet for user:', userId);
  const wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    console.error('❌ [PAYMENT] Wallet not found');
    return sendNotFound(res, 'Wallet not found');
  }

  console.log('✅ [PAYMENT] Wallet found:', wallet._id);
  console.log('💵 [PAYMENT] Available balance:', wallet.balance.available);

  // Check if wallet is frozen
  if (wallet.isFrozen) {
    console.error('❌ [PAYMENT] Wallet is frozen:', wallet.frozenReason);
    return sendError(res, `Wallet is frozen: ${wallet.frozenReason}`, 403);
  }

  // Check if can spend
  if (!wallet.canSpend(amount)) {
    if (wallet.balance.available < amount) {
      console.error('❌ [PAYMENT] Insufficient balance');
      return sendBadRequest(res, 'Insufficient wallet balance');
    } else {
      console.error('❌ [PAYMENT] Daily limit exceeded');
      return sendBadRequest(res, 'Daily spending limit exceeded');
    }
  }

  const balanceBefore = wallet.balance.total;

  console.log('📝 [PAYMENT] Creating transaction record');

  try {
    // Create payment transaction
    const transaction = new Transaction({
      user: new mongoose.Types.ObjectId(userId),
      type: 'debit',
      category: 'spending',
      amount: Number(amount),
      currency: wallet.currency,
      description: description || `Payment for order ${orderId || 'N/A'}`,
      source: {
        type: 'order',
        reference: orderId ? new mongoose.Types.ObjectId(orderId) : new mongoose.Types.ObjectId(String(wallet._id)),
        description: `Purchase from ${storeName || 'Store'}`,
        metadata: {
          orderNumber: orderId || `ORD_${Date.now()}`,
          storeInfo: {
            name: storeName || 'Unknown Store',
            id: storeId ? new mongoose.Types.ObjectId(storeId) : undefined
          },
          items: items || []
        }
      },
      balanceBefore: Number(balanceBefore),
      balanceAfter: Number(balanceBefore) - Number(amount),
      status: {
        current: 'completed',
        history: [{
          status: 'completed',
          timestamp: new Date()
        }]
      }
    });

    console.log('💾 [PAYMENT] Saving transaction');
    await transaction.save();
    console.log('✅ [PAYMENT] Transaction saved:', transaction._id);

    // Deduct funds
    console.log('💰 [PAYMENT] Deducting funds from wallet');
    await wallet.deductFunds(Number(amount));
    console.log('✅ [PAYMENT] Funds deducted, new balance:', wallet.balance.total);

    // Create activity for wallet spending
    await activityService.wallet.onMoneySpent(
      new mongoose.Types.ObjectId(userId),
      Number(amount),
      storeName || 'order'
    );

    sendSuccess(res, {
      transaction,
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency
      },
      paymentStatus: 'success'
    }, 'Payment processed successfully', 201);
  } catch (error) {
    console.error('❌ [PAYMENT] Error processing payment:', error);
    console.error('❌ [PAYMENT] Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
});

/**
 * @desc    Get transaction summary/statistics
 * @route   GET /api/wallet/summary
 * @access  Private
 */
export const getTransactionSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { period = 'month' } = req.query;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const validPeriods = ['day', 'week', 'month', 'year'];
  if (!validPeriods.includes(period as string)) {
    return sendBadRequest(res, 'Invalid period. Must be day, week, month, or year');
  }

  const summary = await Transaction.getUserTransactionSummary(
    userId,
    period as 'day' | 'week' | 'month' | 'year'
  );

  const wallet = await Wallet.findOne({ user: userId });

  sendSuccess(res, {
    summary: summary[0] || { summary: [], totalTransactions: 0 },
    period,
    wallet: wallet ? {
      balance: wallet.balance,
      statistics: wallet.statistics
    } : null
  }, 'Transaction summary retrieved successfully');
});

/**
 * @desc    Update wallet settings
 * @route   PUT /api/wallet/settings
 * @access  Private
 */
export const updateWalletSettings = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const {
    autoTopup,
    autoTopupThreshold,
    autoTopupAmount,
    lowBalanceAlert,
    lowBalanceThreshold
  } = req.body;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    return sendNotFound(res, 'Wallet not found');
  }

  // Update settings
  if (autoTopup !== undefined) wallet.settings.autoTopup = autoTopup;
  if (autoTopupThreshold !== undefined) wallet.settings.autoTopupThreshold = autoTopupThreshold;
  if (autoTopupAmount !== undefined) wallet.settings.autoTopupAmount = autoTopupAmount;
  if (lowBalanceAlert !== undefined) wallet.settings.lowBalanceAlert = lowBalanceAlert;
  if (lowBalanceThreshold !== undefined) wallet.settings.lowBalanceThreshold = lowBalanceThreshold;

  await wallet.save();

  sendSuccess(res, {
    settings: wallet.settings
  }, 'Wallet settings updated successfully');
});

/**
 * @desc    Get wallet transaction categories breakdown
 * @route   GET /api/wallet/categories
 * @access  Private
 */
export const getCategoriesBreakdown = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const breakdown = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        'status.current': 'completed'
      }
    },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);

  sendSuccess(res, {
    categories: breakdown,
    totalCategories: breakdown.length
  }, 'Categories breakdown retrieved successfully');
});

/**
 * @desc    Initiate payment gateway transaction
 * @route   POST /api/wallet/initiate-payment
 * @access  Private
 */
export const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { 
    amount, 
    currency, 
    paymentMethod, 
    paymentMethodType,
    userDetails, 
    metadata,
    returnUrl,
    cancelUrl
  } = req.body;

  console.log('💳 [PAYMENT] Initiating payment:', {
    userId,
    amount,
    currency,
    paymentMethod,
    paymentMethodType
  });

  // Validate required fields
  if (!amount || amount <= 0) {
    return sendBadRequest(res, 'Valid amount is required');
  }

  if (!paymentMethod) {
    return sendBadRequest(res, 'Payment method is required');
  }

  if (!paymentMethodType) {
    return sendBadRequest(res, 'Payment method type is required');
  }

  // Get user wallet
  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    return sendNotFound(res, 'Wallet not found');
  }

  // Check if wallet is active
  if (!wallet.isActive) {
    return sendBadRequest(res, 'Wallet is not active');
  }

  try {
    // Use payment gateway service
    const paymentData = {
      amount: Number(amount),
      currency: currency || 'INR',
      paymentMethod: paymentMethod as 'stripe' | 'razorpay' | 'paypal',
      paymentMethodType: paymentMethodType as 'card' | 'upi' | 'wallet' | 'netbanking',
      userDetails: userDetails || {},
      metadata: metadata || {},
      returnUrl,
      cancelUrl
    };

    const gatewayResponse = await paymentGatewayService.initiatePayment(paymentData, userId);

    console.log('✅ [PAYMENT] Payment initiated successfully:', gatewayResponse.paymentId);

    sendSuccess(res, gatewayResponse, 'Payment initiated successfully');
  } catch (error: any) {
    console.error('❌ [PAYMENT] Payment initiation failed:', error);
    sendError(res, error.message, 500);
  }
});

/**
 * @desc    Check payment status
 * @route   GET /api/wallet/payment-status/:paymentId
 * @access  Private
 */
export const checkPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { paymentId } = req.params;
  const { gateway } = req.query;

  console.log('💳 [PAYMENT] Checking payment status:', { userId, paymentId, gateway });

  if (!paymentId) {
    return sendBadRequest(res, 'Payment ID is required');
  }

  if (!gateway) {
    return sendBadRequest(res, 'Payment gateway is required');
  }

  try {
    // Use payment gateway service to check status
    const paymentStatus = await paymentGatewayService.checkPaymentStatus(
      paymentId,
      gateway as string,
      userId
    );

    console.log('✅ [PAYMENT] Payment status retrieved:', paymentStatus);

    sendSuccess(res, paymentStatus, 'Payment status retrieved successfully');
  } catch (error: any) {
    console.error('❌ [PAYMENT] Status check failed:', error);
    sendError(res, error.message, 500);
  }
});

/**
 * @desc    Get available payment methods
 * @route   GET /api/wallet/payment-methods
 * @access  Private
 */
export const getPaymentMethods = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { currency = 'INR' } = req.query;

  console.log('💳 [PAYMENT] Fetching payment methods for user:', userId, 'currency:', currency);

  try {
    const paymentMethods: any[] = [];

    // Stripe methods
    if (paymentGatewayService.getSupportedCurrencies('stripe').includes(currency as string)) {
      const stripeMethods = paymentGatewayService.getAvailablePaymentMethods('stripe');
      stripeMethods.forEach(method => {
        paymentMethods.push({
          id: `stripe_${method}`,
          name: method === 'card' ? 'Credit/Debit Card (Stripe)' : 
                method === 'upi' ? 'UPI (Stripe)' : 
                method === 'wallet' ? 'Digital Wallet (Stripe)' : method,
          type: method,
          gateway: 'stripe',
          icon: method === 'card' ? '💳' : method === 'upi' ? '📱' : '👛',
          isAvailable: true,
          processingFee: method === 'card' ? 2.9 : 0,
          processingTime: 'Instant',
          description: `Pay using ${method} via Stripe`,
          supportedCurrencies: paymentGatewayService.getSupportedCurrencies('stripe')
        });
      });
    }

    // Razorpay methods (for INR)
    if (currency === 'INR') {
      const razorpayMethods = paymentGatewayService.getAvailablePaymentMethods('razorpay');
      razorpayMethods.forEach(method => {
        paymentMethods.push({
          id: `razorpay_${method}`,
          name: method === 'card' ? 'Credit/Debit Card (Razorpay)' : 
                method === 'upi' ? 'UPI (Razorpay)' : 
                method === 'wallet' ? 'Digital Wallet (Razorpay)' : 
                method === 'netbanking' ? 'Net Banking (Razorpay)' : method,
          type: method,
          gateway: 'razorpay',
          icon: method === 'card' ? '💳' : method === 'upi' ? '📱' : 
                method === 'wallet' ? '👛' : '🏦',
          isAvailable: true,
          processingFee: method === 'card' ? 2.0 : 0,
          processingTime: method === 'netbanking' ? '5-10 minutes' : 'Instant',
          description: `Pay using ${method} via Razorpay`,
          supportedCurrencies: paymentGatewayService.getSupportedCurrencies('razorpay')
        });
      });
    }

    // PayPal methods
    if (paymentGatewayService.getSupportedCurrencies('paypal').includes(currency as string)) {
      const paypalMethods = paymentGatewayService.getAvailablePaymentMethods('paypal');
      paypalMethods.forEach(method => {
        paymentMethods.push({
          id: `paypal_${method}`,
          name: method === 'card' ? 'Credit/Debit Card (PayPal)' : 
                method === 'paypal' ? 'PayPal Account' : method,
          type: method,
          gateway: 'paypal',
          icon: method === 'card' ? '💳' : '🅿️',
          isAvailable: true,
          processingFee: method === 'card' ? 3.4 : 2.9,
          processingTime: '2-5 minutes',
          description: `Pay using ${method} via PayPal`,
          supportedCurrencies: paymentGatewayService.getSupportedCurrencies('paypal')
        });
      });
    }

    console.log('✅ [PAYMENT] Payment methods retrieved:', paymentMethods.length);

    sendSuccess(res, paymentMethods, 'Payment methods retrieved successfully');
  } catch (error: any) {
    console.error('❌ [PAYMENT] Failed to fetch payment methods:', error);
    sendError(res, 'Failed to fetch payment methods', 500);
  }
});

/**
 * @desc    Handle payment gateway webhooks
 * @route   POST /api/wallet/webhook/:gateway
 * @access  Public
 */
export const handlePaymentWebhook = asyncHandler(async (req: Request, res: Response) => {
  const { gateway } = req.params;
  const signature = req.headers['stripe-signature'] || req.headers['x-razorpay-signature'] || req.headers['paypal-signature'] || '';

  console.log('🔔 [PAYMENT WEBHOOK] Received webhook:', { gateway, signature });

  try {
    const result = await paymentGatewayService.handleWebhook(gateway, req.body, signature as string);

    if (result.success) {
      res.status(200).json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('❌ [PAYMENT WEBHOOK] Webhook processing failed:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

/**
 * @desc    Add PayBill balance (prepaid with discount)
 * @route   POST /api/wallet/paybill
 * @access  Private
 */
export const addPayBillBalance = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { amount, paymentMethod, paymentId, discountPercentage } = req.body;

  console.log('🎟️ [PAYBILL] Adding PayBill balance');
  console.log('🎟️ [PAYBILL] User ID:', userId);
  console.log('🎟️ [PAYBILL] Amount:', amount);
  console.log('🎟️ [PAYBILL] Discount:', discountPercentage || 20, '%');

  if (!userId) {
    console.error('❌ [PAYBILL] No user ID found');
    return sendError(res, 'User not authenticated', 401);
  }

  // Validate amount
  if (!amount || amount <= 0) {
    console.error('❌ [PAYBILL] Invalid amount:', amount);
    return sendBadRequest(res, 'Invalid PayBill amount');
  }

  // Get or create wallet
  let wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    console.log('🆕 [PAYBILL] Wallet not found, creating new wallet');
    wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
  }

  if (!wallet) {
    console.error('❌ [PAYBILL] Failed to create wallet');
    return sendError(res, 'Failed to create wallet', 500);
  }

  console.log('✅ [PAYBILL] Wallet found/created:', wallet._id);
  console.log('💵 [PAYBILL] Current PayBill balance:', wallet.balance.paybill);

  // Check if wallet is frozen
  if (wallet.isFrozen) {
    console.error('❌ [PAYBILL] Wallet is frozen:', wallet.frozenReason);
    return sendError(res, `Wallet is frozen: ${wallet.frozenReason}`, 403);
  }

  const balanceBefore = wallet.balance.paybill || 0;

  console.log('💾 [PAYBILL] Wallet state before adding PayBill:', {
    balanceTotal: wallet.balance.total,
    balanceAvailable: wallet.balance.available,
    balancePending: wallet.balance.pending,
    balancePaybill: wallet.balance.paybill,
    statisticsPayBill: wallet.statistics.totalPayBill,
    statisticsPayBillDiscount: wallet.statistics.totalPayBillDiscount
  });

  try {
    // Add PayBill balance with discount
    console.log('🔄 [PAYBILL] Calling addPayBillBalance method...');
    const result = await wallet.addPayBillBalance(Number(amount), discountPercentage || 20);
    console.log('✅ [PAYBILL] addPayBillBalance result:', result);

    console.log('💾 [PAYBILL] Creating transaction record');

    // Create transaction record
    const transaction = new Transaction({
      user: new mongoose.Types.ObjectId(userId),
      type: 'credit',
      category: 'paybill',
      amount: result.finalAmount,
      currency: wallet.currency,
      description: `PayBill topup - Get ${result.discount} RC extra!`,
      source: {
        type: 'paybill',
        reference: new mongoose.Types.ObjectId(String(wallet._id)),
        description: `PayBill prepaid with ${discountPercentage || 20}% discount`,
        metadata: {
          paymentId: paymentId || `PAYBILL_${Date.now()}`,
          paymentMethod: paymentMethod || 'gateway',
          originalAmount: amount,
          discount: result.discount,
          discountPercentage: discountPercentage || 20
        }
      },
      balanceBefore: Number(balanceBefore),
      balanceAfter: Number(balanceBefore) + result.finalAmount,
      status: {
        current: 'completed',
        history: [{
          status: 'completed',
          timestamp: new Date()
        }]
      }
    });

    await transaction.save();
    console.log('✅ [PAYBILL] Transaction saved:', transaction._id);

    // Create activity for PayBill
    await activityService.wallet.onMoneyAdded(
      new mongoose.Types.ObjectId(userId),
      result.finalAmount
    );

    sendSuccess(res, {
      transaction,
      paybillBalance: wallet.balance.paybill,
      originalAmount: amount,
      discount: result.discount,
      finalAmount: result.finalAmount,
      discountPercentage: discountPercentage || 20,
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency
      },
      message: `Added ${amount} + ${result.discount} bonus = ${result.finalAmount} PayBill balance`
    }, 'PayBill balance added successfully', 201);
  } catch (error) {
    console.error('❌ [PAYBILL] Error adding PayBill balance:', error);
    throw error;
  }
});

/**
 * @desc    Get PayBill balance
 * @route   GET /api/wallet/paybill/balance
 * @access  Private
 */
export const getPayBillBalance = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Get or create wallet
  let wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
  }

  if (!wallet) {
    return sendError(res, 'Failed to create wallet', 500);
  }

  sendSuccess(res, {
    paybillBalance: wallet.balance.paybill,
    currency: wallet.currency,
    statistics: {
      totalPayBill: wallet.statistics.totalPayBill,
      totalPayBillDiscount: wallet.statistics.totalPayBillDiscount
    }
  }, 'PayBill balance retrieved successfully');
});

/**
 * @desc    Use PayBill balance for payment
 * @route   POST /api/wallet/paybill/use
 * @access  Private
 */
export const usePayBillBalance = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { amount, orderId, description } = req.body;

  console.log('🎟️ [PAYBILL USE] Using PayBill balance for payment');
  console.log('🎟️ [PAYBILL USE] User ID:', userId);
  console.log('🎟️ [PAYBILL USE] Amount:', amount);
  console.log('🎟️ [PAYBILL USE] Order ID:', orderId);

  if (!userId) {
    console.error('❌ [PAYBILL USE] No user ID found');
    return sendError(res, 'User not authenticated', 401);
  }

  // Validate amount
  if (!amount || amount <= 0) {
    console.error('❌ [PAYBILL USE] Invalid amount:', amount);
    return sendBadRequest(res, 'Invalid payment amount');
  }

  // Get wallet
  const wallet = await Wallet.findOne({ user: userId });

  if (!wallet) {
    console.error('❌ [PAYBILL USE] Wallet not found');
    return sendNotFound(res, 'Wallet not found');
  }

  console.log('✅ [PAYBILL USE] Wallet found:', wallet._id);
  console.log('💵 [PAYBILL USE] Current PayBill balance:', wallet.balance.paybill);

  // Check if wallet is frozen
  if (wallet.isFrozen) {
    console.error('❌ [PAYBILL USE] Wallet is frozen:', wallet.frozenReason);
    return sendError(res, `Wallet is frozen: ${wallet.frozenReason}`, 403);
  }

  // Check if sufficient PayBill balance
  if ((wallet.balance.paybill || 0) < amount) {
    console.error('❌ [PAYBILL USE] Insufficient PayBill balance');
    return sendBadRequest(res, 'Insufficient PayBill balance');
  }

  const balanceBefore = wallet.balance.paybill || 0;

  console.log('📝 [PAYBILL USE] Creating transaction record');

  try {
    // Deduct PayBill balance
    console.log('🔄 [PAYBILL USE] Calling usePayBillBalance method...');
    await wallet.usePayBillBalance(Number(amount));
    console.log('✅ [PAYBILL USE] PayBill balance deducted');

    // Create transaction record
    const transaction = new Transaction({
      user: new mongoose.Types.ObjectId(userId),
      type: 'debit',
      category: 'spending',
      amount: Number(amount),
      currency: wallet.currency,
      description: description || `Payment using PayBill balance`,
      source: {
        type: 'paybill',
        reference: orderId ? new mongoose.Types.ObjectId(orderId) : new mongoose.Types.ObjectId(String(wallet._id)),
        description: 'Payment using PayBill prepaid balance',
        metadata: {
          orderNumber: orderId || `ORD_${Date.now()}`,
          paymentMethod: 'paybill'
        }
      },
      balanceBefore: Number(balanceBefore),
      balanceAfter: Number(balanceBefore) - Number(amount),
      status: {
        current: 'completed',
        history: [{
          status: 'completed',
          timestamp: new Date()
        }]
      }
    });

    await transaction.save();
    console.log('✅ [PAYBILL USE] Transaction saved:', transaction._id);

    // Create activity for PayBill usage
    await activityService.wallet.onMoneySpent(
      new mongoose.Types.ObjectId(userId),
      Number(amount),
      'PayBill payment'
    );

    sendSuccess(res, {
      transaction,
      paybillBalance: wallet.balance.paybill,
      amountPaid: amount,
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency
      },
      paymentStatus: 'success'
    }, 'PayBill payment successful', 201);
  } catch (error) {
    console.error('❌ [PAYBILL USE] Error using PayBill balance:', error);
    throw error;
  }
});

/**
 * @desc    Get PayBill transaction history
 * @route   GET /api/wallet/paybill/transactions
 * @access  Private
 */
export const getPayBillTransactions = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { page = 1, limit = 20 } = req.query;

  console.log('🎟️ [PAYBILL TXN] Fetching PayBill transactions');
  console.log('🎟️ [PAYBILL TXN] User ID:', userId);

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const skip = (Number(page) - 1) * Number(limit);

  // Get PayBill transactions (both credit and debit)
  const transactions = await Transaction.find({
    user: userId,
    $or: [
      { category: 'paybill' },
      { 'source.type': 'paybill' }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .skip(skip);

  const total = await Transaction.countDocuments({
    user: userId,
    $or: [
      { category: 'paybill' },
      { 'source.type': 'paybill' }
    ]
  });

  const totalPages = Math.ceil(total / Number(limit));

  // Get wallet for current balance
  const wallet = await Wallet.findOne({ user: userId });

  sendSuccess(res, {
    transactions,
    currentBalance: wallet?.balance.paybill || 0,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
      hasNext: Number(page) < totalPages,
      hasPrev: Number(page) > 1
    }
  }, 'PayBill transactions retrieved successfully');
});

/**
 * @desc    Create Stripe Payment Intent for PayBill
 * @route   POST /api/wallet/paybill/create-payment-intent
 * @access  Private
 */
export const createPayBillPaymentIntent = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { amount, discountPercentage = 20, paymentType = 'card' } = req.body;

  console.log('💳 [STRIPE PAYBILL] Creating payment intent');
  console.log('💳 [STRIPE PAYBILL] User ID:', userId);
  console.log('💳 [STRIPE PAYBILL] Amount:', amount);
  console.log('💳 [STRIPE PAYBILL] Payment Type:', paymentType);

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Validate amount
  if (!amount || amount < 50) {
    return sendBadRequest(res, 'Minimum amount is ₹50');
  }

  if (amount > 100000) {
    return sendBadRequest(res, 'Maximum amount is ₹100,000');
  }

  // Validate payment type
  const validPaymentTypes = ['card', 'upi'];
  if (!validPaymentTypes.includes(paymentType)) {
    return sendBadRequest(res, 'Invalid payment type. Must be card or upi');
  }

  // Initialize Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-09-30.clover',
  });

  try {
    // Get user details
    const user = await User.findById(userId);

    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    // Calculate final amount with discount
    const discount = Math.round((amount * discountPercentage) / 100);
    const finalAmount = amount + discount;

    // Create payment intent with appropriate payment method types
    // Note: Stripe amounts are in smallest currency unit (paise for INR)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to paise
      currency: 'inr',
      payment_method_types: [paymentType], // Support both card and UPI
      metadata: {
        userId: userId.toString(),
        type: 'paybill',
        paymentType: paymentType,
        originalAmount: amount.toString(),
        discount: discount.toString(),
        finalAmount: finalAmount.toString(),
        discountPercentage: discountPercentage.toString(),
      },
      description: `PayBill topup: ₹${amount} + ₹${discount} bonus (${discountPercentage}% discount)`,
      receipt_email: user.email,
    });

    console.log('✅ [STRIPE PAYBILL] Payment intent created:', paymentIntent.id);

    sendSuccess(res, {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentType,
      amount,
      discount,
      finalAmount,
      discountPercentage,
    }, 'Payment intent created successfully');
  } catch (error: any) {
    console.error('❌ [STRIPE PAYBILL] Error creating payment intent:', error);
    sendError(res, error.message || 'Failed to create payment intent', 500);
  }
});

/**
 * @desc    Confirm PayBill Payment and Add Balance
 * @route   POST /api/wallet/paybill/confirm-payment
 * @access  Private
 */
export const confirmPayBillPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { paymentIntentId } = req.body;

  console.log('✅ [STRIPE PAYBILL] Confirming payment');
  console.log('✅ [STRIPE PAYBILL] User ID:', userId);
  console.log('✅ [STRIPE PAYBILL] Payment Intent ID:', paymentIntentId);

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  if (!paymentIntentId) {
    return sendBadRequest(res, 'Payment Intent ID is required');
  }

  // Initialize Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-09-30.clover',
  });

  try {
    // Retrieve payment intent to verify it was successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log('🔍 [STRIPE PAYBILL] Payment Intent Status:', paymentIntent.status);

    if (paymentIntent.status !== 'succeeded') {
      return sendBadRequest(res, `Payment not completed. Status: ${paymentIntent.status}`);
    }

    // Verify user ID matches
    if (paymentIntent.metadata.userId !== userId.toString()) {
      return sendError(res, 'Unauthorized payment confirmation', 403);
    }

    // Extract metadata
    const amount = Number(paymentIntent.metadata.originalAmount);
    const discount = Number(paymentIntent.metadata.discount);
    const finalAmount = Number(paymentIntent.metadata.finalAmount);
    const discountPercentage = Number(paymentIntent.metadata.discountPercentage);

    // Get or create wallet
    let wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
    }

    if (!wallet) {
      return sendError(res, 'Failed to create wallet', 500);
    }

    // Check if wallet is frozen
    if (wallet.isFrozen) {
      return sendError(res, `Wallet is frozen: ${wallet.frozenReason}`, 403);
    }

    const balanceBefore = wallet.balance.paybill || 0;

    // Add PayBill balance
    const result = await wallet.addPayBillBalance(finalAmount, 0); // Already calculated discount

    // Create transaction record
    const transaction = new Transaction({
      user: new mongoose.Types.ObjectId(userId),
      type: 'credit',
      category: 'paybill',
      amount: finalAmount,
      currency: wallet.currency,
      description: `PayBill topup via Stripe - Get ${discount} RC extra!`,
      source: {
        type: 'paybill',
        reference: new mongoose.Types.ObjectId(String(wallet._id)),
        description: `PayBill prepaid with ${discountPercentage}% discount`,
        metadata: {
          paymentId: paymentIntent.id,
          paymentMethod: 'stripe',
          originalAmount: amount,
          discount: discount,
          discountPercentage: discountPercentage,
          stripePaymentIntentId: paymentIntent.id,
        }
      },
      balanceBefore: Number(balanceBefore),
      balanceAfter: Number(balanceBefore) + finalAmount,
      status: {
        current: 'completed',
        history: [{
          status: 'completed',
          timestamp: new Date()
        }]
      }
    });

    await transaction.save();
    console.log('✅ [STRIPE PAYBILL] Transaction saved:', transaction._id);

    // Create activity
    await activityService.wallet.onMoneyAdded(
      new mongoose.Types.ObjectId(userId),
      finalAmount
    );

    sendSuccess(res, {
      transaction,
      paybillBalance: wallet.balance.paybill,
      originalAmount: amount,
      discount: discount,
      finalAmount: finalAmount,
      discountPercentage: discountPercentage,
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency
      },
      message: `Added ${amount} + ${discount} bonus = ${finalAmount} PayBill balance`
    }, 'PayBill balance added successfully', 201);
  } catch (error: any) {
    console.error('❌ [STRIPE PAYBILL] Error confirming payment:', error);
    sendError(res, error.message || 'Failed to confirm payment', 500);
  }
});

/**
 * @desc    Add test funds to wallet (DEVELOPMENT ONLY)
 * @route   POST /api/wallet/dev-topup
 * @access  Private
 */
export const devTopup = asyncHandler(async (req: Request, res: Response) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return sendError(res, 'This endpoint is not available in production', 403);
  }

  const userId = (req as any).userId;
  const { amount = 1000, type = 'wallet' } = req.body;

  console.log('🧪 [DEV TOPUP] Adding test funds:', { userId, amount, type });

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  try {
    let wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      wallet = new Wallet({
        user: userId,
        balance: { total: 0, available: 0, pending: 0, paybill: 0 },
        currency: 'INR',
        isActive: true
      });
    }

    if (type === 'paybill') {
      wallet.balance.paybill = (wallet.balance.paybill || 0) + Number(amount);
    } else {
      wallet.balance.total = (wallet.balance.total || 0) + Number(amount);
      wallet.balance.available = (wallet.balance.available || 0) + Number(amount);
    }

    await wallet.save();

    console.log('✅ [DEV TOPUP] Test funds added:', wallet.balance);

    sendSuccess(res, {
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency
      },
      addedAmount: amount,
      type: type
    }, `Test ${type} funds added successfully`);
  } catch (error: any) {
    console.error('❌ [DEV TOPUP] Error:', error);
    sendError(res, error.message, 500);
  }
});