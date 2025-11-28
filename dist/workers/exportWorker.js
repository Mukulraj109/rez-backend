"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queue_config_1 = require("../config/queue.config");
const exportService_1 = require("../services/exportService");
/**
 * Export worker - processes export jobs from the queue
 * Only starts if Redis is available
 */
if (queue_config_1.exportQueue) {
    queue_config_1.exportQueue.process(async (job) => {
        console.log(`Processing export job ${job.id}:`, job.data);
        try {
            const result = await exportService_1.ExportService.processExport(job);
            if (!result.success) {
                throw new Error(result.error || 'Export failed');
            }
            return result;
        }
        catch (error) {
            console.error(`Export job ${job.id} failed:`, error);
            throw error;
        }
    });
    console.log('✅ Export worker started and listening for jobs...');
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('SIGTERM received, closing export worker...');
        if (queue_config_1.exportQueue) {
            await queue_config_1.exportQueue.close();
        }
        process.exit(0);
    });
    process.on('SIGINT', async () => {
        console.log('SIGINT received, closing export worker...');
        if (queue_config_1.exportQueue) {
            await queue_config_1.exportQueue.close();
        }
        process.exit(0);
    });
}
else {
    console.warn('⚠️ Export worker not started - Redis is not available');
}
