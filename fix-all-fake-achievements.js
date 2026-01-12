const mongoose = require('mongoose');

async function fixAllFakeAchievements() {
  await mongoose.connect('mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority');
  const db = mongoose.connection.db;

  console.log('\n=== CHECKING ALL USERS FOR FAKE ACHIEVEMENTS ===\n');

  // Get all unlocked achievements
  const unlockedAchievements = await db.collection('userachievements').find({ unlocked: true }).toArray();
  console.log('Total unlocked achievements:', unlockedAchievements.length);

  let fakeCount = 0;
  let fixedCount = 0;

  for (const achievement of unlockedAchievements) {
    const userId = achievement.user;
    let isReal = true;
    let actualValue = 0;

    // Check if achievement matches real data
    switch (achievement.type) {
      case 'FIRST_ORDER':
      case 'ORDERS_10':
      case 'ORDERS_50':
      case 'FREQUENT_BUYER':
        const orders = await db.collection('orders').countDocuments({ user: userId, status: 'delivered' });
        actualValue = orders;
        const requiredOrders = { 'FIRST_ORDER': 1, 'ORDERS_10': 10, 'ORDERS_50': 50, 'FREQUENT_BUYER': 100 };
        isReal = orders >= requiredOrders[achievement.type];
        break;

      case 'FIRST_VIDEO':
      case 'VIDEOS_10':
        const videos = await db.collection('videos').countDocuments({ creator: userId });
        actualValue = videos;
        isReal = videos >= (achievement.type === 'FIRST_VIDEO' ? 1 : 10);
        break;

      case 'VIEWS_10000':
        const viewStats = await db.collection('videos').aggregate([
          { $match: { creator: userId } },
          { $group: { _id: null, total: { $sum: '$engagement.views' } } }
        ]).toArray();
        actualValue = viewStats[0]?.total || 0;
        isReal = actualValue >= 10000;
        break;

      case 'FIRST_PROJECT':
      case 'PROJECTS_10':
        const projects = await db.collection('projects').countDocuments({ 'submissions.user': userId });
        actualValue = projects;
        isReal = projects >= (achievement.type === 'FIRST_PROJECT' ? 1 : 10);
        break;

      case 'FIRST_REFERRAL':
      case 'REFERRALS_10':
        // Check user's referral count
        const user = await db.collection('users').findOne({ _id: userId });
        actualValue = user?.referral?.totalReferrals || 0;
        isReal = actualValue >= (achievement.type === 'FIRST_REFERRAL' ? 1 : 10);
        break;

      case 'FIRST_REVIEW':
      case 'REVIEWS_25':
        const reviews = await db.collection('reviews').countDocuments({ user: userId });
        actualValue = reviews;
        isReal = reviews >= (achievement.type === 'FIRST_REVIEW' ? 1 : 25);
        break;

      case 'EARLY_BIRD':
        // Check if user joined within first 30 days (hard to verify, assume real)
        isReal = true;
        break;

      default:
        // Unknown type, assume real
        isReal = true;
    }

    if (!isReal) {
      fakeCount++;
      console.log(`❌ FAKE: ${achievement.type} for user ${userId.toString().slice(-6)} (actual: ${actualValue})`);

      // Fix it
      await db.collection('userachievements').updateOne(
        { _id: achievement._id },
        { $set: { unlocked: false, unlockedDate: null, progress: 0, currentValue: actualValue } }
      );

      // Remove coin transaction
      await db.collection('cointransactions').deleteOne({
        user: userId,
        source: 'achievement',
        'metadata.achievementType': achievement.type
      });

      // Get coin amount to deduct
      const coinRewards = {
        'FIRST_ORDER': 50, 'ORDERS_10': 100, 'ORDERS_50': 500, 'FREQUENT_BUYER': 1000,
        'FIRST_VIDEO': 100, 'VIDEOS_10': 500, 'VIEWS_10000': 1000,
        'FIRST_PROJECT': 50, 'PROJECTS_10': 500,
        'FIRST_REFERRAL': 100, 'REFERRALS_10': 1000,
        'FIRST_REVIEW': 25, 'REVIEWS_25': 250,
        'EARLY_BIRD': 200
      };
      const coinsToDeduct = coinRewards[achievement.type] || 0;

      if (coinsToDeduct > 0) {
        await db.collection('wallets').updateOne(
          { user: userId },
          { $inc: { 'balance.available': -coinsToDeduct, 'balance.total': -coinsToDeduct, 'statistics.totalEarned': -coinsToDeduct } }
        );
      }

      fixedCount++;
      console.log(`   ✅ Fixed: Un-unlocked and deducted ${coinsToDeduct} coins`);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log('Total unlocked achievements checked:', unlockedAchievements.length);
  console.log('Fake achievements found:', fakeCount);
  console.log('Achievements fixed:', fixedCount);

  await mongoose.disconnect();
  console.log('\nDone!');
}

fixAllFakeAchievements().catch(console.error);
