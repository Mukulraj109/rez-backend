const { MongoClient } = require('mongodb');

// MongoDB connection details
const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

async function fixDeliveryCategories() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔌 Connecting to MongoDB...\n');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    const db = client.db(DB_NAME);
    const storesCollection = db.collection('stores');

    console.log('🔧 FIXING DELIVERY CATEGORIES FOR ALL STORES\n');
    console.log('═'.repeat(80));

    // Define updates for each store based on their characteristics
    const updates = [
      {
        slug: 'techmart-electronics',
        name: 'TechMart Electronics',
        categories: {
          premium: true,           // High-end electronics
          alliance: true,          // Partner store
        }
      },
      {
        slug: 'fashion-hub',
        name: 'Fashion Hub',
        categories: {
          premium: true,           // Fashion store
          alliance: true,          // Platinum partner
        }
      },
      {
        slug: 'foodie-paradise',
        name: 'Foodie Paradise',
        categories: {
          fastDelivery: true,      // 20-30 mins delivery
          organic: true,           // Organic produce mentioned
          budgetFriendly: true,    // Low minimum order (₹300)
        }
      },
      {
        slug: 'bookworld',
        name: 'BookWorld',
        categories: {
          budgetFriendly: true,    // ₹400 minimum order
          lowestPrice: true,       // Books typically competitive pricing
        }
      },
      {
        slug: 'sports-central',
        name: 'Sports Central',
        categories: {
          premium: true,           // Sports equipment, higher prices
        }
      },
      {
        slug: 'shopping-mall',
        name: 'Shopping Mall',
        categories: {
          mall: true,              // It's a mall!
          premium: true,           // Phoenix MarketCity
          alliance: true,          // Partner store
        }
      },
      {
        slug: 'entertainment-hub',
        name: 'Entertainment Hub',
        categories: {
          mall: true,              // Select Citywalk
          premium: true,           // Entertainment venue
        }
      },
      {
        slug: 'travel-express',
        name: 'Travel Express',
        categories: {
          premium: true,           // Travel services
          alliance: true,          // Platinum partner
        }
      }
    ];

    let successCount = 0;
    let failCount = 0;

    for (const update of updates) {
      try {
        // Build the update object
        const updateFields = {};
        Object.keys(update.categories).forEach(category => {
          updateFields[`deliveryCategories.${category}`] = update.categories[category];
        });

        const result = await storesCollection.updateOne(
          { slug: update.slug },
          { $set: updateFields }
        );

        if (result.modifiedCount > 0) {
          console.log(`✅ ${update.name.padEnd(25)} - Updated: ${Object.keys(update.categories).join(', ')}`);
          successCount++;
        } else {
          console.log(`⚠️  ${update.name.padEnd(25)} - No changes (store not found or already updated)`);
        }
      } catch (error) {
        console.log(`❌ ${update.name.padEnd(25)} - Failed: ${error.message}`);
        failCount++;
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log(`\n📊 Summary: ${successCount} successful, ${failCount} failed\n`);

    // Verify the updates
    console.log('═'.repeat(80));
    console.log('🔍 VERIFYING UPDATES\n');

    const allStores = await storesCollection.find({}).toArray();

    // Count stores by category
    const categoryCounts = {
      fastDelivery: 0,
      budgetFriendly: 0,
      premium: 0,
      organic: 0,
      alliance: 0,
      lowestPrice: 0,
      mall: 0,
      cashStore: 0
    };

    allStores.forEach(store => {
      Object.keys(categoryCounts).forEach(category => {
        if (store.deliveryCategories && store.deliveryCategories[category] === true) {
          categoryCounts[category]++;
        }
      });
    });

    console.log('Updated Category Distribution:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      const percentage = ((count / allStores.length) * 100).toFixed(1);
      console.log(`  • ${category.padEnd(20)}: ${count} stores (${percentage}%)`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log('✅ Delivery categories update complete!\n');

  } catch (error) {
    console.error('❌ Error fixing delivery categories:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the fix
fixDeliveryCategories()
  .then(() => {
    console.log('✅ All done! You can now filter stores by delivery categories in your app.\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
