"use strict";
// Audit Retention Service
// Manages audit log retention, archival, and cleanup
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
exports.AuditRetentionService = void 0;
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const XLSX = __importStar(require("xlsx"));
class AuditRetentionService {
    /**
     * Initialize archive directory
     */
    static async initialize() {
        try {
            if (!fs.existsSync(this.ARCHIVE_DIR)) {
                fs.mkdirSync(this.ARCHIVE_DIR, { recursive: true });
                console.log('✅ [RETENTION] Archive directory created:', this.ARCHIVE_DIR);
            }
        }
        catch (error) {
            console.error('❌ [RETENTION] Failed to create archive directory:', error);
        }
    }
    /**
     * Archive old logs before deletion
     */
    static async archiveOldLogs(merchantId, olderThan) {
        try {
            const logs = await AuditLog_1.default.find({
                merchantId,
                timestamp: { $lt: olderThan }
            })
                .sort({ timestamp: -1 })
                .lean();
            if (logs.length === 0) {
                console.log('ℹ️ [RETENTION] No logs to archive for merchant:', merchantId);
                return null;
            }
            // Format data for export
            const data = logs.map(log => ({
                Timestamp: log.timestamp,
                MerchantId: log.merchantId?.toString(),
                UserId: log.merchantUserId?.toString() || '',
                Action: log.action,
                ResourceType: log.resourceType,
                ResourceId: log.resourceId?.toString() || '',
                IPAddress: log.ipAddress,
                UserAgent: log.userAgent,
                Severity: log.severity,
                DetailsBefore: JSON.stringify(log.details?.before || {}),
                DetailsAfter: JSON.stringify(log.details?.after || {}),
                DetailsChanges: JSON.stringify(log.details?.changes || {}),
                DetailsMetadata: JSON.stringify(log.details?.metadata || {})
            }));
            // Create Excel file
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
            // Generate filename
            const filename = `audit_logs_${merchantId}_${Date.now()}.xlsx`;
            const filepath = path.join(this.ARCHIVE_DIR, filename);
            // Write file
            XLSX.writeFile(wb, filepath);
            console.log(`✅ [RETENTION] Archived ${logs.length} logs to:`, filepath);
            return filepath;
        }
        catch (error) {
            console.error('❌ [RETENTION] Failed to archive logs:', error);
            return null;
        }
    }
    /**
     * Delete old logs
     */
    static async deleteOldLogs(merchantId, olderThan) {
        try {
            const result = await AuditLog_1.default.deleteMany({
                merchantId,
                timestamp: { $lt: olderThan }
            });
            console.log(`✅ [RETENTION] Deleted ${result.deletedCount} old logs for merchant:`, merchantId);
            return result.deletedCount || 0;
        }
        catch (error) {
            console.error('❌ [RETENTION] Failed to delete old logs:', error);
            return 0;
        }
    }
    /**
     * Clean up logs (archive + delete)
     */
    static async cleanupLogs(merchantId, retentionDays = this.DEFAULT_RETENTION_DAYS, autoArchive = true) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
            let archivePath = null;
            // Archive if enabled
            if (autoArchive) {
                archivePath = await this.archiveOldLogs(merchantId, cutoffDate);
            }
            // Delete old logs
            const deleted = await this.deleteOldLogs(merchantId, cutoffDate);
            return {
                archived: archivePath !== null,
                archivePath,
                deleted
            };
        }
        catch (error) {
            console.error('❌ [RETENTION] Failed to cleanup logs:', error);
            return {
                archived: false,
                archivePath: null,
                deleted: 0
            };
        }
    }
    /**
     * Cleanup all merchants (scheduled task)
     */
    static async cleanupAllMerchants(retentionDays = this.DEFAULT_RETENTION_DAYS) {
        try {
            // Get all unique merchant IDs
            const merchantIds = await AuditLog_1.default.distinct('merchantId');
            const results = [];
            let succeeded = 0;
            let failed = 0;
            for (const merchantId of merchantIds) {
                try {
                    const result = await this.cleanupLogs(merchantId, retentionDays, true);
                    results.push({
                        merchantId: merchantId.toString(),
                        deleted: result.deleted,
                        archived: result.archived
                    });
                    succeeded++;
                }
                catch (error) {
                    console.error('❌ [RETENTION] Failed to cleanup merchant:', merchantId, error);
                    failed++;
                }
            }
            console.log(`✅ [RETENTION] Cleanup complete: ${succeeded} succeeded, ${failed} failed`);
            return {
                total: merchantIds.length,
                succeeded,
                failed,
                results
            };
        }
        catch (error) {
            console.error('❌ [RETENTION] Failed to cleanup all merchants:', error);
            return {
                total: 0,
                succeeded: 0,
                failed: 0,
                results: []
            };
        }
    }
    /**
     * Get storage stats
     */
    static async getStorageStats(merchantId) {
        try {
            const query = merchantId ? { merchantId } : {};
            const [totalLogs, oldestLog, newestLog, byMonth] = await Promise.all([
                AuditLog_1.default.countDocuments(query),
                AuditLog_1.default.findOne(query).sort({ timestamp: 1 }).select('timestamp').lean(),
                AuditLog_1.default.findOne(query).sort({ timestamp: -1 }).select('timestamp').lean(),
                AuditLog_1.default.aggregate([
                    { $match: query },
                    {
                        $group: {
                            _id: {
                                $dateToString: { format: '%Y-%m', date: '$timestamp' }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: -1 } },
                    { $limit: 12 }
                ])
            ]);
            // Estimate size (rough calculation: ~1KB per log entry)
            const estimatedSizeMB = (totalLogs * 1024) / (1024 * 1024);
            return {
                totalLogs,
                oldestLog: oldestLog?.timestamp || null,
                newestLog: newestLog?.timestamp || null,
                estimatedSizeMB: Math.round(estimatedSizeMB * 100) / 100,
                byMonth: byMonth.map(item => ({
                    month: item._id,
                    count: item.count
                }))
            };
        }
        catch (error) {
            console.error('❌ [RETENTION] Failed to get storage stats:', error);
            return {
                totalLogs: 0,
                oldestLog: null,
                newestLog: null,
                estimatedSizeMB: 0,
                byMonth: []
            };
        }
    }
    /**
     * Get compliance report
     */
    static async getComplianceReport(merchantId) {
        try {
            const stats = await this.getStorageStats(merchantId);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.DEFAULT_RETENTION_DAYS);
            const logsToBeDeleted = await AuditLog_1.default.countDocuments({
                merchantId,
                timestamp: { $lt: cutoffDate }
            });
            const nextCleanupDate = new Date();
            nextCleanupDate.setDate(nextCleanupDate.getDate() + 7); // Weekly cleanup
            const recommendations = [];
            let complianceStatus = 'compliant';
            // Check compliance
            if (logsToBeDeleted > 1000) {
                complianceStatus = 'warning';
                recommendations.push('Large number of logs pending deletion. Consider running cleanup.');
            }
            if (stats.estimatedSizeMB > 100) {
                complianceStatus = 'warning';
                recommendations.push('Audit logs consuming significant storage. Review retention policy.');
            }
            if (!stats.oldestLog || (new Date().getTime() - stats.oldestLog.getTime()) >
                (this.DEFAULT_RETENTION_DAYS * 2 * 24 * 60 * 60 * 1000)) {
                complianceStatus = 'non-compliant';
                recommendations.push('Logs older than retention policy detected. Immediate cleanup required.');
            }
            return {
                merchantId: merchantId.toString(),
                totalLogs: stats.totalLogs,
                retentionPeriodDays: this.DEFAULT_RETENTION_DAYS,
                oldestLog: stats.oldestLog,
                logsToBeDeleted,
                nextCleanupDate,
                complianceStatus,
                recommendations
            };
        }
        catch (error) {
            console.error('❌ [RETENTION] Failed to generate compliance report:', error);
            throw error;
        }
    }
    /**
     * Schedule automatic cleanup (call from cron job)
     */
    static async scheduleCleanup() {
        console.log('🔄 [RETENTION] Starting scheduled cleanup...');
        const result = await this.cleanupAllMerchants();
        console.log('✅ [RETENTION] Scheduled cleanup completed:', result);
    }
    /**
     * Export archive list
     */
    static async getArchiveList() {
        try {
            await this.initialize();
            const files = fs.readdirSync(this.ARCHIVE_DIR);
            return files
                .filter(file => file.endsWith('.xlsx'))
                .map(file => {
                const filepath = path.join(this.ARCHIVE_DIR, file);
                const stats = fs.statSync(filepath);
                return {
                    filename: file,
                    size: stats.size,
                    created: stats.birthtime
                };
            })
                .sort((a, b) => b.created.getTime() - a.created.getTime());
        }
        catch (error) {
            console.error('❌ [RETENTION] Failed to get archive list:', error);
            return [];
        }
    }
}
exports.AuditRetentionService = AuditRetentionService;
// Default retention period (1 year)
AuditRetentionService.DEFAULT_RETENTION_DAYS = 365;
// Archive directory
AuditRetentionService.ARCHIVE_DIR = path.join(process.cwd(), 'archives', 'audit-logs');
exports.default = AuditRetentionService;
