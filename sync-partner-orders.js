/**
 * Sync Partner Orders Script
 * Syncs partner totalOrders and totalSpent with actual order data
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function syncPartnerOrders() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log('URI:', MONGODB_URI.replace(/:[^:@]+@/, ':****@'));
    console.log('Database:', DB_NAME);
    
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    // Import models (using ts-node require hook)
    require('ts-node/register');
    const Partner = require('./src/models/Partner').default;
    const { User } = require('./src/models/User');
    const Order = require('./src/models/Order').default;
    
    // Find user by phone number
    const phoneNumber = '+918210224305'; // Your phone number
    const user = await User.findOne({ 'auth.phoneNumber': phoneNumber });
    
    if (!user) {
      console.log('❌ User not found with phone:', phoneNumber);
      process.exit(1);
    }
    
    console.log('✅ Found user:', {
      id: user._id,
      name: user.profile?.firstName || 'Unknown',
      phone: user.auth.phoneNumber
    });
    
    // Get all orders for this user
    const allOrders = await Order.find({ user: user._id }).sort({ createdAt: -1 });
    const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
    const activeOrders = allOrders.filter(o => ['placed', 'preparing', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery'].includes(o.status));
    
    console.log('\n📊 ORDER SUMMARY:');
    console.log('─'.repeat(50));
    console.log(`Total Orders: ${allOrders.length}`);
    console.log(`Delivered Orders: ${deliveredOrders.length}`);
    console.log(`Active Orders: ${activeOrders.length}`);
    console.log('─'.repeat(50));
    
    if (allOrders.length > 0) {
      console.log('\n📦 ORDER DETAILS:');
      allOrders.forEach((order, index) => {
        const total = order.totals?.total || order.totalAmount || 0;
        console.log(`${index + 1}. ${order.orderNumber}`);
        console.log(`   Status: ${order.status.toUpperCase()}`);
        console.log(`   Total: ₹${total}`);
        console.log(`   Date: ${order.createdAt.toLocaleString()}`);
      });
    }
    
    // Calculate delivered order totals
    const deliveredTotal = deliveredOrders.reduce((sum, order) => {
      return sum + (order.totals?.total || order.totalAmount || 0);
    }, 0);
    
    console.log('\n💰 DELIVERED ORDERS CALCULATION:');
    console.log('─'.repeat(50));
    console.log(`Count: ${deliveredOrders.length} orders`);
    console.log(`Total Spent: ₹${deliveredTotal.toFixed(2)}`);
    console.log('─'.repeat(50));
    
    // Find or create partner profile
    let partner = await Partner.findOne({ userId: user._id });
    
    if (!partner) {
      console.log('\n⚠️ Partner profile not found, creating...');
      partner = await Partner.createDefaultPartner(
        user._id.toString(),
        user.profile?.firstName || user.auth.phoneNumber,
        user.email || user.auth.phoneNumber,
        user.profile?.avatar
      );
      console.log('✅ Partner profile created');
    } else {
      console.log('\n✅ Found partner profile');
    }
    
    console.log('\n📊 CURRENT PARTNER DATA:');
    console.log('─'.repeat(50));
    console.log(`Total Orders: ${partner.totalOrders}`);
    console.log(`Total Spent: ₹${partner.totalSpent}`);
    console.log('─'.repeat(50));
    
    // Sync with delivered orders
    const ordersDiff = deliveredOrders.length - partner.totalOrders;
    const spentDiff = deliveredTotal - partner.totalSpent;
    
    if (ordersDiff !== 0 || spentDiff !== 0) {
      console.log('\n🔄 SYNCING PARTNER DATA...');
      console.log('─'.repeat(50));
      console.log(`Orders: ${partner.totalOrders} → ${deliveredOrders.length} (${ordersDiff > 0 ? '+' : ''}${ordersDiff})`);
      console.log(`Spent: ₹${partner.totalSpent} → ₹${deliveredTotal.toFixed(2)} (${spentDiff > 0 ? '+' : ''}₹${spentDiff.toFixed(2)})`);
      console.log('─'.repeat(50));
      
      partner.totalOrders = deliveredOrders.length;
      partner.ordersThisLevel = deliveredOrders.length;
      partner.totalSpent = deliveredTotal;
      partner.lastActivityDate = new Date();
      
      // Update milestones
      let milestonesUpdated = 0;
      partner.milestones.forEach((milestone) => {
        if (partner.totalOrders >= milestone.orderCount && !milestone.achieved) {
          milestone.achieved = true;
          milestonesUpdated++;
          console.log(`✅ Unlocked milestone: ${milestone.orderCount} orders (${milestone.reward.title})`);
        }
      });
      
      // Update jackpots
      let jackpotsUpdated = 0;
      partner.jackpotProgress.forEach((jackpot) => {
        if (partner.totalSpent >= jackpot.spendAmount && !jackpot.achieved) {
          jackpot.achieved = true;
          jackpotsUpdated++;
          console.log(`✅ Unlocked jackpot: ₹${jackpot.spendAmount} (${jackpot.title})`);
        }
      });
      
      await partner.save();
      
      console.log('\n✅ SYNC COMPLETE!');
      console.log('─'.repeat(50));
      console.log(`Milestones unlocked: ${milestonesUpdated}`);
      console.log(`Jackpots unlocked: ${jackpotsUpdated}`);
      console.log('─'.repeat(50));
    } else {
      console.log('\n✅ Partner data is already in sync!');
    }
    
    console.log('\n📌 IMPORTANT NOTE:');
    console.log('─'.repeat(50));
    console.log('Only DELIVERED orders count towards partner progress.');
    console.log(`You currently have ${activeOrders.length} active orders in PREPARING status.`);
    console.log('Once these orders are delivered, your partner progress will update.');
    console.log('─'.repeat(50));
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
syncPartnerOrders();

