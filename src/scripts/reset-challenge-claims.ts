/**
 * Reset Challenge Claims Script
 *
 * This script resets completed challenges back to "unclaimed" state
 * so users can claim them again and test the reward system.
 *
 * Run with: npx ts-node src/scripts/reset-challenge-claims.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import UserChallengeProgress from '../models/UserChallengeProgress';
import Challenge from '../models/Challenge';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ [RESET] MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function resetChallengeClaims() {
  try {
    console.log('🔧 [RESET] Connecting to database...');
    console.log('🔧 [RESET] URI:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ [RESET] Connected to database');

    // Find all claimed challenges (don't populate to avoid schema issues)
    const claimedChallenges = await UserChallengeProgress.find({
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

  } catch (error) {
    console.error('❌ [RESET] Error resetting challenges:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
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
