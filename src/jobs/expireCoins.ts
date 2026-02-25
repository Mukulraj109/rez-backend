import * as cron from 'node-cron';
import { CoinTransaction, ICoinTransaction } from '../models/CoinTransaction';
import { User } from '../models/User';
import PushNotificationService from '../services/pushNotificationService';

/**
 * Coin Expiry Job
 *
 * This background job runs daily at 1:00 AM to manage coin expiration.
 *
 * What it does:
 * 1. Finds all coin transactions with expiresAt date in the past
 * 2. Creates expiry transactions to deduct expired coins
 * 3. Updates user coin balances
 * 4. Sends notifications to affected users
 * 5. Logs expiry statistics for monitoring
 *
 * This ensures coins don't accumulate indefinitely and encourages users
 * to use their earned coins within a reasonable timeframe.
 */

let expiryJob: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

// Configuration
const CRON_SCHEDULE = '0 1 * * *'; // Daily at 1:00 AM
const NOTIFICATION_BATCH_SIZE = 50; // Send notifications in batches to avoid overwhelming the system

interface ExpiryStats {
  usersAffected: number;
  totalCoinsExpired: number;
  transactionsCreated: number;
  notificationsSent: number;
  notificationsFailed: number;
  errors: Array<{
    userId: string;
    error: string;
  }>;
}

interface UserExpiryData {
  userId: string;
  expiredAmount: number;
  newBalance: number;
  expiredTransactions: Array<{
    id: string;
    source: string;
    amount: number;
    earnedDate: Date;
  }>;
}

/**
 * Send pre-expiry notifications for coins expiring within 48 hours.
 * Runs before the actual expiry processing to give users a chance to use their coins.
 */
async function sendPreExpiryNotifications(): Promise<{ notified: number; failed: number }> {
  const stats = { notified: 0, failed: 0 };

  try {
    const now = new Date();
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Find earned transactions expiring within 48 hours that haven't been notified
    const soonExpiringTransactions = await CoinTransaction.find({
      type: 'earned',
      expiresAt: { $gt: now, $lte: fortyEightHoursFromNow },
      $or: [
        { 'metadata.isExpired': { $ne: true } },
        { metadata: { $exists: false } }
      ],
      'metadata.expiryWarningNotified': { $ne: true }
    }).sort({ user: 1, expiresAt: 1 });

    if (soonExpiringTransactions.length === 0) {
      console.log('✨ [COIN EXPIRY] No coins expiring within 48h');
      return stats;
    }

    // Group by user
    const userExpiryMap = new Map<string, { totalAmount: number; earliestExpiry: Date; txIds: string[] }>();

    for (const tx of soonExpiringTransactions) {
      const userId = tx.user.toString();
      if (!userExpiryMap.has(userId)) {
        userExpiryMap.set(userId, { totalAmount: 0, earliestExpiry: tx.expiresAt!, txIds: [] });
      }
      const data = userExpiryMap.get(userId)!;
      data.totalAmount += tx.amount;
      data.txIds.push(String(tx._id));
      if (tx.expiresAt! < data.earliestExpiry) {
        data.earliestExpiry = tx.expiresAt!;
      }
    }

    console.log(`⏰ [COIN EXPIRY] Sending pre-expiry notifications to ${userExpiryMap.size} users`);

    for (const [userId, data] of userExpiryMap.entries()) {
      try {
        const user = await User.findById(userId).select('phoneNumber').lean();
        if (!user?.phoneNumber) continue;

        const expiryDateStr = data.earliestExpiry.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });

        await PushNotificationService.sendCoinsExpiringSoon(
          user.phoneNumber,
          data.totalAmount,
          expiryDateStr
        );

        stats.notified++;

        // Mark these transactions as warned so we don't notify again
        await CoinTransaction.updateMany(
          { _id: { $in: data.txIds } },
          { $set: { 'metadata.expiryWarningNotified': true } }
        );
      } catch (notifErr) {
        stats.failed++;
        if (process.env.NODE_ENV === 'development') {
          console.log(`[COIN EXPIRY] Failed to send pre-expiry notification for user ${userId}:`, notifErr);
        }
      }
    }
  } catch (error) {
    console.error('❌ [COIN EXPIRY] Error in pre-expiry notifications:', error);
  }

  return stats;
}

