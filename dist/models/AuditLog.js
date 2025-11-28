"use strict";
// Audit Log Model - Merchant Backend
// Tracks all merchant activities for compliance and security
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
    merchantId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Merchant',
        required: [true, 'Merchant ID is required'],
        index: true
    },
    merchantUserId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User', // For team members
        index: true
    },
    action: {
        type: String,
        required: [true, 'Action is required'],
        trim: true,
        maxlength: [100, 'Action cannot exceed 100 characters'],
        index: true
    },
    resourceType: {
        type: String,
        required: [true, 'Resource type is required'],
        trim: true,
        maxlength: [50, 'Resource type cannot exceed 50 characters'],
        index: true
    },
    resourceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        index: true
    },
    details: {
        before: {
            type: mongoose_1.Schema.Types.Mixed
        },
        after: {
            type: mongoose_1.Schema.Types.Mixed
        },
        changes: {
            type: mongoose_1.Schema.Types.Mixed
        },
        metadata: {
            type: mongoose_1.Schema.Types.Mixed
        }
    },
    ipAddress: {
        type: String,
        required: true,
        trim: true
    },
    userAgent: {
        type: String,
        required: true,
        trim: true
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'error', 'critical'],
        default: 'info',
        index: true
    }
}, {
    timestamps: true
});
// Compound indexes for efficient querying
AuditLogSchema.index({ merchantId: 1, timestamp: -1 });
AuditLogSchema.index({ merchantId: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
AuditLogSchema.index({ merchantUserId: 1, timestamp: -1 });
AuditLogSchema.index({ severity: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
// Auto-delete logs older than 1 year (configurable retention)
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 } // 1 year default
);
// Static method to create audit log
AuditLogSchema.statics.log = async function (data) {
    try {
        const log = new this({
            merchantId: data.merchantId,
            merchantUserId: data.merchantUserId,
            action: data.action,
            resourceType: data.resourceType,
            resourceId: data.resourceId,
            details: data.details || {},
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            severity: data.severity || 'info',
            timestamp: new Date()
        });
        // Save asynchronously without waiting
        setImmediate(() => {
            log.save().catch((error) => {
                console.error('❌ [AUDIT] Failed to create log:', error);
            });
        });
        return log;
    }
    catch (error) {
        console.error('❌ [AUDIT] Failed to create log:', error);
        // Don't throw error - audit logging should never break the main flow
        return null;
    }
};
// Static method to get merchant activity
AuditLogSchema.statics.getMerchantActivity = async function (merchantId, options) {
    const query = { merchantId };
    if (options?.resourceType) {
        query.resourceType = options.resourceType;
    }
    if (options?.action) {
        query.action = options.action;
    }
    if (options?.severity) {
        query.severity = options.severity;
    }
    if (options?.merchantUserId) {
        query.merchantUserId = options.merchantUserId;
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
        .populate('merchantUserId', 'name email')
        .lean();
};
// Static method to get resource history
AuditLogSchema.statics.getResourceHistory = async function (resourceType, resourceId, options) {
    return this.find({ resourceType, resourceId })
        .sort({ timestamp: -1 })
        .limit(options?.limit || 50)
        .skip(options?.skip || 0)
        .populate('merchantUserId', 'name email')
        .lean();
};
const AuditLog = mongoose_1.default.model('AuditLog', AuditLogSchema);
exports.default = AuditLog;
