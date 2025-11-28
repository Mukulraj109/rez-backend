// Store Promo Coin Controller
// Handles store-specific promotional coins API endpoints

import { Request, Response } from 'express';
import { StorePromoCoin } from '../models/StorePromoCoin';
import { Types } from 'mongoose';

/**
 * @route   GET /api/store-promo-coins
 * @desc    Get all store promo coins for the authenticated user
 * @access  Private
 */
export const getUserStorePromoCoins = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }
    
    console.log(`📊 [STORE PROMO COIN] Fetching coins for user ${userId}`);
    
    const storeCoins = await StorePromoCoin.getUserStoreCoins(new Types.ObjectId(userId));
    
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
  } catch (error: any) {
    console.error('❌ [STORE PROMO COIN] Error fetching user store coins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch store promo coins',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/store-promo-coins/store/:storeId
 * @desc    Get promo coins for a specific store
 * @access  Private
 */
export const getStorePromoCoins = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { storeId } = req.params;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }
    
    if (!Types.ObjectId.isValid(storeId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid store ID'
      });
      return;
    }
    
    console.log(`📊 [STORE PROMO COIN] Fetching coins for user ${userId} at store ${storeId}`);
    
    const availableCoins = await StorePromoCoin.getAvailableCoins(
      new Types.ObjectId(userId),
      new Types.ObjectId(storeId)
    );
    
    const storeCoins = await StorePromoCoin.findOne({
      user: new Types.ObjectId(userId),
      store: new Types.ObjectId(storeId)
    }).populate('store', 'name logo');
    
    res.status(200).json({
      success: true,
      message: 'Store promo coins retrieved successfully',
      data: {
        availableCoins,
        details: storeCoins
      }
    });
  } catch (error: any) {
    console.error('❌ [STORE PROMO COIN] Error fetching store coins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch store promo coins',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/store-promo-coins/transactions
 * @desc    Get transaction history for all store promo coins
 * @access  Private
 */
export const getStorePromoCoinTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { storeId, type, limit = 50, offset = 0 } = req.query;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }
    
    console.log(`📜 [STORE PROMO COIN] Fetching transactions for user ${userId}`);
    
    const query: any = { user: new Types.ObjectId(userId) };
    
    if (storeId && Types.ObjectId.isValid(storeId as string)) {
      query.store = new Types.ObjectId(storeId as string);
    }
    
    const storeCoins = await StorePromoCoin.find(query)
      .populate('store', 'name logo')
      .sort({ 'transactions.date': -1 });
    
    // Flatten all transactions from all stores
    let allTransactions: any[] = [];
    
    storeCoins.forEach(storeCoin => {
      const storeInfo = {
        storeId: storeCoin.store._id,
        storeName: (storeCoin.store as any).name,
        storeLogo: (storeCoin.store as any).logo
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
    const paginatedTransactions = allTransactions.slice(
      Number(offset),
      Number(offset) + Number(limit)
    );
    
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
  } catch (error: any) {
    console.error('❌ [STORE PROMO COIN] Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/store-promo-coins/use
 * @desc    Use promo coins (internal use, called during checkout)
 * @access  Private
 */
export const useStorePromoCoins = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
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
    
    if (!Types.ObjectId.isValid(storeId) || !Types.ObjectId.isValid(orderId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid store ID or order ID'
      });
      return;
    }
    
    console.log(`💸 [STORE PROMO COIN] Using ${amount} coins at store ${storeId} for order ${orderId}`);
    
    const updatedStoreCoins = await StorePromoCoin.useCoins(
      new Types.ObjectId(userId),
      new Types.ObjectId(storeId),
      amount,
      new Types.ObjectId(orderId)
    );
    
    res.status(200).json({
      success: true,
      message: `Successfully used ${amount} promo coins`,
      data: {
        remainingCoins: updatedStoreCoins.amount,
        storeId,
        amountUsed: amount
      }
    });
  } catch (error: any) {
    console.error('❌ [STORE PROMO COIN] Error using coins:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to use promo coins',
      error: error.message
    });
  }
};

