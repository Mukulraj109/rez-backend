const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

async function checkUnmatchedProducts() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DB_NAME);
    const productsCollection = db.collection('products');

    // Get products without categorySlug (unmatched)
    const unmatchedProducts = await productsCollection.find({
      $or: [
        { categorySlug: { $exists: false } },
        { categorySlug: null },
        { categorySlug: '' }
      ]
    }).toArray();

    console.log(`📦 UNMATCHED PRODUCTS: ${unmatchedProducts.length}\n`);
    console.log('Sample unmatched products:');
    console.log('='.repeat(60));

    // Group by first word or pattern
    const patterns = {};

    unmatchedProducts.forEach(product => {
      const name = product.name || product.title || 'Unknown';
      console.log(`  - ${name}`);

      // Extract potential keywords
      const words = name.toLowerCase().split(' ');
      words.forEach(word => {
        if (word.length > 3) {
          patterns[word] = (patterns[word] || 0) + 1;
        }
      });
    });

    console.log('\n📊 COMMON WORDS IN UNMATCHED PRODUCTS:');
    console.log('='.repeat(60));
    Object.entries(patterns)
      .filter(([word, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .forEach(([word, count]) => {
        console.log(`  ${word}: ${count}`);
      });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkUnmatchedProducts();
