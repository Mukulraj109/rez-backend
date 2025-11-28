"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const bull_1 = __importDefault(require("bull"));
const redis_1 = require("../config/redis");
class QueueService {
    /**
     * Initialize all queues
     */
    static async initialize() {
        if (this.isInitialized) {
            console.log('⚠️ Queue service already initialized');
            return;
        }
        try {
            const redisConfig = (0, redis_1.getRedisConfig)();
            if (!redisConfig.enabled) {
                console.log('⚠️ Queue service disabled (Redis not available)');
                return;
            }
            const redisOptions = {
                redis: {
                    host: redisConfig.url.split('://')[1]?.split(':')[0] || 'localhost',
                    port: parseInt(redisConfig.url.split(':')[2] || '6379'),
                    password: redisConfig.password,
                    maxRetriesPerRequest: redisConfig.maxRetries
                }
            };
            // Initialize queues
            this.emailQueue = new bull_1.default('email', redisOptions);
            this.smsQueue = new bull_1.default('sms', redisOptions);
            this.reportQueue = new bull_1.default('report', redisOptions);
            this.analyticsQueue = new bull_1.default('analytics', redisOptions);
            this.auditLogQueue = new bull_1.default('auditLog', redisOptions);
            this.cacheWarmupQueue = new bull_1.default('cacheWarmup', redisOptions);
            // Setup processors
            this.setupEmailProcessor();
            this.setupSMSProcessor();
            this.setupReportProcessor();
            this.setupAnalyticsProcessor();
            this.setupAuditLogProcessor();
            this.setupCacheWarmupProcessor();
            // Setup event listeners
            this.setupEventListeners();
            this.isInitialized = true;
            console.log('✅ Queue service initialized successfully');
        }
        catch (error) {
            console.error('❌ Failed to initialize queue service:', error);
            throw error;
        }
    }
    /**
     * Add email job to queue
     */
    static async sendEmail(data, options) {
        if (!this.emailQueue) {
            console.error('Email queue not initialized');
            return null;
        }
        return await this.emailQueue.add(data, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000
            },
            removeOnComplete: true,
            removeOnFail: false,
            ...options
        });
    }
    /**
     * Add SMS job to queue
     */
    static async sendSMS(data, options) {
        if (!this.smsQueue) {
            console.error('SMS queue not initialized');
            return null;
        }
        return await this.smsQueue.add(data, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000
            },
            removeOnComplete: true,
            removeOnFail: false,
            ...options
        });
    }
    /**
     * Add report generation job to queue
     */
    static async generateReport(data, options) {
        if (!this.reportQueue) {
            console.error('Report queue not initialized');
            return null;
        }
        return await this.reportQueue.add(data, {
            attempts: 2,
            backoff: {
                type: 'exponential',
                delay: 5000
            },
            timeout: 300000, // 5 minutes
            removeOnComplete: false,
            removeOnFail: false,
            ...options
        });
    }
    /**
     * Add analytics calculation job to queue
     */
    static async calculateAnalytics(data, options) {
        if (!this.analyticsQueue) {
            console.error('Analytics queue not initialized');
            return null;
        }
        return await this.analyticsQueue.add(data, {
            attempts: 2,
            backoff: {
                type: 'fixed',
                delay: 10000
            },
            removeOnComplete: true,
            removeOnFail: false,
            ...options
        });
    }
    /**
     * Add audit log job to queue
     */
    static async writeAuditLog(data, options) {
        if (!this.auditLogQueue) {
            console.error('Audit log queue not initialized');
            return null;
        }
        return await this.auditLogQueue.add(data, {
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 1000
            },
            removeOnComplete: true,
            ...options
        });
    }
    /**
     * Add cache warmup job to queue
     */
    static async warmupCache(data, options) {
        if (!this.cacheWarmupQueue) {
            console.error('Cache warmup queue not initialized');
            return null;
        }
        return await this.cacheWarmupQueue.add(data, {
            priority: data.priority === 'high' ? 1 : data.priority === 'low' ? 10 : 5,
            removeOnComplete: true,
            ...options
        });
    }
    /**
     * Get queue health status
     */
    static async getHealthStatus() {
        const queues = [
            { name: 'Email', queue: this.emailQueue },
            { name: 'SMS', queue: this.smsQueue },
            { name: 'Report', queue: this.reportQueue },
            { name: 'Analytics', queue: this.analyticsQueue },
            { name: 'AuditLog', queue: this.auditLogQueue },
            { name: 'CacheWarmup', queue: this.cacheWarmupQueue }
        ];
        const health = await Promise.all(queues.map(async ({ name, queue }) => {
            if (!queue) {
                return { name, status: 'disabled' };
            }
            try {
                const [waiting, active, completed, failed, delayed] = await Promise.all([
                    queue.getWaitingCount(),
                    queue.getActiveCount(),
                    queue.getCompletedCount(),
                    queue.getFailedCount(),
                    queue.getDelayedCount()
                ]);
                return {
                    name,
                    status: 'healthy',
                    waiting,
                    active,
                    completed,
                    failed,
                    delayed
                };
            }
            catch (error) {
                return {
                    name,
                    status: 'unhealthy',
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }));
        return {
            timestamp: new Date().toISOString(),
            queues: health,
            overall: health.every(q => q.status === 'healthy' || q.status === 'disabled') ? 'healthy' : 'degraded'
        };
    }
    /**
     * Setup email processor
     */
    static setupEmailProcessor() {
        this.emailQueue?.process(async (job) => {
            console.log(`📧 Processing email job ${job.id}`);
            const { to, subject, body, html, from } = job.data;
            try {
                // TODO: Integrate with actual email service (SendGrid, SES, etc.)
                console.log(`Sending email to: ${to}`);
                console.log(`Subject: ${subject}`);
                // Simulate email sending
                await new Promise(resolve => setTimeout(resolve, 1000));
                return { success: true, messageId: `msg_${Date.now()}` };
            }
            catch (error) {
                console.error('Email sending failed:', error);
                throw error;
            }
        });
    }
    /**
     * Setup SMS processor
     */
    static setupSMSProcessor() {
        this.smsQueue?.process(async (job) => {
            console.log(`📱 Processing SMS job ${job.id}`);
            const { to, message } = job.data;
            try {
                // TODO: Integrate with actual SMS service (Twilio, SNS, etc.)
                console.log(`Sending SMS to: ${to}`);
                // Simulate SMS sending
                await new Promise(resolve => setTimeout(resolve, 500));
                return { success: true, messageId: `sms_${Date.now()}` };
            }
            catch (error) {
                console.error('SMS sending failed:', error);
                throw error;
            }
        });
    }
    /**
     * Setup report processor
     */
    static setupReportProcessor() {
        this.reportQueue?.process(async (job) => {
            console.log(`📊 Processing report job ${job.id}`);
            const { merchantId, reportType, format, dateRange, email } = job.data;
            try {
                // TODO: Implement report generation logic
                console.log(`Generating ${reportType} report for merchant ${merchantId}`);
                // Simulate report generation
                await new Promise(resolve => setTimeout(resolve, 5000));
                return {
                    success: true,
                    reportUrl: `https://reports.example.com/${merchantId}/${reportType}.${format}`,
                    generatedAt: new Date()
                };
            }
            catch (error) {
                console.error('Report generation failed:', error);
                throw error;
            }
        });
    }
    /**
     * Setup analytics processor
     */
    static setupAnalyticsProcessor() {
        this.analyticsQueue?.process(async (job) => {
            console.log(`📈 Processing analytics job ${job.id}`);
            const { merchantId, type, data } = job.data;
            try {
                // TODO: Implement analytics calculation logic
                console.log(`Calculating ${type} analytics for merchant ${merchantId}`);
                // Simulate analytics calculation
                await new Promise(resolve => setTimeout(resolve, 2000));
                return { success: true, calculatedAt: new Date() };
            }
            catch (error) {
                console.error('Analytics calculation failed:', error);
                throw error;
            }
        });
    }
    /**
     * Setup audit log processor
     */
    static setupAuditLogProcessor() {
        this.auditLogQueue?.process(async (job) => {
            const { merchantId, action, resourceType, resourceId, userId, metadata } = job.data;
            try {
                // TODO: Write to audit log database
                console.log(`Writing audit log: ${action} on ${resourceType}`);
                // Simulate audit log write
                await new Promise(resolve => setTimeout(resolve, 100));
                return { success: true, loggedAt: new Date() };
            }
            catch (error) {
                console.error('Audit log write failed:', error);
                throw error;
            }
        });
    }
    /**
     * Setup cache warmup processor
     */
    static setupCacheWarmupProcessor() {
        this.cacheWarmupQueue?.process(async (job) => {
            console.log(`🔥 Processing cache warmup job ${job.id}`);
            const { keys } = job.data;
            try {
                // TODO: Implement cache warmup logic
                console.log(`Warming up ${keys.length} cache keys`);
                // Simulate cache warmup
                await new Promise(resolve => setTimeout(resolve, 1000));
                return { success: true, warmedKeys: keys.length };
            }
            catch (error) {
                console.error('Cache warmup failed:', error);
                throw error;
            }
        });
    }
    /**
     * Setup event listeners for all queues
     */
    static setupEventListeners() {
        const queues = [
            this.emailQueue,
            this.smsQueue,
            this.reportQueue,
            this.analyticsQueue,
            this.auditLogQueue,
            this.cacheWarmupQueue
        ];
        queues.forEach(queue => {
            if (!queue)
                return;
            queue.on('completed', (job, result) => {
                console.log(`✅ Job ${job.id} completed in queue ${queue.name}`);
            });
            queue.on('failed', (job, err) => {
                console.error(`❌ Job ${job?.id} failed in queue ${queue.name}:`, err.message);
            });
            queue.on('stalled', (job) => {
                console.warn(`⚠️ Job ${job.id} stalled in queue ${queue.name}`);
            });
        });
    }
    /**
     * Shutdown queue service
     */
    static async shutdown() {
        const queues = [
            this.emailQueue,
            this.smsQueue,
            this.reportQueue,
            this.analyticsQueue,
            this.auditLogQueue,
            this.cacheWarmupQueue
        ];
        await Promise.all(queues.map(async (queue) => {
            if (queue) {
                await queue.close();
            }
        }));
        this.isInitialized = false;
        console.log('📦 Queue service shut down');
    }
}
exports.QueueService = QueueService;
QueueService.emailQueue = null;
QueueService.smsQueue = null;
QueueService.reportQueue = null;
QueueService.analyticsQueue = null;
QueueService.auditLogQueue = null;
QueueService.cacheWarmupQueue = null;
QueueService.isInitialized = false;
