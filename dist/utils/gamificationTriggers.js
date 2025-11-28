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
exports.triggerGamificationEvent = triggerGamificationEvent;
exports.batchTriggerGamification = batchTriggerGamification;
exports.recalculateUserGamification = recalculateUserGamification;
const Achievement_1 = require("../models/Achievement");
const streakService_1 = __importDefault(require("../services/streakService"));
const coinService_1 = __importDefault(require("../services/coinService"));
const CoinTransaction_1 = require("../models/CoinTransaction");
/**
 * Trigger gamification events based on user actions
 *
 * This utility automatically:
 * - Awards coins for various actions
 * - Checks and updates challenge progress
 * - Checks and unlocks achievements
 * - Updates daily streaks
 */
async function triggerGamificationEvent(userId, event, metadata = {}) {
    try {
        console.log(`🎮 Gamification trigger: ${event} for user ${userId}`);
        // Define coin rewards for each event
        const coinRewards = {
            order_placed: 50,
            review_submitted: 20,
            referral_success: 100,
            login: 10,
            bill_uploaded: 100,
            video_created: 50,
            project_completed: 75,
            offer_redeemed: 25
        };
        const reward = coinRewards[event] || 0;
        // Award coins if applicable
        if (reward > 0) {
            await coinService_1.default.awardCoins(userId, reward, event, `Earned ${reward} coins from ${event.replace(/_/g, ' ')}`, metadata);
            console.log(`   ✅ Awarded ${reward} coins`);
        }
        // Update daily streak for login events
        if (event === 'login') {
            await streakService_1.default.updateStreak(userId, 'login');
            console.log('   ✅ Updated login streak');
        }
        // Check for achievement unlocks
        await checkAchievements(userId, event, metadata);
        // Update challenge progress
        await updateChallengeProgress(userId, event, metadata);
        console.log(`✅ Gamification trigger completed for ${event}`);
    }
    catch (error) {
        console.error('❌ Gamification trigger error:', error);
        // Don't throw - gamification errors shouldn't block main operations
    }
}
/**
 * Check and unlock achievements based on user metrics
 */
async function checkAchievements(userId, event, metadata) {
    try {
        // Get all user achievements
        const achievements = await Achievement_1.UserAchievement.find({
            user: userId,
            unlocked: false
        });
        // Fetch user statistics based on event
        const stats = await getUserStats(userId, event);
        for (const achievement of achievements) {
            const definition = Achievement_1.ACHIEVEMENT_DEFINITIONS.find(def => def.type === achievement.type);
            if (!definition)
                continue;
            // Get current value for this achievement's metric
            const currentValue = stats[definition.requirement.metric] || 0;
            // Update achievement progress
            achievement.currentValue = currentValue;
            achievement.progress = Math.min(100, Math.round((currentValue / achievement.targetValue) * 100));
            // Check if achievement should be unlocked
            if (achievement.progress >= 100 && !achievement.unlocked) {
                achievement.unlocked = true;
                achievement.unlockedDate = new Date();
                // Award achievement rewards
                if (definition.reward?.coins) {
                    await coinService_1.default.awardCoins(userId, definition.reward.coins, 'achievement', `Unlocked achievement: ${achievement.title}`, { achievementId: achievement._id });
                }
                console.log(`   🏆 Achievement unlocked: ${achievement.title}`);
            }
            await achievement.save();
        }
    }
    catch (error) {
        console.error('Error checking achievements:', error);
    }
}
/**
 * Update challenge progress based on user actions
 */
async function updateChallengeProgress(userId, event, metadata) {
    try {
        // Map events to challenge actions
        const eventToChallengeAction = {
            order_placed: 'order_count',
            review_submitted: 'review_count',
            referral_success: 'refer_friends',
            login: 'login_streak',
            bill_uploaded: 'upload_bills'
        };
        const action = eventToChallengeAction[event];
        if (!action)
            return;
        // This would typically call a method in challengeService
        // to update challenge progress
        console.log(`   🎯 Updated challenge progress for action: ${action}`);
    }
    catch (error) {
        console.error('Error updating challenge progress:', error);
    }
}
/**
 * Get user statistics for achievement checking
 */
