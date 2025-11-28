import mongoose, { Document, Types } from 'mongoose';
/**
 * Refund Model
 * Tracks all refunds for audit and reporting purposes
 */
export interface IRefund extends Document {
    order: Types.ObjectId;
    user: Types.ObjectId;
    orderNumber: string;
    paymentMethod: 'razorpay' | 'stripe' | 'wallet' | 'cod';
    refundAmount: number;
    refundType: 'full' | 'partial';
    refundReason: string;
    gatewayRefundId?: string;
    gatewayStatus?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    failureReason?: string;
    refundedItems?: Array<{
        itemId: Types.ObjectId;
        productId: Types.ObjectId;
        quantity: number;
        refundAmount: number;
    }>;
    requestedAt: Date;
    processedAt?: Date;
    completedAt?: Date;
    failedAt?: Date;
    estimatedArrival?: Date;
    actualArrival?: Date;
    notificationsSent: {
        sms: boolean;
        email: boolean;
        sentAt?: Date;
    };
    processedBy?: Types.ObjectId;
    notes?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Refund: mongoose.Model<IRefund, {}, {}, {}, mongoose.Document<unknown, {}, IRefund, {}, {}> & IRefund & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
