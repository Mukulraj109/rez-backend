import { IChallenge } from '../models/Challenge';
import { IUserChallengeProgress } from '../models/UserChallengeProgress';
declare class ChallengeService {
    getActiveChallenges(type?: string): Promise<IChallenge[]>;
    getDailyChallenges(): Promise<IChallenge[]>;
    getUserProgress(userId: string, includeCompleted?: boolean): Promise<IUserChallengeProgress[]>;
    joinChallenge(userId: string, challengeId: string): Promise<IUserChallengeProgress>;
    updateProgress(userId: string, action: string, amount?: number, metadata?: any): Promise<IUserChallengeProgress[]>;
    claimRewards(userId: string, progressId: string): Promise<{
        progress: IUserChallengeProgress;
        rewards: any;
        walletBalance?: number;
    }>;
    createChallengeFromTemplate(templateIndex: number, startDate?: Date, featured?: boolean): Promise<IChallenge>;
    generateDailyChallenges(): Promise<IChallenge[]>;
    getChallengeLeaderboard(challengeId: string, limit?: number): Promise<any[]>;
    getUserStatistics(userId: string): Promise<any>;
}
declare const _default: ChallengeService;
export default _default;
