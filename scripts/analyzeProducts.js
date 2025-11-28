require('dotenv').config();
const mongoose = require('mongoose');
const { Product } = require('../dist/models/Product');
const { Store } = require('../dist/models/Store');

async function analyzeProducts() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Fetch sample products
    const products = await Product.find().limit(5).lean();

    console.log('\n📦 PRODUCT STRUCTURE ANALYSIS\n');
    console.log('Total products in DB:', await Product.countDocuments());
    console.log('\nSample Product Structure:');
    if (products.length > 0) {
      console.log(JSON.stringify(products[0], null, 2));
    } else {
      console.log('No products found in database');
    }

    // Analyze required fields
    console.log('\n🔍 REQUIRED FIELDS ANALYSIS:\n');

    if (products.length > 0) {
      const sampleProduct = products[0];
      const fields = Object.keys(sampleProduct);

      console.log('Fields in Product Schema:');
      fields.forEach(field => {
        console.log(`  - ${field}: ${typeof sampleProduct[field]}`);
      });

      // Check store linking
      console.log('\n🔗 STORE LINKING:');
      if (sampleProduct.storeId) {
        console.log('  ✅ Products link to stores via: storeId');
      }
    }

    // Fetch all stores
    const stores = await Store.find().select('_id name category').lean();
    console.log(`\n🏪 STORES IN DATABASE: ${stores.length}`);
    console.log('\nAll stores:');
    stores.forEach((store, index) => {
      console.log(`  ${index + 1}. ${store.name} (ID: ${store._id}, Category: ${store.category || 'N/A'})`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Analysis complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

analyzeProducts();
