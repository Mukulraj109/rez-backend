import { Types } from 'mongoose';
export interface RetentionPolicy {
    merchantId: string | Types.ObjectId;
    retentionDays: number;
    autoArchive: boolean;
    archivePath?: string;
}
export declare class AuditRetentionService {
    private static DEFAULT_RETENTION_DAYS;
    private static ARCHIVE_DIR;
    /**
     * Initialize archive directory
     */
    static initialize(): Promise<void>;
    /**
     * Archive old logs before deletion
     */
    static archiveOldLogs(merchantId: string | Types.ObjectId, olderThan: Date): Promise<string | null>;
    /**
     * Delete old logs
     */
    static deleteOldLogs(merchantId: string | Types.ObjectId, olderThan: Date): Promise<number>;
    /**
     * Clean up logs (archive + delete)
     */
    static cleanupLogs(merchantId: string | Types.ObjectId, retentionDays?: number, autoArchive?: boolean): Promise<{
        archived: boolean;
        archivePath: string | null;
        deleted: number;
    }>;
    /**
     * Cleanup all merchants (scheduled task)
     */
    static cleanupAllMerchants(retentionDays?: number): Promise<{
        total: number;
        succeeded: number;
        failed: number;
        results: Array<{
            merchantId: string;
            deleted: number;
            archived: boolean;
        }>;
    }>;
    /**
     * Get storage stats
     */
    static getStorageStats(merchantId?: string | Types.ObjectId): Promise<{
        totalLogs: number;
        oldestLog: Date | null;
        newestLog: Date | null;
        estimatedSizeMB: number;
        byMonth: Array<{
            month: string;
            count: number;
        }>;
    }>;
    /**
     * Get compliance report
     */
    static getComplianceReport(merchantId: string | Types.ObjectId): Promise<{
        merchantId: string;
        totalLogs: number;
        retentionPeriodDays: number;
        oldestLog: Date | null;
        logsToBeDeleted: number;
        nextCleanupDate: Date;
        complianceStatus: 'compliant' | 'warning' | 'non-compliant';
        recommendations: string[];
    }>;
    /**
     * Schedule automatic cleanup (call from cron job)
     */
    static scheduleCleanup(): Promise<void>;
    /**
     * Export archive list
     */
    static getArchiveList(): Promise<Array<{
        filename: string;
        size: number;
        created: Date;
    }>>;
}
export default AuditRetentionService;
