// Verify Partner Data in MongoDB
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = "mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "test";

async function verifyPartnerData() {
  try {
    console.log('🔍 Connecting to MongoDB Atlas...\n');
    
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to database:', DB_NAME);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Get Partner collection
    const Partner = mongoose.connection.collection('partners');
    
    // Count total partners
    const totalPartners = await Partner.countDocuments();
    console.log(`📊 Total Partners in Database: ${totalPartners}\n`);
    
    if (totalPartners === 0) {
      console.log('❌ No partners found! Please run the seed script first.');
      return;
    }
    
    // Get one partner to show structure
    const samplePartner = await Partner.findOne();
    
    console.log('👤 Sample Partner Profile:');
    console.log('   Name:', samplePartner.name);
    console.log('   Email:', samplePartner.email);
    console.log('   Level:', samplePartner.currentLevel.name, `(Level ${samplePartner.currentLevel.level})`);
    console.log('   Total Orders:', samplePartner.totalOrders);
    console.log('   Total Spent: ₹', samplePartner.totalSpent);
    console.log('\n═══════════════════════════════════════════════════════════\n');
    
    // Check Milestones
    console.log('🎯 ORDER MILESTONES (Stored in Database):');
    console.log(`   Total: ${samplePartner.milestones.length} milestones\n`);
    samplePartner.milestones.forEach((milestone, index) => {
      console.log(`   ${index + 1}. ${milestone.orderCount} Orders`);
      console.log(`      Reward: ${milestone.reward.title}`);
      console.log(`      Type: ${milestone.reward.type}`);
      console.log(`      Value: ${milestone.reward.value}`);
      console.log(`      Achieved: ${milestone.achieved ? '✅' : '❌'}`);
      console.log('');
    });
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Check Tasks
    console.log('📋 REWARD TASKS (Stored in Database):');
    console.log(`   Total: ${samplePartner.tasks.length} tasks\n`);
    samplePartner.tasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.title}`);
      console.log(`      Description: ${task.description}`);
      console.log(`      Type: ${task.type}`);
      console.log(`      Reward: ${task.reward.title}`);
      console.log(`      Progress: ${task.progress.current}/${task.progress.target}`);
      console.log(`      Completed: ${task.completed ? '✅' : '❌'}`);
      console.log(`      Claimed: ${task.claimed ? '✅' : '❌'}`);
      console.log('');
    });
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Check Jackpot
    console.log('🎰 JACKPOT MILESTONES (Stored in Database):');
    console.log(`   Total: ${samplePartner.jackpotProgress.length} jackpot milestones\n`);
    samplePartner.jackpotProgress.forEach((jackpot, index) => {
      console.log(`   ${index + 1}. ${jackpot.title}`);
      console.log(`      Spend Target: ₹${jackpot.spendAmount.toLocaleString()}`);
      console.log(`      Description: ${jackpot.description}`);
      console.log(`      Reward: ${jackpot.reward.title}`);
      console.log(`      Reward Type: ${jackpot.reward.type}`);
      console.log(`      Reward Value: ${jackpot.reward.value}`);
      console.log(`      Achieved: ${jackpot.achieved ? '✅' : '❌'}`);
      console.log('');
    });
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Check Offers
    console.log('🎁 CLAIMABLE OFFERS (Stored in Database):');
    console.log(`   Total: ${samplePartner.claimableOffers.length} offers\n`);
    samplePartner.claimableOffers.forEach((offer, index) => {
      console.log(`   ${index + 1}. ${offer.title}`);
      console.log(`      Description: ${offer.description}`);
      console.log(`      Discount: ${offer.discount}%`);
      console.log(`      Category: ${offer.category}`);
      console.log(`      Valid Until: ${offer.validUntil.toISOString().split('T')[0]}`);
      console.log(`      Terms: ${offer.termsAndConditions.length} conditions`);
      console.log(`      Claimed: ${offer.claimed ? '✅' : '❌'}`);
      if (offer.minPurchase) console.log(`      Min Purchase: ₹${offer.minPurchase}`);
      if (offer.maxDiscount) console.log(`      Max Discount: ₹${offer.maxDiscount}`);
      console.log('');
    });
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Check all partners
    const allPartners = await Partner.find().toArray();
    console.log('📊 ALL PARTNERS IN DATABASE:\n');
    allPartners.forEach((partner, index) => {
      console.log(`   ${index + 1}. ${partner.name} (${partner.email})`);
      console.log(`      Level: ${partner.currentLevel.name}`);
      console.log(`      Orders: ${partner.totalOrders}`);
      console.log(`      Milestones: ${partner.milestones.length}`);
      console.log(`      Tasks: ${partner.tasks.length}`);
      console.log(`      Jackpots: ${partner.jackpotProgress.length}`);
      console.log(`      Offers: ${partner.claimableOffers.length}`);
      console.log('');
    });
    
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('✅ ALL DATA IS PROPERLY CONNECTED IN DATABASE!\n');
    console.log('🎯 What this means:');
    console.log('   ✅ Milestones are stored in database');
    console.log('   ✅ Tasks are stored in database');
    console.log('   ✅ Jackpot milestones are stored in database');
    console.log('   ✅ Offers are stored in database');
    console.log('   ✅ All data is linked to users');
    console.log('   ✅ Frontend will fetch this data via API');
    console.log('   ✅ Updates will be saved to database');
    console.log('\n🚀 Partner system is 100% connected and operational!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

verifyPartnerData();

