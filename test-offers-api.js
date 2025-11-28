// Test script to directly query offers like the API does
const mongoose = require('mongoose');
require('dotenv').config();

async function testOffersAPI() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://visionappmall:SHa32EiCYIBj96Mn@rezcluster.n45wh.mongodb.net/test?retryWrites=true&w=majority&appName=rezcluster');
    console.log('✅ Connected to MongoDB\n');

    // Define the Offer schema (minimal version)
    const offerSchema = new mongoose.Schema({}, { strict: false });
    const Offer = mongoose.model('Offer', offerSchema);

    // Test the exact filter from the controller
    const filter = {
      'validity.isActive': true,
      'validity.startDate': { $lte: new Date() },
      'validity.endDate': { $gte: new Date() },
    };

    console.log('🔍 Testing API query with populate:');
    console.log('Filter:', JSON.stringify(filter, null, 2));

    try {
      // Try the exact query from the controller
      const offers = await Offer.find(filter)
        .populate('category', 'name slug')
        .populate('store', 'name logo location ratings')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      console.log(`\n✅ Found ${offers.length} offers with populate`);

      if (offers.length === 0) {
        console.log('\n⚠️ No offers returned with populate. Testing without populate...\n');

        const offersNoPop = await Offer.find(filter)
          .sort({ createdAt: -1 })
          .limit(20)
          .lean();

        console.log(`✅ Found ${offersNoPop.length} offers WITHOUT populate`);

        if (offersNoPop.length > 0) {
          console.log('\n🔍 Sample offer (no populate):');
          console.log('Store field type:', typeof offersNoPop[0].store);
          console.log('Store value:', offersNoPop[0].store);
          console.log('Category field type:', typeof offersNoPop[0].category);
          console.log('Category value:', offersNoPop[0].category);

          console.log('\n❌ ISSUE FOUND: Populate is failing because:');
          console.log('   - store field is an embedded object, not a reference ObjectId');
          console.log('   - category field is a string enum, not a reference ObjectId');
          console.log('\n💡 SOLUTION: Remove populate for store and category');
        }
      } else {
        console.log('\n✅ Populate worked correctly');
        console.log('Sample offer:', JSON.stringify(offers[0], null, 2));
      }
    } catch (error) {
      console.error('\n❌ Error during populate:', error.message);
      console.log('\n🔍 Testing without populate...\n');

      const offersNoPop = await Offer.find(filter)
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      console.log(`✅ Found ${offersNoPop.length} offers WITHOUT populate`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Test completed');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

testOffersAPI();
