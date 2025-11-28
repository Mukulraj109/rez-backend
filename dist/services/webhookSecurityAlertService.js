"use strict";
/**
 * Webhook Security Alert Service
 * Sends alerts for security violations and anomalies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearOldAlerts = exports.alertTimeout = exports.alertReplayAttack = exports.alertProcessingFailure = exports.alertRateLimit = exports.alertInvalidPayload = exports.alertDuplicateEvent = exports.alertSignatureFailure = exports.alertIPViolation = exports.checkSuspiciousPattern = exports.getAlertStats = exports.getAlertsBySeverity = exports.getRecentAlerts = exports.sendSecurityAlert = void 0;
/**
 * In-memory storage for recent alerts (would be replaced with persistent storage)
 */
const recentAlerts = [];
const ALERT_HISTORY_LIMIT = 1000;
/**
 * Send an alert for a security violation
 */
const sendSecurityAlert = async (alert) => {
    const fullAlert = {
        ...alert,
        timestamp: new Date(),
    };
    // Store alert in memory
    recentAlerts.push(fullAlert);
    // Keep only recent alerts
    if (recentAlerts.length > ALERT_HISTORY_LIMIT) {
        recentAlerts.shift();
    }
    // Log based on severity
    const logMessage = `[WEBHOOK-ALERT-${alert.severity.toUpperCase()}] ${alert.type}: ${alert.reason}`;
    switch (alert.severity) {
        case 'critical':
            console.error(logMessage, {
                ...fullAlert,
            });
            // TODO: Send to error tracking service (Sentry, etc.)
            // TODO: Send email/SMS notification to admins
            // await notifyAdmins(fullAlert);
            break;
        case 'high':
            console.warn(logMessage, {
                ...fullAlert,
            });
            // TODO: Send to error tracking service
            // await logToErrorTracker(fullAlert);
            break;
        case 'medium':
            console.warn(logMessage, {
                ...fullAlert,
            });
            break;
        case 'low':
            console.log(logMessage, {
                ...fullAlert,
            });
            break;
    }
};
exports.sendSecurityAlert = sendSecurityAlert;
/**
 * Get all recent alerts
 */
const getRecentAlerts = (limit = 100, type) => {
    let alerts = [...recentAlerts].reverse();
    if (type) {
        alerts = alerts.filter(alert => alert.type === type);
    }
    return alerts.slice(0, limit);
};
exports.getRecentAlerts = getRecentAlerts;
/**
 * Get alerts by severity
 */
const getAlertsBySeverity = (severity) => {
    return recentAlerts.filter(alert => alert.severity === severity);
};
exports.getAlertsBySeverity = getAlertsBySeverity;
/**
 * Get alert statistics
 */
const getAlertStats = () => {
    const stats = {
        total: recentAlerts.length,
        bySeverity: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
        },
        byType: {},
        last24Hours: 0,
    };
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    recentAlerts.forEach(alert => {
        stats.bySeverity[alert.severity]++;
        if (!stats.byType[alert.type]) {
            stats.byType[alert.type] = 0;
        }
        stats.byType[alert.type]++;
        if (alert.timestamp > twentyFourHoursAgo) {
            stats.last24Hours++;
        }
    });
    return stats;
};
exports.getAlertStats = getAlertStats;
/**
 * Check if there's a suspicious pattern (multiple violations from same IP)
 */
const checkSuspiciousPattern = (ip, timeWindowMinutes = 5) => {
    const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const suspiciousAlerts = recentAlerts.filter(alert => alert.ip === ip &&
        alert.timestamp > timeWindow &&
        alert.severity >= 'medium');
    return suspiciousAlerts.length;
};
exports.checkSuspiciousPattern = checkSuspiciousPattern;
/**
 * Alert helper functions
 */
