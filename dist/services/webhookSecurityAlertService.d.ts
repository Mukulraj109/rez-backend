/**
 * Webhook Security Alert Service
 * Sends alerts for security violations and anomalies
 */
export type AlertType = 'WEBHOOK_IP_VIOLATION' | 'WEBHOOK_SIGNATURE_FAILURE' | 'WEBHOOK_DUPLICATE_EVENT' | 'WEBHOOK_INVALID_PAYLOAD' | 'WEBHOOK_RATE_LIMIT' | 'WEBHOOK_PROCESSING_FAILURE' | 'WEBHOOK_REPLAY_ATTACK' | 'WEBHOOK_TIMEOUT';
export interface WebhookSecurityAlert {
    type: AlertType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    ip?: string;
    eventId?: string;
    reason: string;
    details?: Record<string, any>;
    timestamp: Date;
    resolved?: boolean;
}
/**
 * Send an alert for a security violation
 */
export declare const sendSecurityAlert: (alert: Omit<WebhookSecurityAlert, "timestamp">) => Promise<void>;
/**
 * Get all recent alerts
 */
export declare const getRecentAlerts: (limit?: number, type?: AlertType) => WebhookSecurityAlert[];
/**
 * Get alerts by severity
 */
export declare const getAlertsBySeverity: (severity: "low" | "medium" | "high" | "critical") => WebhookSecurityAlert[];
/**
 * Get alert statistics
 */
export declare const getAlertStats: () => {
    total: number;
    bySeverity: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    byType: Record<AlertType, number>;
    last24Hours: number;
};
/**
 * Check if there's a suspicious pattern (multiple violations from same IP)
 */
export declare const checkSuspiciousPattern: (ip: string, timeWindowMinutes?: number) => number;
/**
 * Alert helper functions
 */
export declare const alertIPViolation: (ip: string, reason: string) => Promise<void>;
export declare const alertSignatureFailure: (eventId: string, reason: string) => Promise<void>;
export declare const alertDuplicateEvent: (eventId: string) => Promise<void>;
export declare const alertInvalidPayload: (eventId: string | undefined, reason: string) => Promise<void>;
export declare const alertRateLimit: (ip: string) => Promise<void>;
export declare const alertProcessingFailure: (eventId: string, error: string) => Promise<void>;
export declare const alertReplayAttack: (eventId: string, reason: string) => Promise<void>;
export declare const alertTimeout: (eventId: string) => Promise<void>;
/**
 * Clear old alerts (can be called periodically)
 */
export declare const clearOldAlerts: (hoursOld?: number) => void;
declare const _default: {
    sendSecurityAlert: (alert: Omit<WebhookSecurityAlert, "timestamp">) => Promise<void>;
    getRecentAlerts: (limit?: number, type?: AlertType) => WebhookSecurityAlert[];
    getAlertsBySeverity: (severity: "low" | "medium" | "high" | "critical") => WebhookSecurityAlert[];
    getAlertStats: () => {
        total: number;
        bySeverity: {
            critical: number;
            high: number;
            medium: number;
            low: number;
        };
        byType: Record<AlertType, number>;
        last24Hours: number;
    };
    checkSuspiciousPattern: (ip: string, timeWindowMinutes?: number) => number;
    alertIPViolation: (ip: string, reason: string) => Promise<void>;
    alertSignatureFailure: (eventId: string, reason: string) => Promise<void>;
    alertDuplicateEvent: (eventId: string) => Promise<void>;
    alertInvalidPayload: (eventId: string | undefined, reason: string) => Promise<void>;
    alertRateLimit: (ip: string) => Promise<void>;
    alertProcessingFailure: (eventId: string, error: string) => Promise<void>;
    alertReplayAttack: (eventId: string, reason: string) => Promise<void>;
    alertTimeout: (eventId: string) => Promise<void>;
    clearOldAlerts: (hoursOld?: number) => void;
};
export default _default;
