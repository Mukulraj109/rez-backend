const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function checkTransactions() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log('📍 Database:', DB_NAME);

    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📦 Available collections:');
    collections.forEach(col => console.log(`   - ${col.name}`));

    // Check for transactions collection
    const hasTransactions = collections.some(col => col.name === 'transactions');
    const hasWallets = collections.some(col => col.name === 'wallets');
    const hasUsers = collections.some(col => col.name === 'users');

    console.log('\n🔍 Checking collections:');
    console.log(`   Transactions: ${hasTransactions ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`   Wallets: ${hasWallets ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`   Users: ${hasUsers ? '✅ EXISTS' : '❌ NOT FOUND'}`);

    if (hasTransactions) {
      const transactionsCount = await db.collection('transactions').countDocuments();
      console.log(`\n💰 Transactions count: ${transactionsCount}`);

      if (transactionsCount > 0) {
        const sampleTransactions = await db.collection('transactions').find().limit(3).toArray();
        console.log('\n📄 Sample transactions:');
        sampleTransactions.forEach((tx, i) => {
          console.log(`\n   ${i + 1}. Transaction ID: ${tx.transactionId || tx._id}`);
          console.log(`      User: ${tx.user}`);
          console.log(`      Type: ${tx.type}`);
          console.log(`      Amount: ${tx.amount}`);
          console.log(`      Status: ${tx.status?.current || 'N/A'}`);
          console.log(`      Date: ${tx.createdAt}`);
        });
      } else {
        console.log('\n⚠️  No transactions found in database');
      }
    }

    if (hasWallets) {
      const walletsCount = await db.collection('wallets').countDocuments();
      console.log(`\n💼 Wallets count: ${walletsCount}`);

      if (walletsCount > 0) {
        const sampleWallet = await db.collection('wallets').findOne();
        console.log('\n📄 Sample wallet:');
        console.log(`   User: ${sampleWallet.user}`);
        console.log(`   Balance: ${sampleWallet.balance?.total || 0}`);
        console.log(`   Active: ${sampleWallet.isActive}`);
      }
    }

    if (hasUsers) {
      const usersCount = await db.collection('users').countDocuments();
      console.log(`\n👥 Users count: ${usersCount}`);

      if (usersCount > 0) {
        const sampleUser = await db.collection('users').findOne();
        console.log('\n📄 Sample user:');
        console.log(`   ID: ${sampleUser._id}`);
        console.log(`   Phone: ${sampleUser.phoneNumber}`);
        console.log(`   Email: ${sampleUser.email || 'N/A'}`);
        console.log(`   Name: ${sampleUser.profile?.firstName || 'N/A'} ${sampleUser.profile?.lastName || ''}`);
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Database check complete');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkTransactions();
