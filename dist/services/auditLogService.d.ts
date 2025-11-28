import { Types } from 'mongoose';
export interface CreateAuditLogParams {
    merchantId?: string | Types.ObjectId;
    merchantUserId?: string | Types.ObjectId;
    userId?: string | Types.ObjectId;
    action: string;
    resourceType: string;
    resourceId?: string | Types.ObjectId;
    details?: {
        before?: any;
        after?: any;
        changes?: any;
        metadata?: any;
    };
    ipAddress?: string;
    userAgent?: string;
    severity?: 'info' | 'warning' | 'error' | 'critical';
    status?: string;
    metadata?: any;
}
/**
 * Create an audit log entry
 * Wraps the AuditLog model's log method
 * Note: AuditLog requires merchantId, so this will only work if merchantId is provided
 * For user-backend, this will log to console if merchantId is not available
 */
export declare const createAuditLog: (params: CreateAuditLogParams) => Promise<any>;
