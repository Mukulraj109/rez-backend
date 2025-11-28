import mongoose, { Document, Types } from 'mongoose';
export interface IAuditLog extends Document {
    merchantId: Types.ObjectId;
    merchantUserId?: Types.ObjectId;
    action: string;
    resourceType: string;
    resourceId?: Types.ObjectId;
    details: {
        before?: any;
        after?: any;
        changes?: any;
        metadata?: any;
    };
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
    severity: 'info' | 'warning' | 'error' | 'critical';
    createdAt: Date;
    updatedAt: Date;
}
export interface IAuditLogModel extends mongoose.Model<IAuditLog> {
    log(data: {
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
    }): Promise<IAuditLog | null>;
    getMerchantActivity(merchantId: string | Types.ObjectId, options?: {
        limit?: number;
        skip?: number;
        resourceType?: string;
        action?: string;
        severity?: string;
        merchantUserId?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<IAuditLog[]>;
    getResourceHistory(resourceType: string, resourceId: string | Types.ObjectId, options?: {
        limit?: number;
        skip?: number;
    }): Promise<IAuditLog[]>;
}
declare const AuditLog: IAuditLogModel;
export default AuditLog;
