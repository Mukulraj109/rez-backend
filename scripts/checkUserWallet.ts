import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../src/models/User';
import { Wallet } from '../src/models/Wallet';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function checkWallet() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    // Find all users
    const users = await User.find().select('phoneNumber wallet walletBalance');
    
    console.log(`Found ${users.length} users:\n`);
    
    for (const user of users) {
      console.log(`📱 User: ${user.phoneNumber || user._id}`);
      console.log(`   User.wallet.balance: ${user.wallet?.balance || 0}`);
      console.log(`   User.walletBalance: ${user.walletBalance || 0}`);
      
      // Check if Wallet model exists
      const wallet = await Wallet.findOne({ user: user._id });
      if (wallet) {
        console.log(`   Wallet Model found:`);
        console.log(`     - Total: ${wallet.balance.total}`);
        console.log(`     - Available: ${wallet.balance.available}`);
        console.log(`     - Pending: ${wallet.balance.pending}`);
      } else {
        console.log(`   ⚠️ No Wallet model record found`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkWallet();