const alertIPViolation = (ip, reason) => {
    return (0, exports.sendSecurityAlert)({
        type: 'WEBHOOK_IP_VIOLATION',
        severity: 'high',
        ip,
        reason: `IP whitelisting violation: ${reason}`,
    });
};
exports.alertIPViolation = alertIPViolation;
const alertSignatureFailure = (eventId, reason) => {
    return (0, exports.sendSecurityAlert)({
        type: 'WEBHOOK_SIGNATURE_FAILURE',
        severity: 'critical',
        eventId,
        reason: `Webhook signature verification failed: ${reason}`,
    });
};
exports.alertSignatureFailure = alertSignatureFailure;
const alertDuplicateEvent = (eventId) => {
    return (0, exports.sendSecurityAlert)({
        type: 'WEBHOOK_DUPLICATE_EVENT',
        severity: 'medium',
        eventId,
        reason: `Duplicate webhook event detected: ${eventId}`,
    });
};
exports.alertDuplicateEvent = alertDuplicateEvent;
const alertInvalidPayload = (eventId, reason) => {
    return (0, exports.sendSecurityAlert)({
        type: 'WEBHOOK_INVALID_PAYLOAD',
        severity: 'high',
        eventId,
        reason: `Invalid webhook payload: ${reason}`,
    });
};
exports.alertInvalidPayload = alertInvalidPayload;
const alertRateLimit = (ip) => {
    return (0, exports.sendSecurityAlert)({
        type: 'WEBHOOK_RATE_LIMIT',
        severity: 'medium',
        ip,
        reason: `Webhook rate limit exceeded from IP: ${ip}`,
    });
};
exports.alertRateLimit = alertRateLimit;
const alertProcessingFailure = (eventId, error) => {
    return (0, exports.sendSecurityAlert)({
        type: 'WEBHOOK_PROCESSING_FAILURE',
        severity: 'high',
        eventId,
        reason: `Webhook processing failed: ${error}`,
    });
};
exports.alertProcessingFailure = alertProcessingFailure;
const alertReplayAttack = (eventId, reason) => {
    return (0, exports.sendSecurityAlert)({
        type: 'WEBHOOK_REPLAY_ATTACK',
        severity: 'critical',
        eventId,
        reason: `Replay attack detected: ${reason}`,
    });
};
exports.alertReplayAttack = alertReplayAttack;
const alertTimeout = (eventId) => {
    return (0, exports.sendSecurityAlert)({
        type: 'WEBHOOK_TIMEOUT',
        severity: 'high',
        eventId,
        reason: `Webhook processing timeout: ${eventId}`,
    });
};
exports.alertTimeout = alertTimeout;
/**
 * Clear old alerts (can be called periodically)
 */
const clearOldAlerts = (hoursOld = 72) => {
    const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    const initialLength = recentAlerts.length;
    while (recentAlerts.length > 0 && recentAlerts[0].timestamp < cutoffTime) {
        recentAlerts.shift();
    }
    console.log(`[ALERT-SERVICE] Cleared ${initialLength - recentAlerts.length} old alerts`);
};
exports.clearOldAlerts = clearOldAlerts;
exports.default = {
    sendSecurityAlert: exports.sendSecurityAlert,
    getRecentAlerts: exports.getRecentAlerts,
    getAlertsBySeverity: exports.getAlertsBySeverity,
    getAlertStats: exports.getAlertStats,
    checkSuspiciousPattern: exports.checkSuspiciousPattern,
    alertIPViolation: exports.alertIPViolation,
    alertSignatureFailure: exports.alertSignatureFailure,
    alertDuplicateEvent: exports.alertDuplicateEvent,
    alertInvalidPayload: exports.alertInvalidPayload,
    alertRateLimit: exports.alertRateLimit,
    alertProcessingFailure: exports.alertProcessingFailure,
    alertReplayAttack: exports.alertReplayAttack,
    alertTimeout: exports.alertTimeout,
    clearOldAlerts: exports.clearOldAlerts,
};
