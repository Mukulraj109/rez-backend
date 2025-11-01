import { Document, Types } from 'mongoose';
export type StockChangeType = 'purchase' | 'return' | 'adjustment' | 'restock' | 'reservation' | 'reservation_release' | 'cancellation' | 'damage' | 'expired' | 'theft' | 'correction';
export interface IStockHistory extends Document {
    product: Types.ObjectId;
    store: Types.ObjectId;
    variant?: {
        type: string;
        value: string;
    };
    previousStock: number;
    newStock: number;
    changeAmount: number;
    changeType: StockChangeType;
    user?: Types.ObjectId;
    order?: Types.ObjectId;
    reservation?: Types.ObjectId;
    reason?: string;
    notes?: string;
    metadata?: {
        customerName?: string;
        orderId?: string;
        batchNumber?: string;
        expiryDate?: Date;
        supplierName?: string;
        invoiceNumber?: string;
        [key: string]: any;
    };
    timestamp: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const StockHistory: any;
