"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoriesBreakdown = exports.updateWalletSettings = exports.getTransactionSummary = exports.processPayment = exports.withdrawFunds = exports.topupWallet = exports.getTransactionById = exports.getTransactions = exports.getWalletBalance = void 0;
const Wallet_1 = require("../models/Wallet");
const Transaction_1 = require("../models/Transaction");
const response_1 = require("../utils/response");
const asyncHandler_1 = require("../utils/asyncHandler");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * @desc    Get user wallet balance
 * @route   GET /api/wallet/balance
 * @access  Private
 */
exports.getWalletBalance = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'User not authenticated', 401);
    }
    // Get or create wallet
    let wallet = await Wallet_1.Wallet.findOne({ user: userId });
    if (!wallet) {
        wallet = await Wallet_1.Wallet.createForUser(new mongoose_1.default.Types.ObjectId(userId));
    }
    if (!wallet) {
        return (0, response_1.sendError)(res, 'Failed to create wallet', 500);
    }
    (0, response_1.sendSuccess)(res, {
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
 * @desc    Get transaction history
 * @route   GET /api/wallet/transactions
 * @access  Private
 */
exports.getTransactions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'User not authenticated', 401);
    }
    const { page = 1, limit = 20, type, category, status, dateFrom, dateTo, minAmount, maxAmount } = req.query;
    // Build filters
    const filters = {};
    if (type)
        filters.type = type;
    if (category)
        filters.category = category;
    if (status)
        filters.status = status;
    if (dateFrom || dateTo) {
        filters.dateRange = {
            start: dateFrom ? new Date(dateFrom) : new Date(0),
            end: dateTo ? new Date(dateTo) : new Date()
        };
    }
    if (minAmount || maxAmount) {
        filters.amountRange = {
            min: minAmount ? Number(minAmount) : 0,
            max: maxAmount ? Number(maxAmount) : Number.MAX_SAFE_INTEGER
        };
    }
    const skip = (Number(page) - 1) * Number(limit);
    const transactions = await Transaction_1.Transaction.getUserTransactions(userId, filters, Number(limit), skip);
    const total = await Transaction_1.Transaction.countDocuments({ user: userId, ...filters });
    const totalPages = Math.ceil(total / Number(limit));
    (0, response_1.sendSuccess)(res, {
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
exports.getTransactionById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) {
        return (0, response_1.sendError)(res, 'User not authenticated', 401);
    }
    const transaction = await Transaction_1.Transaction.findOne({
        _id: id,
        user: userId
    }).populate('source.reference');
    if (!transaction) {
        return (0, response_1.sendNotFound)(res, 'Transaction not found');
    }
    (0, response_1.sendSuccess)(res, { transaction }, 'Transaction details retrieved successfully');
});
/**
 * @desc    Topup wallet
 * @route   POST /api/wallet/topup
 * @access  Private
 */
