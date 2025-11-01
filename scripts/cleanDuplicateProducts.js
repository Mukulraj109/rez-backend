const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function cleanDuplicateProducts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const productsCollection = mongoose.connection.db.collection('products');

    // Find products with ₹0 price or missing essential fields
    const invalidProducts = await productsCollection.find({
      $or: [
        { 'price.current': { $exists: false } },
        { 'price.current': 0 },
        { image: { $exists: false } },
        { image: null },
        { image: '' }
      ]
    }).toArray();

    console.log(`🔍 Found ${invalidProducts.length} products with missing/invalid data:\n`);

    if (invalidProducts.length === 0) {
      console.log('✅ No invalid products found!');
      await mongoose.connection.close();
      return;
    }

    // Show what will be deleted
    invalidProducts.forEach(product => {
      console.log(`❌ ${product.name || product.title}`);
      console.log(`   Price: ${product.price?.current || 0}`);
      console.log(`   Image: ${product.image ? 'Yes' : 'No'}`);
      console.log(`   Store: ${product.store}`);
      console.log('');
    });

    // Delete these products
    const result = await productsCollection.deleteMany({
      _id: { $in: invalidProducts.map(p => p._id) }
    });

    console.log(`\n🗑️  Deleted ${result.deletedCount} invalid products\n`);

    // Verify cleanup
    const remainingInvalid = await productsCollection.countDocuments({
      $or: [
        { 'price.current': { $exists: false } },
        { 'price.current': 0 },
        { image: { $exists: false } },
        { image: null },
        { image: '' }
      ]
    });

    console.log(`Remaining invalid products: ${remainingInvalid}`);

    if (remainingInvalid === 0) {
      console.log('✅ All invalid products cleaned up!');
    }

    // Show final count per store
    console.log('\n📊 Products per store after cleanup:\n');
    const storesCollection = mongoose.connection.db.collection('stores');
    const stores = await storesCollection.find().toArray();

    for (const store of stores) {
      const count = await productsCollection.countDocuments({ store: store._id });
      if (count > 0) {
        console.log(`${store.name}: ${count} products`);
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Cleanup complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

cleanDuplicateProducts();
