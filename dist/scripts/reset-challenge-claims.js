"use strict";
/**
 * Reset Challenge Claims Script
 *
 * This script resets completed challenges back to "unclaimed" state
 * so users can claim them again and test the reward system.
 *
 * Run with: npx ts-node src/scripts/reset-challenge-claims.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const UserChallengeProgress_1 = __importDefault(require("../models/UserChallengeProgress"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('❌ [RESET] MONGODB_URI not found in environment variables');
    process.exit(1);
}
async function resetChallengeClaims() {
    try {
        console.log('🔧 [RESET] Connecting to database...');
        console.log('🔧 [RESET] URI:', MONGODB_URI);
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('✅ [RESET] Connected to database');
        // Find all claimed challenges (don't populate to avoid schema issues)
        const claimedChallenges = await UserChallengeProgress_1.default.find({
            rewardsClaimed: true,
            completed: true
        });
        console.log(`📊 [RESET] Found ${claimedChallenges.length} claimed challenges`);
        if (claimedChallenges.length === 0) {
            console.log('✅ [RESET] No claimed challenges found. Nothing to reset.');
            return;
        }
        let resetCount = 0;
        for (const progress of claimedChallenges) {
            console.log(`🔄 [RESET] Resetting challenge`);
            console.log(`   Progress ID: ${progress._id}`);
            console.log(`   User: ${progress.user}`);
            console.log(`   Challenge ID: ${progress.challenge}`);
            // Reset to unclaimed but keep completed status
            progress.rewardsClaimed = false;
            progress.claimedAt = undefined;
            await progress.save();
            console.log(`   ✅ Reset to unclaimed`);
            resetCount++;
        }
        console.log('\n📊 [RESET] Summary:');
        console.log(`   Total claimed challenges: ${claimedChallenges.length}`);
        console.log(`   Reset: ${resetCount}`);
        console.log('\n✅ [RESET] Challenges reset successfully!');
        console.log('💡 [RESET] You can now claim these rewards again to test the coin-adding functionality.');
    }
    catch (error) {
        console.error('❌ [RESET] Error resetting challenges:', error);
        throw error;
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('👋 [RESET] Disconnected from database');
    }
}
// Run the reset
resetChallengeClaims()
    .then(() => {
    console.log('✅ [RESET] Script completed successfully');
    process.exit(0);
})
    .catch((error) => {
    console.error('❌ [RESET] Script failed:', error);
    process.exit(1);
});
