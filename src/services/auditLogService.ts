import AuditLog from '../models/AuditLog';
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
export const createAuditLog = async (params: CreateAuditLogParams): Promise<any> => {
  try {
    // If status is provided, add it to metadata
    const metadata = params.status
      ? { ...params.metadata, status: params.status }
      : params.metadata;

    return await AuditLog.log({
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      metadata: metadata,
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw - audit logging should never break the main flow
    return null;
  }
};

