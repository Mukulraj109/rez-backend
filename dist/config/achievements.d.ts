export interface AchievementDefinition {
    id: string;
    title: string;
    description: string;
    icon: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
    category: 'shopping' | 'social' | 'engagement' | 'special';
    target: number;
    rewards: {
        coins: number;
        badge?: string;
        title?: string;
        multiplier?: number;
    };
    hidden?: boolean;
}
export declare const ACHIEVEMENTS: {
    [key: string]: AchievementDefinition;
};
export declare const getAchievementsByCategory: (category: string) => AchievementDefinition[];
export declare const getAchievementsByTier: (tier: string) => AchievementDefinition[];
export declare const getVisibleAchievements: () => AchievementDefinition[];
export default ACHIEVEMENTS;
