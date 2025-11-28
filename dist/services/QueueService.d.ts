/**
 * Queue Service for Background Jobs
 *
 * Uses Bull queue with Redis for reliable background job processing
 *
 * Features:
 * - Async email sending
 * - SMS notifications
 * - Report generation
 * - Analytics calculations
 * - Audit log writes
 * - Cache warming
 * - Data exports
 * - Job retries with exponential backoff
 * - Job monitoring and health checks
 */
import { Job, JobOptions } from 'bull';
interface EmailJobData {
    to: string | string[];
    subject: string;
    body: string;
    html?: string;
    from?: string;
}
interface SMSJobData {
    to: string;
    message: string;
}
interface ReportJobData {
    merchantId: string;
    reportType: string;
    format: 'pdf' | 'csv' | 'xlsx';
    dateRange?: {
        start: Date;
        end: Date;
    };
    email?: string;
}
interface AnalyticsJobData {
    merchantId: string;
    type: string;
    data: any;
}
interface AuditLogJobData {
    merchantId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    userId?: string;
    metadata?: any;
}
interface CacheWarmupJobData {
    keys: string[];
    priority?: 'high' | 'normal' | 'low';
}
export declare class QueueService {
    private static emailQueue;
    private static smsQueue;
    private static reportQueue;
    private static analyticsQueue;
    private static auditLogQueue;
    private static cacheWarmupQueue;
    private static isInitialized;
    /**
     * Initialize all queues
     */
    static initialize(): Promise<void>;
    /**
     * Add email job to queue
     */
    static sendEmail(data: EmailJobData, options?: JobOptions): Promise<Job<EmailJobData> | null>;
    /**
     * Add SMS job to queue
     */
    static sendSMS(data: SMSJobData, options?: JobOptions): Promise<Job<SMSJobData> | null>;
    /**
     * Add report generation job to queue
     */
    static generateReport(data: ReportJobData, options?: JobOptions): Promise<Job<ReportJobData> | null>;
    /**
     * Add analytics calculation job to queue
     */
    static calculateAnalytics(data: AnalyticsJobData, options?: JobOptions): Promise<Job<AnalyticsJobData> | null>;
    /**
     * Add audit log job to queue
     */
    static writeAuditLog(data: AuditLogJobData, options?: JobOptions): Promise<Job<AuditLogJobData> | null>;
    /**
     * Add cache warmup job to queue
     */
    static warmupCache(data: CacheWarmupJobData, options?: JobOptions): Promise<Job<CacheWarmupJobData> | null>;
    /**
     * Get queue health status
     */
    static getHealthStatus(): Promise<any>;
    /**
     * Setup email processor
     */
    private static setupEmailProcessor;
    /**
     * Setup SMS processor
     */
    private static setupSMSProcessor;
    /**
     * Setup report processor
     */
    private static setupReportProcessor;
    /**
     * Setup analytics processor
     */
    private static setupAnalyticsProcessor;
    /**
     * Setup audit log processor
     */
    private static setupAuditLogProcessor;
    /**
     * Setup cache warmup processor
     */
    private static setupCacheWarmupProcessor;
    /**
     * Setup event listeners for all queues
     */
    private static setupEventListeners;
    /**
     * Shutdown queue service
     */
    static shutdown(): Promise<void>;
}
export {};
