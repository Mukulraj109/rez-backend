// Script to check Social Media Posts and their Store linkage
// Run: node scripts/checkSocialMediaPosts.js

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function checkSocialMediaPosts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // 1. Check all Social Media Posts
    console.log('========================================');
    console.log('📱 SOCIAL MEDIA POSTS');
    console.log('========================================');

    const posts = await db.collection('socialmediaposts').find({}).toArray();
    console.log(`Total posts: ${posts.length}\n`);

    if (posts.length === 0) {
      console.log('No social media posts found in database.\n');
    } else {
      posts.forEach((post, index) => {
        console.log(`--- Post ${index + 1} ---`);
        console.log(`  ID: ${post._id}`);
        console.log(`  User: ${post.user}`);
        console.log(`  Order: ${post.order || 'NOT SET'}`);
        console.log(`  Store: ${post.store || 'NOT SET ⚠️'}`);
        console.log(`  Merchant: ${post.merchant || 'NOT SET'}`);
        console.log(`  Platform: ${post.platform}`);
        console.log(`  Status: ${post.status}`);
        console.log(`  Post URL: ${post.postUrl}`);
        console.log(`  Cashback: ₹${post.cashbackAmount}`);
        console.log(`  Submitted: ${post.submittedAt}`);
        console.log('');
      });
    }

    // 2. Check Stores and their merchantId
    console.log('========================================');
    console.log('🏪 STORES (with merchantId)');
    console.log('========================================');

    const stores = await db.collection('stores').find({}).project({
      _id: 1,
      name: 1,
      merchantId: 1,
      isActive: 1
    }).toArray();

    console.log(`Total stores: ${stores.length}\n`);

    stores.forEach((store, index) => {
      console.log(`${index + 1}. ${store.name}`);
      console.log(`   ID: ${store._id}`);
      console.log(`   MerchantId: ${store.merchantId || 'NOT SET ⚠️'}`);
      console.log(`   Active: ${store.isActive}`);
      console.log('');
    });

    // 3. Check Orders to see if they have store in items
    console.log('========================================');
    console.log('📦 RECENT ORDERS (checking items.store)');
    console.log('========================================');

    const orders = await db.collection('orders').find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .project({
        _id: 1,
        orderNumber: 1,
        user: 1,
        status: 1,
        'items.store': 1,
        'items.name': 1,
        createdAt: 1
      })
      .toArray();

    console.log(`Showing last ${orders.length} orders:\n`);

    orders.forEach((order, index) => {
      console.log(`${index + 1}. Order: ${order.orderNumber}`);
      console.log(`   ID: ${order._id}`);
      console.log(`   User: ${order.user}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Items:`);
      order.items?.forEach((item, i) => {
        console.log(`     - ${item.name || 'Unknown'}`);
        console.log(`       Store: ${item.store || 'NOT SET ⚠️'}`);
      });
      console.log('');
    });

    // 4. Summary
    console.log('========================================');
    console.log('📊 SUMMARY');
    console.log('========================================');

    const postsWithStore = posts.filter(p => p.store).length;
    const postsWithoutStore = posts.filter(p => !p.store).length;
    const storesWithMerchant = stores.filter(s => s.merchantId).length;

    console.log(`Posts with store field: ${postsWithStore}`);
    console.log(`Posts WITHOUT store field: ${postsWithoutStore} ${postsWithoutStore > 0 ? '⚠️ NEEDS FIX' : '✅'}`);
    console.log(`Stores with merchantId: ${storesWithMerchant}/${stores.length}`);

    if (postsWithoutStore > 0) {
      console.log('\n⚠️ Some posts are missing the store field!');
      console.log('These posts will NOT appear in merchant app until fixed.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkSocialMediaPosts();
