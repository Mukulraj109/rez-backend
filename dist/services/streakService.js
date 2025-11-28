"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const UserStreak_1 = __importDefault(require("../models/UserStreak"));
// Streak milestones and their rewards
const STREAK_MILESTONES = {
    login: [
        { day: 3, coins: 50, name: '3-Day Streak' },
        { day: 7, coins: 200, name: 'Week Warrior' },
        { day: 14, coins: 500, name: 'Two-Week Champion' },
        { day: 30, coins: 2000, name: 'Month Master', badge: 'streak_master' },
        { day: 60, coins: 5000, name: 'Dedication Pro' },
        { day: 100, coins: 10000, name: 'Loyalty Legend', badge: 'loyalty_legend' }
    ],
    order: [
        { day: 2, coins: 100, name: 'Double Order' },
        { day: 4, coins: 300, name: 'Shopping Habit' },
        { day: 7, coins: 800, name: 'Weekly Shopper' },
        { day: 14, coins: 2000, name: 'Shopping Pro', badge: 'shopping_pro' }
    ],
    review: [
        { day: 3, coins: 75, name: 'Review Regular' },
        { day: 7, coins: 250, name: 'Review Pro' },
        { day: 14, coins: 600, name: 'Review Champion', badge: 'review_champion' }
    ]
};
class StreakService {
    // Get or create user streak
    async getOrCreateStreak(userId, type) {
        let streak = await UserStreak_1.default.findOne({ user: userId, type });
        if (!streak) {
            streak = await UserStreak_1.default.create({
                user: userId,
                type,
                currentStreak: 0,
                longestStreak: 0,
                lastActivityDate: new Date(),
                streakStartDate: new Date(),
                totalDays: 0,
                milestones: STREAK_MILESTONES[type].map(m => ({
                    day: m.day,
                    rewardsClaimed: false
                }))
            });
        }
        return streak;
    }
    // Update streak (call this when user performs action)
    async updateStreak(userId, type) {
        const streak = await this.getOrCreateStreak(userId, type);
        await streak.updateStreak();
        // Check if milestone reached
        const milestone = this.checkMilestone(streak, type);
        return {
            streak,
            milestoneReached: milestone
        };
    }
    // Check if milestone reached
    checkMilestone(streak, type) {
        const milestones = STREAK_MILESTONES[type];
        for (const milestone of milestones) {
            if (streak.currentStreak === milestone.day) {
                const streakMilestone = streak.milestones.find(m => m.day === milestone.day);
                if (streakMilestone && !streakMilestone.rewardsClaimed) {
                    return {
                        ...milestone,
                        canClaim: true
                    };
                }
            }
        }
        return null;
    }
    // Claim milestone reward
    async claimMilestone(userId, type, day) {
        const streak = await this.getOrCreateStreak(userId, type);
        if (streak.currentStreak < day) {
            throw new Error('Milestone not reached yet');
        }
        await streak.claimMilestone(day);
        const milestone = STREAK_MILESTONES[type].find(m => m.day === day);
        if (!milestone) {
            throw new Error('Invalid milestone');
        }
        return {
            streak,
            rewards: {
                coins: milestone.coins,
                badge: milestone.badge,
                name: milestone.name
            }
        };
    }
    // Freeze streak (Premium feature)
    async freezeStreak(userId, type, days = 1) {
        const streak = await this.getOrCreateStreak(userId, type);
        if (streak.frozen && streak.freezeExpiresAt && streak.freezeExpiresAt > new Date()) {
            throw new Error('Streak already frozen');
        }
        await streak.freezeStreak(days);
        return streak;
    }
    // Get all streaks for user
    async getUserStreaks(userId) {
        const [login, order, review] = await Promise.all([
            this.getOrCreateStreak(userId, 'login'),
            this.getOrCreateStreak(userId, 'order'),
            this.getOrCreateStreak(userId, 'review')
        ]);
        return {
            login: this.formatStreak(login, 'login'),
            order: this.formatStreak(order, 'order'),
            review: this.formatStreak(review, 'review')
        };
    }
    // Format streak with milestone info
    formatStreak(streak, type) {
        const milestones = STREAK_MILESTONES[type];
        // Find next milestone
        const nextMilestone = milestones.find(m => m.day > streak.currentStreak);
        // Find claimable milestones
        const claimableMilestones = milestones.filter(m => {
            const streakMilestone = streak.milestones.find(sm => sm.day === m.day);
            return streak.currentStreak >= m.day && streakMilestone && !streakMilestone.rewardsClaimed;
        });
        return {
            current: streak.currentStreak,
            longest: streak.longestStreak,
            totalDays: streak.totalDays,
            frozen: streak.frozen,
            freezeExpiresAt: streak.freezeExpiresAt,
            lastActivity: streak.lastActivityDate,
            nextMilestone,
            claimableMilestones,
            allMilestones: milestones.map(m => {
                const streakMilestone = streak.milestones.find(sm => sm.day === m.day);
                return {
                    ...m,
                    reached: streak.currentStreak >= m.day,
                    claimed: streakMilestone?.rewardsClaimed || false,
                    claimedAt: streakMilestone?.claimedAt
                };
            })
        };
    }
    // Get streak statistics
    async getStreakStats(userId) {
        const streaks = await UserStreak_1.default.find({ user: userId });
        const stats = {
            totalStreaks: 0,
            longestStreak: 0,
            totalDaysActive: 0,
            currentlyActive: 0,
            byType: {}
        };
        streaks.forEach(streak => {
            stats.totalStreaks++;
            stats.totalDaysActive += streak.totalDays;
            if (streak.longestStreak > stats.longestStreak) {
                stats.longestStreak = streak.longestStreak;
            }
            if (streak.currentStreak > 0) {
                stats.currentlyActive++;
            }
            stats.byType[streak.type] = {
                current: streak.currentStreak,
                longest: streak.longestStreak,
                total: streak.totalDays
            };
        });
        return stats;
    }
    // Check for broken streaks (run daily via cron)
    async checkBrokenStreaks() {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        // Find streaks that should have been updated yesterday
        const streaks = await UserStreak_1.default.find({
            currentStreak: { $gt: 0 },
            lastActivityDate: { $lt: yesterday }
        });
        for (const streak of streaks) {
            // Check if frozen
            if (streak.frozen && streak.freezeExpiresAt && streak.freezeExpiresAt >= now) {
                continue; // Freeze protects the streak
            }
            // Streak is broken
            streak.currentStreak = 0;
            streak.frozen = false;
            streak.freezeExpiresAt = undefined;
            await streak.save();
            console.log(`Streak broken for user ${streak.user}, type: ${streak.type}`);
        }
    }
}
exports.default = new StreakService();
