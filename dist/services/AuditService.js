"use strict";
// Comprehensive Audit Service for Merchant Backend
// Tracks all merchant activities and changes
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const XLSX = __importStar(require("xlsx"));
const changeDetector_1 = require("../utils/changeDetector");
class AuditService {
    /**
     * Generic log method for creating audit entries
     */
    static async log(params) {
        try {
            await AuditLog_1.default.log({
                merchantId: params.merchantId,
                merchantUserId: params.merchantUserId,
                action: params.action,
                resourceType: params.resourceType,
                resourceId: params.resourceId,
                details: params.details || {},
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
                severity: params.severity || 'info'
            });
        }
        catch (error) {
            console.error('❌ [AUDIT] Logging failed:', error);
            // Never throw - audit logging should not break the main flow
        }
    }
    /**
     * Log product-related changes
     */
    static async logProductChange(merchantId, productId, before, after, merchantUserId, req) {
        const changes = (0, changeDetector_1.detectChanges)(before, after);
        await this.log({
            merchantId,
            merchantUserId,
            action: before ? 'product.updated' : 'product.created',
            resourceType: 'product',
            resourceId: productId,
            details: {
                before,
                after,
                changes,
                metadata: {
                    changedFields: changes.map(c => c.field)
                }
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: 'info'
        });
    }
    /**
     * Log order-related changes
     */
    static async logOrderChange(merchantId, orderId, before, after, merchantUserId, req) {
        const changes = (0, changeDetector_1.detectChanges)(before, after);
        const statusChanged = changes.find(c => c.field === 'status');
        await this.log({
            merchantId,
            merchantUserId,
            action: statusChanged ? 'order.status_changed' : 'order.updated',
            resourceType: 'order',
            resourceId: orderId,
            details: {
                before,
                after,
                changes,
                metadata: {
                    previousStatus: statusChanged?.before,
                    newStatus: statusChanged?.after
                }
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: statusChanged?.after === 'cancelled' ? 'warning' : 'info'
        });
    }
    /**
     * Log store/merchant profile changes
     */
    static async logStoreChange(merchantId, storeId, before, after, merchantUserId, req) {
        const changes = (0, changeDetector_1.detectChanges)(before, after);
        await this.log({
            merchantId,
            merchantUserId,
            action: before ? 'store.updated' : 'store.created',
            resourceType: 'store',
            resourceId: storeId,
            details: {
                before,
                after,
                changes
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: 'info'
        });
    }
    /**
     * Log user/team member actions
     */
    static async logUserAction(merchantId, userId, action, details, req) {
        await this.log({
            merchantId,
            merchantUserId: userId,
            action,
            resourceType: 'user',
            resourceId: userId,
            details: { metadata: details },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: action.includes('removed') || action.includes('suspended') ? 'warning' : 'info'
        });
    }
    /**
     * Log security events
     */
    static async logSecurityEvent(merchantId, event, details, req) {
        await this.log({
            merchantId,
            action: `security.${event}`,
            resourceType: 'security',
            details: { metadata: details },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: event.includes('failed') || event.includes('suspicious') ? 'critical' : 'warning'
        });
    }
    /**
     * Log API calls (for monitoring)
     */
    static async logApiCall(req, res, duration) {
        // Only log important API calls, skip GET requests
        if (req.method === 'GET')
            return;
        const merchant = req.merchant;
        if (!merchant)
            return;
        await this.log({
            merchantId: merchant._id,
            merchantUserId: req.merchantUser?._id,
            action: `api.${req.method.toLowerCase()}`,
            resourceType: 'api',
            details: {
                metadata: {
                    path: req.path,
                    method: req.method,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`,
                    body: this.sanitizeBody(req.body)
                }
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: res.statusCode >= 400 ? 'error' : 'info'
        });
    }
    /**
     * Get audit logs with filtering
     */
    static async getAuditLogs(merchantId, filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const skip = (page - 1) * limit;
        const logs = await AuditLog_1.default.getMerchantActivity(merchantId, {
            action: filters.action,
            resourceType: filters.resourceType,
            merchantUserId: filters.merchantUserId,
            severity: filters.severity,
            startDate: filters.startDate,
            endDate: filters.endDate,
            limit,
            skip
        });
        const total = await AuditLog_1.default.countDocuments({
            merchantId,
            ...(filters.action && { action: filters.action }),
            ...(filters.resourceType && { resourceType: filters.resourceType }),
            ...(filters.severity && { severity: filters.severity }),
            ...(filters.merchantUserId && { merchantUserId: filters.merchantUserId }),
            ...((filters.startDate || filters.endDate) && {
                timestamp: {
                    ...(filters.startDate && { $gte: filters.startDate }),
                    ...(filters.endDate && { $lte: filters.endDate })
                }
            })
        });
        return {
            logs,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }
    /**
     * Get resource history
     */
    static async getResourceHistory(resourceType, resourceId) {
        return await AuditLog_1.default.getResourceHistory(resourceType, resourceId);
    }
    /**
     * Get user activity
     */
    static async getUserActivity(merchantUserId, options) {
        const query = { merchantUserId };
        if (options?.startDate || options?.endDate) {
            query.timestamp = {};
            if (options.startDate) {
                query.timestamp.$gte = options.startDate;
            }
            if (options.endDate) {
                query.timestamp.$lte = options.endDate;
            }
        }
        return await AuditLog_1.default.find(query)
            .sort({ timestamp: -1 })
            .limit(options?.limit || 100)
            .lean();
    }
    /**
     * Export audit logs to CSV or Excel
     */
    static async exportAuditLogs(merchantId, startDate, endDate, format = 'csv') {
        const logs = await AuditLog_1.default.find({
            merchantId,
            timestamp: {
                $gte: startDate,
                $lte: endDate
            }
        })
            .sort({ timestamp: -1 })
            .populate('merchantUserId', 'name email')
            .lean();
        // Format data for export
        const data = logs.map(log => ({
            Timestamp: log.timestamp,
            Action: log.action,
            ResourceType: log.resourceType,
            ResourceId: log.resourceId?.toString() || '',
            User: log.merchantUserId?.name || 'System',
            UserEmail: log.merchantUserId?.email || '',
            IPAddress: log.ipAddress,
            Severity: log.severity,
            Changes: JSON.stringify(log.details?.changes || {}),
            Metadata: JSON.stringify(log.details?.metadata || {})
        }));
        // Create workbook
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
        // Generate buffer
        if (format === 'csv') {
            const csv = XLSX.utils.sheet_to_csv(ws);
            return Buffer.from(csv, 'utf-8');
        }
        else {
            return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        }
    }
    /**
     * Get audit statistics
     */
    static async getAuditStats(merchantId, startDate, endDate) {
        const query = { merchantId };
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate)
                query.timestamp.$gte = startDate;
            if (endDate)
                query.timestamp.$lte = endDate;
        }
        const [totalLogs, logsByAction, logsBySeverity, recentActivity] = await Promise.all([
            AuditLog_1.default.countDocuments(query),
            AuditLog_1.default.aggregate([
                { $match: query },
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            AuditLog_1.default.aggregate([
                { $match: query },
                { $group: { _id: '$severity', count: { $sum: 1 } } }
            ]),
            AuditLog_1.default.find(query)
                .sort({ timestamp: -1 })
                .limit(10)
                .populate('merchantUserId', 'name email')
                .lean()
        ]);
        return {
            totalLogs,
            logsByAction: logsByAction.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            logsBySeverity: logsBySeverity.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            recentActivity
        };
    }
    /**
     * Sanitize request body (remove sensitive data)
     */
    static sanitizeBody(body) {
        if (!body)
            return {};
        const sanitized = { ...body };
        const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'creditCard', 'cvv'];
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }
        return sanitized;
    }
    /**
     * Log authentication events
     */
    static async logAuth(merchantId, action, details, req) {
        await this.log({
            merchantId,
            action: `auth.${action}`,
            resourceType: 'auth',
            details: { metadata: details },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: action === 'failed_login' ? 'warning' : 'info'
        });
    }
    /**
     * Log product deletion
     */
    static async logProductDeleted(merchantId, productId, productData, merchantUserId, req) {
        await this.log({
            merchantId,
            merchantUserId,
            action: 'product.deleted',
            resourceType: 'product',
            resourceId: productId,
            details: {
                before: productData,
                metadata: {
                    name: productData.name,
                    sku: productData.sku
                }
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: 'warning'
        });
    }
    /**
     * Log bulk operations
     */
    static async logBulkOperation(merchantId, action, resourceType, count, merchantUserId, req) {
        await this.log({
            merchantId,
            merchantUserId,
            action: `${resourceType}.${action}`,
            resourceType,
            details: {
                metadata: {
                    operation: 'bulk',
                    count,
                    action
                }
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: action.includes('delete') ? 'warning' : 'info'
        });
    }
    /**
     * Log settings changes
     */
    static async logSettingsChange(merchantId, settingType, before, after, merchantUserId, req) {
        const changes = (0, changeDetector_1.detectChanges)(before, after);
        await this.log({
            merchantId,
            merchantUserId,
            action: `settings.${settingType}_updated`,
            resourceType: 'settings',
            details: {
                before,
                after,
                changes
            },
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            severity: settingType === 'bank_details' ? 'warning' : 'info'
        });
    }
}
exports.AuditService = AuditService;
exports.default = AuditService;
