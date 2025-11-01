/**
 * Trigger gamification events based on user actions
 *
 * This utility automatically:
 * - Awards coins for various actions
 * - Checks and updates challenge progress
 * - Checks and unlocks achievements
 * - Updates daily streaks
 */
export declare function triggerGamificationEvent(userId: string, event: 'order_placed' | 'review_submitted' | 'referral_success' | 'login' | 'bill_uploaded' | 'video_created' | 'project_completed' | 'offer_redeemed', metadata?: any): Promise<void>;
/**
 * Batch trigger for multiple events (useful for recalculation)
 */
export declare function batchTriggerGamification(userId: string, events: Array<{
    event: string;
    metadata?: any;
}>): Promise<void>;
/**
 * Recalculate all achievements for a user
 * (Useful when importing historical data or fixing issues)
 */
export declare function recalculateUserGamification(userId: string): Promise<void>;
declare const _default: {
    triggerGamificationEvent: typeof triggerGamificationEvent;
    batchTriggerGamification: typeof batchTriggerGamification;
    recalculateUserGamification: typeof recalculateUserGamification;
};
export default _default;
