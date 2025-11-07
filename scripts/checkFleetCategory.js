const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

// Schemas
const CategorySchema = new mongoose.Schema({}, { strict: false });
const ProductSchema = new mongoose.Schema({}, { strict: false });
const StoreSchema = new mongoose.Schema({}, { strict: false });

const Category = mongoose.model('Category', CategorySchema);
const Product = mongoose.model('Product', ProductSchema);
const Store = mongoose.model('Store', StoreSchema);

(async function checkFleetCategory() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(`${MONGODB_URI}/${DB_NAME}`);
    console.log('✅ Connected to MongoDB\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 CHECKING FLEET CATEGORY & DATA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check if fleet category exists
    const fleetCategory = await Category.findOne({ slug: 'fleet' });
    
    if (fleetCategory) {
      console.log('✅ Fleet category exists:');
      console.log(`   Name: ${fleetCategory.name}`);
      console.log(`   Slug: ${fleetCategory.slug}`);
      console.log(`   ID: ${fleetCategory._id}`);
      console.log(`   Product Count: ${fleetCategory.productCount || 0}\n`);

      // Check fleet products
      const fleetProducts = await Product.find({ category: fleetCategory._id });
      console.log(`📦 Fleet Products: ${fleetProducts.length}`);
      
      if (fleetProducts.length > 0) {
        console.log('\n   Products:');
        fleetProducts.slice(0, 5).forEach((p, i) => {
          console.log(`   ${i + 1}. ${p.name} - ₹${p.pricing?.selling || p.pricing?.basePrice || 0}`);
        });
      } else {
        console.log('   ⚠️ No fleet products found!\n');
      }
    } else {
      console.log('❌ Fleet category does NOT exist!\n');
      console.log('📋 Available categories:');
      const allCategories = await Category.find({}).limit(10);
      allCategories.forEach((cat, i) => {
        console.log(`   ${i + 1}. ${cat.name} (${cat.slug})`);
      });
    }

    // Check fleet stores
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏪 CHECKING FLEET STORES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const fleetStores = await Store.find({
      $or: [
        { tags: { $in: ['fleet', 'car', 'vehicle', 'rental', 'automobile'] } },
        { name: { $regex: /fleet|car|rental|vehicle|automobile/i } }
      ],
      isActive: true
    });

    console.log(`📦 Fleet Stores: ${fleetStores.length}`);
    
    if (fleetStores.length > 0) {
      fleetStores.forEach((store, i) => {
        console.log(`   ${i + 1}. ${store.name} - Featured: ${store.isFeatured}`);
      });
    } else {
      console.log('   ⚠️ No fleet stores found!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
})();

