import mongoose, { Document, Types } from 'mongoose';
export interface IAuditLog extends Document {
    userId: Types.ObjectId;
    action: string;
    resource: string;
    resourceId?: Types.ObjectId;
    changes?: any;
    metadata?: {
        ipAddress?: string;
        userAgent?: string;
        deviceFingerprint?: string;
        [key: string]: any;
    };
    timestamp: Date;
    createdAt: Date;
}
export interface IAuditLogModel extends mongoose.Model<IAuditLog> {
    log(data: {
        userId: string | Types.ObjectId;
        action: string;
        resource: string;
        resourceId?: string | Types.ObjectId;
        changes?: any;
        metadata?: any;
    }): Promise<IAuditLog | null>;
    getUserActivity(userId: string | Types.ObjectId, options?: {
        limit?: number;
        skip?: number;
        resource?: string;
        action?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<IAuditLog[]>;
}
declare const AuditLog: any;
export default AuditLog;
