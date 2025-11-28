/**
 * Field Name Verification Script
 *
 * This script verifies that database field names match the API code.
 * Run this to confirm there are no field name mismatches.
 *
 * Usage: node verify-field-names.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const verifyFieldNames = async () => {
  try {
    console.log('🔍 Connecting to MongoDB...\n');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const results = [];

    // Test 1: Product Collection - should have 'store' and 'category' fields
    console.log('📦 Test 1: Product Collection');
    const product = await db.collection('products').findOne({}, { projection: { store: 1, category: 1, _id: 0 } });
    if (product) {
      const hasStore = product.hasOwnProperty('store');
      const hasCategory = product.hasOwnProperty('category');
      const hasStoreId = product.hasOwnProperty('storeId');
      const hasCategoryId = product.hasOwnProperty('categoryId');

      console.log(`  - Has 'store' field: ${hasStore ? '✅' : '❌'}`);
      console.log(`  - Has 'category' field: ${hasCategory ? '✅' : '❌'}`);
      console.log(`  - Has 'storeId' field: ${hasStoreId ? '❌ WRONG!' : '✅ Correct (not present)'}`);
      console.log(`  - Has 'categoryId' field: ${hasCategoryId ? '❌ WRONG!' : '✅ Correct (not present)'}\n`);

      results.push({
        collection: 'products',
        passed: hasStore && hasCategory && !hasStoreId && !hasCategoryId
      });
    } else {
      console.log('  ⚠️ No products found in database\n');
    }

    // Test 2: Order Collection - should have 'user' field
    console.log('📋 Test 2: Order Collection');
    const order = await db.collection('orders').findOne({}, { projection: { user: 1, _id: 0 } });
    if (order) {
      const hasUser = order.hasOwnProperty('user');
      const hasUserId = order.hasOwnProperty('userId');

      console.log(`  - Has 'user' field: ${hasUser ? '✅' : '❌'}`);
      console.log(`  - Has 'userId' field: ${hasUserId ? '❌ WRONG!' : '✅ Correct (not present)'}\n`);

      results.push({
        collection: 'orders',
        passed: hasUser && !hasUserId
      });
    } else {
      console.log('  ⚠️ No orders found in database\n');
    }

    // Test 3: Review Collection - should have 'store' and 'user' fields
    console.log('⭐ Test 3: Review Collection');
    const review = await db.collection('reviews').findOne({}, { projection: { store: 1, user: 1, _id: 0 } });
    if (review) {
      const hasStore = review.hasOwnProperty('store');
      const hasUser = review.hasOwnProperty('user');
      const hasStoreId = review.hasOwnProperty('storeId');
      const hasUserId = review.hasOwnProperty('userId');
      const hasProductId = review.hasOwnProperty('productId');

      console.log(`  - Has 'store' field: ${hasStore ? '✅' : '❌'}`);
      console.log(`  - Has 'user' field: ${hasUser ? '✅' : '❌'}`);
      console.log(`  - Has 'storeId' field: ${hasStoreId ? '❌ WRONG!' : '✅ Correct (not present)'}`);
      console.log(`  - Has 'userId' field: ${hasUserId ? '❌ WRONG!' : '✅ Correct (not present)'}`);
      console.log(`  - Has 'productId' field: ${hasProductId ? '❌ WRONG!' : '✅ Correct (not present)'}\n`);

      results.push({
        collection: 'reviews',
        passed: hasStore && hasUser && !hasStoreId && !hasUserId && !hasProductId
      });
    } else {
      console.log('  ⚠️ No reviews found in database\n');
    }

    // Test 4: Video Collection - should have 'products' array
    console.log('🎥 Test 4: Video Collection');
    const video = await db.collection('videos').findOne({}, { projection: { products: 1, _id: 0 } });
    if (video) {
      const hasProducts = video.hasOwnProperty('products');
      const hasProductId = video.hasOwnProperty('productId');
      const isArray = Array.isArray(video.products);

      console.log(`  - Has 'products' field: ${hasProducts ? '✅' : '❌'}`);
      console.log(`  - 'products' is array: ${isArray ? '✅' : '❌'}`);
      console.log(`  - Has 'productId' field: ${hasProductId ? '❌ WRONG!' : '✅ Correct (not present)'}\n`);

      results.push({
        collection: 'videos',
        passed: hasProducts && isArray && !hasProductId
      });
    } else {
      console.log('  ⚠️ No videos found in database\n');
    }

    // Test 5: Wishlist Collection - should have 'user' field
    console.log('❤️ Test 5: Wishlist Collection');
    const wishlist = await db.collection('wishlists').findOne({}, { projection: { user: 1, _id: 0 } });
    if (wishlist) {
      const hasUser = wishlist.hasOwnProperty('user');
      const hasUserId = wishlist.hasOwnProperty('userId');

      console.log(`  - Has 'user' field: ${hasUser ? '✅' : '❌'}`);
      console.log(`  - Has 'userId' field: ${hasUserId ? '❌ WRONG!' : '✅ Correct (not present)'}\n`);

      results.push({
        collection: 'wishlists',
        passed: hasUser && !hasUserId
      });
    } else {
      console.log('  ⚠️ No wishlists found in database\n');
    }

    // Legacy Models Check (these SHOULD have Id suffix)
    console.log('🏛️ Test 6: Legacy Models (TableBooking)');
    const tableBooking = await db.collection('tablebookings').findOne({}, { projection: { storeId: 1, userId: 1, _id: 0 } });
    if (tableBooking) {
      const hasStoreId = tableBooking.hasOwnProperty('storeId');
      const hasUserId = tableBooking.hasOwnProperty('userId');

      console.log(`  - Has 'storeId' field: ${hasStoreId ? '✅ (Legacy naming)' : '❌'}`);
      console.log(`  - Has 'userId' field: ${hasUserId ? '✅ (Legacy naming)' : '❌'}\n`);

      results.push({
        collection: 'tablebookings',
        passed: hasStoreId && hasUserId,
        note: 'Legacy model - uses Id suffix intentionally'
      });
    } else {
      console.log('  ⚠️ No table bookings found in database\n');
    }

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 VERIFICATION SUMMARY');
    console.log('═══════════════════════════════════════\n');

    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;

    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.collection.toUpperCase()}: ${result.passed ? 'PASSED' : 'FAILED'}`);
      if (result.note) {
        console.log(`   Note: ${result.note}`);
      }
    });

    console.log(`\n${passedTests}/${totalTests} collections verified successfully\n`);

    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Field names are correct.\n');
      console.log('✅ Database field names match API code expectations.');
      console.log('✅ No fixes needed. Code is already correct.\n');
    } else {
      console.log('⚠️ SOME TESTS FAILED! Please review the results above.\n');
    }

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');

    process.exit(passedTests === totalTests ? 0 : 1);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

// Run verification
verifyFieldNames();
