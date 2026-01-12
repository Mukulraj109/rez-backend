const mongoose = require('mongoose');

async function checkWalletSync() {
  await mongoose.connect('mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority');
  const db = mongoose.connection.db;

  const userId = new mongoose.Types.ObjectId('68ef4d41061faaf045222506');

  console.log('\n=== WALLET vs COIN TRANSACTION SYNC CHECK ===\n');

  // 1. Get wallet balance
  const wallet = await db.collection('wallets').findOne({ user: userId });
  console.log('WALLET BALANCE:');
  console.log('  Available:', wallet?.balance?.available || 0);
  console.log('  Total:', wallet?.balance?.total || 0);

  // 2. Get actual balance from coin transactions
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
  console.log('\nCOIN TRANSACTIONS:');
  console.log('  Total Earned:', txBalance[0]?.earned || 0);
  console.log('  Total Spent:', txBalance[0]?.spent || 0);
  console.log('  Actual Balance:', actualBalance);

  // 3. Check if they match
  const walletBalance = wallet?.balance?.available || 0;
  const difference = walletBalance - actualBalance;

  console.log('\n=== SYNC STATUS ===');
  if (difference === 0) {
    console.log('✅ SYNCED! Wallet matches Coin Transactions');
  } else {
    console.log('❌ OUT OF SYNC!');
    console.log('  Wallet shows:', walletBalance);
    console.log('  Should be:', actualBalance);
    console.log('  Difference:', difference);

    // Fix it
    console.log('\n  Fixing wallet balance...');
    await db.collection('wallets').updateOne(
      { user: userId },
      {
        $set: {
          'balance.available': actualBalance,
          'balance.total': actualBalance
        }
      }
    );
    console.log('  ✅ Wallet balance updated to:', actualBalance);
  }

  // 4. Check ReZ coins in wallet.coins array
  const rezCoin = wallet?.coins?.find(c => c.type === 'rez');
  console.log('\nWALLET.COINS (ReZ):');
  console.log('  Amount:', rezCoin?.amount || 0);

  if (rezCoin && rezCoin.amount !== actualBalance) {
    console.log('  ❌ ReZ coin amount out of sync, fixing...');
    await db.collection('wallets').updateOne(
      { user: userId, 'coins.type': 'rez' },
      { $set: { 'coins.$.amount': actualBalance } }
    );
    console.log('  ✅ ReZ coin amount updated to:', actualBalance);
  }

  await mongoose.disconnect();
  console.log('\nDone!');
}

checkWalletSync().catch(console.error);
