"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedChallenges = seedChallenges;
exports.seedUserProgress = seedUserProgress;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const Challenge_1 = require("../models/Challenge");
const UserProgress_1 = require("../models/UserProgress");
const challengeTemplates_1 = require("../config/challengeTemplates");
// Load environment variables
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
/**
 * Seed challenges database with realistic data
 * This creates challenges based on templates and makes them active
 */
async function seedChallenges(options = {}) {
    const { clearExisting = false, generateDaily = true, generateWeekly = true, generateMonthly = true, generateSpecial = true, } = options;
    try {
        console.log('🌱 Starting challenges seeding...');
        console.log(`📡 Connecting to MongoDB: ${MONGODB_URI}`);
        // Connect to MongoDB
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        // Clear existing data if requested
        if (clearExisting) {
            console.log('🗑️  Clearing existing challenges...');
            await Challenge_1.Challenge.deleteMany({});
            await UserProgress_1.UserProgress.deleteMany({});
            console.log('✅ Existing data cleared');
        }
        // Generate challenges based on options
        const challengesToCreate = [];
        // Daily Challenges (rotate 3 random ones daily)
        if (generateDaily) {
            const dailyTemplates = challengeTemplates_1.CHALLENGE_TEMPLATES.filter((t) => t.type === 'daily');
            const selectedDaily = getRandomItems(dailyTemplates, 5); // 5 daily challenges
            selectedDaily.forEach((template, index) => {
                const startDate = new Date();
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + (template.durationDays || 1));
                challengesToCreate.push({
                    type: template.type,
                    title: template.title,
                    description: template.description,
                    icon: template.icon,
                    requirements: template.requirements,
                    rewards: template.rewards,
                    difficulty: template.difficulty,
                    startDate,
                    endDate,
                    isActive: true,
                    maxParticipants: 10000,
                    order: index,
                });
            });
            console.log(`✨ Generated ${selectedDaily.length} daily challenges`);
        }
        // Weekly Challenges (2-3 active ones)
        if (generateWeekly) {
            const weeklyTemplates = challengeTemplates_1.CHALLENGE_TEMPLATES.filter((t) => t.type === 'weekly');
            const selectedWeekly = getRandomItems(weeklyTemplates, 3); // 3 weekly challenges
            selectedWeekly.forEach((template, index) => {
                const startDate = getStartOfWeek(new Date());
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 7);
                challengesToCreate.push({
                    type: template.type,
                    title: template.title,
                    description: template.description,
                    icon: template.icon,
                    requirements: template.requirements,
                    rewards: template.rewards,
                    difficulty: template.difficulty,
                    startDate,
                    endDate,
                    isActive: true,
                    maxParticipants: 10000,
                    order: index,
                });
            });
            console.log(`✨ Generated ${selectedWeekly.length} weekly challenges`);
        }
        // Monthly Challenges (2 active ones)
        if (generateMonthly) {
            const monthlyTemplates = challengeTemplates_1.CHALLENGE_TEMPLATES.filter((t) => t.type === 'monthly');
            const selectedMonthly = getRandomItems(monthlyTemplates, 2); // 2 monthly challenges
            selectedMonthly.forEach((template, index) => {
                const startDate = getStartOfMonth(new Date());
                const endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + 1);
                challengesToCreate.push({
                    type: template.type,
                    title: template.title,
                    description: template.description,
                    icon: template.icon,
                    requirements: template.requirements,
                    rewards: template.rewards,
                    difficulty: template.difficulty,
                    startDate,
                    endDate,
                    isActive: true,
                    maxParticipants: 10000,
                    order: index,
                });
            });
            console.log(`✨ Generated ${selectedMonthly.length} monthly challenges`);
        }
        // Special Challenges (1-2 special events)
        if (generateSpecial) {
            const specialTemplates = challengeTemplates_1.CHALLENGE_TEMPLATES.filter((t) => t.type === 'special');
            if (specialTemplates.length > 0) {
                const selectedSpecial = getRandomItems(specialTemplates, 2);
                selectedSpecial.forEach((template, index) => {
                    const startDate = new Date();
                    const endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + (template.durationDays || 7));
                    challengesToCreate.push({
                        type: template.type,
                        title: template.title,
                        description: template.description,
                        icon: template.icon,
                        requirements: template.requirements,
                        rewards: template.rewards,
                        difficulty: template.difficulty,
                        startDate,
                        endDate,
                        isActive: true,
                        maxParticipants: 10000,
                        order: index,
                    });
                });
                console.log(`✨ Generated ${selectedSpecial.length} special challenges`);
            }
        }
        // Insert all challenges
        if (challengesToCreate.length > 0) {
            console.log(`💾 Inserting ${challengesToCreate.length} challenges...`);
            const createdChallenges = await Challenge_1.Challenge.insertMany(challengesToCreate);
            console.log(`✅ Successfully created ${createdChallenges.length} challenges`);
            // Display summary
            console.log('\n📊 Challenges Summary:');
            console.log(`   • Daily: ${createdChallenges.filter((c) => c.type === 'daily').length}`);
            console.log(`   • Weekly: ${createdChallenges.filter((c) => c.type === 'weekly').length}`);
            console.log(`   • Monthly: ${createdChallenges.filter((c) => c.type === 'monthly').length}`);
            console.log(`   • Special: ${createdChallenges.filter((c) => c.type === 'special').length}`);
            console.log(`   • Total: ${createdChallenges.length}`);
            // Display difficulty breakdown
            console.log('\n🎯 Difficulty Breakdown:');
            console.log(`   • Easy: ${createdChallenges.filter((c) => c.difficulty === 'easy').length}`);
            console.log(`   • Medium: ${createdChallenges.filter((c) => c.difficulty === 'medium').length}`);
            console.log(`   • Hard: ${createdChallenges.filter((c) => c.difficulty === 'hard').length}`);
            // Display total rewards available
            const totalCoins = createdChallenges.reduce((sum, c) => sum + c.rewards.coins, 0);
            console.log('\n💰 Total Coins Available:', totalCoins);
        }
        else {
            console.log('⚠️  No challenges to create');
        }
        console.log('\n✅ Challenges seeding completed successfully!');
    }
    catch (error) {
        console.error('❌ Error seeding challenges:', error);
        throw error;
    }
    finally {
        // Disconnect from MongoDB
        await mongoose_1.default.disconnect();
        console.log('📡 Disconnected from MongoDB');
    }
}
/**
 * Seed user progress for testing
 * Creates random progress for users on various challenges
 */
