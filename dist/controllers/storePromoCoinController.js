"use strict";
// Store Promo Coin Controller
// Handles store-specific promotional coins API endpoints
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStorePromoCoins = exports.getStorePromoCoinTransactions = exports.getStorePromoCoins = exports.getUserStorePromoCoins = void 0;
const StorePromoCoin_1 = require("../models/StorePromoCoin");
const mongoose_1 = require("mongoose");
/**
 * @route   GET /api/store-promo-coins
 * @desc    Get all store promo coins for the authenticated user
 * @access  Private
 */
const getUserStorePromoCoins = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
            return;
        }
        console.log(`📊 [STORE PROMO COIN] Fetching coins for user ${userId}`);
        const storeCoins = await StorePromoCoin_1.StorePromoCoin.getUserStoreCoins(new mongoose_1.Types.ObjectId(userId));
        // Calculate totals
        const totalCoins = storeCoins.reduce((sum, sc) => sum + sc.amount, 0);
        const totalEarned = storeCoins.reduce((sum, sc) => sum + sc.earned, 0);
        const totalUsed = storeCoins.reduce((sum, sc) => sum + sc.used, 0);
        res.status(200).json({
            success: true,
            message: 'Store promo coins retrieved successfully',
            data: {
                storeCoins,
                summary: {
                    totalAvailable: totalCoins,
                    totalEarned,
                    totalUsed,
                    storeCount: storeCoins.length
                }
            }
        });
    }
    catch (error) {
        console.error('❌ [STORE PROMO COIN] Error fetching user store coins:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch store promo coins',
            error: error.message
        });
    }
};
exports.getUserStorePromoCoins = getUserStorePromoCoins;
/**
 * @route   GET /api/store-promo-coins/store/:storeId
 * @desc    Get promo coins for a specific store
 * @access  Private
 */
const getStorePromoCoins = async (req, res) => {
    try {
        const userId = req.userId;
        const { storeId } = req.params;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
            return;
        }
        if (!mongoose_1.Types.ObjectId.isValid(storeId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid store ID'
            });
            return;
        }
        console.log(`📊 [STORE PROMO COIN] Fetching coins for user ${userId} at store ${storeId}`);
        const availableCoins = await StorePromoCoin_1.StorePromoCoin.getAvailableCoins(new mongoose_1.Types.ObjectId(userId), new mongoose_1.Types.ObjectId(storeId));
        const storeCoins = await StorePromoCoin_1.StorePromoCoin.findOne({
            user: new mongoose_1.Types.ObjectId(userId),
            store: new mongoose_1.Types.ObjectId(storeId)
        }).populate('store', 'name logo');
        res.status(200).json({
            success: true,
            message: 'Store promo coins retrieved successfully',
            data: {
                availableCoins,
                details: storeCoins
            }
        });
    }
    catch (error) {
        console.error('❌ [STORE PROMO COIN] Error fetching store coins:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch store promo coins',
            error: error.message
        });
    }
};
exports.getStorePromoCoins = getStorePromoCoins;
/**
 * @route   GET /api/store-promo-coins/transactions
 * @desc    Get transaction history for all store promo coins
 * @access  Private
 */
const getStorePromoCoinTransactions = async (req, res) => {
    try {
        const userId = req.userId;
        const { storeId, type, limit = 50, offset = 0 } = req.query;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
            return;
        }
        console.log(`📜 [STORE PROMO COIN] Fetching transactions for user ${userId}`);
        const query = { user: new mongoose_1.Types.ObjectId(userId) };
        if (storeId && mongoose_1.Types.ObjectId.isValid(storeId)) {
            query.store = new mongoose_1.Types.ObjectId(storeId);
        }
        const storeCoins = await StorePromoCoin_1.StorePromoCoin.find(query)
            .populate('store', 'name logo')
            .sort({ 'transactions.date': -1 });
        // Flatten all transactions from all stores
        let allTransactions = [];
        storeCoins.forEach(storeCoin => {
            const storeInfo = {
                storeId: storeCoin.store._id,
                storeName: storeCoin.store.name,
                storeLogo: storeCoin.store.logo
            };
            storeCoin.transactions.forEach(txn => {
                if (!type || txn.type === type) {
                    allTransactions.push({
                        type: txn.type,
                        amount: txn.amount,
                        orderId: txn.orderId,
                        description: txn.description,
                        date: txn.date,
                        store: storeInfo
                    });
                }
            });
        });
        // Sort by date descending
        allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        // Apply pagination
        const paginatedTransactions = allTransactions.slice(Number(offset), Number(offset) + Number(limit));
        res.status(200).json({
            success: true,
            message: 'Transactions retrieved successfully',
            data: {
                transactions: paginatedTransactions,
                pagination: {
                    total: allTransactions.length,
                    limit: Number(limit),
                    offset: Number(offset),
                    hasMore: allTransactions.length > Number(offset) + Number(limit)
                }
            }
        });
    }
    catch (error) {
        console.error('❌ [STORE PROMO COIN] Error fetching transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transactions',
            error: error.message
        });
    }
};
exports.getStorePromoCoinTransactions = getStorePromoCoinTransactions;
/**
 * @route   POST /api/store-promo-coins/use
 * @desc    Use promo coins (internal use, called during checkout)
 * @access  Private
 */
const useStorePromoCoins = async (req, res) => {
    try {
        const userId = req.userId;
        const { storeId, amount, orderId } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
            return;
        }
        if (!storeId || !amount || !orderId) {
            res.status(400).json({
                success: false,
                message: 'Store ID, amount, and order ID are required'
            });
            return;
        }
        if (!mongoose_1.Types.ObjectId.isValid(storeId) || !mongoose_1.Types.ObjectId.isValid(orderId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid store ID or order ID'
            });
            return;
        }
        console.log(`💸 [STORE PROMO COIN] Using ${amount} coins at store ${storeId} for order ${orderId}`);
        const updatedStoreCoins = await StorePromoCoin_1.StorePromoCoin.useCoins(new mongoose_1.Types.ObjectId(userId), new mongoose_1.Types.ObjectId(storeId), amount, new mongoose_1.Types.ObjectId(orderId));
        res.status(200).json({
            success: true,
            message: `Successfully used ${amount} promo coins`,
            data: {
                remainingCoins: updatedStoreCoins.amount,
                storeId,
                amountUsed: amount
            }
        });
    }
    catch (error) {
        console.error('❌ [STORE PROMO COIN] Error using coins:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to use promo coins',
            error: error.message
        });
    }
};
exports.useStorePromoCoins = useStorePromoCoins;
