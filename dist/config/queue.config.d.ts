import Queue from 'bull';
/**
 * Export Queue Configuration
 *
 * DISABLED BY DEFAULT - Redis connection issues
 * To enable: Set ENABLE_EXPORT_QUEUE=true in .env and ensure Redis is running
 */
declare let exportQueue: Queue.Queue | null;
declare let isRedisAvailable: boolean;
export { exportQueue, isRedisAvailable };
export default exportQueue;
