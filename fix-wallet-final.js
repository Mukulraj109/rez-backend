const mongoose = require('mongoose');

async function fixPermanently() {
  await mongoose.connect('mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority');
  const db = mongoose.connection.db;

  const userId = new mongoose.Types.ObjectId('68ef4d41061faaf045222506');

  // Get actual balance from coin transactions
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
  console.log('Actual balance from CoinTransaction:', actualBalance);
  console.log('  Earned:', txBalance[0]?.earned || 0);
  console.log('  Spent:', txBalance[0]?.spent || 0);

  // Update wallet completely
  const result = await db.collection('wallets').updateOne(
    { user: userId },
    {
      $set: {
        'balance.available': actualBalance,
        'balance.total': actualBalance,
        'coins.0.amount': actualBalance,
        'statistics.totalEarned': txBalance[0]?.earned || 0
      }
    }
  );

  console.log('\nWallet updated:', result.modifiedCount > 0 ? 'YES' : 'NO');

  // Verify
  const wallet = await db.collection('wallets').findOne({ user: userId });
  console.log('\nNew wallet state:');
  console.log('  balance.available:', wallet?.balance?.available);
  console.log('  balance.total:', wallet?.balance?.total);
  console.log('  coins[0] (rez):', wallet?.coins?.[0]?.amount);

  await mongoose.disconnect();
  console.log('\n✅ Done! Refresh the app.');
}

fixPermanently().catch(console.error);
