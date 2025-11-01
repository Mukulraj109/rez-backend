import { Types } from 'mongoose';
export interface CreateAuditLogData {
    userId: Types.ObjectId | string;
    action: string;
    resource: string;
    resourceId?: Types.ObjectId | string;
    status?: 'success' | 'failed' | 'pending';
    changes?: any;
    metadata?: {
        ipAddress?: string;
        userAgent?: string;
        deviceFingerprint?: string;
        status?: string;
        [key: string]: any;
    };
}
/**
 * Create an audit log entry
 * This function wraps the AuditLog model's log method
 */
export declare const createAuditLog: (data: CreateAuditLogData) => Promise<any>;
/**
 * Get user activity logs
 */
export declare const getUserActivity: (userId: string | Types.ObjectId, options?: {
    limit?: number;
    skip?: number;
    resource?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
}) => Promise<any>;
/**
 * Get audit logs for a specific resource
 */
export declare const getResourceLogs: (resourceId: string | Types.ObjectId, options?: {
    limit?: number;
    skip?: number;
    action?: string;
}) => Promise<any>;
