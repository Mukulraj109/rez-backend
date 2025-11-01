"use strict";
// Audit Log Service
// Service for creating and managing audit logs
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResourceLogs = exports.getUserActivity = exports.createAuditLog = void 0;
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
/**
 * Create an audit log entry
 * This function wraps the AuditLog model's log method
 */
const createAuditLog = async (data) => {
    try {
        // Convert status to metadata if provided
        const metadata = {
            ...data.metadata,
            ...(data.status && { status: data.status })
        };
        return await AuditLog_1.default.log({
            userId: data.userId,
            action: data.action,
            resource: data.resource,
            resourceId: data.resourceId,
            changes: data.changes,
            metadata
        });
    }
    catch (error) {
        console.error('[AuditLogService] Error creating audit log:', error);
        // Don't throw - audit logging should never break the main flow
        return null;
    }
};
exports.createAuditLog = createAuditLog;
/**
 * Get user activity logs
 */
const getUserActivity = async (userId, options) => {
    try {
        return await AuditLog_1.default.getUserActivity(userId, options);
    }
    catch (error) {
        console.error('[AuditLogService] Error getting user activity:', error);
        return [];
    }
};
exports.getUserActivity = getUserActivity;
/**
 * Get audit logs for a specific resource
 */
const getResourceLogs = async (resourceId, options) => {
    try {
        const query = { resourceId };
        if (options?.action) {
            query.action = options.action;
        }
        return await AuditLog_1.default.find(query)
            .sort({ timestamp: -1 })
            .limit(options?.limit || 100)
            .skip(options?.skip || 0)
            .lean();
    }
    catch (error) {
        console.error('[AuditLogService] Error getting resource logs:', error);
        return [];
    }
};
exports.getResourceLogs = getResourceLogs;
