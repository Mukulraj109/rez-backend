const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function testStoreAPI() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB');

    const Merchant = mongoose.model('Merchant', new mongoose.Schema({}, { strict: false }));
    const Store = mongoose.model('Store', new mongoose.Schema({}, { strict: false }));

    // Find merchant
    const merchantEmail = 'mukulraj756@gmail.com';
    const merchant = await Merchant.findOne({ email: merchantEmail.toLowerCase() });

    if (!merchant) {
      console.log(`❌ No merchant found with email: ${merchantEmail}`);
      await mongoose.disconnect();
      return;
    }

    console.log(`\n✅ Found merchant: ${merchant._id}`);

    // Generate a test token
    const merchantSecret = process.env.JWT_MERCHANT_SECRET || 'your-secret-key-min-32-chars-long-for-security';
    const testToken = jwt.sign(
      { merchantId: String(merchant._id) },
      merchantSecret,
      { expiresIn: '7d' }
    );

    console.log(`\n🔑 Test Token generated (first 20 chars): ${testToken.substring(0, 20)}...`);

    // Find stores for this merchant
    const merchantId = typeof merchant._id === 'string' 
      ? new mongoose.Types.ObjectId(merchant._id) 
      : merchant._id;
    
    const stores = await Store.find({ merchantId });
    
    console.log(`\n📊 Stores found: ${stores.length}`);
    stores.forEach((store, index) => {
      console.log(`   ${index + 1}. ${store.name} (ID: ${store._id})`);
      console.log(`      Active: ${store.isActive}`);
      console.log(`      MerchantId: ${store.merchantId}`);
    });

    console.log(`\n📋 To test the API, use this curl command:`);
    console.log(`curl -X GET "http://localhost:5000/api/merchant/stores" \\`);
    console.log(`  -H "Authorization: Bearer ${testToken}" \\`);
    console.log(`  -H "Content-Type: application/json"`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testStoreAPI();
