/**
 * Check Bus Data in Database
 * Verifies bus services are properly seeded
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';

// Connect to database
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

// Check bus data
async function checkBusData() {
  try {
    // Use mongoose to query directly
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }), 'products');
    const ServiceCategory = mongoose.model('ServiceCategory', new mongoose.Schema({}, { strict: false }), 'servicecategories');
    
    // Find bus category
    const busCategory = await ServiceCategory.findOne({ slug: 'bus' });
    
    if (!busCategory) {
      console.log('❌ Bus category not found in database');
      console.log('💡 Run: npx ts-node src/scripts/seedTravelServices.ts');
      return;
    }
    
    console.log('\n📊 Bus Category Found:');
    console.log(`   Name: ${busCategory.name}`);
    console.log(`   Slug: ${busCategory.slug}`);
    console.log(`   Cashback: ${busCategory.cashbackPercentage}%`);
    console.log(`   Icon: ${busCategory.icon}`);
    
    // Find all bus services
    const busServices = await Product.find({
      $or: [
        { serviceCategory: busCategory._id },
        { 'serviceCategory.slug': 'bus' },
        { 'category.slug': 'bus' },
        { name: { $regex: /bus/i } }
      ],
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true }
    })
    .lean()
    .sort({ createdAt: -1 });
    
    console.log(`\n🚌 Bus Services Found: ${busServices.length}`);
    
    if (busServices.length === 0) {
      console.log('❌ No bus services found in database');
      console.log('💡 Run: npx ts-node src/scripts/seedTravelServices.ts');
      return;
    }
    
    console.log('\n📋 Bus Services List:');
    console.log('─'.repeat(80));
    
    busServices.forEach((bus, index) => {
      console.log(`\n${index + 1}. ${bus.name}`);
      console.log(`   ID: ${bus._id}`);
      console.log(`   Slug: ${bus.slug || 'N/A'}`);
      console.log(`   Price: ₹${bus.pricing?.selling || bus.price || 'N/A'}`);
      console.log(`   Original Price: ₹${bus.pricing?.original || bus.originalPrice || 'N/A'}`);
      console.log(`   Duration: ${bus.serviceDetails?.duration || 'N/A'} minutes`);
      console.log(`   Store: ${bus.store?.name || 'N/A'}`);
      console.log(`   Cashback: ${bus.cashback?.percentage || busCategory.cashbackPercentage || 0}%`);
      console.log(`   Images: ${bus.images?.length || 0} image(s)`);
      console.log(`   Active: ${bus.isActive ? 'Yes' : 'No'}`);
      console.log(`   Created: ${bus.createdAt ? new Date(bus.createdAt).toLocaleDateString() : 'N/A'}`);
    });
    
    console.log('\n' + '─'.repeat(80));
    console.log(`\n✅ Total Bus Services: ${busServices.length}`);
    
    // Check for required fields
    console.log('\n🔍 Data Validation:');
    const issues = [];
    
    busServices.forEach((bus, index) => {
      if (!bus.name) issues.push(`Bus ${index + 1}: Missing name`);
      if (!bus.pricing?.selling && !bus.price) issues.push(`Bus ${index + 1}: Missing price`);
      if (!bus.serviceDetails?.duration) issues.push(`Bus ${index + 1}: Missing duration`);
      if (!bus.images || bus.images.length === 0) issues.push(`Bus ${index + 1}: Missing images`);
      if (!bus.store) issues.push(`Bus ${index + 1}: Missing store`);
    });
    
    if (issues.length > 0) {
      console.log('⚠️  Issues found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('✅ All bus services have required fields');
    }
    
  } catch (error) {
    console.error('❌ Error checking bus data:', error.message);
    console.error(error.stack);
  }
}

// Main function
async function main() {
  try {
    await connectDB();
    await checkBusData();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run
main();
