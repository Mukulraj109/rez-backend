const mongoose = require('mongoose');

async function checkData() {
  await mongoose.connect('mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority');

  const db = mongoose.connection.db;

  // 1. Check unlocked achievements
  console.log('\n=== UNLOCKED ACHIEVEMENTS ===');
  const achievements = await db.collection('userachievements').find({ unlocked: true }).toArray();
  console.log('Total unlocked:', achievements.length);
  achievements.forEach(a => {
    console.log('  -', a.type, '| unlocked:', a.unlockedDate || 'no date');
  });

  // 2. Check coin transactions for achievements
  console.log('\n=== COIN TRANSACTIONS (achievement source) ===');
  const coinTx = await db.collection('cointransactions').find({ source: 'achievement' }).toArray();
  console.log('Total achievement coins awarded:', coinTx.length);
  coinTx.forEach(tx => {
    console.log('  -', tx.description, '| amount:', tx.amount, '| date:', tx.createdAt);
  });

  // 3. Check if related data exists
  console.log('\n=== RELATED DATA CHECK ===');
  const orders = await db.collection('orders').countDocuments();
  const videos = await db.collection('videos').countDocuments();
  const projects = await db.collection('projects').countDocuments();
  const referrals = await db.collection('referrals').countDocuments();
  const reviews = await db.collection('reviews').countDocuments();

  console.log('Orders:', orders);
  console.log('Videos:', videos);
  console.log('Projects:', projects);
  console.log('Referrals:', referrals);
  console.log('Reviews:', reviews);

  // 4. Check user referral stats
  console.log('\n=== USER REFERRAL STATS ===');
  const users = await db.collection('users').find({ 'referral.totalReferrals': { $gt: 0 } }).toArray();
  users.forEach(u => {
    console.log('  User:', u.phoneNumber || u.email, '| totalReferrals:', u.referral?.totalReferrals);
  });

  // 5. Check all coin transactions
  console.log('\n=== ALL COIN TRANSACTIONS ===');
  const allCoinTx = await db.collection('cointransactions').find({}).sort({ createdAt: -1 }).limit(20).toArray();
  console.log('Recent transactions:');
  allCoinTx.forEach(tx => {
    console.log('  -', tx.source, '|', tx.description, '| amount:', tx.amount);
  });

  await mongoose.disconnect();
  console.log('\nDone!');
}

checkData().catch(console.error);
