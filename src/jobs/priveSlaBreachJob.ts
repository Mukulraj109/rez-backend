/**
 * Prive SLA Breach Job
 *
 * Runs every 15 minutes to mark overdue Prive concierge tickets as SLA-breached.
 * Pattern matches priveMissionExpiryJob.ts
 */

import cron from 'node-cron';
import { priveConciergeService } from '../services/priveConciergeService';

let isRunning = false;

export const runPriveSlaBreachCheck = async (): Promise<number> => {
  if (isRunning) {
    console.log('[PriveSlaBreachJob] Job already running, skipping');
    return 0;
  }

  isRunning = true;

  try {
    console.log('[PriveSlaBreachJob] Starting SLA breach check...');
    const breachedCount = await priveConciergeService.markSlaBreached();
    console.log(`[PriveSlaBreachJob] SLA breach check complete: ${breachedCount} tickets breached`);
    return breachedCount;
  } catch (error) {
    console.error('[PriveSlaBreachJob] Job failed:', error);
    return 0;
  } finally {
    isRunning = false;
  }
};

/**
 * Initialize the cron job — runs every 15 minutes
 */
export const initializePriveSlaBreachJob = () => {
  cron.schedule('*/15 * * * *', () => {
    runPriveSlaBreachCheck();
  }, {
    timezone: 'UTC',
  });

  console.log('✅ Prive SLA breach job scheduled (every 15 minutes)');
};
