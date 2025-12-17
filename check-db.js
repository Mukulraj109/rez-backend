/**
 * Database Check Script
 * Run: node check-db.js
 *
 * This script checks the existing data in your MongoDB database
 * to see if categories are properly set up for Cash Store filtering.
 */

const mongoose = require('mongoose');

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

async function checkDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // List all collections
    console.log('📁 Collections in database:');
    console.log('=' .repeat(50));
    const collections = await db.listCollections().toArray();
    collections.forEach(col => console.log(`  - ${col.name}`));
    console.log('\n');

    // Check Offers collection
    console.log('🏷️  OFFERS Collection:');
    console.log('=' .repeat(50));
    const offersCollection = db.collection('offers');
    const offersCount = await offersCollection.countDocuments();
    console.log(`  Total offers: ${offersCount}`);

    if (offersCount > 0) {
      // Get unique categories
      const categories = await offersCollection.distinct('category');
      console.log(`  Unique categories: ${categories.length}`);
      console.log(`  Categories: ${categories.join(', ') || 'None'}`);

      // Sample offer
      const sampleOffer = await offersCollection.findOne();
      console.log('\n  Sample offer structure:');
      console.log(`    - _id: ${sampleOffer._id}`);
      console.log(`    - title: ${sampleOffer.title || 'N/A'}`);
      console.log(`    - category: ${sampleOffer.category || 'N/A'}`);
      console.log(`    - cashbackPercentage: ${sampleOffer.cashbackPercentage || 'N/A'}`);
      console.log(`    - store: ${sampleOffer.store ? JSON.stringify(sampleOffer.store) : 'N/A'}`);
      console.log(`    - metadata.featured: ${sampleOffer.metadata?.featured || 'N/A'}`);
      console.log(`    - metadata.isTrending: ${sampleOffer.metadata?.isTrending || 'N/A'}`);
    }
    console.log('\n');

    // Check MallBrands collection
    console.log('🏪 MALLBRANDS Collection:');
    console.log('=' .repeat(50));
    const mallBrandsCollection = db.collection('mallbrands');
    const mallBrandsCount = await mallBrandsCollection.countDocuments();
    console.log(`  Total mall brands: ${mallBrandsCount}`);

    if (mallBrandsCount > 0) {
      const brandCategories = await mallBrandsCollection.distinct('category');
      console.log(`  Unique categories: ${brandCategories.length}`);
      console.log(`  Categories: ${brandCategories.join(', ') || 'None'}`);

      const sampleBrand = await mallBrandsCollection.findOne();
      console.log('\n  Sample brand structure:');
      console.log(`    - _id: ${sampleBrand._id}`);
      console.log(`    - name: ${sampleBrand.name || 'N/A'}`);
      console.log(`    - category: ${sampleBrand.category || 'N/A'}`);
      console.log(`    - cashback: ${JSON.stringify(sampleBrand.cashback) || 'N/A'}`);
      console.log(`    - isActive: ${sampleBrand.isActive}`);
      console.log(`    - isFeatured: ${sampleBrand.isFeatured}`);
    }
    console.log('\n');

    // Check Stores collection
    console.log('🏬 STORES Collection:');
    console.log('=' .repeat(50));
    const storesCollection = db.collection('stores');
    const storesCount = await storesCollection.countDocuments();
    console.log(`  Total stores: ${storesCount}`);

    if (storesCount > 0) {
      const storeCategories = await storesCollection.distinct('category');
      console.log(`  Unique categories: ${storeCategories.length}`);
      console.log(`  Categories: ${storeCategories.join(', ') || 'None'}`);
    }
    console.log('\n');

    // Check CashStoreBrands collection (if exists)
    console.log('💰 CASHSTOREBRANDS Collection:');
    console.log('=' .repeat(50));
    const cashStoreBrandsCollection = db.collection('cashstorebrands');
    const cashStoreBrandsCount = await cashStoreBrandsCollection.countDocuments();
    console.log(`  Total cash store brands: ${cashStoreBrandsCount}`);

    if (cashStoreBrandsCount > 0) {
      const csbCategories = await cashStoreBrandsCollection.distinct('category');
      console.log(`  Unique categories: ${csbCategories.length}`);
      console.log(`  Categories: ${csbCategories.join(', ') || 'None'}`);
    }
    console.log('\n');

    // Summary
    console.log('📊 SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`  Offers: ${offersCount}`);
    console.log(`  Mall Brands: ${mallBrandsCount}`);
    console.log(`  Stores: ${storesCount}`);
    console.log(`  Cash Store Brands: ${cashStoreBrandsCount}`);
    console.log('\n');

    // Expected categories for Cash Store
    const expectedCategories = ['shopping', 'food', 'travel', 'fashion', 'electronics', 'beauty', 'groceries', 'entertainment', 'finance', 'others'];
    console.log('🎯 EXPECTED CATEGORIES for Cash Store:');
    console.log('=' .repeat(50));
    console.log(`  ${expectedCategories.join(', ')}`);
    console.log('\n');

    // Check if seeding is needed
    if (offersCount === 0 && mallBrandsCount === 0) {
      console.log('⚠️  WARNING: No offers or brands found!');
      console.log('   You need to seed data for the Cash Store to work.');
      console.log('   Run: node seed-cashstore.js');
    } else {
      console.log('✅ Data exists in database.');
      console.log('   Check if categories match the expected values above.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkDatabase();
