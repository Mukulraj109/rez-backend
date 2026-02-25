// Cashback Service
// Business logic for user cashback management

import { Types } from 'mongoose';
import { UserCashback, IUserCashback } from '../models/UserCashback';
import { Order } from '../models/Order';
import { User } from '../models/User';
import subscriptionBenefitsService from './subscriptionBenefitsService';
import DoubleCashbackCampaign from '../models/DoubleCashbackCampaign';
import { pct } from '../utils/currency';

interface CreateCashbackData {
  userId: Types.ObjectId;
  orderId?: Types.ObjectId;
  amount: number;
  cashbackRate: number;
  source: 'order' | 'referral' | 'promotion' | 'special_offer' | 'bonus' | 'signup';
  description: string;
  metadata: {
    orderAmount: number;
    productCategories: string[];
    storeId?: Types.ObjectId;
    storeName?: string;
    campaignId?: Types.ObjectId;
    campaignName?: string;
    bonusMultiplier?: number;
  };
  pendingDays?: number;
  expiryDays?: number;
}

interface CashbackFilters {
  status?: string;
  source?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

class CashbackService {
  /**
   * Calculate cashback for order
   */
  async calculateOrderCashback(
    orderAmount: number,
    productCategories: string[],
    userId?: Types.ObjectId,
    storeId?: Types.ObjectId
  ): Promise<{ amount: number; rate: number; description: string; multiplier: number }> {
    // Base cashback rate
    let cashbackRate = 5; // 5% base rate (ReZ coin reward)

    // Category-specific bonuses
    const electronicCategories = ['electronics', 'mobile', 'laptop', 'camera'];
    const fashionCategories = ['clothing', 'fashion', 'shoes', 'accessories'];

    const hasElectronics = productCategories.some(cat =>
      electronicCategories.some(ec => cat.toLowerCase().includes(ec))
    );
    const hasFashion = productCategories.some(cat =>
      fashionCategories.some(fc => cat.toLowerCase().includes(fc))
    );

    if (hasElectronics) {
      cashbackRate = 3; // 3% for electronics
    } else if (hasFashion) {
      cashbackRate = 2.5; // 2.5% for fashion
    }

    // Order amount bonuses
    if (orderAmount >= 5000) {
      cashbackRate += 1; // Extra 1% for orders above ₹5000
    }
    if (orderAmount >= 10000) {
      cashbackRate += 0.5; // Extra 0.5% for orders above ₹10000
    }

    // Apply subscription tier multiplier
    let tierMultiplier = 1;
    if (userId) {
      tierMultiplier = await subscriptionBenefitsService.getCashbackMultiplier(userId);
    }

    // Calculate final rate and amount
    const finalRate = cashbackRate * tierMultiplier;
    const cashbackAmount = pct(orderAmount, finalRate);

    const description = tierMultiplier > 1
      ? `${finalRate}% cashback (${cashbackRate}% × ${tierMultiplier}x tier bonus) on order of ₹${orderAmount}`
      : `${cashbackRate}% cashback on order of ₹${orderAmount}`;

    return {
      amount: cashbackAmount,
      rate: finalRate,
      description,
      multiplier: tierMultiplier
    };
  }

  /**
   * Create cashback entry
   */
  async createCashback(data: CreateCashbackData): Promise<IUserCashback> {
    try {
      const earnedDate = new Date();
      const expiryDate = new Date(earnedDate);
      expiryDate.setDate(expiryDate.getDate() + (data.expiryDays || 90));

      const cashback = await UserCashback.create({
        user: data.userId,
        order: data.orderId,
        amount: data.amount,
        cashbackRate: data.cashbackRate,
        source: data.source,
        description: data.description,
        earnedDate,
        expiryDate,
        metadata: data.metadata,
        pendingDays: data.pendingDays || 7,
        status: 'pending',
      });

      console.log(`✅ [CASHBACK SERVICE] Created cashback: ₹${data.amount} for user ${data.userId}`);

      return cashback;
    } catch (error) {
      console.error('❌ [CASHBACK SERVICE] Error creating cashback:', error);
      throw error;
    }
  }

