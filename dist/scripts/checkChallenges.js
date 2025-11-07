"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.DB_NAME || 'test';
async function checkChallenges() {
    try {
        console.log('🔍 Checking challenges in database...');
        console.log('📊 Database:', DB_NAME);
        console.log('🔗 URI:', MONGODB_URI.substring(0, 50) + '...');
        await mongoose_1.default.connect(MONGODB_URI, { dbName: DB_NAME });
        console.log('✅ Connected to MongoDB\n');
        const db = mongoose_1.default.connection.db;
        if (!db) {
            console.error('❌ Database connection failed');
            process.exit(1);
        }
        // List all collections
        const collections = await db.listCollections().toArray();
        console.log('📂 Collections in database:', collections.map(c => c.name).join(', '));
        console.log('');
        // Check challenges collection
        const challenges = await db.collection('challenges').find({}).toArray();
        console.log(`🎯 Total challenges in database: ${challenges.length}`);
        if (challenges.length > 0) {
            console.log('\n📋 Challenges found:\n');
            challenges.forEach((c, i) => {
                console.log(`  ${i + 1}. ${c.title}`);
                console.log(`     Type: ${c.type}`);
                console.log(`     Active: ${c.active}`);
                console.log(`     Difficulty: ${c.difficulty}`);
                console.log(`     Rewards: ${c.rewards?.coins || 0} coins`);
                console.log(`     Start: ${c.startDate}`);
                console.log(`     End: ${c.endDate}`);
                console.log('');
            });
        }
        else {
            console.log('⚠️  No challenges found in database!');
        }
        // Check active challenges
        const activeChallenges = await db.collection('challenges').find({ active: true }).toArray();
        console.log(`✅ Active challenges: ${activeChallenges.length}`);
        await mongoose_1.default.disconnect();
        console.log('\n✅ Done!');
    }
    catch (error) {
        console.error('❌ Error:', error);
    }
    process.exit(0);
}
checkChallenges();
