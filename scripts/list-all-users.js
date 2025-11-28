/**
 * List All Users and Their Subscriptions
 * Find all users in database and check their subscriptions
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

// User Schema (simplified)
const userSchema = new mongoose.Schema({
  phone: String,
  name: String,
  email: String,
}, { collection: 'users', timestamps: true });

// Subscription Schema (simplified)
const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tier: String,
  price: Number,
  status: String,
  billingCycle: String,
  startDate: Date,
  endDate: Date,
  trialEndDate: Date,
}, { collection: 'subscriptions', timestamps: true });

const User = mongoose.model('User', userSchema);
const Subscription = mongoose.model('Subscription', subscriptionSchema);

async function listAllUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB!\n');

    // Find all users
    console.log('🔍 Finding all users...');
    const users = await User.find({}).sort({ createdAt: -1 }).limit(10);

    if (users.length === 0) {
      console.log('❌ No users found in database');
      process.exit(1);
    }

    console.log(`✅ Found ${users.length} user(s) (showing last 10):\n`);

    for (const user of users) {
      console.log('👤 User:');
      console.log({
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        createdAt: user.createdAt,
      });

      // Find subscriptions for this user
      const subscriptions = await Subscription.find({ user: user._id }).sort({ createdAt: -1 });

      if (subscriptions.length > 0) {
        console.log(`   📊 Subscriptions (${subscriptions.length}):`);
        subscriptions.forEach((sub, index) => {
          console.log(`   ${index + 1}. ${sub.tier} - ₹${sub.price} - Status: ${sub.status} - Created: ${sub.createdAt}`);
        });
      } else {
        console.log('   📊 No subscriptions');
      }

      console.log('');
    }

    // Look for users with "mukul" in name (case insensitive)
    console.log('\n---\n');
    console.log('🔍 Searching for users with name containing "mukul"...');
    const mukulUsers = await User.find({ name: /mukul/i });

    if (mukulUsers.length > 0) {
      console.log(`✅ Found ${mukulUsers.length} user(s) with "mukul" in name:\n`);
      for (const user of mukulUsers) {
        console.log('👤 User:');
        console.log({
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
        });

        const subscriptions = await Subscription.find({ user: user._id }).sort({ createdAt: -1 });
        if (subscriptions.length > 0) {
          console.log(`   📊 Subscriptions:`);
          subscriptions.forEach((sub) => {
            console.log({
              tier: sub.tier,
              price: sub.price,
              status: sub.status,
              createdAt: sub.createdAt,
            });
          });
        }
        console.log('');
      }
    } else {
      console.log('❌ No users found with "mukul" in name');
    }

    console.log('\n---\n');
    console.log('📊 Analysis Complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

listAllUsers();