async function seedUserProgress(userIds, challengeIds) {
    try {
        console.log('\n🌱 Seeding user progress...');
        const progressToCreate = [];
        // Create random progress for each user
        userIds.forEach((userId) => {
            // Each user gets 30-50% of challenges
            const numChallenges = Math.floor(Math.random() * challengeIds.length * 0.5) + Math.floor(challengeIds.length * 0.3);
            const selectedChallenges = getRandomItems(challengeIds, numChallenges);
            selectedChallenges.forEach((challengeId) => {
                const challenge = challengeIds.indexOf(challengeId);
                const isCompleted = Math.random() > 0.6; // 40% completion rate
                const progressPercent = isCompleted ? 100 : Math.floor(Math.random() * 90) + 10;
                progressToCreate.push({
                    user: new mongoose_1.default.Types.ObjectId(userId),
                    challenge: new mongoose_1.default.Types.ObjectId(challengeId),
                    progress: progressPercent,
                    target: 100,
                    completed: isCompleted,
                    rewardsClaimed: isCompleted && Math.random() > 0.3, // 70% claim rate
                    startDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                    endDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
                });
            });
        });
        if (progressToCreate.length > 0) {
            await UserProgress_1.UserProgress.insertMany(progressToCreate);
            console.log(`✅ Created ${progressToCreate.length} user progress records`);
        }
    }
    catch (error) {
        console.error('❌ Error seeding user progress:', error);
        throw error;
    }
}
// Helper functions
function getRandomItems(array, count) {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, array.length));
}
function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}
function getStartOfMonth(date) {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
}
// Run the seeder if called directly
if (require.main === module) {
    const args = process.argv.slice(2);
    const clearExisting = args.includes('--clear');
    const skipDaily = args.includes('--skip-daily');
    const skipWeekly = args.includes('--skip-weekly');
    const skipMonthly = args.includes('--skip-monthly');
    const skipSpecial = args.includes('--skip-special');
    const options = {
        clearExisting,
        generateDaily: !skipDaily,
        generateWeekly: !skipWeekly,
        generateMonthly: !skipMonthly,
        generateSpecial: !skipSpecial,
    };
    seedChallenges(options)
        .then(() => {
        console.log('\n🎉 Seeding process completed!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Seeding process failed:', error);
        process.exit(1);
    });
}
