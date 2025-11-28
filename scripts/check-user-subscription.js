/**
 * Check User Subscription Status
 * Verifies if user Mukul Raj (8210224305) has Premium subscription
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

async function checkUserSubscription() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB!\n');

    // Find user by phone number
    console.log('🔍 Searching for user with phone: 8210224305...');
    const user = await User.findOne({ phone: '8210224305' });

    if (!user) {
      console.log('❌ User not found with phone number 8210224305');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log({
      id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      createdAt: user.createdAt,
    });
    console.log('\n---\n');

    // Find all subscriptions for this user
    console.log('🔍 Searching for subscriptions...');
    const subscriptions = await Subscription.find({ user: user._id }).sort({ createdAt: -1 });

    if (subscriptions.length === 0) {
      console.log('❌ No subscriptions found for this user');
      process.exit(1);
    }

    console.log(`✅ Found ${subscriptions.length} subscription(s):\n`);

    subscriptions.forEach((sub, index) => {
      console.log(`Subscription ${index + 1}:`);
      console.log({
        id: sub._id,
        tier: sub.tier,
        price: sub.price,
        status: sub.status,
        billingCycle: sub.billingCycle,
        startDate: sub.startDate,
        endDate: sub.endDate,
        trialEndDate: sub.trialEndDate,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
      });
      console.log('');
    });

    // Check which one will be returned by the backend
    console.log('---\n');
    console.log('🎯 Testing backend query (most recent active subscription):');
    const activeSubscription = await Subscription.findOne({
      user: user._id,
      status: { $in: ['active', 'trial', 'grace_period'] }
    }).sort({ createdAt: -1 });

    if (activeSubscription) {
      console.log('✅ Backend will return this subscription:');
      console.log({
        id: activeSubscription._id,
        tier: activeSubscription.tier,
        price: activeSubscription.price,
        status: activeSubscription.status,
        billingCycle: activeSubscription.billingCycle,
        createdAt: activeSubscription.createdAt,
      });

      if (activeSubscription.tier === 'premium' && activeSubscription.price === 99) {
        console.log('\n🎉 SUCCESS! User has Premium subscription with ₹99');
      } else if (activeSubscription.tier === 'free') {
        console.log('\n⚠️ WARNING! Backend is returning Free tier instead of Premium!');
        console.log('This means the Premium subscription might have wrong status or sorting is still broken.');
      } else {
        console.log(`\n✅ User has ${activeSubscription.tier} subscription with ₹${activeSubscription.price}`);
      }
    } else {
      console.log('❌ No active subscription found!');
      console.log('The user might have a subscription with status other than active/trial/grace_period');
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

checkUserSubscription();
