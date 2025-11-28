/**
 * Price History Model
 *
 * Tracks historical price changes for products and variants.
 * Used for price tracking, analytics, and price drop alerts.
 *
 * Features:
 * - Automatic price change detection
 * - Variant-specific price tracking
 * - Price trend analysis
 * - Historical price queries
 * - Price drop detection
 */
import mongoose, { Document, Model } from 'mongoose';
interface IPriceInfo {
    basePrice: number;
    salePrice: number;
    discount?: number;
    discountPercentage?: number;
    currency?: string;
}
interface IPriceHistory extends Document {
    productId: mongoose.Types.ObjectId;
    variantId?: string;
    price: IPriceInfo;
    previousPrice?: {
        basePrice?: number;
        salePrice?: number;
        discount?: number;
    };
    changeType: 'increase' | 'decrease' | 'no_change' | 'initial';
    changeAmount: number;
    changePercentage: number;
    source: 'manual' | 'system' | 'import' | 'api';
    recordedAt: Date;
}
interface IPriceHistoryModel extends Model<IPriceHistory> {
    getProductHistory(productId: string, variantId?: string | null, options?: any): Promise<any[]>;
    getLatestPrice(productId: string, variantId?: string | null): Promise<any>;
    getLowestPrice(productId: string, variantId?: string | null, days?: number): Promise<any>;
    getHighestPrice(productId: string, variantId?: string | null, days?: number): Promise<any>;
    getAveragePrice(productId: string, variantId?: string | null, days?: number): Promise<any>;
    recordPriceChange(data: any): Promise<IPriceHistory>;
    getPriceTrend(productId: string, variantId?: string | null, days?: number): Promise<any>;
    cleanupOldHistory(daysToKeep?: number): Promise<number>;
}
declare const PriceHistory: IPriceHistoryModel;
export default PriceHistory;
