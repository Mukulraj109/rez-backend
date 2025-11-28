import { IAuditLog } from '../models/AuditLog';
import { Types } from 'mongoose';
import { Request } from 'express';
export interface AuditLogParams {
    merchantId: string | Types.ObjectId;
    merchantUserId?: string | Types.ObjectId;
    action: string;
    resourceType: string;
    resourceId?: string | Types.ObjectId;
    details?: {
        before?: any;
        after?: any;
        changes?: any;
        metadata?: any;
    };
    ipAddress: string;
    userAgent: string;
    severity?: 'info' | 'warning' | 'error' | 'critical';
}
export declare class AuditService {
    /**
     * Generic log method for creating audit entries
     */
    static log(params: AuditLogParams): Promise<void>;
    /**
     * Log product-related changes
     */
    static logProductChange(merchantId: string | Types.ObjectId, productId: string | Types.ObjectId, before: any, after: any, merchantUserId: string | Types.ObjectId | undefined, req: Request): Promise<void>;
    /**
     * Log order-related changes
     */
    static logOrderChange(merchantId: string | Types.ObjectId, orderId: string | Types.ObjectId, before: any, after: any, merchantUserId: string | Types.ObjectId | undefined, req: Request): Promise<void>;
    /**
     * Log store/merchant profile changes
     */
    static logStoreChange(merchantId: string | Types.ObjectId, storeId: string | Types.ObjectId | undefined, before: any, after: any, merchantUserId: string | Types.ObjectId | undefined, req: Request): Promise<void>;
    /**
     * Log user/team member actions
     */
    static logUserAction(merchantId: string | Types.ObjectId, userId: string | Types.ObjectId, action: string, details: any, req: Request): Promise<void>;
    /**
     * Log security events
     */
    static logSecurityEvent(merchantId: string | Types.ObjectId, event: string, details: any, req: Request): Promise<void>;
    /**
     * Log API calls (for monitoring)
     */
    static logApiCall(req: Request, res: any, duration: number): Promise<void>;
    /**
     * Get audit logs with filtering
     */
    static getAuditLogs(merchantId: string | Types.ObjectId, filters: {
        action?: string;
        resourceType?: string;
        resourceId?: string;
        merchantUserId?: string;
        severity?: string;
        startDate?: Date;
        endDate?: Date;
        page?: number;
        limit?: number;
    }): Promise<{
        logs: IAuditLog[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    /**
     * Get resource history
     */
    static getResourceHistory(resourceType: string, resourceId: string | Types.ObjectId): Promise<IAuditLog[]>;
    /**
     * Get user activity
     */
    static getUserActivity(merchantUserId: string | Types.ObjectId, options?: {
        limit?: number;
        startDate?: Date;
        endDate?: Date;
    }): Promise<IAuditLog[]>;
    /**
     * Export audit logs to CSV or Excel
     */
    static exportAuditLogs(merchantId: string | Types.ObjectId, startDate: Date, endDate: Date, format?: 'csv' | 'xlsx'): Promise<Buffer>;
    /**
     * Get audit statistics
     */
    static getAuditStats(merchantId: string | Types.ObjectId, startDate?: Date, endDate?: Date): Promise<any>;
    /**
     * Sanitize request body (remove sensitive data)
     */
    private static sanitizeBody;
    /**
     * Log authentication events
     */
    static logAuth(merchantId: string | Types.ObjectId, action: 'login' | 'logout' | 'failed_login' | 'password_reset' | 'password_changed' | 'email_verified' | '2fa_enabled', details: any, req: Request): Promise<void>;
    /**
     * Log product deletion
     */
    static logProductDeleted(merchantId: string | Types.ObjectId, productId: string | Types.ObjectId, productData: any, merchantUserId: string | Types.ObjectId | undefined, req: Request): Promise<void>;
    /**
     * Log bulk operations
     */
    static logBulkOperation(merchantId: string | Types.ObjectId, action: string, resourceType: string, count: number, merchantUserId: string | Types.ObjectId | undefined, req: Request): Promise<void>;
    /**
     * Log settings changes
     */
    static logSettingsChange(merchantId: string | Types.ObjectId, settingType: string, before: any, after: any, merchantUserId: string | Types.ObjectId | undefined, req: Request): Promise<void>;
}
export default AuditService;
