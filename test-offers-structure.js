// Test script to check the actual structure of offers in the database
const mongoose = require('mongoose');
require('dotenv').config();

async function testOffersStructure() {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://visionappmall:SHa32EiCYIBj96Mn@rezcluster.n45wh.mongodb.net/test?retryWrites=true&w=majority&appName=rezcluster');
    console.log('✅ Connected to MongoDB\n');

    // Get the Offer collection
    const db = mongoose.connection.db;
    const offersCollection = db.collection('offers');

    // Count total offers
    const totalCount = await offersCollection.countDocuments({});
    console.log(`📊 Total offers in database: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('❌ No offers found in database!');
      await mongoose.disconnect();
      return;
    }

    // Get a sample offer to see its structure
    console.log('📋 Sample offer structure:');
    const sampleOffer = await offersCollection.findOne({});
    console.log(JSON.stringify(sampleOffer, null, 2));
    console.log('\n');

    // Check how many offers have validity field
    const withValidity = await offersCollection.countDocuments({ 'validity': { $exists: true } });
    console.log(`✅ Offers with 'validity' field: ${withValidity}`);

    // Check how many offers have validity.isActive field
    const withValidityIsActive = await offersCollection.countDocuments({ 'validity.isActive': { $exists: true } });
    console.log(`✅ Offers with 'validity.isActive' field: ${withValidityIsActive}`);

    // Check how many have isActive at root level
    const withIsActive = await offersCollection.countDocuments({ 'isActive': { $exists: true } });
    console.log(`✅ Offers with 'isActive' field (root level): ${withIsActive}`);

    // Check date fields
    const withStartDate = await offersCollection.countDocuments({ 'validity.startDate': { $exists: true } });
    const withEndDate = await offersCollection.countDocuments({ 'validity.endDate': { $exists: true } });
    console.log(`✅ Offers with 'validity.startDate': ${withStartDate}`);
    console.log(`✅ Offers with 'validity.endDate': ${withEndDate}\n`);

    // Test the current filter being used in the API
    console.log('🔍 Testing current API filter:');
    const currentFilter = {
      'validity.isActive': true,
      'validity.startDate': { $lte: new Date() },
      'validity.endDate': { $gte: new Date() },
    };
    const matchingOffers = await offersCollection.find(currentFilter).toArray();
    console.log(`   Filter: ${JSON.stringify(currentFilter, null, 2)}`);
    console.log(`   Matching offers: ${matchingOffers.length}\n`);

    // Try alternative filter with just validity.isActive
    console.log('🔍 Testing simplified filter (just validity.isActive):');
    const simpleFilter = { 'validity.isActive': true };
    const simpleMatches = await offersCollection.find(simpleFilter).toArray();
    console.log(`   Filter: ${JSON.stringify(simpleFilter, null, 2)}`);
    console.log(`   Matching offers: ${simpleMatches.length}\n`);

    // Try finding offers without any filter
    console.log('🔍 Getting all offers (no filter):');
    const allOffers = await offersCollection.find({}).limit(5).toArray();
    console.log(`   Found: ${allOffers.length} offers`);
    if (allOffers.length > 0) {
      console.log('   First offer fields:', Object.keys(allOffers[0]));
    }

    await mongoose.disconnect();
    console.log('\n✅ Test completed');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

testOffersStructure();
