/**
 * Privé Mission Expiry Job
 *
 * Runs daily to expire past-due active missions.
 * Pattern matches priveInviteExpiryJob.ts
 */

import cron from 'node-cron';
import { priveMissionService } from '../services/priveMissionService';

let isRunning = false;

export const runPriveMissionExpiry = async (): Promise<number> => {
  if (isRunning) {
    console.log('[PriveMissionExpiry] Job already running, skipping');
    return 0;
  }

  isRunning = true;

  try {
    console.log('[PriveMissionExpiry] Starting mission expiry check...');
    const expiredCount = await priveMissionService.expireOverdueMissions();
    console.log(`[PriveMissionExpiry] Mission expiry complete: ${expiredCount} missions expired`);
    return expiredCount;
  } catch (error) {
    console.error('[PriveMissionExpiry] Job failed:', error);
    return 0;
  } finally {
    isRunning = false;
  }
};

/**
 * Initialize the cron job — runs daily at 00:15 UTC
 */
export const initializePriveMissionExpiryJob = () => {
  cron.schedule('15 0 * * *', () => {
    runPriveMissionExpiry();
  }, {
    timezone: 'UTC',
  });

  console.log('✅ Privé mission expiry job scheduled (daily 00:15 UTC)');
};
