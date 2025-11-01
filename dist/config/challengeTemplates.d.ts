export interface ChallengeTemplate {
    type: 'daily' | 'weekly' | 'monthly' | 'special';
    title: string;
    description: string;
    icon: string;
    requirements: {
        action: string;
        target: number;
        stores?: string[];
        categories?: string[];
        minAmount?: number;
    };
    rewards: {
        coins: number;
        badges?: string[];
        multiplier?: number;
    };
    difficulty: 'easy' | 'medium' | 'hard';
    durationDays?: number;
}
export declare const CHALLENGE_TEMPLATES: ChallengeTemplate[];
export default CHALLENGE_TEMPLATES;
