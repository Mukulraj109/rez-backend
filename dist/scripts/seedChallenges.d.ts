interface SeedOptions {
    clearExisting?: boolean;
    generateDaily?: boolean;
    generateWeekly?: boolean;
    generateMonthly?: boolean;
    generateSpecial?: boolean;
}
/**
 * Seed challenges database with realistic data
 * This creates challenges based on templates and makes them active
 */
declare function seedChallenges(options?: SeedOptions): Promise<void>;
/**
 * Seed user progress for testing
 * Creates random progress for users on various challenges
 */
declare function seedUserProgress(userIds: string[], challengeIds: string[]): Promise<void>;
export { seedChallenges, seedUserProgress };
