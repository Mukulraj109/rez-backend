import mongoose, { Document } from 'mongoose';
export interface IUserAchievement extends Document {
    user: mongoose.Types.ObjectId;
    achievementId: string;
    title: string;
    description: string;
    icon: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
    category: 'shopping' | 'social' | 'engagement' | 'special';
    progress: number;
    target: number;
    unlocked: boolean;
    unlockedAt?: Date;
    showcased: boolean;
    rewardsClaimed: boolean;
    rewards: {
        coins: number;
        badge?: string;
        title?: string;
        multiplier?: number;
    };
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: any;
export default _default;
