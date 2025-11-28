/**
 * Webhook Logger Utility
 * Provides structured logging for webhook events
 */
export interface WebhookEventDetails {
    provider: 'razorpay' | 'stripe';
    eventId: string;
    eventType: string;
    orderId?: string;
    paymentId?: string;
    amount?: number;
    currency?: string;
    status?: string;
    error?: string;
}
/**
 * Log webhook event receipt
 */
export declare function logWebhookReceived(details: WebhookEventDetails): void;
/**
 * Log successful webhook processing
 */
export declare function logWebhookSuccess(details: WebhookEventDetails): void;
/**
 * Log webhook processing failure
 */
export declare function logWebhookError(details: WebhookEventDetails): void;
/**
 * Log duplicate webhook event
 */
export declare function logWebhookDuplicate(details: WebhookEventDetails): void;
/**
 * Log signature verification failure
 */
export declare function logWebhookSignatureFailure(provider: 'razorpay' | 'stripe', eventType?: string): void;
/**
 * Log payment state change
 */
export declare function logPaymentStateChange(provider: 'razorpay' | 'stripe', orderId: string, oldState: string, newState: string, paymentId?: string): void;
/**
 * Get webhook statistics
 */
export declare function getWebhookStats(provider?: 'razorpay' | 'stripe', startDate?: Date, endDate?: Date): Promise<any>;
/**
 * Get recent webhook events
 */
export declare function getRecentWebhookEvents(provider?: 'razorpay' | 'stripe', limit?: number): Promise<any[]>;
/**
 * Cleanup old webhook logs (called by cron job)
 */
export declare function cleanupOldWebhookLogs(daysToKeep?: number): Promise<number>;
/**
 * Retry failed webhook events (manual retry utility)
 */
export declare function getFailedWebhooksForRetry(maxRetries?: number, limit?: number): Promise<any[]>;
declare const _default: {
    logWebhookReceived: typeof logWebhookReceived;
    logWebhookSuccess: typeof logWebhookSuccess;
    logWebhookError: typeof logWebhookError;
    logWebhookDuplicate: typeof logWebhookDuplicate;
    logWebhookSignatureFailure: typeof logWebhookSignatureFailure;
    logPaymentStateChange: typeof logPaymentStateChange;
    getWebhookStats: typeof getWebhookStats;
    getRecentWebhookEvents: typeof getRecentWebhookEvents;
    cleanupOldWebhookLogs: typeof cleanupOldWebhookLogs;
    getFailedWebhooksForRetry: typeof getFailedWebhooksForRetry;
};
export default _default;
