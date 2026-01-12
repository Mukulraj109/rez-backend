const mongoose = require('mongoose');

async function investigate() {
  await mongoose.connect('mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority');
  const db = mongoose.connection.db;
  const userId = new mongoose.Types.ObjectId('68ef4d41061faaf045222506');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('              COIN SYSTEMS INVESTIGATION');
  console.log('═══════════════════════════════════════════════════════════════');

  // 1. Check Wallet model
  const wallet = await db.collection('wallets').findOne({ user: userId });
  console.log('\n📦 WALLET MODEL:');
  console.log('  balance.available:', wallet?.balance?.available);
  console.log('  balance.total:', wallet?.balance?.total);
  console.log('  balance.pending:', wallet?.balance?.pending);
  console.log('  balance.cashback:', wallet?.balance?.cashback);
  console.log('  statistics.totalEarned:', wallet?.statistics?.totalEarned);
  console.log('  statistics.totalSpent:', wallet?.statistics?.totalSpent);
  console.log('\n  coins array:');
  wallet?.coins?.forEach((c, i) => {
    console.log(`    [${i}] type: ${c.type}, amount: ${c.amount}, isActive: ${c.isActive}`);
  });
  console.log('\n  brandedCoins array:', wallet?.brandedCoins?.length || 0, 'items');

  // 2. Check CoinTransaction collection
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('💰 COIN TRANSACTION COLLECTION:');
  const txBySource = await db.collection('cointransactions').aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
        totalEarned: { $sum: { $cond: [{ $eq: ['$type', 'earned'] }, '$amount', 0] } },
        totalSpent: { $sum: { $cond: [{ $eq: ['$type', 'spent'] }, '$amount', 0] } }
      }
    },
    { $sort: { totalEarned: -1 } }
  ]).toArray();

  let grandTotalEarned = 0;
  let grandTotalSpent = 0;
  txBySource.forEach(src => {
    console.log(`  ${src._id}: ${src.count} txns, earned: ${src.totalEarned}, spent: ${src.totalSpent}`);
    grandTotalEarned += src.totalEarned;
    grandTotalSpent += src.totalSpent;
  });
  console.log('  -----------------------------------------');
  console.log(`  TOTAL: earned: ${grandTotalEarned}, spent: ${grandTotalSpent}`);
  console.log(`  NET BALANCE: ${grandTotalEarned - grandTotalSpent}`);

  // 3. Check Transaction collection (wallet transactions)
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 TRANSACTION COLLECTION (wallet):');
  const walletTxByCategory = await db.collection('transactions').aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: { type: '$type', category: '$category' },
        count: { $sum: 1 },
        total: { $sum: '$amount' }
      }
    }
  ]).toArray();

  walletTxByCategory.forEach(tx => {
    console.log(`  ${tx._id.type}/${tx._id.category}: ${tx.count} txns, total: ${tx.total}`);
  });

  // 4. Check DailyCheckIn collection
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📅 DAILY CHECK-IN COLLECTION:');
  const dailyCheckIns = await db.collection('dailycheckins').find({ user: userId }).toArray();
  console.log('  Total records:', dailyCheckIns.length);
  let totalDailyCoins = 0;
  dailyCheckIns.forEach(dc => {
    totalDailyCoins += dc.coinsEarned || 0;
  });
  console.log('  Total coins from daily check-ins:', totalDailyCoins);

  // 5. Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY:');
  console.log('');
  console.log('  Wallet coins[0].amount (ReZ):', wallet?.coins?.[0]?.amount);
  console.log('  Wallet balance.available:', wallet?.balance?.available);
  console.log('  CoinTransaction net balance:', grandTotalEarned - grandTotalSpent);
  console.log('  DailyCheckIn total coins:', totalDailyCoins);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');

  await mongoose.disconnect();
}

investigate().catch(console.error);
