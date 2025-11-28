"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logWebhookReceived = logWebhookReceived;
exports.logWebhookSuccess = logWebhookSuccess;
exports.logWebhookError = logWebhookError;
exports.logWebhookDuplicate = logWebhookDuplicate;
exports.logWebhookSignatureFailure = logWebhookSignatureFailure;
exports.logPaymentStateChange = logPaymentStateChange;
exports.getWebhookStats = getWebhookStats;
exports.getRecentWebhookEvents = getRecentWebhookEvents;
exports.cleanupOldWebhookLogs = cleanupOldWebhookLogs;
exports.getFailedWebhooksForRetry = getFailedWebhooksForRetry;
const WebhookLog_1 = require("../models/WebhookLog");
const logger_1 = require("../config/logger");
/**
 * Log webhook event receipt
 */
function logWebhookReceived(details) {
    const logData = {
        provider: details.provider.toUpperCase(),
        eventId: details.eventId,
        eventType: details.eventType,
        orderId: details.orderId,
        paymentId: details.paymentId,
        timestamp: new Date().toISOString()
    };
    logger_1.logger.info(`[${details.provider.toUpperCase()} WEBHOOK] Event received`, logData);
    console.log(`🔔 [${details.provider.toUpperCase()} WEBHOOK] Event received:`, {
        eventType: details.eventType,
        eventId: details.eventId,
        orderId: details.orderId || 'N/A',
        timestamp: new Date().toISOString()
    });
}
/**
 * Log successful webhook processing
 */
function logWebhookSuccess(details) {
    const logData = {
        provider: details.provider.toUpperCase(),
        eventId: details.eventId,
        eventType: details.eventType,
        orderId: details.orderId,
        status: 'success',
        timestamp: new Date().toISOString()
    };
    logger_1.logger.info(`[${details.provider.toUpperCase()} WEBHOOK] Event processed successfully`, logData);
    console.log(`✅ [${details.provider.toUpperCase()} WEBHOOK] Event processed successfully:`, {
        eventType: details.eventType,
        eventId: details.eventId,
        orderId: details.orderId || 'N/A'
    });
}
/**
 * Log webhook processing failure
 */
function logWebhookError(details) {
    const logData = {
        provider: details.provider.toUpperCase(),
        eventId: details.eventId,
        eventType: details.eventType,
        orderId: details.orderId,
        error: details.error,
        status: 'failed',
        timestamp: new Date().toISOString()
    };
    logger_1.logger.error(`[${details.provider.toUpperCase()} WEBHOOK] Event processing failed`, logData);
    console.error(`❌ [${details.provider.toUpperCase()} WEBHOOK] Event processing failed:`, {
        eventType: details.eventType,
        eventId: details.eventId,
        orderId: details.orderId || 'N/A',
        error: details.error
    });
}
/**
 * Log duplicate webhook event
 */
function logWebhookDuplicate(details) {
    const logData = {
        provider: details.provider.toUpperCase(),
        eventId: details.eventId,
        eventType: details.eventType,
        status: 'duplicate',
        timestamp: new Date().toISOString()
    };
    logger_1.logger.warn(`[${details.provider.toUpperCase()} WEBHOOK] Duplicate event detected`, logData);
    console.log(`⚠️ [${details.provider.toUpperCase()} WEBHOOK] Duplicate event detected:`, {
        eventType: details.eventType,
        eventId: details.eventId
    });
}
/**
 * Log signature verification failure
 */
function logWebhookSignatureFailure(provider, eventType) {
    const logData = {
        provider: provider.toUpperCase(),
        eventType: eventType || 'unknown',
        error: 'Invalid webhook signature',
        status: 'signature_failed',
        timestamp: new Date().toISOString()
    };
    logger_1.logger.error(`[${provider.toUpperCase()} WEBHOOK] Signature verification failed`, logData);
    console.error(`❌ [${provider.toUpperCase()} WEBHOOK] Signature verification failed for event:`, eventType || 'unknown');
}
/**
 * Log payment state change
 */
function logPaymentStateChange(provider, orderId, oldState, newState, paymentId) {
    const logData = {
        provider: provider.toUpperCase(),
        orderId,
        oldState,
        newState,
        paymentId,
        timestamp: new Date().toISOString()
    };
    logger_1.logger.info(`[${provider.toUpperCase()} WEBHOOK] Payment state changed`, logData);
    console.log(`🔄 [${provider.toUpperCase()} WEBHOOK] Payment state changed:`, {
        orderId,
        oldState,
        newState,
        paymentId: paymentId || 'N/A'
    });
}
/**
 * Get webhook statistics
 */
async function getWebhookStats(provider, startDate, endDate) {
    const query = {};
    if (provider) {
        query.provider = provider;
    }
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate)
            query.createdAt.$gte = startDate;
        if (endDate)
            query.createdAt.$lte = endDate;
    }
    const [total, processed, failed, duplicates] = await Promise.all([
        WebhookLog_1.WebhookLog.countDocuments(query),
        WebhookLog_1.WebhookLog.countDocuments({ ...query, status: 'success' }),
        WebhookLog_1.WebhookLog.countDocuments({ ...query, status: 'failed' }),
        WebhookLog_1.WebhookLog.countDocuments({ ...query, status: 'duplicate' })
    ]);
    const successRate = total > 0 ? ((processed / total) * 100).toFixed(2) : '0.00';
    return {
        total,
        processed,
        failed,
        duplicates,
        pending: total - processed - failed - duplicates,
        successRate: `${successRate}%`,
        provider: provider || 'all',
        dateRange: {
            start: startDate?.toISOString() || 'all time',
            end: endDate?.toISOString() || 'present'
        }
    };
}
/**
 * Get recent webhook events
 */
async function getRecentWebhookEvents(provider, limit = 20) {
    const query = {};
    if (provider) {
        query.provider = provider;
    }
    return await WebhookLog_1.WebhookLog.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('provider eventType status metadata createdAt errorMessage')
        .lean();
}
/**
 * Cleanup old webhook logs (called by cron job)
 */
async function cleanupOldWebhookLogs(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const result = await WebhookLog_1.WebhookLog.deleteMany({
        createdAt: { $lt: cutoffDate }
    });
    logger_1.logger.info(`[WEBHOOK CLEANUP] Deleted ${result.deletedCount} old webhook logs`, {
        daysToKeep,
        cutoffDate: cutoffDate.toISOString(),
        deletedCount: result.deletedCount
    });
    return result.deletedCount || 0;
}
/**
 * Retry failed webhook events (manual retry utility)
 */
async function getFailedWebhooksForRetry(maxRetries = 3, limit = 50) {
    return await WebhookLog_1.WebhookLog.find({
        status: 'failed',
        retryCount: { $lt: maxRetries }
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
}
exports.default = {
    logWebhookReceived,
    logWebhookSuccess,
    logWebhookError,
    logWebhookDuplicate,
    logWebhookSignatureFailure,
    logPaymentStateChange,
    getWebhookStats,
    getRecentWebhookEvents,
    cleanupOldWebhookLogs,
    getFailedWebhooksForRetry
};
