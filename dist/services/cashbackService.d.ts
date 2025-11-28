import { Types } from 'mongoose';
import { IUserCashback } from '../models/UserCashback';
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
declare class CashbackService {
    /**
     * Calculate cashback for order
     */
    calculateOrderCashback(orderAmount: number, productCategories: string[], userId?: Types.ObjectId, storeId?: Types.ObjectId): Promise<{
        amount: number;
        rate: number;
        description: string;
        multiplier: number;
    }>;
    /**
     * Create cashback entry
     */
    createCashback(data: CreateCashbackData): Promise<IUserCashback>;
    /**
     * Create cashback from order
     */
    createCashbackFromOrder(orderId: Types.ObjectId): Promise<IUserCashback | null>;
    /**
     * Get user's cashback summary
     */
    getUserSummary(userId: Types.ObjectId): Promise<any>;
    /**
     * Get user's cashback history
     */
    getUserCashbackHistory(userId: Types.ObjectId, filters?: CashbackFilters, page?: number, limit?: number): Promise<{
        cashbacks: IUserCashback[];
        total: number;
        pages: number;
    }>;
    /**
     * Get pending cashback ready for credit
     */
    getPendingReadyForCredit(userId: Types.ObjectId): Promise<IUserCashback[]>;
    /**
     * Get expiring soon cashback
     */
    getExpiringSoon(userId: Types.ObjectId, days?: number): Promise<IUserCashback[]>;
    /**
     * Credit cashback to wallet
     */
    creditCashbackToWallet(cashbackId: Types.ObjectId): Promise<IUserCashback>;
    /**
     * Redeem multiple pending cashback
     */
    redeemPendingCashback(userId: Types.ObjectId): Promise<{
        totalAmount: number;
        count: number;
        cashbacks: IUserCashback[];
    }>;
    /**
     * Forecast cashback for cart
     */
    forecastCashbackForCart(cartData: {
        items: Array<{
            product: any;
            quantity: number;
            price: number;
        }>;
        subtotal: number;
    }, userId?: Types.ObjectId): Promise<{
        estimatedCashback: number;
        cashbackRate: number;
        description: string;
        multiplier: number;
    }>;
    /**
     * Mark expired cashback (scheduled task)
     */
    markExpiredCashback(): Promise<number>;
    /**
     * Get cashback campaigns (placeholder for future campaigns)
     */
    getActiveCampaigns(): Promise<any[]>;
    /**
     * Get cashback statistics for period
     */
    getCashbackStatistics(userId: Types.ObjectId, period?: 'day' | 'week' | 'month' | 'year'): Promise<any>;
}
declare const _default: CashbackService;
export default _default;
