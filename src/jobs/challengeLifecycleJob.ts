import * as cron from 'node-cron';
import challengeService from '../services/challengeService';

/**
 * Challenge Lifecycle Jobs
 *
 * 1. Status Transitions - Runs every 5 minutes
 *    - scheduled + scheduledPublishAt <= now -> active
 *    - active + endDate < now -> expired
 *    - Auto-regenerate daily challenges if none active
 *
 * 2. Expired Progress Cleanup - Runs every 30 minutes
 *    - Marks progress for expired challenges
 */

let statusTransitionJob: ReturnType<typeof cron.schedule> | null = null;
let cleanupJob: ReturnType<typeof cron.schedule> | null = null;
let isTransitionRunning = false;
let isCleanupRunning = false;

const STATUS_TRANSITION_SCHEDULE = '*/5 * * * *';   // Every 5 minutes
const CLEANUP_SCHEDULE = '*/30 * * * *';              // Every 30 minutes

/**
 * Initialize and start challenge lifecycle jobs
 */
export function initChallengeLifecycleJobs(): void {
  if (statusTransitionJob || cleanupJob) {
    console.log('⚠️ [CHALLENGE LIFECYCLE] Jobs already running');
    return;
  }

  console.log('🎯 [CHALLENGE LIFECYCLE] Starting challenge lifecycle jobs');

  // Job 1: Transition challenge statuses every 5 minutes
  statusTransitionJob = cron.schedule(STATUS_TRANSITION_SCHEDULE, async () => {
    if (isTransitionRunning) {
      console.log('⏭️ [CHALLENGE LIFECYCLE] Previous status transition still running, skipping');
      return;
    }

    isTransitionRunning = true;
    const startTime = Date.now();

    try {
      const result = await challengeService.transitionChallengeStatuses();
      const duration = Date.now() - startTime;

      if (result.activated > 0 || result.expired > 0) {
        console.log(`✅ [CHALLENGE LIFECYCLE] Transitions completed in ${duration}ms: ${result.activated} activated, ${result.expired} expired`);
      }

      // Auto-regenerate if no active challenges exist
      const activeChallenges = await challengeService.getActiveChallenges();
      if (activeChallenges.length === 0) {
        console.log('📅 [CHALLENGE LIFECYCLE] No active challenges, auto-regenerating...');
        const regenerated = await challengeService.regenerateExpiredChallenges();
        console.log(`✅ [CHALLENGE LIFECYCLE] Regenerated ${regenerated} challenges`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [CHALLENGE LIFECYCLE] Status transition failed after ${duration}ms:`, error);
    } finally {
      isTransitionRunning = false;
    }
  });

  // Job 2: Cleanup expired challenge progress every 30 minutes
  cleanupJob = cron.schedule(CLEANUP_SCHEDULE, async () => {
    if (isCleanupRunning) {
      console.log('⏭️ [CHALLENGE LIFECYCLE] Previous cleanup still running, skipping');
      return;
    }

    isCleanupRunning = true;
    const startTime = Date.now();

    try {
      // Invalidate Redis cache for challenges to ensure fresh data
      try {
        const redisService = (await import('../services/redisService')).default;
        await redisService.delPattern('challenges:*');
      } catch {
        // Redis may not be available in all environments
      }

      const duration = Date.now() - startTime;
      if (duration > 100) {
        console.log(`✅ [CHALLENGE LIFECYCLE] Cleanup completed in ${duration}ms`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [CHALLENGE LIFECYCLE] Cleanup failed after ${duration}ms:`, error);
    } finally {
      isCleanupRunning = false;
    }
  });

  console.log('✅ [CHALLENGE LIFECYCLE] Jobs started successfully');
  console.log('   - Status transitions: every 5 minutes');
  console.log('   - Cleanup: every 30 minutes');
}

/**
 * Stop all challenge lifecycle jobs
 */
export function stopChallengeLifecycleJobs(): void {
  if (statusTransitionJob) {
    statusTransitionJob.stop();
    statusTransitionJob = null;
  }
  if (cleanupJob) {
    cleanupJob.stop();
    cleanupJob = null;
  }
  console.log('🛑 [CHALLENGE LIFECYCLE] Jobs stopped');
}

export default {
  initialize: initChallengeLifecycleJobs,
  stop: stopChallengeLifecycleJobs,
};
