const mongoose = require('mongoose');

async function fixTransactionBalances() {
  await mongoose.connect('mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority');
  const db = mongoose.connection.db;
  const userId = new mongoose.Types.ObjectId('68ef4d41061faaf045222506');

  console.log('=== FIXING TRANSACTION BALANCES ===\n');

  // Get all transactions sorted by createdAt
  const transactions = await db.collection('cointransactions')
    .find({ user: userId })
    .sort({ createdAt: 1 })
    .toArray();

  console.log('Total transactions:', transactions.length);

  // Calculate running balance and update each transaction
  let runningBalance = 0;
  let updatedCount = 0;

  for (const tx of transactions) {
    // Calculate balance change
    if (tx.type === 'earned' || tx.type === 'refunded' || tx.type === 'bonus') {
      runningBalance += tx.amount;
    } else if (tx.type === 'spent' || tx.type === 'expired') {
      runningBalance -= tx.amount;
    }

    // Update transaction with correct balance
    if (tx.balance !== runningBalance) {
      await db.collection('cointransactions').updateOne(
        { _id: tx._id },
        { $set: { balance: runningBalance } }
      );
      updatedCount++;
    }
  }

  console.log('Updated transactions:', updatedCount);
  console.log('Final running balance:', runningBalance);

  // Verify the latest transaction now has the correct balance
  const latestTx = await db.collection('cointransactions')
    .findOne({ user: userId }, { sort: { createdAt: -1 } });

  console.log('\nLatest transaction now has balance:', latestTx?.balance);

  // Update wallet to match
  await db.collection('wallets').updateOne(
    { user: userId },
    { $set: {
      'balance.available': runningBalance,
      'balance.total': runningBalance,
      'coins.0.amount': runningBalance
    } }
  );

  console.log('Wallet updated to:', runningBalance);
  console.log('\n✅ Done! All transaction balances fixed.');

  await mongoose.disconnect();
}

fixTransactionBalances().catch(console.error);
