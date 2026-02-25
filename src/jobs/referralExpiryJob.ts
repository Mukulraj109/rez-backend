import * as cron from 'node-cron';
import referralService from '../services/referralService';

/**
 * Referral Expiry Job
 *
 * Runs daily at 3:00 AM to mark expired referrals.
 * Referrals that have passed their expiresAt date (90 days from creation)
 * and are still in PENDING or ACTIVE status are transitioned to EXPIRED.
 */

let expiryJob: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

const CRON_SCHEDULE = '0 3 * * *'; // Daily at 3:00 AM

export async function runReferralExpiry(): Promise<void> {
  if (isRunning) {
    console.log('⏭️ [REFERRAL_EXPIRY] Job already running, skipping');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    console.log('⏰ [REFERRAL_EXPIRY] Starting referral expiry check...');

    const expiredCount = await referralService.markExpiredReferrals();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [REFERRAL_EXPIRY] Completed in ${duration}s — ${expiredCount} referrals expired`);
  } catch (error) {
    console.error('❌ [REFERRAL_EXPIRY] Job failed:', error);
  } finally {
    isRunning = false;
  }
}

export function initializeReferralExpiryJob(): void {
  if (expiryJob) {
    expiryJob.stop();
  }

  expiryJob = cron.schedule(CRON_SCHEDULE, () => {
    runReferralExpiry().catch(console.error);
  });

  console.log('🔄 [REFERRAL_EXPIRY] Scheduled: daily at 3:00 AM');
}

export function stopReferralExpiryJob(): void {
  if (expiryJob) {
    expiryJob.stop();
    expiryJob = null;
    console.log('🛑 [REFERRAL_EXPIRY] Job stopped');
  }
}
