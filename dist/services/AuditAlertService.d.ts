import { IAuditLog } from '../models/AuditLog';
import { Types } from 'mongoose';
export interface AlertRule {
    name: string;
    condition: (log: IAuditLog) => boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    notification: {
        email: boolean;
        sms: boolean;
    };
}
export declare class AuditAlertService {
    private static rules;
    /**
     * Check if audit log should trigger an alert
     */
    static checkAndAlert(log: IAuditLog): Promise<void>;
    /**
     * Send alert notification
     */
    private static sendAlert;
    /**
     * Send email alert
     */
    private static sendEmailAlert;
    /**
     * Send SMS alert
     */
    private static sendSMSAlert;
    /**
     * Format email body
     */
    private static formatEmailBody;
    /**
     * Format SMS body
     */
    private static formatSMSBody;
    /**
     * Get failed login count for merchant
     */
    static getFailedLoginCount(merchantId: string | Types.ObjectId, since?: Date): Promise<number>;
    /**
     * Check for suspicious activity patterns
     */
    static checkSuspiciousActivity(merchantId: string | Types.ObjectId): Promise<{
        suspicious: boolean;
        reasons: string[];
    }>;
    /**
     * Add custom alert rule
     */
    static addRule(rule: AlertRule): void;
    /**
     * Remove alert rule
     */
    static removeRule(name: string): void;
    /**
     * Get all alert rules
     */
    static getRules(): AlertRule[];
}
export default AuditAlertService;
