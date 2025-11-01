"use strict";
// Activity Service
// Helper service for creating activities from other controllers
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityService = exports.referralActivities = exports.achievementActivities = exports.walletActivities = exports.reviewActivities = exports.cashbackActivities = exports.orderActivities = exports.createActivity = void 0;
const Activity_1 = require("../models/Activity");
/**
 * Create an activity record
 * This is called by other services/controllers to log user activities
 */
const createActivity = async (options) => {
    try {
        const { userId, type, title, description, amount, icon, color, relatedEntity, metadata } = options;
        // Get default icon and color if not provided
        const defaults = (0, Activity_1.getActivityTypeDefaults)(type);
        const activity = new Activity_1.Activity({
            user: userId,
            type,
            title,
            description,
            amount,
            icon: icon || defaults.icon,
            color: color || defaults.color,
            relatedEntity,
            metadata: metadata || {}
        });
        await activity.save();
        console.log(`✅ [ACTIVITY] Created ${type} activity for user ${userId}: ${title}`);
    }
    catch (error) {
        // Silent fail - don't disrupt main flow if activity creation fails
        console.error(`❌ [ACTIVITY] Failed to create activity:`, error);
    }
};
exports.createActivity = createActivity;
/**
 * Order Activity Helpers
 */
exports.orderActivities = {
    /**
     * Create activity when order is placed
     */
    onOrderPlaced: async (userId, orderId, storeName, amount) => {
        await (0, exports.createActivity)({
            userId,
            type: Activity_1.ActivityType.ORDER,
            title: 'Order Placed',
            description: `Placed an order at ${storeName}`,
            amount,
            relatedEntity: {
                id: orderId,
                type: 'Order'
            },
            metadata: {
                storeName,
                status: 'placed'
            }
        });
    },
    /**
     * Create activity when order is delivered
     */
    onOrderDelivered: async (userId, orderId, storeName) => {
        await (0, exports.createActivity)({
            userId,
            type: Activity_1.ActivityType.ORDER,
            title: 'Order Delivered',
            description: `Order from ${storeName} was delivered successfully`,
            relatedEntity: {
                id: orderId,
                type: 'Order'
            },
            metadata: {
                storeName,
                status: 'delivered'
            }
        });
    },
    /**
     * Create activity when order is cancelled
     */
    onOrderCancelled: async (userId, orderId, storeName) => {
        await (0, exports.createActivity)({
            userId,
            type: Activity_1.ActivityType.ORDER,
            title: 'Order Cancelled',
            description: `Cancelled order from ${storeName}`,
            relatedEntity: {
                id: orderId,
                type: 'Order'
            },
            metadata: {
                storeName,
                status: 'cancelled'
            }
        });
    }
};
/**
 * Cashback Activity Helpers
 */
exports.cashbackActivities = {
    /**
     * Create activity when cashback is earned
     */
    onCashbackEarned: async (userId, amount, orderId, storeName) => {
        await (0, exports.createActivity)({
            userId,
            type: Activity_1.ActivityType.CASHBACK,
            title: 'Cashback Earned',
            description: `Earned ₹${amount} cashback from ${storeName}`,
            amount,
            relatedEntity: {
                id: orderId,
                type: 'Order'
            },
            metadata: {
                storeName,
                type: 'earned'
            }
        });
    },
    /**
     * Create activity when cashback is credited
     */
    onCashbackCredited: async (userId, amount, source) => {
        await (0, exports.createActivity)({
            userId,
            type: Activity_1.ActivityType.CASHBACK,
            title: 'Cashback Credited',
            description: `₹${amount} cashback credited to your wallet`,
            amount,
            metadata: {
                source,
                type: 'credited'
            }
        });
    }
};
/**
 * Review Activity Helpers
 */
exports.reviewActivities = {
    /**
     * Create activity when review is submitted
     */
    onReviewSubmitted: async (userId, reviewId, storeName) => {
        await (0, exports.createActivity)({
            userId,
            type: Activity_1.ActivityType.REVIEW,
            title: 'Review Submitted',
            description: `Thank you for your feedback on ${storeName}!`,
            relatedEntity: {
                id: reviewId,
                type: 'Review'
            },
            metadata: {
                storeName
            }
        });
    }
};
/**
 * Wallet Activity Helpers
 */
exports.walletActivities = {
    /**
     * Create activity when money is added to wallet
     */
    onMoneyAdded: async (userId, amount) => {
        await (0, exports.createActivity)({
            userId,
            type: Activity_1.ActivityType.WALLET,
            title: 'Money Added',
            description: `Added ₹${amount} to your wallet`,
            amount,
            metadata: {
                type: 'credit'
            }
        });
    },
    /**
     * Create activity when money is spent from wallet
     */
    onMoneySpent: async (userId, amount, purpose) => {
        await (0, exports.createActivity)({
            userId,
            type: Activity_1.ActivityType.WALLET,
            title: 'Money Spent',
            description: `Spent ₹${amount} on ${purpose}`,
            amount,
            metadata: {
                type: 'debit',
                purpose
            }
        });
    }
};
/**
 * Achievement Activity Helpers
 */
exports.achievementActivities = {
    /**
     * Create activity when achievement is unlocked
     */
    onAchievementUnlocked: async (userId, achievementId, achievementName) => {
        await (0, exports.createActivity)({
            userId,
            type: Activity_1.ActivityType.ACHIEVEMENT,
            title: 'Achievement Unlocked',
            description: `${achievementName} badge earned`,
            relatedEntity: {
                id: achievementId,
                type: 'Achievement'
            },
            metadata: {
                achievementName
            }
        });
    }
};
// Referral Activities
exports.referralActivities = {
    onReferralSignup: async (userId, referralId, description) => {
        await (0, exports.createActivity)({
            userId,
            type: Activity_1.ActivityType.REFERRAL,
            title: 'New Referral',
            description,
            relatedEntity: {
                id: referralId,
                type: 'Referral'
            }
        });
    },
    onReferralCompleted: async (userId, referralId, description) => {
        await (0, exports.createActivity)({
            userId,
            type: Activity_1.ActivityType.REFERRAL,
            title: 'Referral Reward Earned',
            description,
            relatedEntity: {
                id: referralId,
                type: 'Referral'
            }
        });
    }
};
// Export all activity helpers
exports.activityService = {
    createActivity: exports.createActivity,
    order: exports.orderActivities,
    cashback: exports.cashbackActivities,
    review: exports.reviewActivities,
    wallet: exports.walletActivities,
    achievement: exports.achievementActivities,
    referral: exports.referralActivities
};
exports.default = exports.activityService;
