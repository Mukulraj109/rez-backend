/**
 * Price Alert Model
 *
 * Manages user price alert subscriptions.
 * Users get notified when product prices drop below their target price.
 *
 * Features:
 * - Target price alerts
 * - Percentage drop alerts
 * - Multiple notification methods
 * - Automatic triggering on price changes
 * - Alert expiration
 */
import mongoose, { Document, Model } from 'mongoose';
interface IPriceAlert extends Document {
    userId: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    variantId?: string;
    alertType: 'target_price' | 'percentage_drop' | 'any_drop';
    targetPrice?: number;
    percentageDrop?: number;
    currentPriceAtCreation: number;
    notificationMethod: ('email' | 'push' | 'sms')[];
    contact: {
        email?: string;
        phone?: string;
    };
    status: 'active' | 'triggered' | 'expired' | 'cancelled';
    triggeredAt?: Date;
    triggeredPrice?: number;
    expiresAt: Date;
    metadata?: {
        productName?: string;
        productImage?: string;
        variantAttributes?: any;
        ipAddress?: string;
        userAgent?: string;
    };
    shouldTrigger(newPrice: number): boolean;
    trigger(triggeredPrice: number): Promise<IPriceAlert>;
    cancel(): Promise<IPriceAlert>;
    daysUntilExpiration?: number;
}
interface IPriceAlertModel extends Model<IPriceAlert> {
    findActiveForProduct(productId: string, variantId?: string | null): Promise<IPriceAlert[]>;
    hasActiveAlert(userId: string, productId: string, variantId?: string | null): Promise<boolean>;
    getUserAlerts(userId: string, options?: any): Promise<IPriceAlert[]>;
    checkAndTriggerAlerts(productId: string, variantId: string | null, newPrice: number): Promise<IPriceAlert[]>;
    expireOldAlerts(): Promise<number>;
    getProductStats(productId: string): Promise<any>;
}
declare const PriceAlert: IPriceAlertModel;
export default PriceAlert;
