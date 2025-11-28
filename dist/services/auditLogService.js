"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = void 0;
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
/**
 * Create an audit log entry
 * Wraps the AuditLog model's log method
 * Note: AuditLog requires merchantId, so this will only work if merchantId is provided
 * For user-backend, this will log to console if merchantId is not available
 */
const createAuditLog = async (params) => {
    try {
        // If merchantId is not provided, log to console instead (user-backend case)
        if (!params.merchantId) {
            console.log('[AUDIT LOG]', {
                userId: params.userId,
                action: params.action,
                resourceType: params.resourceType,
                resourceId: params.resourceId,
                status: params.status,
                metadata: params.metadata || params.details?.metadata,
                timestamp: new Date().toISOString()
            });
            return null;
        }
        // Use merchantId if provided (merchant-backend case)
        return await AuditLog_1.default.log({
            merchantId: params.merchantId,
            merchantUserId: params.merchantUserId || params.userId,
            action: params.action,
            resourceType: params.resourceType,
            resourceId: params.resourceId,
            details: params.details || {
                metadata: params.metadata,
                ...(params.status && { status: params.status })
            },
            ipAddress: params.ipAddress || 'unknown',
            userAgent: params.userAgent || 'unknown',
            severity: params.severity,
        });
    }
    catch (error) {
        console.error('Error creating audit log:', error);
        // Don't throw - audit logging should never break the main flow
        return null;
    }
};
exports.createAuditLog = createAuditLog;
