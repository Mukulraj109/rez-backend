import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

async function fixSortOrder() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('Connected to MongoDB\n');

    const Category = mongoose.connection.collection('categories');

    // Update our homepage categories to have negative sortOrder so they appear first
    const updates = [
      { slug: 'beauty-fashion', sortOrder: -5 },
      { slug: 'cosmetics', sortOrder: -4 },
      { slug: 'electronics', sortOrder: -3 },
      { slug: 'rentals', sortOrder: -2 },
      { slug: 'travel', sortOrder: -1 }
    ];

    for (const u of updates) {
      const result = await Category.updateOne(
        { slug: u.slug },
        { $set: { sortOrder: u.sortOrder } }
      );
      console.log(`${u.slug}: sortOrder -> ${u.sortOrder} (matched: ${result.matchedCount})`);
    }

    // Verify
    console.log('\nVerifying...');
    for (const u of updates) {
      const cat = await Category.findOne({ slug: u.slug });
      if (cat) {
        console.log(`${u.slug}: sortOrder = ${cat.sortOrder}`);
      }
    }

    console.log('\nDone!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixSortOrder();
