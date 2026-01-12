const mongoose = require('mongoose');

async function fixComplete() {
  await mongoose.connect('mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority');
  const db = mongoose.connection.db;

  const userId = new mongoose.Types.ObjectId('68ef4d41061faaf045222506');

  console.log('\n=== COMPLETE FIX ===\n');

  // 1. Fix User.referral stats (already done but verify)
  await db.collection('users').updateOne(
    { _id: userId },
    {
      $set: {
        'referral.totalReferrals': 0,
        'referral.referredUsers': [],
        'referral.referralEarnings': 0
      }
    }
  );
  console.log('✅ User.referral stats reset to 0');

  // 2. Delete fake referral record
  const delRef = await db.collection('referrals').deleteMany({ referrer: userId });
  console.log('✅ Deleted', delRef.deletedCount, 'fake referral records');

  // 3. Un-unlock FIRST_REFERRAL achievement
  await db.collection('userachievements').updateOne(
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
  console.log('✅ FIRST_REFERRAL achievement un-unlocked');

  // 4. Delete coin transaction for FIRST_REFERRAL if exists
  const delTx = await db.collection('cointransactions').deleteMany({
    user: userId,
    source: 'achievement',
    'metadata.achievementType': 'FIRST_REFERRAL'
  });
  console.log('✅ Deleted', delTx.deletedCount, 'FIRST_REFERRAL coin transactions');

  // 5. Recalculate wallet balance from coin transactions
  const txBalance = await db.collection('cointransactions').aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: null,
        earned: { $sum: { $cond: [{ $eq: ['$type', 'earned'] }, '$amount', 0] } },
        spent: { $sum: { $cond: [{ $eq: ['$type', 'spent'] }, '$amount', 0] } }
      }
    }
  ]).toArray();

  const actualBalance = txBalance[0] ? (txBalance[0].earned - txBalance[0].spent) : 0;

  await db.collection('wallets').updateOne(
    { user: userId },
    {
      $set: {
        'balance.available': actualBalance,
        'balance.total': actualBalance
      }
    }
  );

  // Also update coins array
  await db.collection('wallets').updateOne(
    { user: userId, 'coins.type': 'rez' },
    { $set: { 'coins.$.amount': actualBalance } }
  );

  console.log('✅ Wallet balance synced to:', actualBalance);

  // 6. Verify final state
  console.log('\n=== FINAL STATE ===');

  const user = await db.collection('users').findOne({ _id: userId });
  console.log('User.referral.totalReferrals:', user?.referral?.totalReferrals);

  const achievement = await db.collection('userachievements').findOne({
    user: userId, type: 'FIRST_REFERRAL'
  });
  console.log('FIRST_REFERRAL unlocked:', achievement?.unlocked);

  const unlockedCount = await db.collection('userachievements').countDocuments({
    user: userId, unlocked: true
  });
  console.log('Total unlocked achievements:', unlockedCount);

  const wallet = await db.collection('wallets').findOne({ user: userId });
  console.log('Wallet balance:', wallet?.balance?.available);

  await mongoose.disconnect();
  console.log('\n✅ All fixes complete! Refresh the page.');
}

fixComplete().catch(console.error);
