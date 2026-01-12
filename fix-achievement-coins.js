/**
 * Migration Script: Award missing coins for unlocked achievements
 *
 * Problem: Achievements were unlocked but coins were never awarded
 * Solution: Find all unlocked achievements and award their coins retroactively
 */

const mongoose = require('mongoose');

// Coin rewards mapping (from ACHIEVEMENT_DEFINITIONS)
const COIN_REWARDS = {
  'FIRST_ORDER': 50,
  'ORDERS_10': 100,
  'ORDERS_50': 500,
  'FREQUENT_BUYER': 1000,
  'SPENT_1000': 50,
  'SPENT_5000': 200,
  'BIG_SPENDER': 500,
  'FIRST_REVIEW': 25,
  'REVIEWS_25': 250,
  'FIRST_VIDEO': 100,
  'VIEWS_10000': 1000,
  'FIRST_PROJECT': 50,
  'TOP_EARNER': 500,
  'FIRST_REFERRAL': 100,
  'REFERRALS_10': 1000,
  'EARLY_BIRD': 200,
  'ACTIVITY_100': 500,
  'SUPER_USER': 2000
};

async function fixAchievementCoins() {
  await mongoose.connect('mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority');

  const db = mongoose.connection.db;

  console.log('\n=== FIXING ACHIEVEMENT COINS ===\n');

  // 1. Get all unlocked achievements
  const unlockedAchievements = await db.collection('userachievements').find({ unlocked: true }).toArray();
  console.log(`Found ${unlockedAchievements.length} unlocked achievements\n`);

  // 2. Check which ones already have coin transactions
  const existingTx = await db.collection('cointransactions').find({ source: 'achievement' }).toArray();
  const existingAchievementIds = new Set(existingTx.map(tx => tx.metadata?.achievementId?.toString()));

  console.log(`Existing achievement coin transactions: ${existingTx.length}`);

  // 3. Award coins for achievements that don't have transactions yet
  let awarded = 0;
  let skipped = 0;
  let totalCoins = 0;

  for (const achievement of unlockedAchievements) {
    const achievementId = achievement._id.toString();

    // Skip if already awarded
    if (existingAchievementIds.has(achievementId)) {
      skipped++;
      continue;
    }

    const coins = COIN_REWARDS[achievement.type] || 0;
    if (coins === 0) {
      console.log(`  ⚠️ No coin reward defined for: ${achievement.type}`);
      continue;
    }

    // Get current balance for this user
    const balanceResult = await db.collection('cointransactions').aggregate([
      { $match: { user: achievement.user } },
      {
        $group: {
          _id: null,
          earned: { $sum: { $cond: [{ $eq: ['$type', 'earned'] }, '$amount', 0] } },
          spent: { $sum: { $cond: [{ $eq: ['$type', 'spent'] }, '$amount', 0] } }
        }
      }
    ]).toArray();

    const currentBalance = balanceResult[0]
      ? (balanceResult[0].earned - balanceResult[0].spent)
      : 0;
    const newBalance = currentBalance + coins;

    // Create coin transaction
    await db.collection('cointransactions').insertOne({
      user: achievement.user,
      type: 'earned',
      amount: coins,
      balance: newBalance,
      source: 'achievement',
      description: `Achievement unlocked: ${achievement.title}`,
      metadata: {
        achievementType: achievement.type,
        achievementId: achievement._id,
        retroactive: true,
        fixedAt: new Date()
      },
      createdAt: achievement.unlockedDate || new Date(),
      updatedAt: new Date()
    });

    // Also update wallet balance
    await db.collection('wallets').updateOne(
      { user: achievement.user },
      {
        $inc: {
          'balance.available': coins,
          'balance.total': coins,
          'statistics.totalEarned': coins
        },
        $set: { lastTransactionAt: new Date() }
      }
    );

    console.log(`  ✅ Awarded ${coins} coins for ${achievement.type} to user ${achievement.user.toString().slice(-6)}`);
    awarded++;
    totalCoins += coins;
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Achievements processed: ${unlockedAchievements.length}`);
  console.log(`Already had coins: ${skipped}`);
  console.log(`Coins awarded: ${awarded} achievements, ${totalCoins} total coins`);

  await mongoose.disconnect();
  console.log('\nDone!');
}

fixAchievementCoins().catch(console.error);
