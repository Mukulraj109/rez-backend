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
declare const _default: mongoose.Model<IUserStreak, {}, {}, {}, mongoose.Document<unknown, {}, IUserStreak, {}, {}> & IUserStreak & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