/**
 * Find and process expired coins for all users
 */
async function processExpiredCoins(): Promise<ExpiryStats> {
  const stats: ExpiryStats = {
    usersAffected: 0,
    totalCoinsExpired: 0,
    transactionsCreated: 0,
    notificationsSent: 0,
    notificationsFailed: 0,
    errors: []
  };

  try {
    const now = new Date();

    // Find all earned transactions that have expired
    const expiredTransactions = await CoinTransaction.find({
      type: 'earned',
      expiresAt: { $lte: now, $ne: null },
      // Only process transactions that haven't been marked as expired yet
      $or: [
        { metadata: { $exists: false } },
        { 'metadata.isExpired': { $ne: true } }
      ]
    })
      .populate('user', 'phoneNumber email profile.firstName')
      .sort({ user: 1, expiresAt: 1 });

    console.log(`💰 [COIN EXPIRY] Found ${expiredTransactions.length} expired coin transactions`);

    if (expiredTransactions.length === 0) {
      return stats;
    }

    // Group expired transactions by user
    const userExpiryMap = new Map<string, UserExpiryData>();

    for (const transaction of expiredTransactions) {
      const typedTransaction = transaction as ICoinTransaction;
      const userId = typedTransaction.user.toString();

      if (!userExpiryMap.has(userId)) {
        userExpiryMap.set(userId, {
          userId,
          expiredAmount: 0,
          newBalance: 0,
          expiredTransactions: []
        });
      }

      const userData = userExpiryMap.get(userId)!;
      userData.expiredAmount += typedTransaction.amount;
      userData.expiredTransactions.push({
        id: String(typedTransaction._id),
        source: typedTransaction.source,
        amount: typedTransaction.amount,
        earnedDate: typedTransaction.createdAt
      });
    }

    console.log(`👥 [COIN EXPIRY] Processing expiry for ${userExpiryMap.size} users`);

    // Process each user's expired coins
    for (const [userId, expiryData] of userExpiryMap.entries()) {
      try {
        // Get current balance
        const currentBalance = await CoinTransaction.getUserBalance(userId);

        // Create expiry transaction (this will deduct from balance)
        const expiryTransaction = await CoinTransaction.createTransaction(
          userId,
          'expired',
          expiryData.expiredAmount,
          'expiry',
          `${expiryData.expiredAmount} coins expired from ${expiryData.expiredTransactions.length} transaction(s)`,
          {
            expiredTransactionIds: expiryData.expiredTransactions.map(t => t.id),
            expiredSources: [...new Set(expiryData.expiredTransactions.map(t => t.source))],
            expiryDate: now
          }
        );

        // Mark original transactions as expired
        await CoinTransaction.updateMany(
          {
            _id: { $in: expiryData.expiredTransactions.map(t => t.id) }
          },
          {
            $set: {
              'metadata.isExpired': true,
              'metadata.expiredAt': now,
              'metadata.expiryTransactionId': expiryTransaction._id
            }
          }
        );

        expiryData.newBalance = expiryTransaction.balance;

        stats.usersAffected++;
        stats.totalCoinsExpired += expiryData.expiredAmount;
        stats.transactionsCreated++;

        console.log(`   ✓ User ${userId}: ${expiryData.expiredAmount} coins expired, new balance: ${expiryData.newBalance}`);

      } catch (error: any) {
        console.error(`   ✗ Failed to process expiry for user ${userId}:`, error.message);
        stats.errors.push({
          userId,
          error: error.message || 'Unknown error'
        });
      }
    }

    // Send notifications in batches
    const userExpiryArray = Array.from(userExpiryMap.values());
    for (let i = 0; i < userExpiryArray.length; i += NOTIFICATION_BATCH_SIZE) {
      const batch = userExpiryArray.slice(i, i + NOTIFICATION_BATCH_SIZE);
      await sendExpiryNotifications(batch, stats);

      // Small delay between batches
      if (i + NOTIFICATION_BATCH_SIZE < userExpiryArray.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

  } catch (error: any) {
    console.error('❌ [COIN EXPIRY] Error processing expired coins:', error);
    stats.errors.push({
      userId: 'SYSTEM',
      error: error.message || 'Unknown error'
    });
  }

  return stats;
}

/**
 * Send expiry notifications to users
 */
async function sendExpiryNotifications(
  userExpiryData: UserExpiryData[],
  stats: ExpiryStats
): Promise<void> {
  const notificationService = PushNotificationService;

  for (const userData of userExpiryData) {
    try {
      // Get user details for notification
      const user = await User.findById(userData.userId).select('phoneNumber profile.firstName email');

      if (!user) {
        console.warn(`⚠️ [COIN EXPIRY] User ${userData.userId} not found for notification`);
        continue;
      }

      const firstName = user.profile?.firstName || 'Valued Customer';

      // Prepare notification message
      const title = 'Coins Expired';
      const message = `Hi ${firstName}, ${userData.expiredAmount} coins have expired from your account. Your new balance is ${userData.newBalance} coins. Earn and use coins before they expire!`;

      // Try to send notification
      try {
        await notificationService.sendOrderUpdate(
          'COIN_EXPIRY',
          user.phoneNumber,
          title,
          message
        );
        stats.notificationsSent++;
        console.log(`   📧 Notification sent to user ${userData.userId}`);
      } catch (notifError: any) {
        console.error(`   ✗ Failed to send notification to ${userData.userId}:`, notifError.message);
        stats.notificationsFailed++;
      }

    } catch (error: any) {
      console.error(`❌ [COIN EXPIRY] Error sending notification to ${userData.userId}:`, error.message);
      stats.notificationsFailed++;
    }
  }
}

/**
 * Initialize and start the expiry job
 */
export function startCoinExpiryJob(): void {
  if (expiryJob) {
    console.log('⚠️ [COIN EXPIRY] Job already running');
    return;
  }

  console.log(`💰 [COIN EXPIRY] Starting coin expiry job (runs daily at 1:00 AM)`);

  expiryJob = cron.schedule(CRON_SCHEDULE, async () => {
    // Prevent concurrent executions
    if (isRunning) {
      console.log('⏭️ [COIN EXPIRY] Previous expiry job still running, skipping this execution');
      return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      console.log('💰 [COIN EXPIRY] Running coin expiry job...');

      // Phase 1: Send pre-expiry notifications (48h warning)
      const preExpiryStats = await sendPreExpiryNotifications();
      if (preExpiryStats.notified > 0) {
        console.log(`⏰ [COIN EXPIRY] Pre-expiry: ${preExpiryStats.notified} notified, ${preExpiryStats.failed} failed`);
      }

      // Phase 2: Process actual expired coins
      const stats = await processExpiredCoins();

      const duration = Date.now() - startTime;

      console.log('✅ [COIN EXPIRY] Expiry job completed:', {
        duration: `${duration}ms`,
        usersAffected: stats.usersAffected,
        totalCoinsExpired: stats.totalCoinsExpired,
        transactionsCreated: stats.transactionsCreated,
        notificationsSent: stats.notificationsSent,
        notificationsFailed: stats.notificationsFailed,
        errorCount: stats.errors.length,
        timestamp: new Date().toISOString()
      });

      if (stats.errors.length > 0) {
        console.error('❌ [COIN EXPIRY] Errors during expiry:');
        stats.errors.slice(0, 10).forEach((error, index) => {
          console.error(`   ${index + 1}. User: ${error.userId}, Error: ${error.error}`);
        });
        if (stats.errors.length > 10) {
          console.error(`   ... and ${stats.errors.length - 10} more errors`);
        }
      }

      // Summary message
      if (stats.usersAffected > 0) {
        console.log(`📈 [COIN EXPIRY] ${stats.totalCoinsExpired} coins expired from ${stats.usersAffected} users, ${stats.notificationsSent} notifications sent`);
      } else {
        console.log('✨ [COIN EXPIRY] No coins expired today');
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ [COIN EXPIRY] Expiry job failed:', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      isRunning = false;
    }
  });

  console.log('✅ [COIN EXPIRY] Coin expiry job started successfully');
}

/**
 * Stop the expiry job
 */
export function stopCoinExpiryJob(): void {
  if (expiryJob) {
    expiryJob.stop();
    expiryJob = null;
    console.log('🛑 [COIN EXPIRY] Coin expiry job stopped');
  } else {
    console.log('⚠️ [COIN EXPIRY] No job running to stop');
  }
}

/**
 * Get expiry job status
 */
export function getCoinExpiryJobStatus(): {
  running: boolean;
  executing: boolean;
  schedule: string;
  config: {
    notificationBatchSize: number;
  };
} {
  return {
    running: expiryJob !== null,
    executing: isRunning,
    schedule: CRON_SCHEDULE,
    config: {
      notificationBatchSize: NOTIFICATION_BATCH_SIZE
    }
  };
}

/**
 * Manually trigger coin expiry (for testing or maintenance)
 */
export async function triggerManualCoinExpiry(): Promise<ExpiryStats> {
  if (isRunning) {
    console.log('⚠️ [COIN EXPIRY] Expiry already running, please wait');
    throw new Error('Expiry already in progress');
  }

  console.log('💰 [COIN EXPIRY] Manual expiry triggered');

  isRunning = true;
  const startTime = Date.now();

  try {
    const stats = await processExpiredCoins();
    const duration = Date.now() - startTime;

    console.log('✅ [COIN EXPIRY] Manual expiry completed:', {
      duration: `${duration}ms`,
      usersAffected: stats.usersAffected,
      totalCoinsExpired: stats.totalCoinsExpired,
      notificationsSent: stats.notificationsSent
    });

    return stats;
  } catch (error) {
    console.error('❌ [COIN EXPIRY] Manual expiry failed:', error);
    throw error;
  } finally {
    isRunning = false;
  }
}

/**
 * Preview upcoming expirations (without processing)
 */
export async function previewUpcomingExpirations(daysAhead: number = 7): Promise<{
  totalCoins: number;
  usersAffected: number;
  expirationsByDate: Array<{
    date: Date;
    coins: number;
    users: number;
  }>;
}> {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const upcomingExpirations = await CoinTransaction.aggregate([
    {
      $match: {
        type: 'earned',
        expiresAt: {
          $gt: now,
          $lte: futureDate
        },
        $or: [
          { 'metadata.isExpired': { $ne: true } },
          { metadata: { $exists: false } }
        ]
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$expiresAt' } },
          user: '$user'
        },
        totalAmount: { $sum: '$amount' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        totalCoins: { $sum: '$totalAmount' },
        uniqueUsers: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  const totalStats = upcomingExpirations.reduce(
    (acc, item) => ({
      totalCoins: acc.totalCoins + item.totalCoins,
      usersAffected: acc.usersAffected + item.uniqueUsers
    }),
    { totalCoins: 0, usersAffected: 0 }
  );

  return {
    totalCoins: totalStats.totalCoins,
    usersAffected: totalStats.usersAffected,
    expirationsByDate: upcomingExpirations.map(item => ({
      date: new Date(item._id),
      coins: item.totalCoins,
      users: item.uniqueUsers
    }))
  };
}

/**
 * Initialize the job (called from server startup)
 */
export function initializeCoinExpiryJob(): void {
  startCoinExpiryJob();
}

export default {
  start: startCoinExpiryJob,
  stop: stopCoinExpiryJob,
  getStatus: getCoinExpiryJobStatus,
  triggerManual: triggerManualCoinExpiry,
  previewUpcoming: previewUpcomingExpirations,
  initialize: initializeCoinExpiryJob
};
