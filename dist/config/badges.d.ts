export interface BadgeDefinition {
    id: string;
    name: string;
    description: string;
    icon: string;
    type: 'tier' | 'achievement' | 'special' | 'limited';
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    color: string;
    obtainedBy: string;
    displayOnProfile: boolean;
    displayOnReviews: boolean;
}
export declare const BADGES: {
    [key: string]: BadgeDefinition;
};
export declare const getBadgesByType: (type: string) => BadgeDefinition[];
export declare const getBadgesByRarity: (rarity: string) => BadgeDefinition[];
export declare const getProfileBadges: () => BadgeDefinition[];
export declare const getReviewBadges: () => BadgeDefinition[];
export default BADGES;
