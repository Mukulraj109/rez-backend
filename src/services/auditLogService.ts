// Audit Log Service
// Service for creating and managing audit logs

import { Types } from 'mongoose';
import AuditLog from '../models/AuditLog';

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
export const createAuditLog = async (data: CreateAuditLogData) => {
  try {
    // Convert status to metadata if provided
    const metadata = {
      ...data.metadata,
      ...(data.status && { status: data.status })
    };

    return await AuditLog.log({
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      changes: data.changes,
      metadata
    });
  } catch (error) {
    console.error('[AuditLogService] Error creating audit log:', error);
    // Don't throw - audit logging should never break the main flow
    return null;
  }
};

/**
 * Get user activity logs
 */
export const getUserActivity = async (
  userId: string | Types.ObjectId,
  options?: {
    limit?: number;
    skip?: number;
    resource?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }
) => {
  try {
    return await AuditLog.getUserActivity(userId, options);
  } catch (error) {
    console.error('[AuditLogService] Error getting user activity:', error);
    return [];
  }
};

/**
 * Get audit logs for a specific resource
 */
export const getResourceLogs = async (
  resourceId: string | Types.ObjectId,
  options?: {
    limit?: number;
    skip?: number;
    action?: string;
  }
) => {
  try {
    const query: any = { resourceId };

    if (options?.action) {
      query.action = options.action;
    }

    return await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(options?.limit || 100)
      .skip(options?.skip || 0)
      .lean();
  } catch (error) {
    console.error('[AuditLogService] Error getting resource logs:', error);
    return [];
  }
};
