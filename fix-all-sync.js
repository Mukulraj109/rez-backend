const mongoose = require('mongoose');

async function fixAll() {
  await mongoose.connect('mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority');
  const db = mongoose.connection.db;
  const userId = new mongoose.Types.ObjectId('68ef4d41061faaf045222506');

  // Get current state
  const wallet = await db.collection('wallets').findOne({ user: userId });
  const rezCoinAmount = wallet?.coins?.[0]?.amount || 0;

  console.log('=== CURRENT STATE ===');
  console.log('Wallet balance.available:', wallet?.balance?.available);
  console.log('Wallet coins[0].amount:', rezCoinAmount);

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
  console.log('CoinTransaction balance:', coinTxBalance);

  // The correct balance should be the wallet.coins[0].amount (4568)
  // because that includes the daily check-in migration
  const correctBalance = rezCoinAmount;

  console.log('\n=== FIXING ===');
  console.log('Target balance:', correctBalance);

  // 1. Update wallet.balance.available and balance.total
  await db.collection('wallets').updateOne(
    { user: userId },
    {
      $set: {
        'balance.available': correctBalance,
        'balance.total': correctBalance
      }
    }
  );
  console.log('✅ Updated wallet.balance.available to', correctBalance);

  // 2. Add missing coins to CoinTransaction
  const missingCoins = correctBalance - coinTxBalance;
  if (missingCoins > 0) {
    // Add a coin transaction for the missing daily check-in coins
    await db.collection('cointransactions').insertOne({
      user: userId,
      type: 'earned',
      amount: missingCoins,
      source: 'daily_checkin_migration',
      description: 'Daily check-in historical data migration sync',
      metadata: {
        note: 'Added to sync CoinTransaction with wallet after migration'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✅ Added', missingCoins, 'coins to CoinTransaction');
  }

  // Verify final state
  const finalWallet = await db.collection('wallets').findOne({ user: userId });
  const finalTxBalance = await db.collection('cointransactions').aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: null,
        earned: { $sum: { $cond: [{ $eq: ['$type', 'earned'] }, '$amount', 0] } },
        spent: { $sum: { $cond: [{ $eq: ['$type', 'spent'] }, '$amount', 0] } }
      }
    }
  ]).toArray();

  console.log('\n=== FINAL STATE ===');
  console.log('Wallet balance.available:', finalWallet?.balance?.available);
  console.log('Wallet coins[0].amount:', finalWallet?.coins?.[0]?.amount);
  console.log('CoinTransaction balance:', finalTxBalance[0] ? (finalTxBalance[0].earned - finalTxBalance[0].spent) : 0);

  const allMatch = finalWallet?.balance?.available === finalWallet?.coins?.[0]?.amount &&
                   finalWallet?.balance?.available === (finalTxBalance[0] ? (finalTxBalance[0].earned - finalTxBalance[0].spent) : 0);

  if (allMatch) {
    console.log('\n✅ ALL SYNCED! Everything shows', finalWallet?.balance?.available, 'coins');
  } else {
    console.log('\n⚠️ Still not fully synced');
  }

  await mongoose.disconnect();
}

fixAll().catch(console.error);
