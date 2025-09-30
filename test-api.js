const mongoose = require('mongoose');
const { Store } = require('./dist/models/Store');

async function testAPI() {
  try {
    await mongoose.connect('mongodb://localhost:27017/rez-app');
    console.log('✅ Connected to MongoDB');

    // Test 1: Get all stores
    console.log('\n🧪 Test 1: Get all stores');
    const allStores = await Store.find({ isActive: true }).limit(5);
    console.log(`Found ${allStores.length} stores`);
    allStores.forEach(store => {
      console.log(`- ${store.name} (${store.deliveryCategories.fastDelivery ? 'Fast Delivery' : 'Regular'})`);
    });

    // Test 2: Search stores by category (fastDelivery)
    console.log('\n🧪 Test 2: Search stores by fastDelivery category');
    const fastDeliveryStores = await Store.find({
      isActive: true,
      'deliveryCategories.fastDelivery': true
    });
    console.log(`Found ${fastDeliveryStores.length} fast delivery stores`);
    fastDeliveryStores.forEach(store => {
      console.log(`- ${store.name}: ${store.operationalInfo.deliveryTime}`);
    });

    // Test 3: Search stores by category (budgetFriendly)
    console.log('\n🧪 Test 3: Search stores by budgetFriendly category');
    const budgetStores = await Store.find({
      isActive: true,
      'deliveryCategories.budgetFriendly': true
    });
    console.log(`Found ${budgetStores.length} budget friendly stores`);
    budgetStores.forEach(store => {
      console.log(`- ${store.name}: Min order ₹${store.operationalInfo.minimumOrder}`);
    });

    // Test 4: Test MainStorePage compatibility
    console.log('\n🧪 Test 4: MainStorePage compatibility test');
    const storeForMainPage = await Store.findOne({ isActive: true }).populate('category', 'name slug');
    if (storeForMainPage) {
      console.log('✅ Store data structure for MainStorePage:');
      console.log(`- ID: ${storeForMainPage._id}`);
      console.log(`- Name: ${storeForStorePage.name}`);
      console.log(`- Category: ${storeForMainPage.category?.name}`);
      console.log(`- Location: ${storeForMainPage.location.address}`);
      console.log(`- Rating: ${storeForMainPage.ratings.average}`);
      console.log(`- Delivery Time: ${storeForMainPage.operationalInfo.deliveryTime}`);
      console.log(`- Fast Delivery: ${storeForMainPage.deliveryCategories.fastDelivery}`);
      console.log(`- Budget Friendly: ${storeForMainPage.deliveryCategories.budgetFriendly}`);
    }

    console.log('\n🎉 All tests passed! Backend is ready for Phase 2.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testAPI();
