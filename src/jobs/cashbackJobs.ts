import * as cron from 'node-cron';
import mallAffiliateService from '../services/mallAffiliateService';

/**
 * Cashback Background Jobs
 *
 * This module schedules and manages background jobs for the CashStore/Affiliate system:
 *
 * 1. Credit Pending Cashback (runs hourly):
 *    - Finds confirmed purchases past verification period
 *    - Credits cashback to user wallets
 *    - Updates UserCashback status to 'credited'
 *
 * 2. Mark Expired Clicks (runs daily at 2:00 AM):
 *    - Finds clicks older than 30 days that weren't converted
 *    - Marks them as 'expired' to clean up attribution window
 */

// Job instances
let creditCashbackJob: ReturnType<typeof cron.schedule> | null = null;
let expireClicksJob: ReturnType<typeof cron.schedule> | null = null;

// Execution flags to prevent concurrent runs
let isCreditJobRunning = false;
let isExpireJobRunning = false;

// Configuration
const CREDIT_CASHBACK_SCHEDULE = '0 * * * *'; // Every hour at minute 0
const EXPIRE_CLICKS_SCHEDULE = '0 2 * * *'; // Daily at 2:00 AM

interface CreditStats {
  credited: number;
  total: number;
  errors: string[];
  duration: number;
}

interface ExpireStats {
  expired: number;
  duration: number;
}

/**
 * Run the credit pending cashback job
 */
async function runCreditPendingCashback(): Promise<CreditStats> {
  const startTime = Date.now();
  const stats: CreditStats = {
    credited: 0,
    total: 0,
    errors: [],
    duration: 0,
  };

  try {
    console.log('💰 [CASHBACK JOB] Running credit pending cashback...');

    const result = await mallAffiliateService.creditPendingCashback();
    stats.credited = result.credited;
    stats.total = result.total;

    stats.duration = Date.now() - startTime;

    console.log(`✅ [CASHBACK JOB] Credit job completed:`, {
      credited: stats.credited,
      total: stats.total,
      duration: `${stats.duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return stats;
  } catch (error: any) {
    stats.duration = Date.now() - startTime;
    stats.errors.push(error.message || 'Unknown error');

    console.error('❌ [CASHBACK JOB] Credit job failed:', {
      error: error.message,
      duration: `${stats.duration}ms`,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

/**
 * Run the expire clicks job
 */
async function runExpireClicks(): Promise<ExpireStats> {
  const startTime = Date.now();
  const stats: ExpireStats = {
    expired: 0,
    duration: 0,
  };

  try {
    console.log('⏰ [CASHBACK JOB] Running expire clicks...');

    stats.expired = await mallAffiliateService.markExpiredClicks();

    stats.duration = Date.now() - startTime;

    console.log(`✅ [CASHBACK JOB] Expire clicks completed:`, {
      expired: stats.expired,
      duration: `${stats.duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return stats;
  } catch (error: any) {
    stats.duration = Date.now() - startTime;

    console.error('❌ [CASHBACK JOB] Expire clicks failed:', {
      error: error.message,
      duration: `${stats.duration}ms`,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

/**
 * Start the credit pending cashback job
 */
export function startCreditCashbackJob(): void {
  if (creditCashbackJob) {
    console.log('⚠️ [CASHBACK JOB] Credit cashback job already running');
    return;
  }

  console.log(`💰 [CASHBACK JOB] Starting credit cashback job (runs every hour)`);

  creditCashbackJob = cron.schedule(CREDIT_CASHBACK_SCHEDULE, async () => {
    if (isCreditJobRunning) {
      console.log('⏭️ [CASHBACK JOB] Previous credit job still running, skipping');
      return;
    }

    isCreditJobRunning = true;

    try {
      await runCreditPendingCashback();
    } catch (error) {
      // Error already logged in runCreditPendingCashback
    } finally {
      isCreditJobRunning = false;
    }
  });

  console.log('✅ [CASHBACK JOB] Credit cashback job started');
}

/**
 * Start the expire clicks job
 */
export function startExpireClicksJob(): void {
  if (expireClicksJob) {
    console.log('⚠️ [CASHBACK JOB] Expire clicks job already running');
    return;
  }

  console.log(`⏰ [CASHBACK JOB] Starting expire clicks job (runs daily at 2:00 AM)`);

  expireClicksJob = cron.schedule(EXPIRE_CLICKS_SCHEDULE, async () => {
    if (isExpireJobRunning) {
      console.log('⏭️ [CASHBACK JOB] Previous expire job still running, skipping');
      return;
    }

    isExpireJobRunning = true;

    try {
      await runExpireClicks();
    } catch (error) {
      // Error already logged in runExpireClicks
    } finally {
      isExpireJobRunning = false;
    }
  });

  console.log('✅ [CASHBACK JOB] Expire clicks job started');
}

/**
 * Stop all cashback jobs
 */
export function stopCashbackJobs(): void {
  if (creditCashbackJob) {
    creditCashbackJob.stop();
    creditCashbackJob = null;
    console.log('🛑 [CASHBACK JOB] Credit cashback job stopped');
  }

  if (expireClicksJob) {
    expireClicksJob.stop();
    expireClicksJob = null;
    console.log('🛑 [CASHBACK JOB] Expire clicks job stopped');
  }
}

/**
 * Get cashback jobs status
 */
export function getCashbackJobsStatus(): {
  creditJob: { running: boolean; executing: boolean; schedule: string };
  expireJob: { running: boolean; executing: boolean; schedule: string };
} {
  return {
    creditJob: {
      running: creditCashbackJob !== null,
      executing: isCreditJobRunning,
      schedule: CREDIT_CASHBACK_SCHEDULE,
    },
    expireJob: {
      running: expireClicksJob !== null,
      executing: isExpireJobRunning,
      schedule: EXPIRE_CLICKS_SCHEDULE,
    },
  };
}

/**
 * Manually trigger credit pending cashback (for testing/maintenance)
 */
export async function triggerManualCreditCashback(): Promise<CreditStats> {
  if (isCreditJobRunning) {
    throw new Error('Credit job already in progress');
  }

  console.log('💰 [CASHBACK JOB] Manual credit cashback triggered');

  isCreditJobRunning = true;

  try {
    return await runCreditPendingCashback();
  } finally {
    isCreditJobRunning = false;
  }
}

/**
 * Manually trigger expire clicks (for testing/maintenance)
 */
export async function triggerManualExpireClicks(): Promise<ExpireStats> {
  if (isExpireJobRunning) {
    throw new Error('Expire job already in progress');
  }

  console.log('⏰ [CASHBACK JOB] Manual expire clicks triggered');

  isExpireJobRunning = true;

  try {
    return await runExpireClicks();
  } finally {
    isExpireJobRunning = false;
  }
}

/**
 * Initialize all cashback background jobs
 * Called from server startup after database connection
 */
export function initializeCashbackJobs(): void {
  startCreditCashbackJob();
  startExpireClicksJob();
}

export default {
  initialize: initializeCashbackJobs,
  startCreditJob: startCreditCashbackJob,
  startExpireJob: startExpireClicksJob,
  stop: stopCashbackJobs,
  getStatus: getCashbackJobsStatus,
  triggerCreditManual: triggerManualCreditCashback,
  triggerExpireManual: triggerManualExpireClicks,
};
