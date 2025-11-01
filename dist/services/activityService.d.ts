import { Types } from 'mongoose';
import { ActivityType } from '../models/Activity';
interface CreateActivityOptions {
    userId: Types.ObjectId;
    type: ActivityType;
    title: string;
    description?: string;
    amount?: number;
    icon?: string;
    color?: string;
    relatedEntity?: {
        id: Types.ObjectId;
        type: string;
    };
    metadata?: Record<string, any>;
}
/**
 * Create an activity record
 * This is called by other services/controllers to log user activities
 */
export declare const createActivity: (options: CreateActivityOptions) => Promise<void>;
/**
 * Order Activity Helpers
 */
export declare const orderActivities: {
    /**
     * Create activity when order is placed
     */
    onOrderPlaced: (userId: Types.ObjectId, orderId: Types.ObjectId, storeName: string, amount: number) => Promise<void>;
    /**
     * Create activity when order is delivered
     */
    onOrderDelivered: (userId: Types.ObjectId, orderId: Types.ObjectId, storeName: string) => Promise<void>;
    /**
     * Create activity when order is cancelled
     */
    onOrderCancelled: (userId: Types.ObjectId, orderId: Types.ObjectId, storeName: string) => Promise<void>;
};
/**
 * Cashback Activity Helpers
 */
export declare const cashbackActivities: {
    /**
     * Create activity when cashback is earned
     */
    onCashbackEarned: (userId: Types.ObjectId, amount: number, orderId: Types.ObjectId, storeName: string) => Promise<void>;
    /**
     * Create activity when cashback is credited
     */
    onCashbackCredited: (userId: Types.ObjectId, amount: number, source: string) => Promise<void>;
};
/**
 * Review Activity Helpers
 */
export declare const reviewActivities: {
    /**
     * Create activity when review is submitted
     */
    onReviewSubmitted: (userId: Types.ObjectId, reviewId: Types.ObjectId, storeName: string) => Promise<void>;
};
/**
 * Wallet Activity Helpers
 */
export declare const walletActivities: {
    /**
     * Create activity when money is added to wallet
     */
    onMoneyAdded: (userId: Types.ObjectId, amount: number) => Promise<void>;
    /**
     * Create activity when money is spent from wallet
     */
    onMoneySpent: (userId: Types.ObjectId, amount: number, purpose: string) => Promise<void>;
};
/**
 * Achievement Activity Helpers
 */
export declare const achievementActivities: {
    /**
     * Create activity when achievement is unlocked
     */
    onAchievementUnlocked: (userId: Types.ObjectId, achievementId: Types.ObjectId, achievementName: string) => Promise<void>;
};
export declare const referralActivities: {
    onReferralSignup: (userId: Types.ObjectId, referralId: Types.ObjectId, description: string) => Promise<void>;
    onReferralCompleted: (userId: Types.ObjectId, referralId: Types.ObjectId, description: string) => Promise<void>;
};
export declare const activityService: {
    createActivity: (options: CreateActivityOptions) => Promise<void>;
    order: {
        /**
         * Create activity when order is placed
         */
        onOrderPlaced: (userId: Types.ObjectId, orderId: Types.ObjectId, storeName: string, amount: number) => Promise<void>;
        /**
         * Create activity when order is delivered
         */
        onOrderDelivered: (userId: Types.ObjectId, orderId: Types.ObjectId, storeName: string) => Promise<void>;
        /**
         * Create activity when order is cancelled
         */
        onOrderCancelled: (userId: Types.ObjectId, orderId: Types.ObjectId, storeName: string) => Promise<void>;
    };
    cashback: {
        /**
         * Create activity when cashback is earned
         */
        onCashbackEarned: (userId: Types.ObjectId, amount: number, orderId: Types.ObjectId, storeName: string) => Promise<void>;
        /**
         * Create activity when cashback is credited
         */
        onCashbackCredited: (userId: Types.ObjectId, amount: number, source: string) => Promise<void>;
    };
    review: {
        /**
         * Create activity when review is submitted
         */
        onReviewSubmitted: (userId: Types.ObjectId, reviewId: Types.ObjectId, storeName: string) => Promise<void>;
    };
    wallet: {
        /**
         * Create activity when money is added to wallet
         */
        onMoneyAdded: (userId: Types.ObjectId, amount: number) => Promise<void>;
        /**
         * Create activity when money is spent from wallet
         */
        onMoneySpent: (userId: Types.ObjectId, amount: number, purpose: string) => Promise<void>;
    };
    achievement: {
        /**
         * Create activity when achievement is unlocked
         */
        onAchievementUnlocked: (userId: Types.ObjectId, achievementId: Types.ObjectId, achievementName: string) => Promise<void>;
    };
    referral: {
        onReferralSignup: (userId: Types.ObjectId, referralId: Types.ObjectId, description: string) => Promise<void>;
        onReferralCompleted: (userId: Types.ObjectId, referralId: Types.ObjectId, description: string) => Promise<void>;
    };
};
export default activityService;
