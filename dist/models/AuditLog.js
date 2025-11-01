"use strict";
// Audit Log Model
// Tracks all critical actions for compliance and security
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const AuditLogSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        type: mongoose_1.Schema.Types.ObjectId,
        index: true
    },
    changes: {
        type: mongoose_1.Schema.Types.Mixed
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
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 365 * 24 * 60 * 60 } // 7 years
);
// Static method to create audit log
AuditLogSchema.statics.log = async function (data) {
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
    }
    catch (error) {
        console.error('❌ [AUDIT] Failed to create log:', error);
        // Don't throw error - audit logging should never break the main flow
        return null;
    }
};
// Static method to get user activity
AuditLogSchema.statics.getUserActivity = async function (userId, options) {
    const query = { userId };
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
const AuditLog = mongoose_1.default.model('AuditLog', AuditLogSchema);
exports.default = AuditLog;
