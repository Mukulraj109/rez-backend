const mongoose = require('mongoose');
require('dotenv').config();

async function fixStoreCategories() {
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME || 'test'
  });
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  try {
    console.log('\n🔍 Starting store category fix...\n');

    // Get all stores
    const storesCollection = db.collection('stores');
    const categoriesCollection = db.collection('categories');

    const stores = await storesCollection.find({}).toArray();
    console.log(`📦 Found ${stores.length} stores to check`);

    // Get all valid categories
    const categories = await categoriesCollection.find({}).toArray();
    console.log(`📂 Found ${categories.length} categories`);

    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name.toLowerCase()] = cat._id;
      if (cat.slug) {
        categoryMap[cat.slug.toLowerCase()] = cat._id;
      }
    });

    let fixedCount = 0;
    let invalidCount = 0;

    for (const store of stores) {
      let needsUpdate = false;
      let newCategoryId = null;

      // Check if category is a valid ObjectId
      if (!store.category) {
        console.log(`⚠️  Store "${store.name}" has no category`);
        invalidCount++;
        continue;
      }

      // Try to convert to ObjectId
      try {
        if (typeof store.category === 'string') {
          // Check if it's a valid ObjectId string
          if (/^[0-9a-fA-F]{24}$/.test(store.category)) {
            // It's a valid ObjectId string, convert it
            newCategoryId = new mongoose.Types.ObjectId(store.category);
            needsUpdate = true;
          } else {
            // It's a category name/slug, look it up
            const categoryKey = store.category.toLowerCase();
            if (categoryMap[categoryKey]) {
              newCategoryId = categoryMap[categoryKey];
              needsUpdate = true;
              console.log(`🔧 Fixing store "${store.name}": "${store.category}" → ${newCategoryId}`);
            } else {
              console.log(`❌ Store "${store.name}" has unknown category: "${store.category}"`);
              invalidCount++;

              // Set to a default category (Fashion if exists, or first category)
              const defaultCategory = categories.find(c => c.name === 'Fashion') || categories[0];
              if (defaultCategory) {
                newCategoryId = defaultCategory._id;
                needsUpdate = true;
                console.log(`   → Setting to default category: ${defaultCategory.name}`);
              }
            }
          }
        } else if (store.category._bsontype === 'ObjectId' || store.category instanceof mongoose.Types.ObjectId) {
          // Already a valid ObjectId, verify it exists
          const categoryExists = await categoriesCollection.findOne({ _id: store.category });
          if (!categoryExists) {
            console.log(`⚠️  Store "${store.name}" has invalid category reference: ${store.category}`);
            const defaultCategory = categories.find(c => c.name === 'Fashion') || categories[0];
            if (defaultCategory) {
              newCategoryId = defaultCategory._id;
              needsUpdate = true;
              console.log(`   → Setting to default category: ${defaultCategory.name}`);
            }
            invalidCount++;
          }
        }
      } catch (error) {
        console.log(`❌ Error processing store "${store.name}":`, error.message);
        invalidCount++;

        // Set to default category
        const defaultCategory = categories.find(c => c.name === 'Fashion') || categories[0];
        if (defaultCategory) {
          newCategoryId = defaultCategory._id;
          needsUpdate = true;
          console.log(`   → Setting to default category: ${defaultCategory.name}`);
        }
      }

      // Update the store if needed
      if (needsUpdate && newCategoryId) {
        await storesCollection.updateOne(
          { _id: store._id },
          { $set: { category: newCategoryId } }
        );
        fixedCount++;
      }
    }

    console.log('\n✅ Fix completed!');
    console.log(`📊 Fixed: ${fixedCount} stores`);
    console.log(`⚠️  Invalid/Missing: ${invalidCount} stores`);

  } catch (error) {
    console.error('❌ Error fixing store categories:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

fixStoreCategories();
