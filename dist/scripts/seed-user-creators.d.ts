interface CreatorProfile {
    firstName: string;
    lastName: string;
    gender: 'male' | 'female';
    age: number;
    bio: string;
    avatar: string;
    interests: string[];
    category: 'fashion' | 'beauty' | 'lifestyle' | 'tech';
    engagementScore: number;
    isPremium: boolean;
}
declare const CREATOR_PROFILES: CreatorProfile[];
declare function seedUserCreators(): Promise<any[]>;
export { CREATOR_PROFILES, seedUserCreators };
