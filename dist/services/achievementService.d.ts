import { Types } from 'mongoose';
declare class AchievementService {
    /**
     * Recalculate all achievements for a user based on their current statistics
     */
    recalculateUserAchievements(userId: string | Types.ObjectId): Promise<void>;
    /**
     * Initialize achievements for a new user
     */
    initializeUserAchievements(userId: string | Types.ObjectId): Promise<void>;
    /**
     * Trigger achievement recalculation after specific actions
     */
    triggerAchievementUpdate(userId: string | Types.ObjectId, action: string): Promise<void>;
    /**
     * Check and award achievements based on user actions
     * This is a more targeted approach for specific achievement types
     */
    checkAndAwardAchievements(userId: string | Types.ObjectId, type: string, data?: any): Promise<void>;
}
declare const _default: AchievementService;
export default _default;
