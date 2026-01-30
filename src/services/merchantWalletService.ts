import { Types } from 'mongoose';
import { MerchantWallet, IMerchantWallet, IMerchantWalletTransaction } from '../models/MerchantWallet';
import { Store } from '../models/Store';
import merchantNotificationService from './merchantNotificationService';

interface WalletSummary {
  balance: {
    total: number;
    available: number;
    pending: number;
    withdrawn: number;
    held: number;
  };
  statistics: {
    totalSales: number;
    totalPlatformFees: number;
    netSales: number;
    totalOrders: number;
    averageOrderValue: number;
    totalRefunds: number;
    totalWithdrawals: number;
  };
  settlementCycle: string;
  bankDetailsConfigured: boolean;
  recentTransactions: IMerchantWalletTransaction[];
  lastSettlementAt?: Date;
}

interface TransactionHistoryResult {
  transactions: IMerchantWalletTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class MerchantWalletService {
  /**
   * Get or create wallet for a merchant
   */
  async getOrCreateWallet(merchantId: string | Types.ObjectId, storeId?: string | Types.ObjectId): Promise<IMerchantWallet> {
    const merchantObjectId = typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;

    // Try to find existing wallet
    const existingWallet = await MerchantWallet.findOne({ merchant: merchantObjectId });

    if (existingWallet) {
      return existingWallet;
    }

    // If no storeId provided, try to find the merchant's store
    let storeObjectId: Types.ObjectId;

    if (storeId) {
      storeObjectId = typeof storeId === 'string' ? new Types.ObjectId(storeId) : storeId;
    } else {
      const store = await Store.findOne({ merchantId: merchantObjectId });
      if (!store) {
        throw new Error('No store found for this merchant');
      }
      storeObjectId = store._id as Types.ObjectId;
    }

    return MerchantWallet.getOrCreateForMerchant(merchantObjectId, storeObjectId);
  }

  /**
   * Credit order payment to merchant wallet
   * Called after successful payment
   */
  async creditOrderPayment(
    merchantId: string | Types.ObjectId,
    orderId: string | Types.ObjectId,
    orderNumber: string,
    grossAmount: number,
    platformFee: number,
    storeId?: string | Types.ObjectId
  ): Promise<{ balance: { total: number; available: number; pending: number } } | null> {
    try {
      const wallet = await this.getOrCreateWallet(merchantId, storeId);

      const orderObjectId = typeof orderId === 'string' ? new Types.ObjectId(orderId) : orderId;

      await wallet.creditOrder(orderObjectId, orderNumber, grossAmount, platformFee);

      console.log(`✅ [MERCHANT WALLET SERVICE] Credited ₹${grossAmount - platformFee} to merchant ${merchantId}`);

      // Return updated balance for real-time notifications
      return {
        balance: {
          total: wallet.balance.total,
          available: wallet.balance.available,
          pending: wallet.balance.pending
        }
      };
    } catch (error) {
      console.error(`❌ [MERCHANT WALLET SERVICE] Failed to credit wallet:`, error);
      throw error;
    }
  }

  /**
   * Get wallet summary for a merchant
   */
  async getWalletSummary(merchantId: string | Types.ObjectId): Promise<WalletSummary | null> {
    const merchantObjectId = typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;

    const summary = await MerchantWallet.getWalletSummary(merchantObjectId);

    return summary;
  }

  /**
   * Get transaction history with pagination
   */
  async getTransactionHistory(
    merchantId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 20,
    type?: 'credit' | 'debit' | 'withdrawal' | 'refund' | 'adjustment'
  ): Promise<TransactionHistoryResult> {
    const merchantObjectId = typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;

    const wallet = await MerchantWallet.findOne({ merchant: merchantObjectId });

    if (!wallet) {
      return {
        transactions: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    }

    // Filter transactions by type if specified
    let transactions = wallet.transactions;
    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }

    // Sort by date descending
    transactions = transactions.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = transactions.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const paginatedTransactions = transactions.slice(skip, skip + limit);

    return {
      transactions: paginatedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Request withdrawal from wallet
   */
  async requestWithdrawal(
    merchantId: string | Types.ObjectId,
    amount: number
  ): Promise<IMerchantWalletTransaction> {
    const wallet = await this.getOrCreateWallet(merchantId);

    const transaction = await wallet.requestWithdrawal(amount);

    console.log(`💸 [MERCHANT WALLET SERVICE] Withdrawal requested: ₹${amount} for merchant ${merchantId}`);

    return transaction;
  }

  /**
   * Process withdrawal (admin action)
   */
  async processWithdrawal(
    merchantId: string | Types.ObjectId,
    transactionId: string,
    transactionReference: string
  ): Promise<void> {
    const merchantObjectId = typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;

    const wallet = await MerchantWallet.findOne({ merchant: merchantObjectId });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Find the pending withdrawal transaction
    const transaction = wallet.transactions.find(
      t => t._id?.toString() === transactionId && t.type === 'withdrawal' && t.status === 'pending'
    );

    if (!transaction) {
      throw new Error('Withdrawal transaction not found or already processed');
    }

    // Update transaction status
    transaction.status = 'completed';
    if (transaction.withdrawalDetails) {
      transaction.withdrawalDetails.transactionId = transactionReference;
      transaction.withdrawalDetails.processedAt = new Date();
    }

    // Update balances
    wallet.balance.pending -= transaction.amount;
    wallet.balance.withdrawn += transaction.amount;
    wallet.statistics.totalWithdrawals += transaction.amount;

    await wallet.save();

    console.log(`✅ [MERCHANT WALLET SERVICE] Processed withdrawal: ₹${transaction.amount}`);

    // Send notification to merchant about successful withdrawal
    try {
      await merchantNotificationService.notifyWithdrawalStatus({
        merchantId: merchantObjectId.toString(),
        withdrawalId: transactionId,
        amount: transaction.amount,
        status: 'completed',
      });
      console.log('📬 [MERCHANT WALLET SERVICE] Sent withdrawal completion notification');
    } catch (notifyError) {
      console.warn('Failed to send withdrawal notification:', notifyError);
    }
  }

  /**
   * Reject withdrawal (admin action)
   */
  async rejectWithdrawal(
    merchantId: string | Types.ObjectId,
    transactionId: string,
    reason: string
  ): Promise<void> {
    const merchantObjectId = typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;

    const wallet = await MerchantWallet.findOne({ merchant: merchantObjectId });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Find the pending withdrawal transaction
    const transaction = wallet.transactions.find(
      t => t._id?.toString() === transactionId && t.type === 'withdrawal' && t.status === 'pending'
    );

    if (!transaction) {
      throw new Error('Withdrawal transaction not found or already processed');
    }

    // Update transaction status
    transaction.status = 'failed';
    transaction.description = `${transaction.description} - Rejected: ${reason}`;

    // Return the pending amount to available balance
    wallet.balance.pending -= transaction.amount;
    wallet.balance.available += transaction.amount;

    await wallet.save();

    console.log(`❌ [MERCHANT WALLET SERVICE] Rejected withdrawal: ₹${transaction.amount} - ${reason}`);

    // Send notification to merchant about rejected withdrawal
    try {
      await merchantNotificationService.notifyWithdrawalStatus({
        merchantId: merchantObjectId.toString(),
        withdrawalId: transactionId,
        amount: transaction.amount,
        status: 'rejected',
        reason,
      });
      console.log('📬 [MERCHANT WALLET SERVICE] Sent withdrawal rejection notification');
    } catch (notifyError) {
      console.warn('Failed to send withdrawal rejection notification:', notifyError);
    }
  }

  /**
   * Update bank details for a merchant
   */
  async updateBankDetails(
    merchantId: string | Types.ObjectId,
    bankDetails: {
      accountNumber: string;
      ifscCode: string;
      accountHolderName: string;
      bankName: string;
      branchName?: string;
      upiId?: string;
    }
  ): Promise<void> {
    const wallet = await this.getOrCreateWallet(merchantId);

    wallet.bankDetails = {
      ...bankDetails,
      isVerified: false  // Bank details need verification
    };

    await wallet.save();

    console.log(`📝 [MERCHANT WALLET SERVICE] Updated bank details for merchant ${merchantId}`);
  }

  /**
   * Verify bank details (admin action)
   */
  async verifyBankDetails(merchantId: string | Types.ObjectId): Promise<void> {
    const merchantObjectId = typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;

    const wallet = await MerchantWallet.findOne({ merchant: merchantObjectId });

    if (!wallet || !wallet.bankDetails) {
      throw new Error('Wallet or bank details not found');
    }

    wallet.bankDetails.isVerified = true;
    wallet.bankDetails.verifiedAt = new Date();

    await wallet.save();

    console.log(`✅ [MERCHANT WALLET SERVICE] Bank details verified for merchant ${merchantId}`);
  }

  /**
   * Debit merchant wallet when awarding branded coins to a customer
   */
  async debitForCoinAward(
    merchantId: string | Types.ObjectId,
    storeId: string | Types.ObjectId,
    amount: number,
    userId: string,
    reason: string
  ): Promise<{ newBalance: { total: number; available: number } }> {
    const wallet = await this.getOrCreateWallet(merchantId, storeId);

    if (wallet.balance.available < amount) {
      throw new Error(
        `Insufficient wallet balance. Available: ${wallet.balance.available}, Requested: ${amount}`
      );
    }

    // Create debit transaction
    const transaction: IMerchantWalletTransaction = {
      type: 'debit',
      amount,
      netAmount: amount,
      description: reason,
      status: 'completed',
      createdAt: new Date()
    };

    // Deduct from balance
    wallet.balance.available -= amount;
    wallet.balance.total -= amount;

    // Add transaction
    wallet.transactions.push(transaction);

    await wallet.save();

    console.log(`💸 [MERCHANT WALLET SERVICE] Debited ${amount} coins from merchant ${merchantId} for coin award to user ${userId}`);

    return {
      newBalance: {
        total: wallet.balance.total,
        available: wallet.balance.available
      }
    };
  }

  /**
   * Handle refund - deduct from merchant wallet
   */
  async handleRefund(
    merchantId: string | Types.ObjectId,
    orderId: string | Types.ObjectId,
    orderNumber: string,
    refundAmount: number,
    platformFeeRefund: number
  ): Promise<void> {
    const merchantObjectId = typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;
    const orderObjectId = typeof orderId === 'string' ? new Types.ObjectId(orderId) : orderId;

    const wallet = await MerchantWallet.findOne({ merchant: merchantObjectId });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const netRefund = refundAmount - platformFeeRefund;

    // Create refund transaction
    const transaction: IMerchantWalletTransaction = {
      type: 'refund',
      amount: refundAmount,
      platformFee: platformFeeRefund,
      netAmount: netRefund,
      orderId: orderObjectId,
      orderNumber: orderNumber,
      description: `Refund for order ${orderNumber}`,
      status: 'completed',
      createdAt: new Date()
    };

    // Update balances
    wallet.balance.available -= netRefund;
    wallet.statistics.totalRefunds += refundAmount;

    // Add transaction
    wallet.transactions.push(transaction);

    await wallet.save();

    console.log(`🔄 [MERCHANT WALLET SERVICE] Processed refund: ₹${netRefund} for order ${orderNumber}`);
  }

  /**
   * Get all merchant wallets (admin)
   */
  async getAllWallets(
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'statistics.totalSales',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{
    wallets: IMerchantWallet[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    const [wallets, total] = await Promise.all([
      MerchantWallet.find({ isActive: true })
        .populate('merchant', 'name email phone')
        .populate('store', 'name logo')
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit),
      MerchantWallet.countDocuments({ isActive: true })
    ]);

    return {
      wallets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get platform-wide wallet statistics (admin)
   */
  async getPlatformStats(): Promise<{
    totalMerchants: number;
    totalSales: number;
    totalPlatformFees: number;
    totalNetSales: number;
    totalPendingWithdrawals: number;
    totalWithdrawn: number;
  }> {
    const stats = await MerchantWallet.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalMerchants: { $sum: 1 },
          totalSales: { $sum: '$statistics.totalSales' },
          totalPlatformFees: { $sum: '$statistics.totalPlatformFees' },
          totalNetSales: { $sum: '$statistics.netSales' },
          totalPendingWithdrawals: { $sum: '$balance.pending' },
          totalWithdrawn: { $sum: '$balance.withdrawn' }
        }
      }
    ]);

    return stats[0] || {
      totalMerchants: 0,
      totalSales: 0,
      totalPlatformFees: 0,
      totalNetSales: 0,
      totalPendingWithdrawals: 0,
      totalWithdrawn: 0
    };
  }
}

// Export singleton instance
export const merchantWalletService = new MerchantWalletService();
export default merchantWalletService;
