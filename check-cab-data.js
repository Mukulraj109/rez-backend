/**
 * Script to check cab service data in database
 */

const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';

async function checkCabData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get Product model (using flexible schema)
    const ProductSchema = new mongoose.Schema({}, { strict: false });
    const Product = mongoose.model('Product', ProductSchema);

    // Find cab services
    const cabServices = await Product.find({
      $or: [
        { 'serviceCategory.slug': 'cab' },
        { 'category.slug': 'cab' },
        { name: { $regex: /cab|taxi/i } }
      ]
    })
    .populate('serviceCategory', 'name slug')
    .populate('category', 'name slug')
    .populate('store', 'name slug')
    .lean();

    console.log(`📊 Found ${cabServices.length} cab service(s) in database\n`);

    if (cabServices.length === 0) {
      console.log('⚠️  No cab services found. The database might need to be seeded.');
      console.log('   Run: npm run seed:travel-services');
      await mongoose.disconnect();
      return;
    }

    // Display each cab service
    cabServices.forEach((service, index) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🚕 CAB SERVICE #${index + 1}`);
      console.log('='.repeat(80));
      
      console.log('\n📋 BASIC INFO:');
      console.log(`   Name: ${service.name}`);
      console.log(`   Slug: ${service.slug}`);
      console.log(`   ID: ${service._id}`);
      console.log(`   Product Type: ${service.productType || 'N/A'}`);
      
      console.log('\n💰 PRICING:');
      if (service.pricing) {
        console.log(`   Selling Price: ₹${service.pricing.selling || 'N/A'}`);
        console.log(`   Original Price: ₹${service.pricing.original || 'N/A'}`);
        console.log(`   Discount: ${service.pricing.discount || 0}%`);
        console.log(`   Currency: ${service.pricing.currency || 'INR'}`);
      } else if (service.price) {
        console.log(`   Price: ₹${service.price}`);
        console.log(`   Original Price: ₹${service.originalPrice || 'N/A'}`);
      } else {
        console.log('   ⚠️  No pricing data found');
      }
      
      console.log('\n⏱️  SERVICE DETAILS:');
      if (service.serviceDetails) {
        console.log(`   Duration: ${service.serviceDetails.duration || 'N/A'} minutes`);
        console.log(`   Service Type: ${service.serviceDetails.serviceType || 'N/A'}`);
        console.log(`   Max Bookings Per Slot: ${service.serviceDetails.maxBookingsPerSlot || 'N/A'}`);
        console.log(`   Requires Address: ${service.serviceDetails.requiresAddress || false}`);
        console.log(`   Requires Payment Upfront: ${service.serviceDetails.requiresPaymentUpfront || false}`);
        if (service.serviceDetails.serviceArea) {
          console.log(`   Service Area Radius: ${service.serviceDetails.serviceArea.radius || 'N/A'} km`);
        }
        if (service.serviceDetails.distance) {
          console.log(`   Distance: ${service.serviceDetails.distance} km`);
        } else {
          console.log('   ⚠️  No distance field in serviceDetails');
        }
      } else {
        console.log('   ⚠️  No serviceDetails found');
      }
      
      console.log('\n🏪 STORE INFO:');
      if (service.store) {
        if (typeof service.store === 'object') {
          console.log(`   Store Name: ${service.store.name || 'N/A'}`);
          console.log(`   Store Slug: ${service.store.slug || 'N/A'}`);
        } else {
          console.log(`   Store ID: ${service.store}`);
        }
      } else {
        console.log('   ⚠️  No store data');
      }
      
      console.log('\n📂 CATEGORY INFO:');
      if (service.serviceCategory) {
        if (typeof service.serviceCategory === 'object') {
          console.log(`   Service Category: ${service.serviceCategory.name || 'N/A'} (${service.serviceCategory.slug || 'N/A'})`);
        } else {
          console.log(`   Service Category ID: ${service.serviceCategory}`);
        }
      }
      if (service.category) {
        if (typeof service.category === 'object') {
          console.log(`   Category: ${service.category.name || 'N/A'} (${service.category.slug || 'N/A'})`);
        } else {
          console.log(`   Category ID: ${service.category}`);
        }
      }
      
      console.log('\n💵 CASHBACK:');
      if (service.cashback) {
        if (typeof service.cashback === 'object') {
          console.log(`   Percentage: ${service.cashback.percentage || 'N/A'}%`);
          console.log(`   Max Amount: ₹${service.cashback.maxAmount || 'N/A'}`);
        } else {
          console.log(`   Cashback: ${service.cashback}%`);
        }
      } else {
        console.log('   ⚠️  No cashback data');
      }
      
      console.log('\n📸 IMAGES:');
      if (service.images && service.images.length > 0) {
        console.log(`   Count: ${service.images.length}`);
        service.images.slice(0, 3).forEach((img, i) => {
          console.log(`   [${i + 1}] ${img}`);
        });
        if (service.images.length > 3) {
          console.log(`   ... and ${service.images.length - 3} more`);
        }
      } else {
        console.log('   ⚠️  No images found');
      }
      
      console.log('\n📝 DESCRIPTION:');
      console.log(`   ${service.description || service.shortDescription || 'N/A'}`);
      
      console.log('\n🏷️  TAGS:');
      if (service.tags && service.tags.length > 0) {
        console.log(`   ${service.tags.join(', ')}`);
      } else {
        console.log('   No tags');
      }
      
      console.log('\n📊 RATINGS:');
      if (service.ratings) {
        console.log(`   Average: ${service.ratings.average || 'N/A'}`);
        console.log(`   Count: ${service.ratings.count || 'N/A'}`);
      } else {
        console.log('   ⚠️  No ratings data');
      }
      
      console.log('\n🔍 FULL DATA STRUCTURE:');
      console.log(JSON.stringify(service, null, 2));
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCabData();