  /**
   * Create cashback from order
   *
   * Race-condition safe:
   * - Uses the unique index on { order, user } as the duplicate guard instead of a racy findOne check.
   * - Wallet balance update uses atomic $inc (via addFunds).
   * - Coins array update uses atomic positional $inc instead of read-modify-write.
   */
  async createCashbackFromOrder(orderId: Types.ObjectId): Promise<IUserCashback | null> {
    try {
      const order = await Order.findById(orderId).populate('items.product');

      if (!order) {
        console.log(`⚠️ [CASHBACK SERVICE] Order not found: ${orderId}`);
        return null;
      }

      // Only create cashback for delivered orders
      if (order.status !== 'delivered') {
        console.log(`⚠️ [CASHBACK SERVICE] Order not delivered yet: ${orderId}`);
        return null;
      }

      // Get product categories
      const productCategories = order.items
        .map((item: any) => item.product?.category)
        .filter(Boolean);

      // Get store from first item
      const storeId = order.items.length > 0 ? order.items[0].store : undefined;

      // Calculate cashback with tier multiplier
      const { amount, rate, description, multiplier } = await this.calculateOrderCashback(
        order.totals.total,
        productCategories,
        order.user as Types.ObjectId,
        storeId
      );

      // Track cashback earned in subscription
      if (multiplier > 1) {
        await subscriptionBenefitsService.trackCashbackEarned(
          order.user as Types.ObjectId,
          amount
        );
      }

      // Create cashback entry — relies on unique index { order, user } to prevent duplicates.
      // If a duplicate key error (11000) occurs, another request already created the cashback.
      let cashback: IUserCashback;
      try {
        cashback = await this.createCashback({
          userId: order.user as Types.ObjectId,
          orderId: order._id as Types.ObjectId,
          amount,
          cashbackRate: rate,
          source: 'order',
          description,
          metadata: {
            orderAmount: order.totals.total,
            productCategories,
            storeId,
          },
        });
      } catch (createError: any) {
        // MongoDB duplicate key error — cashback already exists for this order+user
        if (createError?.code === 11000 || createError?.message?.includes('E11000')) {
          console.log(`⚠️ [CASHBACK SERVICE] Cashback already exists for order: ${orderId} (caught duplicate key)`);
          const existing = await UserCashback.findOne({ order: orderId, user: order.user });
          return existing;
        }
        throw createError;
      }

      // Credit cashback to wallet as ReZ coins immediately
      if (amount > 0) {
        try {
          const { Wallet } = await import('../models/Wallet');
          const wallet = await Wallet.findOne({ user: order.user });

          if (wallet) {
            // Atomic balance update via $inc (addFunds is already atomic)
            await wallet.addFunds(amount, 'cashback');

            // Atomic coins array update — use positional $inc instead of read-modify-write
            await Wallet.findOneAndUpdate(
              { user: order.user, 'coins.type': 'rez' },
              {
                $inc: { 'coins.$.amount': amount },
                $set: { 'coins.$.lastEarned': new Date() },
              }
            );

            // Create CoinTransaction record for auto-sync consistency
            try {
              const { CoinTransaction } = await import('../models/CoinTransaction');
              await CoinTransaction.createTransaction(
                order.user.toString(),
                'earned',
                amount,
                'cashback',
                `${rate}% cashback on order #${order.orderNumber}`,
                { orderId: order._id, orderAmount: order.totals.total }
              );
            } catch (coinTxError) {
              console.error('⚠️ [CASHBACK SERVICE] CoinTransaction creation failed (non-blocking):', coinTxError);
            }

            // Atomic status transition — use findOneAndUpdate to avoid stale-document overwrites
            await UserCashback.findByIdAndUpdate(cashback._id, {
              $set: { status: 'credited', creditedDate: new Date() },
            });
            cashback.status = 'credited';

            console.log(`✅ [CASHBACK SERVICE] Credited ₹${amount} ReZ coins to wallet for user ${order.user}`);
          } else {
            console.warn(`⚠️ [CASHBACK SERVICE] Wallet not found for user ${order.user}, cashback record created but not credited`);
          }
        } catch (walletError) {
          console.error('❌ [CASHBACK SERVICE] Error crediting cashback to wallet (non-blocking):', walletError);
          // Cashback record still exists, can be manually credited later
        }
      }

      return cashback;
    } catch (error) {
      console.error('❌ [CASHBACK SERVICE] Error creating cashback from order:', error);
      throw error;
    }
  }

