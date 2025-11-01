// Audit Log Model
// Tracks all critical actions for compliance and security

import mongoose, { Schema, Document, Types } from 'mongoose';

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

const AuditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
    maxlength: [100, 'Action cannot exceed 100 characters'],
    index: true
  },
  resource: {
    type: String,
    required: [true, 'Resource is required'],
    trim: true,
    maxlength: [50, 'Resource cannot exceed 50 characters'],
    index: true
  },
  resourceId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  changes: {
    type: Schema.Types.Mixed
  },
  metadata: {
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    deviceFingerprint: {
      type: String,
      trim: true
    }
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Compound indexes for efficient querying
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ resourceId: 1, timestamp: -1 });

// Auto-delete logs older than 7 years (GDPR compliance)
AuditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 7 * 365 * 24 * 60 * 60 } // 7 years
);

// Static method to create audit log
AuditLogSchema.statics.log = async function(data: {
  userId: string | Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string | Types.ObjectId;
  changes?: any;
  metadata?: any;
}) {
  try {
    const log = new this({
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      changes: data.changes,
      metadata: data.metadata,
      timestamp: new Date()
    });

    await log.save();
    console.log('📝 [AUDIT] Log created:', { action: data.action, resource: data.resource });
    return log;
  } catch (error) {
    console.error('❌ [AUDIT] Failed to create log:', error);
    // Don't throw error - audit logging should never break the main flow
    return null;
  }
};

// Static method to get user activity
AuditLogSchema.statics.getUserActivity = async function(
  userId: string | Types.ObjectId,
  options?: {
    limit?: number;
    skip?: number;
    resource?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const query: any = { userId };

  if (options?.resource) {
    query.resource = options.resource;
  }

  if (options?.action) {
    query.action = options.action;
  }

  if (options?.startDate || options?.endDate) {
    query.timestamp = {};
    if (options.startDate) {
      query.timestamp.$gte = options.startDate;
    }
    if (options.endDate) {
      query.timestamp.$lte = options.endDate;
    }
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options?.limit || 100)
    .skip(options?.skip || 0)
    .lean();
};

export interface IAuditLogModel extends mongoose.Model<IAuditLog> {
  log(data: {
    userId: string | Types.ObjectId;
    action: string;
    resource: string;
    resourceId?: string | Types.ObjectId;
    changes?: any;
    metadata?: any;
  }): Promise<IAuditLog | null>;

  getUserActivity(
    userId: string | Types.ObjectId,
    options?: {
      limit?: number;
      skip?: number;
      resource?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<IAuditLog[]>;
}

const AuditLog = mongoose.model<IAuditLog, IAuditLogModel>('AuditLog', AuditLogSchema);

export default AuditLog;
