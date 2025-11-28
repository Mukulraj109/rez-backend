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

import Bull, { Queue, Job, JobOptions } from 'bull';
import { getRedisConfig } from '../config/redis';

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
  dateRange?: { start: Date; end: Date };
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

export class QueueService {
  private static emailQueue: Queue<EmailJobData> | null = null;
  private static smsQueue: Queue<SMSJobData> | null = null;
  private static reportQueue: Queue<ReportJobData> | null = null;
  private static analyticsQueue: Queue<AnalyticsJobData> | null = null;
  private static auditLogQueue: Queue<AuditLogJobData> | null = null;
  private static cacheWarmupQueue: Queue<CacheWarmupJobData> | null = null;

  private static isInitialized = false;

  /**
   * Initialize all queues
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Queue service already initialized');
      return;
    }

    try {
      const redisConfig = getRedisConfig();

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
      this.emailQueue = new Bull('email', redisOptions);
      this.smsQueue = new Bull('sms', redisOptions);
      this.reportQueue = new Bull('report', redisOptions);
      this.analyticsQueue = new Bull('analytics', redisOptions);
      this.auditLogQueue = new Bull('auditLog', redisOptions);
      this.cacheWarmupQueue = new Bull('cacheWarmup', redisOptions);

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

    } catch (error) {
      console.error('❌ Failed to initialize queue service:', error);
      throw error;
    }
  }

  /**
   * Add email job to queue
   */
  static async sendEmail(data: EmailJobData, options?: JobOptions): Promise<Job<EmailJobData> | null> {
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
  static async sendSMS(data: SMSJobData, options?: JobOptions): Promise<Job<SMSJobData> | null> {
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
  static async generateReport(data: ReportJobData, options?: JobOptions): Promise<Job<ReportJobData> | null> {
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
  static async calculateAnalytics(data: AnalyticsJobData, options?: JobOptions): Promise<Job<AnalyticsJobData> | null> {
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
  static async writeAuditLog(data: AuditLogJobData, options?: JobOptions): Promise<Job<AuditLogJobData> | null> {
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
  static async warmupCache(data: CacheWarmupJobData, options?: JobOptions): Promise<Job<CacheWarmupJobData> | null> {
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
  static async getHealthStatus(): Promise<any> {
    const queues = [
      { name: 'Email', queue: this.emailQueue },
      { name: 'SMS', queue: this.smsQueue },
      { name: 'Report', queue: this.reportQueue },
      { name: 'Analytics', queue: this.analyticsQueue },
      { name: 'AuditLog', queue: this.auditLogQueue },
      { name: 'CacheWarmup', queue: this.cacheWarmupQueue }
    ];

    const health = await Promise.all(
      queues.map(async ({ name, queue }) => {
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
        } catch (error) {
          return {
            name,
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    return {
      timestamp: new Date().toISOString(),
      queues: health,
      overall: health.every(q => q.status === 'healthy' || q.status === 'disabled') ? 'healthy' : 'degraded'
    };
  }

  /**
   * Setup email processor
   */
  private static setupEmailProcessor(): void {
    this.emailQueue?.process(async (job: Job<EmailJobData>) => {
      console.log(`📧 Processing email job ${job.id}`);
      const { to, subject, body, html, from } = job.data;

      try {
        // TODO: Integrate with actual email service (SendGrid, SES, etc.)
        console.log(`Sending email to: ${to}`);
        console.log(`Subject: ${subject}`);

        // Simulate email sending
        await new Promise(resolve => setTimeout(resolve, 1000));

        return { success: true, messageId: `msg_${Date.now()}` };
      } catch (error) {
        console.error('Email sending failed:', error);
        throw error;
      }
    });
  }

  /**
   * Setup SMS processor
   */
  private static setupSMSProcessor(): void {
    this.smsQueue?.process(async (job: Job<SMSJobData>) => {
      console.log(`📱 Processing SMS job ${job.id}`);
      const { to, message } = job.data;

      try {
        // TODO: Integrate with actual SMS service (Twilio, SNS, etc.)
        console.log(`Sending SMS to: ${to}`);

        // Simulate SMS sending
        await new Promise(resolve => setTimeout(resolve, 500));

        return { success: true, messageId: `sms_${Date.now()}` };
      } catch (error) {
        console.error('SMS sending failed:', error);
        throw error;
      }
    });
  }

  /**
   * Setup report processor
   */
  private static setupReportProcessor(): void {
    this.reportQueue?.process(async (job: Job<ReportJobData>) => {
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
      } catch (error) {
        console.error('Report generation failed:', error);
        throw error;
      }
    });
  }

  /**
   * Setup analytics processor
   */
  private static setupAnalyticsProcessor(): void {
    this.analyticsQueue?.process(async (job: Job<AnalyticsJobData>) => {
      console.log(`📈 Processing analytics job ${job.id}`);
      const { merchantId, type, data } = job.data;

      try {
        // TODO: Implement analytics calculation logic
        console.log(`Calculating ${type} analytics for merchant ${merchantId}`);

        // Simulate analytics calculation
        await new Promise(resolve => setTimeout(resolve, 2000));

        return { success: true, calculatedAt: new Date() };
      } catch (error) {
        console.error('Analytics calculation failed:', error);
        throw error;
      }
    });
  }

  /**
   * Setup audit log processor
   */
  private static setupAuditLogProcessor(): void {
    this.auditLogQueue?.process(async (job: Job<AuditLogJobData>) => {
      const { merchantId, action, resourceType, resourceId, userId, metadata } = job.data;

      try {
        // TODO: Write to audit log database
        console.log(`Writing audit log: ${action} on ${resourceType}`);

        // Simulate audit log write
        await new Promise(resolve => setTimeout(resolve, 100));

        return { success: true, loggedAt: new Date() };
      } catch (error) {
        console.error('Audit log write failed:', error);
        throw error;
      }
    });
  }

  /**
   * Setup cache warmup processor
   */
  private static setupCacheWarmupProcessor(): void {
    this.cacheWarmupQueue?.process(async (job: Job<CacheWarmupJobData>) => {
      console.log(`🔥 Processing cache warmup job ${job.id}`);
      const { keys } = job.data;

      try {
        // TODO: Implement cache warmup logic
        console.log(`Warming up ${keys.length} cache keys`);

        // Simulate cache warmup
        await new Promise(resolve => setTimeout(resolve, 1000));

        return { success: true, warmedKeys: keys.length };
      } catch (error) {
        console.error('Cache warmup failed:', error);
        throw error;
      }
    });
  }

  /**
   * Setup event listeners for all queues
   */
  private static setupEventListeners(): void {
    const queues = [
      this.emailQueue,
      this.smsQueue,
      this.reportQueue,
      this.analyticsQueue,
      this.auditLogQueue,
      this.cacheWarmupQueue
    ];

    queues.forEach(queue => {
      if (!queue) return;

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
  static async shutdown(): Promise<void> {
    const queues = [
      this.emailQueue,
      this.smsQueue,
      this.reportQueue,
      this.analyticsQueue,
      this.auditLogQueue,
      this.cacheWarmupQueue
    ];

    await Promise.all(
      queues.map(async queue => {
        if (queue) {
          await queue.close();
        }
      })
    );

    this.isInitialized = false;
    console.log('📦 Queue service shut down');
  }
}
