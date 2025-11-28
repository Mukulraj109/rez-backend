const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function checkStoreProducts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const storesCollection = mongoose.connection.db.collection('stores');
    const productsCollection = mongoose.connection.db.collection('products');

    // Get all stores
    const stores = await storesCollection.find().toArray();
    console.log(`📊 Total Stores: ${stores.length}\n`);

    // Check product count for each store
    console.log('🏪 STORE PRODUCT DISTRIBUTION:\n');

    const storesNeedingProducts = [];
    const storesWithProducts = [];

    for (const store of stores) {
      const productCount = await productsCollection.countDocuments({
        store: store._id.toString()
      });

      const status = productCount === 0 ? '❌' : productCount < 2 ? '⚠️ ' : '✅';
      console.log(`${status} ${store.name || store.storeName}: ${productCount} products`);

      if (productCount < 2) {
        storesNeedingProducts.push({
          id: store._id.toString(),
          name: store.name || store.storeName,
          currentCount: productCount,
          needed: 2 - productCount
        });
      } else {
        storesWithProducts.push({
          id: store._id.toString(),
          name: store.name || store.storeName,
          count: productCount
        });
      }
    }

    console.log(`\n📋 SUMMARY:`);
    console.log(`  ✅ Stores with 2+ products: ${storesWithProducts.length}`);
    console.log(`  ⚠️  Stores needing products: ${storesNeedingProducts.length}`);
    console.log(`  📦 Total products needed: ${storesNeedingProducts.reduce((sum, s) => sum + s.needed, 0)}\n`);

    if (storesNeedingProducts.length > 0) {
      console.log('🔧 STORES NEEDING PRODUCTS:\n');
      storesNeedingProducts.forEach((store, index) => {
        console.log(`${index + 1}. ${store.name} (${store.id})`);
        console.log(`   Current: ${store.currentCount} | Need: ${store.needed} more products\n`);
      });
    }

    await mongoose.connection.close();
    console.log('✅ Analysis complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkStoreProducts();
