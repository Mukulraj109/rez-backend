"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerTrialExpiryCheck = exports.initializeTrialExpiryJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const Subscription_1 = require("../models/Subscription");
const User_1 = require("../models/User");
const Notification_1 = require("../models/Notification");
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Send trial expiry notification to user
 */
const sendTrialNotification = async (payload) => {
    try {
        const { userId, userName, daysRemaining, trialTier } = payload;
        // Get urgency level based on days remaining
        let urgencyLevel = 'low';
        let notificationTitle = '';
        let notificationMessage = '';
        if (daysRemaining === 0) {
            // Trial expires today
            urgencyLevel = 'high';
            notificationTitle = '⏰ Your Trial Expires Today!';
            notificationMessage = `Your ${trialTier} trial ends today! Subscribe now to keep your benefits and exclusive deals.`;
        }
        else if (daysRemaining === 1) {
            // Trial expires tomorrow
            urgencyLevel = 'high';
            notificationTitle = '⚠️ Trial Expires Tomorrow!';
            notificationMessage = `Only 1 day left! Subscribe to ${trialTier} before your benefits expire.`;
        }
        else if (daysRemaining === 3) {
            // Trial expires in 3 days
            urgencyLevel = 'medium';
            notificationTitle = '📅 Your Trial Ends in 3 Days';
            notificationMessage = `Get ready! Your ${trialTier} trial ends in 3 days. Don't miss out on exclusive benefits!`;
        }
        else if (daysRemaining <= 7) {
            // Trial expires in a week
            urgencyLevel = 'medium';
            notificationTitle = '⏳ Trial Ending Soon';
            notificationMessage = `Your ${trialTier} trial ends in ${daysRemaining} days. Upgrade to keep enjoying premium features.`;
        }
        // Send in-app notification
        await Notification_1.Notification.create({
            user: new mongoose_1.default.Types.ObjectId(userId),
            type: 'system',
            title: notificationTitle,
            message: notificationMessage,
            data: {
                tier: trialTier,
                daysRemaining,
                action: 'upgrade',
                routeTo: '/subscription/trial',
            },
            priority: urgencyLevel === 'high' ? 'high' : 'normal',
            isRead: false,
        });
        console.log(`[TRIAL NOTIFICATION] Sent to user ${userId}: ${daysRemaining} days remaining`);
        // Send push notification if user has push notifications enabled
        try {
            const user = await User_1.User.findById(userId).select('preferences');
            if (user?.preferences?.notifications?.push) {
                // Push notification would be sent here
                // This depends on your push notification service (Firebase, OneSignal, etc.)
                console.log(`[TRIAL PUSH NOTIFICATION] Would be sent to user ${userId}`);
            }
        }
        catch (error) {
            console.warn(`[TRIAL NOTIFICATION] Could not send push notification for user ${userId}:`, error);
        }
        // Send email notification
        try {
            const user = await User_1.User.findById(userId).select('email profile preferences');
            if (user?.email && user.preferences?.notifications?.email) {
                // Email notification would be sent here
                // This depends on your email service (SendGrid, AWS SES, etc.)
                console.log(`[TRIAL EMAIL NOTIFICATION] Would be sent to ${user.email}`);
            }
        }
        catch (error) {
            console.warn(`[TRIAL NOTIFICATION] Could not send email for user ${userId}:`, error);
        }
    }
    catch (error) {
        console.error('[TRIAL NOTIFICATION] Error sending notification:', error);
        throw error;
    }
};
/**
 * Check for expiring trials and send notifications
 */