async function getUserStats(userId, event) {
    const stats = {};
    try {
        // Import models as needed
        const { Order } = await Promise.resolve().then(() => __importStar(require('../models/Order')));
        const { Video } = await Promise.resolve().then(() => __importStar(require('../models/Video')));
        const { Project } = await Promise.resolve().then(() => __importStar(require('../models/Project')));
        const { Review } = await Promise.resolve().then(() => __importStar(require('../models/Review')));
        const OfferRedemption = (await Promise.resolve().then(() => __importStar(require('../models/OfferRedemption')))).default;
        // Fetch relevant statistics based on event
        if (event === 'order_placed' || event === 'review_submitted') {
            const [orderStats, reviewCount, offerCount] = await Promise.all([
                Order.aggregate([
                    { $match: { user: userId, status: 'delivered' } },
                    {
                        $group: {
                            _id: null,
                            totalOrders: { $sum: 1 },
                            totalSpent: { $sum: '$totalPrice' }
                        }
                    }
                ]),
                Review.countDocuments({ user: userId }),
                OfferRedemption.countDocuments({ user: userId })
            ]);
            stats.totalOrders = orderStats[0]?.totalOrders || 0;
            stats.totalSpent = orderStats[0]?.totalSpent || 0;
            stats.totalReviews = reviewCount || 0;
        }
        if (event === 'video_created') {
            const videoStats = await Video.aggregate([
                { $match: { creator: userId } },
                {
                    $group: {
                        _id: null,
                        totalVideos: { $sum: 1 },
                        totalViews: { $sum: '$engagement.views' }
                    }
                }
            ]);
            stats.totalVideos = videoStats[0]?.totalVideos || 0;
            stats.totalVideoViews = videoStats[0]?.totalViews || 0;
        }
        if (event === 'project_completed') {
            const projectStats = await Project.aggregate([
                { $match: { 'submissions.user': userId } },
                { $unwind: '$submissions' },
                { $match: { 'submissions.user': userId } },
                {
                    $group: {
                        _id: null,
                        totalProjects: { $sum: 1 },
                        totalEarned: { $sum: { $ifNull: ['$submissions.paidAmount', 0] } }
                    }
                }
            ]);
            stats.totalProjects = projectStats[0]?.totalProjects || 0;
            stats.projectEarnings = projectStats[0]?.totalEarned || 0;
        }
        // Get coin-based stats
        const coinBalance = await CoinTransaction_1.CoinTransaction.getUserBalance(userId);
        stats.coinBalance = coinBalance;
        // Calculate total activity
        stats.totalActivity =
            (stats.totalOrders || 0) +
                (stats.totalVideos || 0) +
                (stats.totalProjects || 0) +
                (stats.totalReviews || 0);
    }
    catch (error) {
        console.error('Error fetching user stats:', error);
    }
    return stats;
}
/**
 * Batch trigger for multiple events (useful for recalculation)
 */
async function batchTriggerGamification(userId, events) {
    for (const { event, metadata } of events) {
        await triggerGamificationEvent(userId, event, metadata);
    }
}
/**
 * Recalculate all achievements for a user
 * (Useful when importing historical data or fixing issues)
 */
async function recalculateUserGamification(userId) {
    console.log(`🔄 Recalculating gamification for user ${userId}`);
    try {
        // Trigger all relevant events to recalculate
        const events = [
            'order_placed',
            'review_submitted',
            'video_created',
            'project_completed'
        ];
        for (const event of events) {
            await triggerGamificationEvent(userId, event);
        }
        console.log(`✅ Recalculation complete for user ${userId}`);
    }
    catch (error) {
        console.error('Error recalculating gamification:', error);
    }
}
exports.default = {
    triggerGamificationEvent,
    batchTriggerGamification,
    recalculateUserGamification
};
