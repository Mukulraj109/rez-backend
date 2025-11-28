const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function fixProductStoreIds() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const productsCollection = mongoose.connection.db.collection('products');

    // Find all products where store is a string
    const productsWithStringStoreId = await productsCollection.find({
      store: { $type: 'string' }
    }).toArray();

    console.log(`🔧 Found ${productsWithStringStoreId.length} products with string store IDs\n`);

    if (productsWithStringStoreId.length === 0) {
      console.log('✅ All products already have ObjectId store references!');
      await mongoose.connection.close();
      return;
    }

    console.log('🔄 Converting store IDs from string to ObjectId...\n');

    let updated = 0;
    for (const product of productsWithStringStoreId) {
      try {
        // Convert string to ObjectId
        const storeObjectId = new ObjectId(product.store);

        await productsCollection.updateOne(
          { _id: product._id },
          { $set: { store: storeObjectId } }
        );

        updated++;
        console.log(`✅ Updated: ${product.name} (${product.store} → ObjectId)`);
      } catch (error) {
        console.error(`❌ Failed to update ${product.name}:`, error.message);
      }
    }

    console.log(`\n🎉 Successfully updated ${updated} products!\n`);

    // Verify the fix
    console.log('🔍 Verifying fix...\n');
    const remainingStringIds = await productsCollection.countDocuments({
      store: { $type: 'string' }
    });

    console.log(`Remaining products with string store IDs: ${remainingStringIds}`);

    if (remainingStringIds === 0) {
      console.log('✅ All products now have ObjectId store references!');
    }

    await mongoose.connection.close();
    console.log('\n✅ Fix complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixProductStoreIds();
