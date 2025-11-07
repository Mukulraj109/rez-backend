import { Document, Types, Model } from 'mongoose';
export interface ITransactionModel extends Model<ITransaction> {
    getUserTransactions(userId: string, filters?: any, limit?: number, skip?: number): Promise<ITransaction[]>;
    getUserTransactionSummary(userId: string, period?: 'day' | 'week' | 'month' | 'year'): Promise<any[]>;
    cleanupExpired(): Promise<any>;
}
export interface ITransactionSource {
    type: 'project' | 'order' | 'referral' | 'cashback' | 'refund' | 'bonus' | 'withdrawal' | 'topup' | 'penalty' | 'paybill';
    reference: Types.ObjectId;
    description?: string;
    metadata?: {
        projectTitle?: string;
        orderNumber?: string;
        storeInfo?: {
            name: string;
            id: Types.ObjectId;
        };
        referralInfo?: {
            referredUser: Types.ObjectId;
            level: number;
        };
        withdrawalInfo?: {
            method: 'bank' | 'upi' | 'paypal';
            accountDetails?: string;
            withdrawalId: string;
        };
        bonusInfo?: {
            reason: string;
            campaign?: string;
        };
    };
}
export interface ITransactionStatus {
    current: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'reversed';
    history: {
        status: string;
        timestamp: Date;
        reason?: string;
        updatedBy?: Types.ObjectId;
    }[];
}
export interface ITransaction extends Document {
    transactionId: string;
    user: Types.ObjectId;
    type: 'credit' | 'debit';
    category: 'earning' | 'spending' | 'refund' | 'withdrawal' | 'topup' | 'bonus' | 'penalty' | 'cashback' | 'paybill';
    amount: number;
    currency: string;
    description: string;
    source: ITransactionSource;
    status: ITransactionStatus;
    balanceBefore: number;
    balanceAfter: number;
    fees?: number;
    tax?: number;
    netAmount?: number;
    processingTime?: number;
    receiptUrl?: string;
    notes?: string;
    isReversible: boolean;
    reversedAt?: Date;
    reversalReason?: string;
    reversalTransactionId?: string;
    expiresAt?: Date;
    scheduledAt?: Date;
    processedAt?: Date;
    failureReason?: string;
    retryCount: number;
    maxRetries: number;
    createdAt: Date;
    updatedAt: Date;
    updateStatus(newStatus: string, reason?: string, updatedBy?: string): Promise<void>;
    reverse(reason: string): Promise<ITransaction>;
    retry(): Promise<void>;
    generateReceipt(): Promise<string>;
    canBeReversed(): boolean;
    getFormattedAmount(): string;
}
export declare const Transaction: ITransactionModel;
