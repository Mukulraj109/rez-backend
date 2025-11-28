declare class GamificationAnalyticsService {
    getOverallEngagementMetrics(period?: 'week' | 'month' | 'all'): Promise<any>;
    private getChallengeEngagement;
    private getAchievementEngagement;
    private getStreakEngagement;
    private getGameEngagement;
    getUserGamificationProfile(userId: string): Promise<any>;
    getGamificationROI(beforeDate: Date, afterDate: Date): Promise<any>;
    private getDateFilter;
    private calculateUniqueUsers;
    private calculateEngagementScore;
    private calculateUserLevel;
    getTopPerformers(limit?: number): Promise<any[]>;
}
declare const _default: GamificationAnalyticsService;
export default _default;
