interface LeaderboardEntry {
    user: {
        id: string;
        name: string;
        avatar?: string;
    };
    value: number;
    rank: number;
}
declare class LeaderboardService {
    getSpendingLeaderboard(period?: 'week' | 'month' | 'all', limit?: number): Promise<LeaderboardEntry[]>;
    getReviewLeaderboard(period?: 'week' | 'month' | 'all', limit?: number): Promise<LeaderboardEntry[]>;
    getReferralLeaderboard(period?: 'week' | 'month' | 'all', limit?: number): Promise<LeaderboardEntry[]>;
    getCashbackLeaderboard(period?: 'week' | 'month' | 'all', limit?: number): Promise<LeaderboardEntry[]>;
    getStreakLeaderboard(type?: 'login' | 'order' | 'review', limit?: number): Promise<LeaderboardEntry[]>;
    getUserRank(userId: string, leaderboardType: 'spending' | 'reviews' | 'referrals' | 'cashback' | 'streak', period?: 'week' | 'month' | 'all'): Promise<{
        rank: number;
        total: number;
        value: number;
    } | null>;
    getAllUserRanks(userId: string, period?: 'week' | 'month' | 'all'): Promise<any>;
    private getDateFilter;
    private addRanks;
    getLeaderboardStats(): Promise<any>;
}
declare const _default: LeaderboardService;
export default _default;
