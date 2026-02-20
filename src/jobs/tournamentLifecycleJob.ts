import * as cron from 'node-cron';
import tournamentService from '../services/tournamentService';

/**
 * Tournament Lifecycle Jobs
 *
 * 1. Activation Job - Runs every 5 minutes
 *    Transitions tournaments from 'upcoming' to 'active' when startDate passes.
 *
 * 2. Completion Job - Runs every 5 minutes
 *    Transitions tournaments from 'active' to 'completed' when endDate passes,
 *    then distributes prizes to winners.
 */

let activationJob: ReturnType<typeof cron.schedule> | null = null;
let completionJob: ReturnType<typeof cron.schedule> | null = null;
let isActivationRunning = false;
let isCompletionRunning = false;

const ACTIVATION_SCHEDULE = '*/5 * * * *';   // Every 5 minutes
const COMPLETION_SCHEDULE = '*/5 * * * *';   // Every 5 minutes

/**
 * Initialize and start tournament lifecycle jobs
 */
export function initializeTournamentLifecycleJobs(): void {
  if (activationJob || completionJob) {
    console.log('⚠️ [TOURNAMENT] Lifecycle jobs already running');
    return;
  }

  console.log('🏆 [TOURNAMENT] Starting tournament lifecycle jobs');

  // Job 1: Activate upcoming tournaments every 5 minutes
  activationJob = cron.schedule(ACTIVATION_SCHEDULE, async () => {
    if (isActivationRunning) {
      console.log('⏭️ [TOURNAMENT] Previous activation job still running, skipping');
      return;
    }

    isActivationRunning = true;
    const startTime = Date.now();

    try {
      const activated = await tournamentService.activateUpcomingTournaments();
      const duration = Date.now() - startTime;
      if (activated > 0) {
        console.log(`✅ [TOURNAMENT] Activated ${activated} tournaments in ${duration}ms`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [TOURNAMENT] Activation job failed after ${duration}ms:`, error);
    } finally {
      isActivationRunning = false;
    }
  });

  // Job 2: Complete ended tournaments every 5 minutes
  completionJob = cron.schedule(COMPLETION_SCHEDULE, async () => {
    if (isCompletionRunning) {
      console.log('⏭️ [TOURNAMENT] Previous completion job still running, skipping');
      return;
    }

    isCompletionRunning = true;
    const startTime = Date.now();

    try {
      const completed = await tournamentService.completeEndedTournaments();
      const duration = Date.now() - startTime;
      if (completed > 0) {
        console.log(`✅ [TOURNAMENT] Completed ${completed} tournaments (with prize distribution) in ${duration}ms`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [TOURNAMENT] Completion job failed after ${duration}ms:`, error);
    } finally {
      isCompletionRunning = false;
    }
  });

  console.log('✅ [TOURNAMENT] Lifecycle jobs started successfully');
  console.log('   - Activation: every 5 minutes');
  console.log('   - Completion + prize distribution: every 5 minutes');
}

/**
 * Stop all tournament lifecycle jobs
 */
export function stopTournamentLifecycleJobs(): void {
  if (activationJob) {
    activationJob.stop();
    activationJob = null;
  }
  if (completionJob) {
    completionJob.stop();
    completionJob = null;
  }
  console.log('🛑 [TOURNAMENT] Lifecycle jobs stopped');
}

export default {
  initialize: initializeTournamentLifecycleJobs,
  stop: stopTournamentLifecycleJobs,
};
