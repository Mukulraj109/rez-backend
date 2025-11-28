/**
 * Fix Missing Challenge Rewards Script
 *
 * This script finds all challenges where rewards were claimed but coins were NOT added to wallet,
 * and retroactively credits those coins.
 *
 * Run with: npx ts-node src/scripts/fix-missing-challenge-rewards.ts
 */

import mongoose from 'mongoose';
import UserChallengeProgress from '../models/UserChallengeProgress';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rez-app:12345@rez-app.izhjc.mongodb.net/?retryWrites=true&w=majority&appName=rez-app';

async function fixMissingRewards() {
  try {
    console.log('🔧 [FIX] Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ [FIX] Connected to database');

    // Find all claimed challenges
    const claimedChallenges = await UserChallengeProgress.find({
      rewardsClaimed: true,
      completed: true
    }).populate('challenge').populate('user');

    console.log(`📊 [FIX] Found ${claimedChallenges.length} claimed challenges`);

    let fixedCount = 0;
    let alreadyFixedCount = 0;

    for (const progress of claimedChallenges) {
      const challenge = progress.challenge as any;
      const userId = progress.user as any;

      if (!challenge || !userId) {
        console.log(`⚠️ [FIX] Skipping - missing challenge or user data`);
        continue;
      }

      const coinsReward = challenge.rewards?.coins || 0;

      if (coinsReward <= 0) {
        console.log(`⚠️ [FIX] Skipping ${challenge.title} - no coin reward`);
        continue;
      }

      // Check if we already created a transaction for this claim
      const existingTransaction = await Transaction.findOne({
        user: userId._id,
        'source.type': 'challenge_reward',
        'source.metadata.progressId': String(progress._id)
      });

      if (existingTransaction) {
        console.log(`✅ [FIX] Already fixed: ${challenge.title} for user ${userId._id}`);
        alreadyFixedCount++;
        continue;
      }

      // This reward was claimed but coins were never added!
      console.log(`🔧 [FIX] Fixing missing reward for: ${challenge.title}`);
      console.log(`   User: ${userId._id}`);
      console.log(`   Coins: ${coinsReward}`);

      // Get or create wallet
      let wallet = await Wallet.findOne({ user: userId._id });
      if (!wallet) {
        wallet = await (Wallet as any).createForUser(userId._id);
      }

      if (!wallet) {
        console.error(`❌ [FIX] Could not create wallet for user ${userId._id}`);
        continue;
      }

      const balanceBefore = wallet.balance.available;

      // Add to wasil coins (REZ coins)
      const wasilCoin = wallet.coins.find((c: any) => c.type === 'wasil');
      if (wasilCoin) {
        wasilCoin.amount += coinsReward;
        wasilCoin.lastUsed = new Date();
      } else {
        wallet.coins.push({
          type: 'wasil',
          amount: coinsReward,
          isActive: true,
          earnedDate: new Date(),
          lastUsed: new Date()
        } as any);
      }

      // Update balances
      wallet.balance.available += coinsReward;
      wallet.balance.total += coinsReward;
      wallet.statistics.totalEarned += coinsReward;

      await wallet.save();

      console.log(`   ✅ Balance updated: ${balanceBefore} → ${wallet.balance.available}`);

      // Create transaction record
      await Transaction.create({
        user: userId._id,
        type: 'credit',
        category: 'earning',
        amount: coinsReward,
        currency: 'RC',
        description: `[RETROACTIVE] Challenge reward: ${challenge.title}`,
        source: {
          type: 'challenge_reward',
          reference: String(challenge._id),
          description: `Retroactively credited ${coinsReward} coins from challenge: ${challenge.title}`,
          metadata: {
            challengeId: String(challenge._id),
            challengeTitle: challenge.title,
            progressId: String(progress._id),
            retroactive: true,
            fixDate: new Date().toISOString()
          }
        },
        status: {
          current: 'completed',
          history: [{
            status: 'completed',
            timestamp: new Date(),
            reason: 'Retroactively credited missing challenge reward'
          }]
        },
        balanceBefore,
        balanceAfter: wallet.balance.available,
        netAmount: coinsReward,
        isReversible: false
      });

      console.log(`   ✅ Transaction created`);
      fixedCount++;
    }

    console.log('\n📊 [FIX] Summary:');
    console.log(`   Total claimed challenges: ${claimedChallenges.length}`);
    console.log(`   Fixed: ${fixedCount}`);
    console.log(`   Already fixed: ${alreadyFixedCount}`);
    console.log(`   Skipped: ${claimedChallenges.length - fixedCount - alreadyFixedCount}`);

    if (fixedCount > 0) {
      console.log('\n✅ [FIX] Successfully fixed missing challenge rewards!');
    } else {
      console.log('\n✅ [FIX] No missing rewards found - everything is already correct!');
    }

  } catch (error) {
    console.error('❌ [FIX] Error fixing missing rewards:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('👋 [FIX] Disconnected from database');
  }
}

// Run the fix
fixMissingRewards()
  .then(() => {
    console.log('✅ [FIX] Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ [FIX] Script failed:', error);
    process.exit(1);
  });
