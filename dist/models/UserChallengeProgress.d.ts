import mongoose, { Document } from 'mongoose';
export interface IUserChallengeProgress extends Document {
    user: mongoose.Types.ObjectId;
    challenge: mongoose.Types.ObjectId;
    progress: number;
    target: number;
    completed: boolean;
    completedAt?: Date;
    rewardsClaimed: boolean;
    claimedAt?: Date;
    startedAt: Date;
    lastUpdatedAt: Date;
    progressHistory: Array<{
        amount: number;
        timestamp: Date;
        source: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
    addProgress(amount: number, source?: string): Promise<IUserChallengeProgress>;
    claimRewards(): Promise<IUserChallengeProgress>;
}
declare const _default: any;
export default _default;
