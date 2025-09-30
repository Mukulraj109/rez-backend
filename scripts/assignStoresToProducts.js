const mongoose = require('mongoose');
const { Product } = require('../dist/models/Product');
const { Store } = require('../dist/models/Store');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      dbName: process.env.DB_NAME || 'test'
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const assignStoresToProducts = async () => {
  try {
    // Get all stores
    console.log('🏪 Getting all stores...');
    const stores = await Store.find({ isActive: true });
    console.log(`📦 Found ${stores.length} active stores`);

    const storeMap = {};
    stores.forEach(store => {
      console.log(`  - ${store.name} (${store._id})`);
      storeMap[store.name] = store._id;
    });

    // Get all products without stores
    console.log('📦 Finding products without stores...');
    const products = await Product.find({ store: null });
    console.log(`📦 Found ${products.length} products without stores`);

    // Store assignment mapping based on categories
    const storeAssignments = {
      'Electronics': storeMap['TechHub'] || storeMap['Premium Restaurant'], // Fallback
      'Fashion': storeMap['FashionForward'] || storeMap['Premium Restaurant'],
      'Books': storeMap['BookWorld'],
      'Home & Kitchen': storeMap['HomeEssentials'] || storeMap['Premium Restaurant'],
      'Sports': storeMap['FitnessZone'] || storeMap['Premium Restaurant']
    };

    console.log('🔄 Store assignment mapping:');
    Object.keys(storeAssignments).forEach(category => {
      console.log(`  ${category} -> ${storeAssignments[category]}`);
    });

    let updatedCount = 0;

    for (const product of products) {
      // Get category name
      let categoryName = 'General';
      if (product.category) {
        if (typeof product.category === 'string') {
          categoryName = product.category;
        } else {
          // It's an ObjectId, need to populate
          await product.populate('category');
          categoryName = product.category.name;
        }
      }

      console.log(`🔄 Processing product: ${product.title} (Category: ${categoryName})`);

      // Assign store based on category
      let assignedStoreId = storeAssignments[categoryName];

      // Default fallback to first available store
      if (!assignedStoreId) {
        assignedStoreId = stores[0]._id;
        console.log(`⚠️  No specific store for ${categoryName}, using default: ${stores[0].name}`);
      }

      // Update product
      await Product.updateOne(
        { _id: product._id },
        { store: assignedStoreId }
      );

      console.log(`✅ Assigned ${product.title} to store ID: ${assignedStoreId}`);
      updatedCount++;
    }

    console.log(`🎉 Successfully assigned stores to ${updatedCount} products!`);

  } catch (error) {
    console.error('❌ Error assigning stores to products:', error);
    throw error;
  }
};

// Run the assignment
const run = async () => {
  await connectDB();
  await assignStoresToProducts();

  console.log('🎉 Store assignment completed!');
  process.exit(0);
};

run().catch(error => {
  console.error('💥 Assignment failed:', error);
  process.exit(1);
});