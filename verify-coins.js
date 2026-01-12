const mongoose = require('mongoose');

async function verify() {
  await mongoose.connect('mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority');
  const db = mongoose.connection.db;

  console.log('\n=== VERIFICATION ===\n');

  // Check achievement coin transactions
  const achievementTx = await db.collection('cointransactions').find({ source: 'achievement' }).toArray();
  console.log('Achievement coin transactions:', achievementTx.length);
  achievementTx.forEach(tx => {
    console.log('  -', tx.description, '|', tx.amount, 'coins');
  });

  // Check total coins by source
  console.log('\n=== COIN TOTALS BY SOURCE ===');
  const totals = await db.collection('cointransactions').aggregate([
    { $group: { _id: '$source', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } }
  ]).toArray();
  totals.forEach(t => {
    console.log(' ', t._id, ':', t.total, 'coins (', t.count, 'transactions)');
  });

  await mongoose.disconnect();
  console.log('\nDone!');
}

verify().catch(console.error);
