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
 */
const createAuditLog = async (params) => {
    try {
        // If status is provided, add it to metadata
        const metadata = params.status
            ? { ...params.metadata, status: params.status }
            : params.metadata;
        return await AuditLog_1.default.log({
            userId: params.userId,
            action: params.action,
            resource: params.resource,
            resourceId: params.resourceId,
            metadata: metadata,
        });
    }
    catch (error) {
        console.error('Error creating audit log:', error);
        // Don't throw - audit logging should never break the main flow
        return null;
    }
};
exports.createAuditLog = createAuditLog;
