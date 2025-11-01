"use strict";
// Achievement Service
// Handles automatic achievement updates and triggers
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
Object.defineProperty(exports, "__esModule", { value: true });
const Achievement_1 = require("../models/Achievement");
class AchievementService {
    /**
     * Recalculate all achievements for a user based on their current statistics
     */
    async recalculateUserAchievements(userId) {
        try {
            console.log(`🏆 [ACHIEVEMENT] Recalculating achievements for user: ${userId}`);
            // Get user statistics
            const { Order } = await Promise.resolve().then(() => __importStar(require('../models/Order')));
            const { Video } = await Promise.resolve().then(() => __importStar(require('../models/Video')));
            const { Project } = await Promise.resolve().then(() => __importStar(require('../models/Project')));
            const { Review } = await Promise.resolve().then(() => __importStar(require('../models/Review')));
            const { User } = await Promise.resolve().then(() => __importStar(require('../models/User')));
            const OfferRedemption = (await Promise.resolve().then(() => __importStar(require('../models/OfferRedemption')))).default;
            // Fetch all relevant metrics
            const [orderStats, videoStats, projectStats, reviewCount, offerCount, user] = await Promise.all([
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
                Video.aggregate([
                    { $match: { creator: userId } },
                    {
                        $group: {
                            _id: null,
                            totalVideos: { $sum: 1 },
                            totalViews: { $sum: '$engagement.views' }
                        }
                    }
                ]),
                Project.aggregate([
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
                ]),
                Review.countDocuments({ user: userId }),
                OfferRedemption.countDocuments({ user: userId }),
                User.findById(userId)
            ]);
            // Build metrics object
            const metrics = {
                totalOrders: orderStats[0]?.totalOrders || 0,
                totalSpent: orderStats[0]?.totalSpent || 0,
                totalVideos: videoStats[0]?.totalVideos || 0,
                totalVideoViews: videoStats[0]?.totalViews || 0,
                totalProjects: projectStats[0]?.totalProjects || 0,
                projectEarnings: projectStats[0]?.totalEarned || 0,
                totalReviews: reviewCount || 0,
                totalReferrals: user?.referral?.totalReferrals || 0,
                totalActivity: ((orderStats[0]?.totalOrders || 0) +
                    (videoStats[0]?.totalVideos || 0) +
                    (projectStats[0]?.totalProjects || 0) +
                    (reviewCount || 0) +
                    (offerCount || 0)),
                daysActive: user?.createdAt ? Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0
            };
            // Get all user achievements
            const achievements = await Achievement_1.UserAchievement.find({ user: userId });
            // Update each achievement based on its metric
            const updates = achievements.map(async (achievement) => {
                const definition = Achievement_1.ACHIEVEMENT_DEFINITIONS.find(def => def.type === achievement.type);
                if (!definition)
                    return achievement;
                const currentValue = metrics[definition.requirement.metric] || 0;
                const wasUnlocked = achievement.unlocked;
                achievement.currentValue = currentValue;
                achievement.progress = Math.min(100, Math.round((currentValue / achievement.targetValue) * 100));
                // Check if achievement should be unlocked
                if (achievement.progress >= 100 && !achievement.unlocked) {
                    achievement.unlocked = true;
                    achievement.unlockedDate = new Date();
                    console.log(`🎉 [ACHIEVEMENT] User ${userId} unlocked achievement: ${achievement.title}`);
                }
                return achievement.save();
            });
            await Promise.all(updates);
            console.log(`✅ [ACHIEVEMENT] Successfully recalculated achievements for user: ${userId}`);
        }
        catch (error) {
            console.error(`❌ [ACHIEVEMENT] Error recalculating achievements for user ${userId}:`, error);
            // Don't throw error to avoid disrupting the main flow
        }
    }
    /**
     * Initialize achievements for a new user
     */
    async initializeUserAchievements(userId) {
        try {
            console.log(`🏆 [ACHIEVEMENT] Initializing achievements for user: ${userId}`);
            // Check if achievements already exist
            const existingCount = await Achievement_1.UserAchievement.countDocuments({ user: userId });
            if (existingCount > 0) {
                console.log(`ℹ️ [ACHIEVEMENT] Achievements already exist for user: ${userId}`);
                return;
            }
            // Create achievement entries for all defined achievements
            const achievements = Achievement_1.ACHIEVEMENT_DEFINITIONS.filter(def => def.isActive).map(def => ({
                user: userId,
                type: def.type,
                title: def.title,
                description: def.description,
                icon: def.icon,
                color: def.color,
                unlocked: false,
                progress: 0,
                targetValue: def.requirement.target
            }));
            await Achievement_1.UserAchievement.insertMany(achievements);
            console.log(`✅ [ACHIEVEMENT] Successfully initialized ${achievements.length} achievements for user: ${userId}`);
        }
        catch (error) {
            console.error(`❌ [ACHIEVEMENT] Error initializing achievements for user ${userId}:`, error);
            // Don't throw error to avoid disrupting the main flow
        }
    }
    /**
     * Trigger achievement recalculation after specific actions
     */
    async triggerAchievementUpdate(userId, action) {
        try {
            console.log(`🏆 [ACHIEVEMENT] Triggering achievement update for user: ${userId}, action: ${action}`);
            // Recalculate achievements
            await this.recalculateUserAchievements(userId);
        }
        catch (error) {
            console.error(`❌ [ACHIEVEMENT] Error triggering achievement update for user ${userId}:`, error);
        }
    }
    /**
     * Check and award achievements based on user actions
     * This is a more targeted approach for specific achievement types
     */
    async checkAndAwardAchievements(userId, type, data) {
        try {
            console.log(`🏆 [ACHIEVEMENT] Checking achievements for user: ${userId}, type: ${type}`);
            // Map action types to achievement types
            const achievementTypeMap = {
                'order_completed': ['first_order', 'order_master', 'shopping_spree', 'big_spender'],
                'video_created': ['first_video', 'content_creator', 'video_star'],
                'project_completed': ['first_project', 'project_master', 'earner'],
                'review_created': ['first_review', 'reviewer'],
                'referral_completed': ['referral_starter', 'referral_pro'],
                'offer_redeemed': ['deal_hunter'],
                'activity': ['active_user']
            };
            const relevantAchievementTypes = achievementTypeMap[type] || [];
            if (relevantAchievementTypes.length === 0) {
                console.log(`ℹ️ [ACHIEVEMENT] No relevant achievement types for action: ${type}`);
                // Still recalculate all achievements to be safe
                await this.recalculateUserAchievements(userId);
                return;
            }
            // Get relevant achievements for the user
            const achievements = await Achievement_1.UserAchievement.find({
                user: userId,
                type: { $in: relevantAchievementTypes },
                unlocked: false // Only check unlocked achievements
            });
            if (achievements.length === 0) {
                console.log(`ℹ️ [ACHIEVEMENT] No unlocked achievements to check for user: ${userId}`);
                return;
            }
            // Recalculate only if there are relevant achievements to check
            await this.recalculateUserAchievements(userId);
            console.log(`✅ [ACHIEVEMENT] Successfully checked and updated achievements for user: ${userId}`);
        }
        catch (error) {
            console.error(`❌ [ACHIEVEMENT] Error checking achievements for user ${userId}:`, error);
            // Don't throw error to avoid disrupting the main flow
        }
    }
}
exports.default = new AchievementService();
