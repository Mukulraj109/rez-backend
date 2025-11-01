import { IUserStreak } from '../models/UserStreak';
declare class StreakService {
    getOrCreateStreak(userId: string, type: 'login' | 'order' | 'review'): Promise<IUserStreak>;
    updateStreak(userId: string, type: 'login' | 'order' | 'review'): Promise<{
        streak: IUserStreak;
        milestoneReached?: any;
    }>;
    private checkMilestone;
    claimMilestone(userId: string, type: 'login' | 'order' | 'review', day: number): Promise<{
        streak: IUserStreak;
        rewards: any;
    }>;
    freezeStreak(userId: string, type: 'login' | 'order' | 'review', days?: number): Promise<IUserStreak>;
    getUserStreaks(userId: string): Promise<any>;
    private formatStreak;
    getStreakStats(userId: string): Promise<any>;
    checkBrokenStreaks(): Promise<void>;
}
declare const _default: StreakService;
export default _default;
