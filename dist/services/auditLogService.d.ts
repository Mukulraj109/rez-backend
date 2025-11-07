import { Types } from 'mongoose';
export interface CreateAuditLogParams {
    userId: string | Types.ObjectId;
    action: string;
    resource: string;
    resourceId?: string | Types.ObjectId;
    status?: string;
    metadata?: any;
}
/**
 * Create an audit log entry
 * Wraps the AuditLog model's log method
 */
export declare const createAuditLog: (params: CreateAuditLogParams) => Promise<any>;
