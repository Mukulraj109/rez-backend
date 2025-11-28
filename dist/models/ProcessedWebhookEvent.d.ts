import mongoose, { Document } from 'mongoose';
/**
 * Interface for ProcessedWebhookEvent document properties
 * Tracks all processed webhook events to prevent replay attacks
 */
export interface IProcessedWebhookEvent {
    eventId: string;
    eventType: string;
    subscriptionId?: string;
    razorpaySignature: string;
    processedAt: Date;
    expiresAt: Date;
    status: 'success' | 'failed' | 'pending';
    errorMessage?: string;
    retryCount: number;
    lastRetryAt?: Date;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * Interface for ProcessedWebhookEvent Document (extends mongoose Document)
 */
export interface IProcessedWebhookEventDocument extends IProcessedWebhookEvent, Document {
}
/**
 * Interface for ProcessedWebhookEvent Model (static methods)
 */
export interface IProcessedWebhookEventModel extends mongoose.Model<IProcessedWebhookEventDocument> {
    isEventProcessed(eventId: string): Promise<boolean>;
    getSubscriptionEventHistory(subscriptionId: string, limit?: number): Promise<IProcessedWebhookEventDocument[]>;
    recordEvent(eventId: string, eventType: string, subscriptionId: string, razorpaySignature: string, ipAddress?: string, userAgent?: string): Promise<IProcessedWebhookEventDocument>;
    markEventFailed(eventId: string, errorMessage: string): Promise<IProcessedWebhookEventDocument | null>;
    getFailedEvents(hoursAgo?: number): Promise<IProcessedWebhookEventDocument[]>;
    getEventStats(hoursAgo?: number): Promise<{
        success: number;
        failed: number;
        pending: number;
    }>;
}
export declare const ProcessedWebhookEvent: IProcessedWebhookEventModel;
