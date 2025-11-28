import { exportQueue } from '../config/queue.config';
import { ExportService } from '../services/exportService';

/**
 * Export worker - processes export jobs from the queue
 * Only starts if Redis is available
 */
if (exportQueue) {
  exportQueue.process(async (job) => {
    console.log(`Processing export job ${job.id}:`, job.data);

    try {
      const result = await ExportService.processExport(job);

      if (!result.success) {
        throw new Error(result.error || 'Export failed');
      }

      return result;
    } catch (error: any) {
      console.error(`Export job ${job.id} failed:`, error);
      throw error;
    }
  });

  console.log('✅ Export worker started and listening for jobs...');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing export worker...');
    if (exportQueue) {
      await exportQueue.close();
    }
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, closing export worker...');
    if (exportQueue) {
      await exportQueue.close();
    }
    process.exit(0);
  });
} else {
  console.warn('⚠️ Export worker not started - Redis is not available');
}
