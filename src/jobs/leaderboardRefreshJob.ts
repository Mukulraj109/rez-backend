import * as cron from 'node-cron';
import redisService from '../services/redisService';
import { CoinTransaction } from '../models/CoinTransaction';
import mongoose from 'mongoose';

/**
 * Leaderboard Refresh Background Job
 *
 * This module schedules a background job that recalculates leaderboard aggregations
 * for daily/weekly/monthly/all-time periods and caches results in Redis.
 *
 * - Runs every 5 minutes via cron
 * - Aggregates CoinTransaction by userId where type = 'earned' (or 'bonus')
 * - Sums amounts, sorts descending, limits to top 100 users
 * - Looks up user details (name, avatar)
 * - Caches result in Redis with key pattern: leaderboard:{period}:{page}
 *
 * Uses Redis distributed locks with owner tokens for multi-instance safety.
 */

// Job instance
let leaderboardRefreshJob: ReturnType<typeof cron.schedule> | null = null;

// Configuration
const LEADERBOARD_REFRESH_SCHEDULE = '*/5 * * * *'; // Every 5 minutes
const LEADERBOARD_CACHE_TTL = 300; // 5 minutes
const LEADERBOARD_LOCK_TTL = 120; // 2 minutes (should finish well within this)
const TOP_N = 100; // Top 100 users per leaderboard

type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all';

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar?: string;
  totalCoins: number;
  rank: number;
}

interface RefreshStats {
  period: LeaderboardPeriod;
  entriesCount: number;
  duration: number;
}

/**
 * Calculate the date filter start based on the period
 */
function getDateFilter(period: LeaderboardPeriod): Date | null {
  const now = new Date();

  switch (period) {
    case 'daily': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case 'weekly': {
      const start = new Date(now);
      start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case 'monthly': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case 'all':
      return null; // No date filter for all-time
  }
}

/**
 * Refresh a single leaderboard period
 */
async function refreshLeaderboard(period: LeaderboardPeriod): Promise<RefreshStats> {
  const startTime = Date.now();

  // Build match stage
  const matchStage: any = {
    type: { $in: ['earned', 'bonus', 'refunded'] },
  };

  const dateFilter = getDateFilter(period);
  if (dateFilter) {
    matchStage.createdAt = { $gte: dateFilter };
  }

  // Aggregate CoinTransaction: sum amounts per user, sort descending, limit top N
  const pipeline: mongoose.PipelineStage[] = [
    { $match: matchStage },
    {
      $group: {
        _id: '$user',
        totalCoins: { $sum: '$amount' },
      },
    },
    { $sort: { totalCoins: -1 } },
    { $limit: TOP_N },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userInfo',
        pipeline: [
          { $project: { name: 1, avatar: 1, profilePicture: 1 } },
        ],
      },
    },
    { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        totalCoins: 1,
        name: { $ifNull: ['$userInfo.name', 'Anonymous'] },
        avatar: { $ifNull: ['$userInfo.avatar', '$userInfo.profilePicture'] },
      },
    },
  ];

  const results = await CoinTransaction.aggregate(pipeline);

  // Add rank
  const leaderboard: LeaderboardEntry[] = results.map((entry: any, index: number) => ({
    userId: entry.userId.toString(),
    name: entry.name,
    avatar: entry.avatar || undefined,
    totalCoins: entry.totalCoins,
    rank: index + 1,
  }));

  // Cache page 1 (the full top-N list) in Redis
  // Future: could paginate (e.g., 20 per page) if needed
  await redisService.set(`leaderboard:${period}:1`, leaderboard, LEADERBOARD_CACHE_TTL);

  // Also cache metadata (total count, last updated)
  await redisService.set(`leaderboard:${period}:meta`, {
    totalEntries: leaderboard.length,
    lastUpdated: new Date().toISOString(),
    period,
  }, LEADERBOARD_CACHE_TTL);

  const duration = Date.now() - startTime;

  return {
    period,
    entriesCount: leaderboard.length,
    duration,
  };
}

/**
 * Run all leaderboard refreshes
 */
async function runLeaderboardRefresh(): Promise<void> {
  const startTime = Date.now();

  console.log('🏆 [LEADERBOARD JOB] Running leaderboard refresh...');

  const results = await Promise.all([
    refreshLeaderboard('daily'),
    refreshLeaderboard('weekly'),
    refreshLeaderboard('monthly'),
    refreshLeaderboard('all'),
  ]);

  const totalDuration = Date.now() - startTime;

  console.log('✅ [LEADERBOARD JOB] Refresh completed:', {
    periods: results.map(r => `${r.period}(${r.entriesCount} entries, ${r.duration}ms)`),
    totalDuration: `${totalDuration}ms`,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Start the leaderboard refresh job
 */
export function startLeaderboardRefreshJob(): void {
  if (leaderboardRefreshJob) {
    console.log('⚠️ [LEADERBOARD JOB] Leaderboard refresh job already running');
    return;
  }

  console.log('🏆 [LEADERBOARD JOB] Starting leaderboard refresh job (runs every 5 minutes)');

  leaderboardRefreshJob = cron.schedule(LEADERBOARD_REFRESH_SCHEDULE, async () => {
    // Acquire distributed lock with owner token — only one instance runs the job
    const lockToken = await redisService.acquireLock('leaderboard_refresh_job', LEADERBOARD_LOCK_TTL);
    if (!lockToken) {
      console.log('⏭️ [LEADERBOARD JOB] Another instance is running the refresh job, skipping');
      return;
    }

    try {
      await runLeaderboardRefresh();
    } catch (error: any) {
      console.error('❌ [LEADERBOARD JOB] Error:', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      await redisService.releaseLock('leaderboard_refresh_job', lockToken);
    }
  });

  console.log('✅ [LEADERBOARD JOB] Leaderboard refresh job started');
}

/**
 * Stop the leaderboard refresh job
 */
export function stopLeaderboardRefreshJob(): void {
  if (leaderboardRefreshJob) {
    leaderboardRefreshJob.stop();
    leaderboardRefreshJob = null;
    console.log('🛑 [LEADERBOARD JOB] Leaderboard refresh job stopped');
  }
}

/**
 * Manually trigger leaderboard refresh (for testing/maintenance)
 */
export async function triggerManualLeaderboardRefresh(): Promise<void> {
  const lockToken = await redisService.acquireLock('leaderboard_refresh_job', LEADERBOARD_LOCK_TTL);
  if (!lockToken) {
    throw new Error('Leaderboard refresh already in progress (locked by another instance)');
  }

  console.log('🏆 [LEADERBOARD JOB] Manual leaderboard refresh triggered');

  try {
    await runLeaderboardRefresh();
  } finally {
    await redisService.releaseLock('leaderboard_refresh_job', lockToken);
  }
}

/**
 * Get leaderboard job status
 */
export function getLeaderboardJobStatus(): {
  running: boolean;
  schedule: string;
} {
  return {
    running: leaderboardRefreshJob !== null,
    schedule: LEADERBOARD_REFRESH_SCHEDULE,
  };
}

/**
 * Initialize the leaderboard refresh job
 * Called from server startup after database connection
 */
export function initializeLeaderboardRefreshJob(): void {
  startLeaderboardRefreshJob();
}

export default {
  initialize: initializeLeaderboardRefreshJob,
  start: startLeaderboardRefreshJob,
  stop: stopLeaderboardRefreshJob,
  triggerManual: triggerManualLeaderboardRefresh,
  getStatus: getLeaderboardJobStatus,
};