exports.topupWallet = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { amount, paymentMethod, paymentId } = req.body;
    console.log('💰 [TOPUP] Starting wallet topup');
    console.log('💰 [TOPUP] User ID:', userId);
    console.log('💰 [TOPUP] Amount:', amount);
    console.log('💰 [TOPUP] Payment Method:', paymentMethod);
    if (!userId) {
        console.error('❌ [TOPUP] No user ID found');
        return (0, response_1.sendError)(res, 'User not authenticated', 401);
    }
    // Validate amount
    if (!amount || amount <= 0) {
        console.error('❌ [TOPUP] Invalid amount:', amount);
        return (0, response_1.sendBadRequest)(res, 'Invalid topup amount');
    }
    // Get wallet
    console.log('🔍 [TOPUP] Finding wallet for user:', userId);
    let wallet = await Wallet_1.Wallet.findOne({ user: userId });
    if (!wallet) {
        console.log('🆕 [TOPUP] Wallet not found, creating new wallet');
        wallet = await Wallet_1.Wallet.createForUser(new mongoose_1.default.Types.ObjectId(userId));
    }
    if (!wallet) {
        console.error('❌ [TOPUP] Failed to create wallet');
        return (0, response_1.sendError)(res, 'Failed to create wallet', 500);
    }
    console.log('✅ [TOPUP] Wallet found/created:', wallet._id);
    console.log('💵 [TOPUP] Current balance:', wallet.balance.total);
    // Check if wallet is frozen
    if (wallet.isFrozen) {
        console.error('❌ [TOPUP] Wallet is frozen:', wallet.frozenReason);
        return (0, response_1.sendError)(res, `Wallet is frozen: ${wallet.frozenReason}`, 403);
    }
    // Check max balance limit
    if (wallet.balance.total + amount > wallet.limits.maxBalance) {
        console.error('❌ [TOPUP] Max balance limit would be exceeded');
        return (0, response_1.sendBadRequest)(res, `Maximum wallet balance limit (${wallet.limits.maxBalance} RC) would be exceeded`);
    }
    // Get current balance for transaction record
    const balanceBefore = wallet.balance.total;
    console.log('📝 [TOPUP] Creating transaction record');
    console.log('📝 [TOPUP] Wallet ID for reference:', wallet._id);
    console.log('📝 [TOPUP] Wallet ID type:', typeof wallet._id);
    // Create transaction record
    try {
        const transaction = new Transaction_1.Transaction({
            user: new mongoose_1.default.Types.ObjectId(userId),
            type: 'credit',
            category: 'topup',
            amount: Number(amount),
            currency: wallet.currency,
            description: `Wallet topup - ${paymentMethod || 'Payment Gateway'}`,
            source: {
                type: 'topup',
                reference: new mongoose_1.default.Types.ObjectId(String(wallet._id)),
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
        (0, response_1.sendSuccess)(res, {
            transaction,
            wallet: {
                balance: wallet.balance,
                currency: wallet.currency
            }
        }, 'Wallet topup successful', 201);
    }
    catch (error) {
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
exports.withdrawFunds = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { amount, method, accountDetails } = req.body;
    if (!userId) {
        return (0, response_1.sendError)(res, 'User not authenticated', 401);
    }
    // Validate amount
    if (!amount || amount <= 0) {
        return (0, response_1.sendBadRequest)(res, 'Invalid withdrawal amount');
    }
    // Validate method
    if (!method || !['bank', 'upi', 'paypal'].includes(method)) {
        return (0, response_1.sendBadRequest)(res, 'Invalid withdrawal method');
    }
    // Get wallet
    const wallet = await Wallet_1.Wallet.findOne({ user: userId });
    if (!wallet) {
        return (0, response_1.sendNotFound)(res, 'Wallet not found');
    }
    // Check if wallet is frozen
    if (wallet.isFrozen) {
        return (0, response_1.sendError)(res, `Wallet is frozen: ${wallet.frozenReason}`, 403);
    }
    // Check minimum withdrawal
    if (amount < wallet.limits.minWithdrawal) {
        return (0, response_1.sendBadRequest)(res, `Minimum withdrawal amount is ${wallet.limits.minWithdrawal} RC`);
    }
    // Check if sufficient balance
    if (wallet.balance.available < amount) {
        return (0, response_1.sendBadRequest)(res, 'Insufficient wallet balance');
    }
    // Calculate fees (2% withdrawal fee)
    const fees = Math.round(amount * 0.02);
    const netAmount = amount - fees;
    const balanceBefore = wallet.balance.total;
    // Create withdrawal transaction
    const withdrawalId = `WD${Date.now()}`;
    const transaction = new Transaction_1.Transaction({
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
    (0, response_1.sendSuccess)(res, {
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
exports.processPayment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { amount, orderId, storeId, storeName, description, items } = req.body;
    console.log('💳 [PAYMENT] Starting payment processing');
    console.log('💳 [PAYMENT] User ID:', userId);
    console.log('💳 [PAYMENT] Amount:', amount);
    console.log('💳 [PAYMENT] Store:', storeName);
    if (!userId) {
        console.error('❌ [PAYMENT] No user ID found');
        return (0, response_1.sendError)(res, 'User not authenticated', 401);
    }
    // Validate amount
    if (!amount || amount <= 0) {
        console.error('❌ [PAYMENT] Invalid amount:', amount);
        return (0, response_1.sendBadRequest)(res, 'Invalid payment amount');
    }
    // Get wallet
    console.log('🔍 [PAYMENT] Finding wallet for user:', userId);
    const wallet = await Wallet_1.Wallet.findOne({ user: userId });
    if (!wallet) {
        console.error('❌ [PAYMENT] Wallet not found');
        return (0, response_1.sendNotFound)(res, 'Wallet not found');
    }
    console.log('✅ [PAYMENT] Wallet found:', wallet._id);
    console.log('💵 [PAYMENT] Available balance:', wallet.balance.available);
    // Check if wallet is frozen
    if (wallet.isFrozen) {
        console.error('❌ [PAYMENT] Wallet is frozen:', wallet.frozenReason);
        return (0, response_1.sendError)(res, `Wallet is frozen: ${wallet.frozenReason}`, 403);
    }
    // Check if can spend
    if (!wallet.canSpend(amount)) {
        if (wallet.balance.available < amount) {
            console.error('❌ [PAYMENT] Insufficient balance');
            return (0, response_1.sendBadRequest)(res, 'Insufficient wallet balance');
        }
        else {
            console.error('❌ [PAYMENT] Daily limit exceeded');
            return (0, response_1.sendBadRequest)(res, 'Daily spending limit exceeded');
        }
    }
    const balanceBefore = wallet.balance.total;
    console.log('📝 [PAYMENT] Creating transaction record');
    try {
        // Create payment transaction
        const transaction = new Transaction_1.Transaction({
            user: new mongoose_1.default.Types.ObjectId(userId),
            type: 'debit',
            category: 'spending',
            amount: Number(amount),
            currency: wallet.currency,
            description: description || `Payment for order ${orderId || 'N/A'}`,
            source: {
                type: 'order',
                reference: orderId ? new mongoose_1.default.Types.ObjectId(orderId) : new mongoose_1.default.Types.ObjectId(String(wallet._id)),
                description: `Purchase from ${storeName || 'Store'}`,
                metadata: {
                    orderNumber: orderId || `ORD_${Date.now()}`,
                    storeInfo: {
                        name: storeName || 'Unknown Store',
                        id: storeId ? new mongoose_1.default.Types.ObjectId(storeId) : undefined
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
        (0, response_1.sendSuccess)(res, {
            transaction,
            wallet: {
                balance: wallet.balance,
                currency: wallet.currency
            },
            paymentStatus: 'success'
        }, 'Payment processed successfully', 201);
    }
    catch (error) {
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
exports.getTransactionSummary = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { period = 'month' } = req.query;
    if (!userId) {
        return (0, response_1.sendError)(res, 'User not authenticated', 401);
    }
    const validPeriods = ['day', 'week', 'month', 'year'];
    if (!validPeriods.includes(period)) {
        return (0, response_1.sendBadRequest)(res, 'Invalid period. Must be day, week, month, or year');
    }
    const summary = await Transaction_1.Transaction.getUserTransactionSummary(userId, period);
    const wallet = await Wallet_1.Wallet.findOne({ user: userId });
    (0, response_1.sendSuccess)(res, {
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
exports.updateWalletSettings = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const { autoTopup, autoTopupThreshold, autoTopupAmount, lowBalanceAlert, lowBalanceThreshold } = req.body;
    if (!userId) {
        return (0, response_1.sendError)(res, 'User not authenticated', 401);
    }
    const wallet = await Wallet_1.Wallet.findOne({ user: userId });
    if (!wallet) {
        return (0, response_1.sendNotFound)(res, 'Wallet not found');
    }
    // Update settings
    if (autoTopup !== undefined)
        wallet.settings.autoTopup = autoTopup;
    if (autoTopupThreshold !== undefined)
        wallet.settings.autoTopupThreshold = autoTopupThreshold;
    if (autoTopupAmount !== undefined)
        wallet.settings.autoTopupAmount = autoTopupAmount;
    if (lowBalanceAlert !== undefined)
        wallet.settings.lowBalanceAlert = lowBalanceAlert;
    if (lowBalanceThreshold !== undefined)
        wallet.settings.lowBalanceThreshold = lowBalanceThreshold;
    await wallet.save();
    (0, response_1.sendSuccess)(res, {
        settings: wallet.settings
    }, 'Wallet settings updated successfully');
});
/**
 * @desc    Get wallet transaction categories breakdown
 * @route   GET /api/wallet/categories
 * @access  Private
 */
exports.getCategoriesBreakdown = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    if (!userId) {
        return (0, response_1.sendError)(res, 'User not authenticated', 401);
    }
    const breakdown = await Transaction_1.Transaction.aggregate([
        {
            $match: {
                user: new mongoose_1.default.Types.ObjectId(userId),
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
    (0, response_1.sendSuccess)(res, {
        categories: breakdown,
        totalCategories: breakdown.length
    }, 'Categories breakdown retrieved successfully');
});
