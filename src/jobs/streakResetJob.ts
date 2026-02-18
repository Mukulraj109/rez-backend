import * as cron from 'node-cron';
import streakService from '../services/streakService';

/**
 * Streak Reset Job
 *
 * Runs daily at 00:05 UTC to reset broken streaks.
 * Uses the existing streakService.checkBrokenStreaks() method which:
 * 1. Finds all UserStreak docs with currentStreak > 0 and lastActivityDate < yesterday
 * 2. Skips frozen streaks that haven't expired
 * 3. Resets broken streaks to 0
 *
 * This ensures streaks are proactively reset even if the user doesn't
 * make another check-in attempt (e.g. for leaderboard accuracy).
 */

let streakResetJob: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

const CRON_SCHEDULE = '5 0 * * *'; // Daily at 00:05 UTC

/**
 * Initialize and start the streak reset job
 */
export function initializeStreakResetJob(): void {
  if (streakResetJob) {
    console.log('⚠️ [STREAK RESET] Job already running');
    return;
  }

  console.log(`🔥 [STREAK RESET] Starting streak reset job (runs daily at 00:05 UTC)`);

  streakResetJob = cron.schedule(CRON_SCHEDULE, async () => {
    if (isRunning) {
      console.log('⏭️ [STREAK RESET] Previous job still running, skipping');
      return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      console.log('🔥 [STREAK RESET] Running streak reset check...');
      await streakService.checkBrokenStreaks();
      const duration = Date.now() - startTime;
      console.log(`✅ [STREAK RESET] Completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [STREAK RESET] Failed after ${duration}ms:`, error);
    } finally {
      isRunning = false;
    }
  });

  console.log('✅ [STREAK RESET] Streak reset job started successfully');
}

/**
 * Stop the streak reset job
 */
export function stopStreakResetJob(): void {
  if (streakResetJob) {
    streakResetJob.stop();
    streakResetJob = null;
    console.log('🛑 [STREAK RESET] Job stopped');
  }
}

export default {
  initialize: initializeStreakResetJob,
  stop: stopStreakResetJob,
};
