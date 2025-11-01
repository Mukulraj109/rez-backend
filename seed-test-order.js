/**
 * Seed Test Delivered Order
 * Creates a test order and marks it as delivered to test partner syncing
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function seedTestOrder() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log('URI:', MONGODB_URI.replace(/:[^:@]+@/, ':****@'));
    console.log('Database:', DB_NAME);
    
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    // Import models
    console.log('📦 Loading models...');
    require('ts-node/register');
    const Partner = require('./src/models/Partner').default;
    const { User } = require('./src/models/User');
    const { Order } = require('./src/models/Order');
    const Store = require('./src/models/Store').default;
    
    console.log('✅ Models loaded:', {
      Partner: !!Partner,
      User: !!User,
      Order: !!Order
    });
    
    // Find any user (first one)
    console.log('\n🔍 Looking for users...');
    const user = await User.findOne({}).sort({ createdAt: -1 });
    
    if (!user) {
      console.log('❌ No users found in database!');
      console.log('Please create a user account first.');
      process.exit(1);
    }
    
    const userName = user.profile?.firstName || user.profile?.lastName || 'Test User';
    const userPhone = user.auth?.phoneNumber || user.phoneNumber || '+919999999999';
    const userEmail = user.email || userPhone;
    
    console.log('✅ Found user:', {
      id: user._id,
      name: userName,
      phone: userPhone,
      email: userEmail
    });
    
    // Check existing orders
    const existingOrders = await Order.find({ user: user._id });
    console.log(`\n📊 User has ${existingOrders.length} existing orders`);
    
    // Generate order number
    const orderCount = await Order.countDocuments();
    const orderNumber = `ORD${Date.now()}${String(orderCount + 1).padStart(4, '0')}`;
    
    console.log('\n📦 Creating test order...');
    console.log('Order Number:', orderNumber);
    
    // Create a test order with dummy IDs
    const testOrder = new Order({
      orderNumber,
      user: user._id,
      items: [{
        product: new mongoose.Types.ObjectId(),
        store: new mongoose.Types.ObjectId(), // Dummy store ID
        name: 'Test Product',
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
        method: 'razorpay', // Changed to valid enum value
        status: 'paid', // Changed to valid enum value
        transactionId: `TXN${Date.now()}`
      },
      delivery: {
        method: 'standard',
        status: 'delivered',
        address: {
          name: userName, // Changed from fullName to name
          phone: userPhone, // Changed from phoneNumber to phone
          addressLine1: 'Test Address',
          city: 'Test City',
          state: 'Test State',
          pincode: '123456',
          country: 'India',
          addressType: 'home'
        },
        deliveryFee: 50,
        estimatedDelivery: new Date(Date.now() - 1000 * 60 * 60 * 24), // Yesterday
        actualDelivery: new Date() // Now
      },
      timeline: [
        {
          status: 'placed',
          message: 'Order placed',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) // 3 days ago
        },
        {
          status: 'confirmed',
          message: 'Order confirmed',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) // 2 days ago
        },
        {
          status: 'processing',
          message: 'Order processing',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1) // 1 day ago
        },
        {
          status: 'delivered',
          message: 'Order delivered',
          timestamp: new Date() // Now
        }
      ],
      status: 'delivered'
    });
    
    await testOrder.save();
    console.log('✅ Test order created successfully!');
    console.log('   Order ID:', testOrder._id);
    console.log('   Status: DELIVERED');
    console.log('   Total: ₹', testOrder.totals.total);
    
    // Now sync partner profile
    console.log('\n🎯 Syncing partner profile...');
    
    let partner = await Partner.findOne({ userId: user._id });
    
    if (!partner) {
      console.log('⚠️ Partner profile not found, creating...');
      partner = await Partner.createDefaultPartner(
        user._id.toString(),
        userName,
        userEmail,
        user.profile?.avatar
      );
      console.log('✅ Partner profile created');
    } else {
      console.log('✅ Found existing partner profile');
    }
    
    console.log('\n📊 BEFORE SYNC:');
    console.log('─'.repeat(50));
    console.log(`Total Orders: ${partner.totalOrders}`);
    console.log(`Total Spent: ₹${partner.totalSpent}`);
    console.log('─'.repeat(50));
    
    // Count all delivered orders
    const deliveredOrders = await Order.find({ 
      user: user._id, 
      status: 'delivered' 
    });
    
    const totalDelivered = deliveredOrders.length;
    const totalSpent = deliveredOrders.reduce((sum, order) => {
      return sum + (order.totals?.total || 0);
    }, 0);
    
    console.log('\n📦 ACTUAL DELIVERED ORDERS:');
    console.log('─'.repeat(50));
    console.log(`Count: ${totalDelivered}`);
    console.log(`Total Spent: ₹${totalSpent.toFixed(2)}`);
    console.log('─'.repeat(50));
    
    // Update partner
    partner.totalOrders = totalDelivered;
    partner.ordersThisLevel = totalDelivered;
    partner.totalSpent = totalSpent;
    partner.lastActivityDate = new Date();
    
    // Check milestones
    let milestonesUnlocked = [];
    partner.milestones.forEach((milestone) => {
      const wasAchieved = milestone.achieved;
      if (partner.totalOrders >= milestone.orderCount && !milestone.achieved) {
        milestone.achieved = true;
        milestonesUnlocked.push(milestone.orderCount);
      }
    });
    
    // Check jackpots
    let jackpotsUnlocked = [];
    partner.jackpotProgress.forEach((jackpot) => {
      const wasAchieved = jackpot.achieved;
      if (partner.totalSpent >= jackpot.spendAmount && !jackpot.achieved) {
        jackpot.achieved = true;
        jackpotsUnlocked.push(jackpot.spendAmount);
      }
    });
    
    await partner.save();
    
    console.log('\n📊 AFTER SYNC:');
    console.log('─'.repeat(50));
    console.log(`Total Orders: ${partner.totalOrders}`);
    console.log(`Total Spent: ₹${partner.totalSpent.toFixed(2)}`);
    console.log('─'.repeat(50));
    
    if (milestonesUnlocked.length > 0) {
      console.log('\n🎉 MILESTONES UNLOCKED:');
      milestonesUnlocked.forEach(count => {
        const milestone = partner.milestones.find(m => m.orderCount === count);
        console.log(`✅ ${count} orders: ${milestone.reward.title}`);
      });
    }
    
    if (jackpotsUnlocked.length > 0) {
      console.log('\n💰 JACKPOTS UNLOCKED:');
      jackpotsUnlocked.forEach(amount => {
        const jackpot = partner.jackpotProgress.find(j => j.spendAmount === amount);
        console.log(`✅ ₹${amount}: ${jackpot.title}`);
      });
    }
    
    console.log('\n✅ SYNC COMPLETE!');
    console.log('─'.repeat(50));
    console.log('Now refresh your browser to see the updated partner profile.');
    console.log('─'.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
seedTestOrder();

