const mongoose = require('mongoose');

async function checkUserStats() {
  await mongoose.connect('mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority');
  const db = mongoose.connection.db;

  const userId = new mongoose.Types.ObjectId('68ef4d41061faaf045222506');

  console.log('\n=== USER REFERRAL STATS CHECK ===\n');

  // Check User model's referral stats
  const user = await db.collection('users').findOne({ _id: userId });
  console.log('User.referral.totalReferrals:', user?.referral?.totalReferrals);
  console.log('User.referral.referredUsers:', user?.referral?.referredUsers?.length || 0);

  // Check actual referred users
  const actualReferred = await db.collection('users').countDocuments({
    'referral.referredBy': userId.toString()
  });
  console.log('Actual users referred (in DB):', actualReferred);

  // Check referrals collection
  const referrals = await db.collection('referrals').countDocuments({ referrer: userId });
  console.log('Referrals collection count:', referrals);

  // Check achievement status
  const achievement = await db.collection('userachievements').findOne({
    user: userId,
    type: 'FIRST_REFERRAL'
  });
  console.log('\nFIRST_REFERRAL Achievement:');
  console.log('  unlocked:', achievement?.unlocked);
  console.log('  progress:', achievement?.progress);

  // If user.referral.totalReferrals is wrong, fix it
  if (user?.referral?.totalReferrals > 0 && actualReferred === 0) {
    console.log('\n❌ User.referral.totalReferrals is WRONG!');
    console.log('  Shows:', user.referral.totalReferrals);
    console.log('  Actual:', actualReferred);

    console.log('\n  Fixing user.referral.totalReferrals...');
    await db.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          'referral.totalReferrals': 0,
          'referral.referredUsers': []
        }
      }
    );
    console.log('  ✅ Fixed! Set totalReferrals to 0');
  }

  await mongoose.disconnect();
  console.log('\nDone!');
}

checkUserStats().catch(console.error);
