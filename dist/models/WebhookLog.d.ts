import mongoose, { Document } from 'mongoose';
/**
 * Webhook Log Model
 * Tracks all webhook events for debugging and idempotency
 */
export interface IWebhookLog extends Document {
    provider: 'razorpay' | 'stripe';
    eventId: string;
    eventType: string;
    payload: any;
    signature: string;
    signatureValid: boolean;
    processed: boolean;
    processedAt?: Date;
    status: 'pending' | 'processing' | 'success' | 'failed' | 'duplicate';
    errorMessage?: string;
    retryCount: number;
    metadata?: {
        orderId?: string;
        paymentId?: string;
        amount?: number;
        currency?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const WebhookLog: mongoose.Model<IWebhookLog, {}, {}, {}, mongoose.Document<unknown, {}, IWebhookLog, {}, {}> & IWebhookLog & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
