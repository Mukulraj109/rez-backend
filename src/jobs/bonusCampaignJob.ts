import * as cron from 'node-cron';
import { transitionCampaignStatuses, expirePendingClaims } from '../services/bonusCampaignService';

/**
 * Bonus Campaign Jobs
 *
 * 1. Campaign Status Transitions - Runs every 5 minutes
 *    Transitions campaigns between scheduled/active/ended states based on dates.
 *
 * 2. Expire Pending Claims - Runs every 30 minutes
 *    Expires unclaimed bonus campaign rewards that have passed their claim deadline.
 */

let statusTransitionJob: ReturnType<typeof cron.schedule> | null = null;
let expireClaimsJob: ReturnType<typeof cron.schedule> | null = null;
let isTransitionRunning = false;
let isExpireRunning = false;

const STATUS_TRANSITION_SCHEDULE = '*/5 * * * *';   // Every 5 minutes
const EXPIRE_CLAIMS_SCHEDULE = '*/30 * * * *';       // Every 30 minutes

/**
 * Initialize and start bonus campaign jobs
 */
export function initBonusCampaignJobs(): void {
  if (statusTransitionJob || expireClaimsJob) {
    console.log('⚠️ [BONUS CAMPAIGN] Jobs already running');
    return;
  }

  console.log('🎯 [BONUS CAMPAIGN] Starting bonus campaign jobs');

  // Job 1: Transition campaign statuses every 5 minutes
  statusTransitionJob = cron.schedule(STATUS_TRANSITION_SCHEDULE, async () => {
    if (isTransitionRunning) {
      console.log('⏭️ [BONUS CAMPAIGN] Previous status transition still running, skipping');
      return;
    }

    isTransitionRunning = true;
    const startTime = Date.now();

    try {
      console.log('🎯 [BONUS CAMPAIGN] Running campaign status transitions...');
      await transitionCampaignStatuses();
      const duration = Date.now() - startTime;
      console.log(`✅ [BONUS CAMPAIGN] Status transitions completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [BONUS CAMPAIGN] Status transition failed after ${duration}ms:`, error);
    } finally {
      isTransitionRunning = false;
    }
  });

  // Job 2: Expire pending claims every 30 minutes
  expireClaimsJob = cron.schedule(EXPIRE_CLAIMS_SCHEDULE, async () => {
    if (isExpireRunning) {
      console.log('⏭️ [BONUS CAMPAIGN] Previous expire claims still running, skipping');
      return;
    }

    isExpireRunning = true;
    const startTime = Date.now();

    try {
      console.log('🎯 [BONUS CAMPAIGN] Running expire pending claims...');
      await expirePendingClaims();
      const duration = Date.now() - startTime;
      console.log(`✅ [BONUS CAMPAIGN] Expire pending claims completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [BONUS CAMPAIGN] Expire pending claims failed after ${duration}ms:`, error);
    } finally {
      isExpireRunning = false;
    }
  });

  console.log('✅ [BONUS CAMPAIGN] Bonus campaign jobs started successfully');
  console.log('   - Status transitions: every 5 minutes');
  console.log('   - Expire pending claims: every 30 minutes');
}

/**
 * Stop all bonus campaign jobs
 */
export function stopBonusCampaignJobs(): void {
  if (statusTransitionJob) {
    statusTransitionJob.stop();
    statusTransitionJob = null;
  }
  if (expireClaimsJob) {
    expireClaimsJob.stop();
    expireClaimsJob = null;
  }
  console.log('🛑 [BONUS CAMPAIGN] Jobs stopped');
}

export default {
  initialize: initBonusCampaignJobs,
  stop: stopBonusCampaignJobs,
};
