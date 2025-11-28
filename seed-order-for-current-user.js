/**
 * Create Test Order for Current Logged-In User
 * This will prompt for the user ID from the backend logs
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createOrderForUser() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║   🎯 CREATE TEST DELIVERED ORDER FOR YOUR ACCOUNT         ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('📋 INSTRUCTIONS:');
    console.log('─'.repeat(60));
    console.log('1. Look at your backend terminal');
    console.log('2. Find the line that says: "✅ [AUTH] Authentication successful for user: new ObjectId(...)"');
    console.log('3. Copy the ObjectId (without the "new ObjectId" part)');
    console.log('4. Paste it below');
    console.log('─'.repeat(60));
    console.log('\nExample: If you see "new ObjectId(\'68ef4d41061faaf045222506\')"');
    console.log('         Just enter: 68ef4d41061faaf045222506\n');
    
    const userIdInput = await question('Enter your user ID: ');
    const userId = userIdInput.trim().replace(/['"`]/g, '');
    
    if (!userId || userId.length !== 24) {
      console.log('\n❌ Invalid user ID! Must be 24 characters.');
      console.log('Example: 68ef4d41061faaf045222506');
      process.exit(1);
    }
    
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB\n');
    
    // Load models
    require('ts-node/register');
    const Partner = require('./src/models/Partner').default;
    const { User } = require('./src/models/User');
    const { Order } = require('./src/models/Order');
    
    // Find user
    console.log('🔍 Looking for user:', userId);
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('❌ User not found with ID:', userId);
      process.exit(1);
    }
    
    const userName = user.profile?.firstName || user.profile?.lastName || 'Test User';
    const userPhone = user.auth?.phoneNumber || user.phoneNumber || '+919999999999';
    const userEmail = user.email || userPhone;
    
    console.log('\n✅ Found user:', {
      id: user._id,
      name: userName,
      phone: userPhone,
      email: userEmail
    });
    
    // Check existing delivered orders
    const existingDelivered = await Order.find({ 
      user: user._id, 
      status: 'delivered' 
    });
    
    console.log(`\n📊 Current delivered orders: ${existingDelivered.length}`);
    
    // Generate order number
    const orderCount = await Order.countDocuments();
    const orderNumber = `ORD${Date.now()}${String(orderCount + 1).padStart(4, '0')}`;
    
    console.log('\n📦 Creating test delivered order...');
    console.log('Order Number:', orderNumber);
    
    // Create order
    const testOrder = new Order({
      orderNumber,
      user: user._id,
      items: [{
        product: new mongoose.Types.ObjectId(),
        store: new mongoose.Types.ObjectId(),
        name: 'Test Product - Partner Milestone',
        quantity: 1,
        price: 999,
        subtotal: 999,
        image: 'https://via.placeholder.com/150'
      }],
      totals: {
        subtotal: 999,
        tax: 100,
        delivery: 50,
        discount: 0,
        cashback: 50,
        total: 1149,
        paidAmount: 1149
      },
      payment: {
        method: 'razorpay',
        status: 'paid',
        transactionId: `TXN${Date.now()}`
      },
      delivery: {
        method: 'standard',
        status: 'delivered',
        address: {
          name: userName,
          phone: userPhone,
          addressLine1: 'Test Address',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
          country: 'India',
          addressType: 'home'
        },
        deliveryFee: 50,
        estimatedDelivery: new Date(Date.now() - 1000 * 60 * 60 * 24),
        actualDelivery: new Date()
      },
      timeline: [
        {
          status: 'placed',
          message: 'Order placed',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3)
        },
        {
          status: 'confirmed',
          message: 'Order confirmed',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
        },
        {
          status: 'processing',
          message: 'Order processing',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1)
        },
        {
          status: 'delivered',
          message: 'Order delivered',
          timestamp: new Date()
        }
      ],
      status: 'delivered'
    });
    
    await testOrder.save();
    console.log('\n✅ Test order created successfully!');
    console.log('   Order ID:', testOrder._id);
    console.log('   Status: DELIVERED ✅');
    console.log('   Total: ₹', testOrder.totals.total);
    
    // Sync partner profile
    console.log('\n🎯 Syncing partner profile...');
    
    let partner = await Partner.findOne({ userId: user._id });
    
    if (!partner) {
      console.log('⚠️  Partner profile not found, creating...');
      partner = await Partner.createDefaultPartner(
        user._id.toString(),
        userName,
        userEmail,
        user.profile?.avatar
      );
      console.log('✅ Partner profile created');
    } else {
      console.log('✅ Found partner profile');
    }
    
    console.log('\n📊 BEFORE SYNC:');
    console.log('─'.repeat(60));
    console.log(`Total Orders: ${partner.totalOrders}`);
    console.log(`Total Spent: ₹${partner.totalSpent}`);
    console.log('─'.repeat(60));
    
    // Get all delivered orders
    const allDelivered = await Order.find({ 
      user: user._id, 
      status: 'delivered' 
    });
    
    const totalOrders = allDelivered.length;
    const totalSpent = allDelivered.reduce((sum, order) => {
      return sum + (order.totals?.total || 0);
    }, 0);
    
    // Update partner
    partner.totalOrders = totalOrders;
    partner.ordersThisLevel = totalOrders;
    partner.totalSpent = totalSpent;
    partner.lastActivityDate = new Date();
    
    // Check milestones
    let milestonesUnlocked = [];
    partner.milestones.forEach((milestone) => {
      if (partner.totalOrders >= milestone.orderCount && !milestone.achieved) {
        milestone.achieved = true;
        milestonesUnlocked.push(milestone.orderCount);
      }
    });
    
    // Check jackpots
    let jackpotsUnlocked = [];
    partner.jackpotProgress.forEach((jackpot) => {
      if (partner.totalSpent >= jackpot.spendAmount && !jackpot.achieved) {
        jackpot.achieved = true;
        jackpotsUnlocked.push(jackpot.spendAmount);
      }
    });
    
    await partner.save();
    
    console.log('\n📊 AFTER SYNC:');
    console.log('─'.repeat(60));
    console.log(`Total Orders: ${partner.totalOrders} ✅`);
    console.log(`Total Spent: ₹${partner.totalSpent.toFixed(2)} ✅`);
    console.log('─'.repeat(60));
    
    if (milestonesUnlocked.length > 0) {
      console.log('\n🎉 MILESTONES UNLOCKED:');
      milestonesUnlocked.forEach(count => {
        const milestone = partner.milestones.find(m => m.orderCount === count);
        console.log(`✅ ${count} orders: ${milestone.reward.title}`);
      });
    } else {
      console.log('\n📋 MILESTONE PROGRESS:');
      partner.milestones.slice(0, 2).forEach(m => {
        const remaining = m.orderCount - partner.totalOrders;
        console.log(`   ${m.orderCount} orders (${m.reward.title}): ${remaining} more needed`);
      });
    }
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║   ✅ SUCCESS! ORDER CREATED AND SYNCED!                   ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('🔄 NEXT STEPS:');
    console.log('─'.repeat(60));
    console.log('1. Go to your browser');
    console.log('2. Press Ctrl+R or F5 to refresh');
    console.log('3. You should see your order count updated!');
    console.log('─'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    rl.close();
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB\n');
  }
}

createOrderForUser();

