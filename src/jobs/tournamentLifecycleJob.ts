import * as cron from 'node-cron';
import tournamentService from '../services/tournamentService';
import Tournament from '../models/Tournament';
import { User } from '../models/User';
import pushNotificationService from '../services/pushNotificationService';

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
let endingSoonJob: ReturnType<typeof cron.schedule> | null = null;
let isActivationRunning = false;
let isCompletionRunning = false;
let isEndingSoonRunning = false;

const ACTIVATION_SCHEDULE = '*/5 * * * *';   // Every 5 minutes
const COMPLETION_SCHEDULE = '*/5 * * * *';   // Every 5 minutes
const ENDING_SOON_SCHEDULE = '0 * * * *';    // Every hour

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

  // Job 3: Notify participants of tournaments ending within 24h (every hour)
  endingSoonJob = cron.schedule(ENDING_SOON_SCHEDULE, async () => {
    if (isEndingSoonRunning) {
      console.log('⏭️ [TOURNAMENT] Previous ending-soon job still running, skipping');
      return;
    }

    isEndingSoonRunning = true;
    const startTime = Date.now();

    try {
      const notified = await notifyTournamentsEndingSoon();
      const duration = Date.now() - startTime;
      if (notified > 0) {
        console.log(`✅ [TOURNAMENT] Sent ending-soon notifications to ${notified} participants in ${duration}ms`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [TOURNAMENT] Ending-soon job failed after ${duration}ms:`, error);
    } finally {
      isEndingSoonRunning = false;
    }
  });

  console.log('✅ [TOURNAMENT] Lifecycle jobs started successfully');
  console.log('   - Activation: every 5 minutes');
  console.log('   - Completion + prize distribution: every 5 minutes');
  console.log('   - Ending-soon notifications: every hour');
}

/**
 * Notify participants of tournaments ending within 24 hours.
 * Only notifies once per tournament by checking a metadata flag.
 */
async function notifyTournamentsEndingSoon(): Promise<number> {
  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find active tournaments ending within 24 hours that haven't been notified yet
  const endingSoonTournaments = await Tournament.find({
    status: 'active',
    endDate: { $gt: now, $lte: twentyFourHoursFromNow },
    endingSoonNotified: { $ne: true }
  });

  if (endingSoonTournaments.length === 0) return 0;

  let totalNotified = 0;

  for (const tournament of endingSoonTournaments) {
    const hoursLeft = Math.ceil((tournament.endDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    // Get all participant user IDs
    const participantUserIds = tournament.participants.map(p => p.user);

    if (participantUserIds.length === 0) {
      // Mark as notified even if no participants
      await Tournament.updateOne({ _id: tournament._id }, { $set: { endingSoonNotified: true } });
      continue;
    }

    // Fetch phone numbers for all participants
    const users = await User.find({ _id: { $in: participantUserIds } })
      .select('phoneNumber')
      .lean();

    for (const user of users) {
      if (!user.phoneNumber) continue;

      try {
        await pushNotificationService.sendTournamentEndingSoon(
          user.phoneNumber,
          tournament.name,
          hoursLeft
        );
        totalNotified++;
      } catch (notifErr) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[TOURNAMENT] Failed to send ending-soon notification:`, notifErr);
        }
      }
    }

    // Mark tournament as notified so we don't send again
    await Tournament.updateOne({ _id: tournament._id }, { $set: { endingSoonNotified: true } });
  }

  return totalNotified;
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
  if (endingSoonJob) {
    endingSoonJob.stop();
    endingSoonJob = null;
  }
  console.log('🛑 [TOURNAMENT] Lifecycle jobs stopped');
}

export default {
  initialize: initializeTournamentLifecycleJobs,
  stop: stopTournamentLifecycleJobs,
};
