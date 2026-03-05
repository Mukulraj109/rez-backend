import { exportQueue } from '../config/queue.config';
import { ExportService } from '../services/exportService';
import { logger } from '../config/logger';

/**
 * Export worker - processes export jobs from the queue
 * Only starts if Redis is available
 */
if (exportQueue) {
  exportQueue.process(async (job) => {
    logger.info(`Processing export job ${job.id}:`, job.data);

    try {
      const result = await ExportService.processExport(job);

      if (!result.success) {
        throw new Error(result.error || 'Export failed');
      }

      return result;
    } catch (error: any) {
      logger.error(`Export job ${job.id} failed:`, error);
      throw error;
    }
  });

  logger.info('✅ Export worker started and listening for jobs...');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing export worker...');
    if (exportQueue) {
      await exportQueue.close();
    }
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, closing export worker...');
    if (exportQueue) {
      await exportQueue.close();
    }
    process.exit(0);
  });
} else {
  console.warn('⚠️ Export worker not started - Redis is not available');
}
