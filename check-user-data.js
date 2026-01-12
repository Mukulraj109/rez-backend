const mongoose = require('mongoose');

async function checkUserData() {
  await mongoose.connect('mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority');
  const db = mongoose.connection.db;

  // Find the user with these specific 5 achievements unlocked
  console.log('\n=== CHECKING USER DATA ===\n');

  // Get all users with achievements
  const userAchievements = await db.collection('userachievements').aggregate([
    { $match: { unlocked: true } },
    { $group: { _id: '$user', achievements: { $push: '$type' }, count: { $sum: 1 } } },
    { $match: { count: 5 } } // User with exactly 5 unlocked
  ]).toArray();

  console.log('Users with 5 unlocked achievements:', userAchievements.length);

  for (const ua of userAchievements) {
    const userId = ua._id;
    console.log('\n--- User ID:', userId.toString(), '---');
    console.log('Achievements:', ua.achievements);

    // Check if this user has REAL activity
    const orders = await db.collection('orders').countDocuments({ user: userId });
    const videos = await db.collection('videos').countDocuments({ creator: userId });
    const projects = await db.collection('projects').find({ 'submissions.user': userId }).count();
    const referrals = await db.collection('users').countDocuments({ 'referral.referredBy': userId.toString() });

    // Check video views
    const videoStats = await db.collection('videos').aggregate([
      { $match: { creator: userId } },
      { $group: { _id: null, totalViews: { $sum: '$engagement.views' } } }
    ]).toArray();

    console.log('REAL DATA CHECK:');
    console.log('  Orders placed:', orders);
    console.log('  Videos created:', videos);
    console.log('  Video views:', videoStats[0]?.totalViews || 0);
    console.log('  Projects submitted:', projects);
    console.log('  Users referred:', referrals);

    // Check if achievements match real activity
    const hasFirstOrder = ua.achievements.includes('FIRST_ORDER');
    const hasFirstVideo = ua.achievements.includes('FIRST_VIDEO');
    const hasInfluencer = ua.achievements.includes('VIEWS_10000');
    const hasFirstProject = ua.achievements.includes('FIRST_PROJECT');
    const hasFirstReferral = ua.achievements.includes('FIRST_REFERRAL');

    console.log('\nACHIEVEMENT vs REALITY:');
    if (hasFirstOrder) console.log('  First Order:', orders >= 1 ? '✅ REAL' : '❌ FAKE (no orders)');
    if (hasFirstVideo) console.log('  First Video:', videos >= 1 ? '✅ REAL' : '❌ FAKE (no videos)');
    if (hasInfluencer) console.log('  Influencer (10K views):', (videoStats[0]?.totalViews || 0) >= 10000 ? '✅ REAL' : '❌ FAKE (only ' + (videoStats[0]?.totalViews || 0) + ' views)');
    if (hasFirstProject) console.log('  First Project:', projects >= 1 ? '✅ REAL' : '❌ FAKE (no projects)');
    if (hasFirstReferral) console.log('  First Referral:', referrals >= 1 ? '✅ REAL' : '❌ FAKE (no referrals)');
  }

  await mongoose.disconnect();
  console.log('\nDone!');
}

checkUserData().catch(console.error);
