/**
 * Create Test Order for User: 68ef4d41061faaf045222506
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

// YOUR USER ID from backend logs
const TARGET_USER_ID = '68ef4d41061faaf045222506';

async function createOrder() {
  try {
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected\n');
    
    require('ts-node/register');
    const Partner = require('./src/models/Partner').default;
    const { User } = require('./src/models/User');
    const { Order } = require('./src/models/Order');
    
    console.log('🔍 Finding user:', TARGET_USER_ID);
    const user = await User.findById(TARGET_USER_ID);
    
    if (!user) {
      console.log('❌ User not found!');
      process.exit(1);
    }
    
    const userName = user.profile?.firstName || user.profile?.lastName || 'Mukul Raj';
    const userPhone = user.auth?.phoneNumber || '+918210224305';
    
    console.log('✅ Found:', userName, '-', userPhone);
    
    // Create order
    const orderNumber = `ORD${Date.now()}TEST`;
    console.log('\n📦 Creating order:', orderNumber);
    
    const order = await Order.create({
      orderNumber,
      user: user._id,
      items: [{
        product: new mongoose.Types.ObjectId(),
        store: new mongoose.Types.ObjectId(),
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
          addressLine1: 'Test',
          city: 'Test',
          state: 'Test',
          pincode: '123456',
          country: 'India',
          addressType: 'home'
        },
        deliveryFee: 50
      },
      status: 'delivered',
      timeline: [{
        status: 'delivered',
        message: 'Delivered',
        timestamp: new Date()
      }]
    });
    
    console.log('✅ Order created:', order._id);
    
    // Sync partner
    console.log('\n🎯 Syncing partner...');
    let partner = await Partner.findOne({ userId: user._id });
    
    if (!partner) {
      console.log('Creating partner profile...');
      partner = await Partner.createDefaultPartner(
        user._id.toString(),
        userName,
        user.email || userPhone,
        user.profile?.avatar
      );
    }
    
    const delivered = await Order.find({ user: user._id, status: 'delivered' });
    const total = delivered.reduce((sum, o) => sum + (o.totals?.total || 0), 0);
    
    console.log(`\n📊 BEFORE: ${partner.totalOrders} orders, ₹${partner.totalSpent}`);
    
    partner.totalOrders = delivered.length;
    partner.ordersThisLevel = delivered.length;
    partner.totalSpent = total;
    partner.lastActivityDate = new Date();
    
    partner.milestones.forEach(m => {
      if (partner.totalOrders >= m.orderCount && !m.achieved) {
        m.achieved = true;
      }
    });
    
    await partner.save();
    
    console.log(`📊 AFTER:  ${partner.totalOrders} orders, ₹${partner.totalSpent} ✅`);
    console.log('\n✅ SUCCESS! Refresh your browser now!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

createOrder();

