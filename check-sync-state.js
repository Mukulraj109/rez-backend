const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority');
  const db = mongoose.connection.db;
  const userId = new mongoose.Types.ObjectId('68ef4d41061faaf045222506');

  // Get CoinTransaction balance
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

  const coinTxBalance = txBalance[0] ? (txBalance[0].earned - txBalance[0].spent) : 0;

  // Get wallet balance
  const wallet = await db.collection('wallets').findOne({ user: userId });

  // Count daily check-in transactions
  const dailyCheckInTx = await db.collection('cointransactions')
    .find({ user: userId, source: 'daily_login' })
    .toArray();

  let dailyCheckInTotal = 0;
  dailyCheckInTx.forEach(tx => {
    if (tx.type === 'earned') dailyCheckInTotal += tx.amount;
  });

  console.log('=== CURRENT STATE ===');
  console.log('');
  console.log('CoinTransaction Balance:', coinTxBalance);
  console.log('  Total Earned:', txBalance[0]?.earned || 0);
  console.log('  Total Spent:', txBalance[0]?.spent || 0);
  console.log('  Daily Check-in Transactions:', dailyCheckInTx.length);
  console.log('  Daily Check-in Total:', dailyCheckInTotal);
  console.log('');
  console.log('Wallet Balance:', wallet?.balance?.available);
  console.log('Wallet Coins[0] (ReZ):', wallet?.coins?.[0]?.amount);
  console.log('');

  const walletBalance = wallet?.balance?.available || 0;

  if (Math.abs(coinTxBalance - walletBalance) > 1) {
    console.log('❌ OUT OF SYNC!');
    console.log('   CoinTransaction says:', coinTxBalance);
    console.log('   Wallet shows:', walletBalance);
    console.log('   Difference:', coinTxBalance - walletBalance);
  } else {
    console.log('✅ IN SYNC!');
  }

  await mongoose.disconnect();
}

check().catch(console.error);
