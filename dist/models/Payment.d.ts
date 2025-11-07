import mongoose, { Document, Model } from 'mongoose';
export interface IPaymentModel extends Model<IPayment> {
    findActivePayments(userId: string): Promise<IPayment[]>;
    findByPaymentId(paymentId: string, userId: string): Promise<IPayment | null>;
}
export interface IPayment extends Document {
    paymentId: string;
    orderId: string;
    user: mongoose.Types.ObjectId;
    amount: number;
    currency: string;
    paymentMethod: string;
    paymentMethodId?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired';
    userDetails: {
        name?: string;
        email?: string;
        phone?: string;
    };
    metadata: Record<string, any>;
    gatewayResponse?: {
        gateway: string;
        transactionId?: string;
        paymentUrl?: string;
        qrCode?: string;
        upiId?: string;
        expiryTime?: Date;
        timestamp: Date;
        [key: string]: any;
    };
    failureReason?: string;
    completedAt?: Date;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Payment: IPaymentModel;
export default Payment;
