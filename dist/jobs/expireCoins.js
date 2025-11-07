"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCoinExpiryJob = startCoinExpiryJob;
exports.stopCoinExpiryJob = stopCoinExpiryJob;
exports.getCoinExpiryJobStatus = getCoinExpiryJobStatus;
exports.triggerManualCoinExpiry = triggerManualCoinExpiry;
exports.previewUpcomingExpirations = previewUpcomingExpirations;
exports.initializeCoinExpiryJob = initializeCoinExpiryJob;
const cron = __importStar(require("node-cron"));
const CoinTransaction_1 = require("../models/CoinTransaction");
const User_1 = require("../models/User");
const pushNotificationService_1 = __importDefault(require("../services/pushNotificationService"));
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
let expiryJob = null;
let isRunning = false;
// Configuration
const CRON_SCHEDULE = '0 1 * * *'; // Daily at 1:00 AM
const NOTIFICATION_BATCH_SIZE = 50; // Send notifications in batches to avoid overwhelming the system
/**
 * Find and process expired coins for all users
 */
async function processExpiredCoins() {
    const stats = {
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
        const expiredTransactions = await CoinTransaction_1.CoinTransaction.find({
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
        const userExpiryMap = new Map();
        for (const transaction of expiredTransactions) {
            const typedTransaction = transaction;
            const userId = typedTransaction.user.toString();
            if (!userExpiryMap.has(userId)) {
                userExpiryMap.set(userId, {
                    userId,
                    expiredAmount: 0,
                    newBalance: 0,
                    expiredTransactions: []
                });
            }
            const userData = userExpiryMap.get(userId);
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
                const currentBalance = await CoinTransaction_1.CoinTransaction.getUserBalance(userId);
                // Create expiry transaction (this will deduct from balance)
                const expiryTransaction = await CoinTransaction_1.CoinTransaction.createTransaction(userId, 'expired', expiryData.expiredAmount, 'expiry', `${expiryData.expiredAmount} coins expired from ${expiryData.expiredTransactions.length} transaction(s)`, {
                    expiredTransactionIds: expiryData.expiredTransactions.map(t => t.id),
                    expiredSources: [...new Set(expiryData.expiredTransactions.map(t => t.source))],
                    expiryDate: now
                });
                // Mark original transactions as expired
                await CoinTransaction_1.CoinTransaction.updateMany({
                    _id: { $in: expiryData.expiredTransactions.map(t => t.id) }
                }, {
                    $set: {
                        'metadata.isExpired': true,
                        'metadata.expiredAt': now,
                        'metadata.expiryTransactionId': expiryTransaction._id
                    }
                });
                expiryData.newBalance = expiryTransaction.balance;
                stats.usersAffected++;
                stats.totalCoinsExpired += expiryData.expiredAmount;
                stats.transactionsCreated++;
                console.log(`   ✓ User ${userId}: ${expiryData.expiredAmount} coins expired, new balance: ${expiryData.newBalance}`);
            }
            catch (error) {
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
    }
    catch (error) {
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
async function sendExpiryNotifications(userExpiryData, stats) {
    const notificationService = pushNotificationService_1.default;
    for (const userData of userExpiryData) {
        try {
            // Get user details for notification
            const user = await User_1.User.findById(userData.userId).select('phoneNumber profile.firstName email');
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
                await notificationService.sendOrderUpdate('COIN_EXPIRY', user.phoneNumber, title, message);
                stats.notificationsSent++;
                console.log(`   📧 Notification sent to user ${userData.userId}`);
            }
            catch (notifError) {
                console.error(`   ✗ Failed to send notification to ${userData.userId}:`, notifError.message);
                stats.notificationsFailed++;
            }
        }
        catch (error) {
            console.error(`❌ [COIN EXPIRY] Error sending notification to ${userData.userId}:`, error.message);
            stats.notificationsFailed++;
        }
    }
}
/**
 * Initialize and start the expiry job
 */
function startCoinExpiryJob() {
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
            }
            else {
                console.log('✨ [COIN EXPIRY] No coins expired today');
            }
        }
        catch (error) {
            const duration = Date.now() - startTime;
            console.error('❌ [COIN EXPIRY] Expiry job failed:', {
                duration: `${duration}ms`,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
        finally {
            isRunning = false;
        }
    });
    console.log('✅ [COIN EXPIRY] Coin expiry job started successfully');
}
/**
 * Stop the expiry job
 */
function stopCoinExpiryJob() {
    if (expiryJob) {
        expiryJob.stop();
        expiryJob = null;
        console.log('🛑 [COIN EXPIRY] Coin expiry job stopped');
    }
    else {
        console.log('⚠️ [COIN EXPIRY] No job running to stop');
    }
}
/**
 * Get expiry job status
 */
function getCoinExpiryJobStatus() {
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
async function triggerManualCoinExpiry() {
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
    }
    catch (error) {
        console.error('❌ [COIN EXPIRY] Manual expiry failed:', error);
        throw error;
    }
    finally {
        isRunning = false;
    }
}
/**
 * Preview upcoming expirations (without processing)
 */
async function previewUpcomingExpirations(daysAhead = 7) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const upcomingExpirations = await CoinTransaction_1.CoinTransaction.aggregate([
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
    const totalStats = upcomingExpirations.reduce((acc, item) => ({
        totalCoins: acc.totalCoins + item.totalCoins,
        usersAffected: acc.usersAffected + item.uniqueUsers
    }), { totalCoins: 0, usersAffected: 0 });
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
function initializeCoinExpiryJob() {
    startCoinExpiryJob();
}
exports.default = {
    start: startCoinExpiryJob,
    stop: stopCoinExpiryJob,
    getStatus: getCoinExpiryJobStatus,
    triggerManual: triggerManualCoinExpiry,
    previewUpcoming: previewUpcomingExpirations,
    initialize: initializeCoinExpiryJob
};
