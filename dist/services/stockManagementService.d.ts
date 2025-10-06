import { Types } from 'mongoose';
import { StockChangeType } from '../models/StockHistory';
/**
 * Stock Management Service with Audit Trail
 *
 * This service wraps all stock-changing operations and automatically logs them
 * to the stock history for audit trail purposes.
 */
declare class StockManagementService {
    /**
     * Deduct stock for a purchase/order
     */
    deductStockForOrder(productId: string | Types.ObjectId, quantity: number, variant?: {
        type: string;
        value: string;
    }, metadata?: {
        userId?: string | Types.ObjectId;
        orderId?: string | Types.ObjectId;
        reason?: string;
        notes?: string;
    }): Promise<{
        success: boolean;
        previousStock: number;
        newStock: number;
    }>;
    /**
     * Restore stock for order cancellation or return
     */
    restoreStockForCancellation(productId: string | Types.ObjectId, quantity: number, variant?: {
        type: string;
        value: string;
    }, metadata?: {
        userId?: string | Types.ObjectId;
        orderId?: string | Types.ObjectId;
        reason?: string;
        changeType?: 'cancellation' | 'return';
    }): Promise<{
        success: boolean;
        previousStock: number;
        newStock: number;
    }>;
    /**
     * Manual stock adjustment by merchant
     */
    adjustStock(productId: string | Types.ObjectId, newStock: number, variant?: {
        type: string;
        value: string;
    }, metadata?: {
        userId?: string | Types.ObjectId;
        reason?: string;
        notes?: string;
        changeType?: StockChangeType;
    }): Promise<{
        success: boolean;
        previousStock: number;
        newStock: number;
    }>;
    /**
     * Reserve stock (for cart items)
     */
    reserveStock(productId: string | Types.ObjectId, quantity: number, variant?: {
        type: string;
        value: string;
    }, metadata?: {
        userId?: string | Types.ObjectId;
        reservationId?: string | Types.ObjectId;
        reason?: string;
    }): Promise<{
        success: boolean;
    }>;
    /**
     * Release stock reservation
     */
    releaseReservation(productId: string | Types.ObjectId, quantity: number, variant?: {
        type: string;
        value: string;
    }, metadata?: {
        userId?: string | Types.ObjectId;
        reservationId?: string | Types.ObjectId;
        reason?: string;
    }): Promise<{
        success: boolean;
    }>;
}
declare const _default: StockManagementService;
export default _default;
