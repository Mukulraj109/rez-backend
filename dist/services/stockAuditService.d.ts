import { Types } from 'mongoose';
import { StockChangeType, IStockHistory } from '../models/StockHistory';
export interface StockChangeData {
    productId: string | Types.ObjectId;
    storeId: string | Types.ObjectId;
    variant?: {
        type: string;
        value: string;
    };
    previousStock: number;
    newStock: number;
    changeType: StockChangeType;
    userId?: string | Types.ObjectId;
    orderId?: string | Types.ObjectId;
    reservationId?: string | Types.ObjectId;
    reason?: string;
    notes?: string;
    metadata?: any;
}
export interface StockHistoryFilters {
    variant?: {
        type: string;
        value: string;
    };
    startDate?: Date;
    endDate?: Date;
    changeTypes?: StockChangeType[];
    limit?: number;
    skip?: number;
}
export interface AnomalyDetectionOptions {
    days?: number;
    threshold?: number;
}
export interface StockAnomalyResult {
    product: Types.ObjectId;
    productName: string;
    changeAmount: number;
    changeType: StockChangeType;
    timestamp: Date;
    previousStock: number;
    newStock: number;
    reason?: string;
    absoluteChange: number;
    percentageChange: number;
}
export interface StockReportResult {
    _id: Types.ObjectId;
    productName: string;
    currentStock: number;
    changes: {
        changeType: StockChangeType;
        totalChanges: number;
        totalQuantity: number;
        absoluteQuantity: number;
    }[];
}
declare class StockAuditService {
    /**
     * Log a stock change in the audit trail
     */
    logStockChange(data: StockChangeData): Promise<IStockHistory>;
    /**
     * Get stock history for a product
     */
    getStockHistory(productId: string | Types.ObjectId, filters?: StockHistoryFilters): Promise<IStockHistory[]>;
    /**
     * Get stock snapshot at a specific date
     */
    getStockSnapshot(productId: string | Types.ObjectId, date: Date, variant?: {
        type: string;
        value: string;
    }): Promise<number>;
    /**
     * Detect stock anomalies for a store
     */
    detectAnomalies(storeId: string | Types.ObjectId, options?: AnomalyDetectionOptions): Promise<StockAnomalyResult[]>;
    /**
     * Generate stock report for a date range
     */
    generateStockReport(storeId: string | Types.ObjectId, startDate: Date, endDate: Date): Promise<StockReportResult[]>;
    /**
     * Get stock movement summary for a product
     */
    getStockMovementSummary(productId: string | Types.ObjectId, startDate: Date, endDate: Date, variant?: {
        type: string;
        value: string;
    }): Promise<{
        totalIn: number;
        totalOut: number;
        netChange: number;
        currentStock: number;
        movements: {
            changeType: StockChangeType;
            count: number;
            totalQuantity: number;
        }[];
    }>;
    /**
     * Get low stock alerts based on history
     */
    getLowStockAlerts(storeId: string | Types.ObjectId, threshold?: number): Promise<{
        product: any;
        currentStock: number;
        averageDailySales: number;
        daysUntilStockOut: number;
        recentHistory: IStockHistory[];
    }[]>;
    /**
     * Get stock value over time
     */
    getStockValueOverTime(storeId: string | Types.ObjectId, startDate: Date, endDate: Date, interval?: 'day' | 'week' | 'month'): Promise<{
        date: Date;
        totalStockValue: number;
        totalItems: number;
    }[]>;
}
declare const _default: StockAuditService;
export default _default;
