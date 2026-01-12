const mongoose = require('mongoose');

async function fixFakeAchievement() {
  await mongoose.connect('mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority');
  const db = mongoose.connection.db;

  const userId = new mongoose.Types.ObjectId('68ef4d41061faaf045222506');

  console.log('\n=== FIXING FAKE FIRST_REFERRAL ACHIEVEMENT ===\n');

  // 1. Un-unlock the First Referral achievement
  const result = await db.collection('userachievements').updateOne(
    { user: userId, type: 'FIRST_REFERRAL' },
    {
      $set: {
        unlocked: false,
        unlockedDate: null,
        progress: 0,
        currentValue: 0
      }
    }
  );
  console.log('Achievement updated:', result.modifiedCount > 0 ? '✅ Un-unlocked' : '⚠️ Not found');

  // 2. Remove the coin transaction for this achievement
  const deleteTx = await db.collection('cointransactions').deleteOne({
    user: userId,
    source: 'achievement',
    'metadata.achievementType': 'FIRST_REFERRAL'
  });
  console.log('Coin transaction removed:', deleteTx.deletedCount > 0 ? '✅ Deleted' : '⚠️ Not found');

  // 3. Deduct 100 coins from wallet
  const walletUpdate = await db.collection('wallets').updateOne(
    { user: userId },
    {
      $inc: {
        'balance.available': -100,
        'balance.total': -100,
        'statistics.totalEarned': -100
      }
    }
  );
  console.log('Wallet updated:', walletUpdate.modifiedCount > 0 ? '✅ Deducted 100 coins' : '⚠️ Not found');

  // 4. Verify the fix
  console.log('\n=== VERIFICATION ===');

  const achievement = await db.collection('userachievements').findOne({ user: userId, type: 'FIRST_REFERRAL' });
  console.log('First Referral achievement unlocked:', achievement?.unlocked);

  const wallet = await db.collection('wallets').findOne({ user: userId });
  console.log('Wallet balance:', wallet?.balance?.available);

  const unlockedCount = await db.collection('userachievements').countDocuments({ user: userId, unlocked: true });
  console.log('Total unlocked achievements:', unlockedCount);

  await mongoose.disconnect();
  console.log('\n✅ Done! Fake achievement removed.');
}

fixFakeAchievement().catch(console.error);