  /**
   * Get user's cashback summary
   */
  async getUserSummary(userId: Types.ObjectId): Promise<any> {
    try {
      return await (UserCashback as any).getUserSummary(userId);
    } catch (error) {
      console.error('❌ [CASHBACK SERVICE] Error getting user summary:', error);
      throw error;
    }
  }

  /**
   * Get user's cashback history
   */
  async getUserCashbackHistory(
    userId: Types.ObjectId,
    filters?: CashbackFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{ cashbacks: IUserCashback[]; total: number; pages: number }> {
    try {
      const query: any = { user: userId };

      if (filters?.status) {
        query.status = filters.status;
      }

      if (filters?.source) {
        query.source = filters.source;
      }

      if (filters?.dateFrom || filters?.dateTo) {
        query.earnedDate = {};
        if (filters.dateFrom) {
          query.earnedDate.$gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          query.earnedDate.$lte = filters.dateTo;
        }
      }

      const skip = (page - 1) * limit;

      const [cashbacks, total] = await Promise.all([
        UserCashback.find(query)
          .sort({ earnedDate: -1 })
          .skip(skip)
          .limit(limit)
          .populate('order', 'orderNumber totalAmount status')
          .lean(),
        UserCashback.countDocuments(query),
      ]);

      const pages = Math.ceil(total / limit);

      console.log(`✅ [CASHBACK SERVICE] Retrieved ${cashbacks.length} cashback entries`);

      return { cashbacks, total, pages };
    } catch (error) {
      console.error('❌ [CASHBACK SERVICE] Error getting cashback history:', error);
      throw error;
    }
  }

  /**
   * Get pending cashback ready for credit
   */
  async getPendingReadyForCredit(userId: Types.ObjectId): Promise<IUserCashback[]> {
    try {
      return await (UserCashback as any).getPendingReadyForCredit(userId);
    } catch (error) {
      console.error('❌ [CASHBACK SERVICE] Error getting pending cashback:', error);
      throw error;
    }
  }

  /**
   * Get expiring soon cashback
   */
  async getExpiringSoon(
    userId: Types.ObjectId,
    days: number = 7
  ): Promise<IUserCashback[]> {
    try {
      return await (UserCashback as any).getExpiringSoon(userId, days);
    } catch (error) {
      console.error('❌ [CASHBACK SERVICE] Error getting expiring cashback:', error);
      throw error;
    }
  }

  /**
   * Credit cashback to wallet
   */
  async creditCashbackToWallet(cashbackId: Types.ObjectId): Promise<IUserCashback> {
    try {
      const cashback = await UserCashback.findById(cashbackId);

      if (!cashback) {
        throw new Error('Cashback not found');
      }

      // Credit to wallet (would integrate with wallet service)
      await (cashback as any).creditToWallet();

      // Here we would create a wallet transaction
      // For now, just logging
      console.log(`💰 [CASHBACK SERVICE] Credited ₹${cashback.amount} to wallet for user ${cashback.user}`);

      return cashback;
    } catch (error) {
      console.error('❌ [CASHBACK SERVICE] Error crediting cashback:', error);
      throw error;
    }
  }

  /**
   * Redeem multiple pending cashback
   */
  async redeemPendingCashback(userId: Types.ObjectId): Promise<{
    totalAmount: number;
    count: number;
    cashbacks: IUserCashback[];
  }> {
    try {
      const readyCashbacks = await this.getPendingReadyForCredit(userId);

      if (readyCashbacks.length === 0) {
        return { totalAmount: 0, count: 0, cashbacks: [] };
      }

      let totalAmount = 0;
      const creditedCashbacks: IUserCashback[] = [];

      for (const cashback of readyCashbacks) {
        try {
          const credited = await this.creditCashbackToWallet(cashback._id as Types.ObjectId);
          totalAmount += credited.amount;
          creditedCashbacks.push(credited);
        } catch (error) {
          console.error(`Failed to credit cashback ${cashback._id}:`, error);
        }
      }

      console.log(`✅ [CASHBACK SERVICE] Redeemed ${creditedCashbacks.length} cashback entries, total: ₹${totalAmount}`);

      return {
        totalAmount,
        count: creditedCashbacks.length,
        cashbacks: creditedCashbacks,
      };
    } catch (error) {
      console.error('❌ [CASHBACK SERVICE] Error redeeming cashback:', error);
      throw error;
    }
  }

  /**
   * Forecast cashback for cart
   */
  async forecastCashbackForCart(
    cartData: {
      items: Array<{
        product: any;
        quantity: number;
        price: number;
      }>;
      subtotal: number;
    },
    userId?: Types.ObjectId
  ): Promise<{
    estimatedCashback: number;
    cashbackRate: number;
    description: string;
    multiplier: number;
  }> {
    try {
      const categories = cartData.items
        .map(item => item.product?.category)
        .filter(Boolean);

      const { amount, rate, description, multiplier } = await this.calculateOrderCashback(
        cartData.subtotal,
        categories,
        userId
      );

      return {
        estimatedCashback: amount,
        cashbackRate: rate,
        description,
        multiplier
      };
    } catch (error) {
      console.error('❌ [CASHBACK SERVICE] Error forecasting cashback:', error);
      throw error;
    }
  }

  /**
   * Mark expired cashback (scheduled task)
   */
  async markExpiredCashback(): Promise<number> {
    try {
      return await (UserCashback as any).markExpiredCashback();
    } catch (error) {
      console.error('❌ [CASHBACK SERVICE] Error marking expired cashback:', error);
      throw error;
    }
  }

  /**
   * Get active cashback campaigns from DoubleCashbackCampaign model
   */
  async getActiveCampaigns(): Promise<any[]> {
    try {
      const now = new Date();
      const campaigns = await DoubleCashbackCampaign.find({
        isActive: true,
        startTime: { $lte: now },
        endTime: { $gte: now },
      })
        .sort({ priority: -1, createdAt: -1 })
        .lean();

      // Map to frontend expected shape
      return campaigns.map((c) => ({
        id: c._id.toString(),
        name: c.title,
        description: c.subtitle || c.description || '',
        cashbackRate: c.multiplier,
        validFrom: c.startTime,
        validTo: c.endTime,
        categories: c.eligibleCategories || [],
        isActive: true,
      }));
    } catch (error) {
      console.error('❌ [CASHBACK SERVICE] Error fetching campaigns:', error);
      return [];
    }
  }

  /**
   * Get cashback statistics for period
   */
  async getCashbackStatistics(
    userId: Types.ObjectId,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<any> {
    try {
      const now = new Date();
      let startDate = new Date();

      switch (period) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      const stats = await (UserCashback as any).getTotalForPeriod(userId, startDate, now);

      return {
        period,
        startDate,
        endDate: now,
        totalAmount: stats.totalAmount,
        totalCount: stats.count,
        averagePerTransaction: stats.count > 0 ? stats.totalAmount / stats.count : 0,
      };
    } catch (error) {
      console.error('❌ [CASHBACK SERVICE] Error getting statistics:', error);
      throw error;
    }
  }
}

export default new CashbackService();
