import mongoose, { Document } from 'mongoose';
export interface IUserStreak extends Document {
    user: mongoose.Types.ObjectId;
    type: 'login' | 'order' | 'review';
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: Date;
    streakStartDate: Date;
    totalDays: number;
    milestones: Array<{
        day: number;
        rewardsClaimed: boolean;
        claimedAt?: Date;
    }>;
    frozen: boolean;
    freezeExpiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    updateStreak(): Promise<IUserStreak>;
    freezeStreak(days?: number): Promise<IUserStreak>;
    claimMilestone(day: number): Promise<IUserStreak>;
}
declare const _default: any;
export default _default;
