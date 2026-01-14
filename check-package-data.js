/**
 * Check Package Data in Database
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';

async function checkPackageData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }), 'products');
    const ServiceCategory = mongoose.model('ServiceCategory', new mongoose.Schema({}, { strict: false }), 'servicecategories');
    
    const pkgCategory = await ServiceCategory.findOne({ slug: 'packages' }).lean();
    
    if (!pkgCategory) {
      console.log('❌ Packages category not found');
      console.log('💡 Run: npx ts-node src/scripts/seedTravelServices.ts');
      await mongoose.disconnect();
      return;
    }
    
    console.log('📊 Packages Category Found:');
    console.log(`   Name: ${pkgCategory.name}`);
    console.log(`   Slug: ${pkgCategory.slug}`);
    console.log(`   Cashback: ${pkgCategory.cashbackPercentage}%`);
    
    const packages = await Product.find({
      $or: [
        { serviceCategory: pkgCategory._id },
        { 'serviceCategory.slug': 'packages' },
        { name: { $regex: /package/i } }
      ],
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true }
    }).lean();
    
    console.log(`\n🎒 Packages Found: ${packages.length}\n`);
    
    if (packages.length === 0) {
      console.log('❌ No packages found');
      console.log('💡 Run: npx ts-node src/scripts/seedTravelServices.ts');
    } else {
      packages.forEach((pkg, index) => {
        console.log(`${index + 1}. ${pkg.name}`);
        console.log(`   Price: ₹${pkg.pricing?.selling || pkg.price || 0}`);
        console.log(`   Original: ₹${pkg.pricing?.original || pkg.originalPrice || 'N/A'}`);
        console.log(`   Cashback: ${pkg.cashback?.percentage || pkgCategory.cashbackPercentage}%`);
        console.log('');
      });
    }
    
    await mongoose.disconnect();
    console.log('👋 Disconnected');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPackageData();