const checkExpiringTrials = async () => {
    try {
        console.log('[TRIAL EXPIRY JOB] Starting trial expiry check...');
        const now = new Date();
        // Get trials that expire in 3 days
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const threeDaysTrials = await Subscription_1.Subscription.find({
            status: 'trial',
            trialEndDate: {
                $gte: now,
                $lte: threeDaysFromNow,
            },
        }).populate({
            path: 'user',
            select: 'email firstName userPreferences pushTokens',
        });
        // Get trials that expire in 1 day
        const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
        const oneDayTrials = await Subscription_1.Subscription.find({
            status: 'trial',
            trialEndDate: {
                $gte: now,
                $lte: oneDayFromNow,
            },
        }).populate({
            path: 'user',
            select: 'email firstName userPreferences pushTokens',
        });
        // Get trials that expire today
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);
        const todayTrials = await Subscription_1.Subscription.find({
            status: 'trial',
            trialEndDate: {
                $gte: now,
                $lte: endOfToday,
            },
        }).populate({
            path: 'user',
            select: 'email firstName userPreferences pushTokens',
        });
        // Process notifications for 3-day trials
        for (const subscription of threeDaysTrials) {
            const daysRemaining = Math.ceil((subscription.trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            // Only process if exactly 3 days remaining
            if (daysRemaining === 3) {
                const user = subscription.user;
                await sendTrialNotification({
                    userId: user._id.toString(),
                    userName: user.firstName || 'User',
                    daysRemaining: 3,
                    trialTier: subscription.tier,
                    trialEndDate: subscription.trialEndDate,
                });
            }
        }
        // Process notifications for 1-day trials
        for (const subscription of oneDayTrials) {
            const daysRemaining = Math.ceil((subscription.trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            // Only process if exactly 1 day remaining
            if (daysRemaining === 1) {
                const user = subscription.user;
                await sendTrialNotification({
                    userId: user._id.toString(),
                    userName: user.firstName || 'User',
                    daysRemaining: 1,
                    trialTier: subscription.tier,
                    trialEndDate: subscription.trialEndDate,
                });
            }
        }
        // Process notifications for today's trials
        for (const subscription of todayTrials) {
            const daysRemaining = Math.ceil((subscription.trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            // Only process if 0 days remaining (expires today)
            if (daysRemaining === 0) {
                const user = subscription.user;
                await sendTrialNotification({
                    userId: user._id.toString(),
                    userName: user.firstName || 'User',
                    daysRemaining: 0,
                    trialTier: subscription.tier,
                    trialEndDate: subscription.trialEndDate,
                });
                // Auto-downgrade subscription to free tier when trial expires
                await Subscription_1.Subscription.findByIdAndUpdate(subscription._id, {
                    status: 'expired',
                    tier: 'free',
                    endDate: now,
                    autoRenew: false,
                }, { new: true });
                console.log(`[TRIAL EXPIRY JOB] Auto-downgraded subscription ${subscription._id} to free tier`);
            }
        }
        console.log(`[TRIAL EXPIRY JOB] Completed. Processed: ${threeDaysTrials.length} (3-day), ` +
            `${oneDayTrials.length} (1-day), ${todayTrials.length} (today)`);
    }
    catch (error) {
        console.error('[TRIAL EXPIRY JOB] Error checking expiring trials:', error);
    }
};
/**
 * Initialize trial expiry notification job
 * Runs daily at 9:00 AM
 */
const initializeTrialExpiryJob = () => {
    try {
        // Run at 9:00 AM every day
        node_cron_1.default.schedule('0 9 * * *', async () => {
            console.log('[TRIAL EXPIRY JOB] Scheduled job triggered');
            await checkExpiringTrials();
        });
        console.log('[TRIAL EXPIRY JOB] Initialized successfully (runs daily at 9:00 AM)');
    }
    catch (error) {
        console.error('[TRIAL EXPIRY JOB] Failed to initialize:', error);
    }
};
exports.initializeTrialExpiryJob = initializeTrialExpiryJob;
/**
 * Manual trigger for testing
 */
const triggerTrialExpiryCheck = async () => {
    console.log('[TRIAL EXPIRY JOB] Manual trigger');
    await checkExpiringTrials();
};
exports.triggerTrialExpiryCheck = triggerTrialExpiryCheck;
exports.default = {
    initializeTrialExpiryJob: exports.initializeTrialExpiryJob,
    triggerTrialExpiryCheck: exports.triggerTrialExpiryCheck,
    checkExpiringTrials,
};
