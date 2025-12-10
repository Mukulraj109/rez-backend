/**
 * Migration Script: Update Store Location Fields
 * Updates both 'location' and 'address' fields for all stores with proper Bangalore data
 */

const { MongoClient } = require('mongodb');

// MongoDB connection details
const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

// Bangalore location data with variations for different stores
const BANGALORE_LOCATIONS = [
  {
    address: { street: 'Indiranagar 100 Feet Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', landmark: 'Near Sony Signal' },
    location: { address: 'Indiranagar 100 Feet Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', type: 'Point', coordinates: [77.6408, 12.9716] }
  },
  {
    address: { street: 'Koramangala 5th Block', city: 'Bengaluru', state: 'Karnataka', pincode: '560095', landmark: 'Near Forum Mall' },
    location: { address: 'Koramangala 5th Block', city: 'Bengaluru', state: 'Karnataka', pincode: '560095', type: 'Point', coordinates: [77.6245, 12.9352] }
  },
  {
    address: { street: 'HSR Layout Sector 2', city: 'Bengaluru', state: 'Karnataka', pincode: '560102', landmark: 'Near BDA Complex' },
    location: { address: 'HSR Layout Sector 2', city: 'Bengaluru', state: 'Karnataka', pincode: '560102', type: 'Point', coordinates: [77.6501, 12.9121] }
  },
  {
    address: { street: 'Whitefield Main Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560066', landmark: 'Near Phoenix Marketcity' },
    location: { address: 'Whitefield Main Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560066', type: 'Point', coordinates: [77.7480, 12.9698] }
  },
  {
    address: { street: 'Jayanagar 4th Block', city: 'Bengaluru', state: 'Karnataka', pincode: '560041', landmark: 'Near Cool Joint' },
    location: { address: 'Jayanagar 4th Block', city: 'Bengaluru', state: 'Karnataka', pincode: '560041', type: 'Point', coordinates: [77.5838, 12.9279] }
  },
  {
    address: { street: 'MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', landmark: 'Near Trinity Metro' },
    location: { address: 'MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001', type: 'Point', coordinates: [77.6070, 12.9757] }
  },
  {
    address: { street: 'Brigade Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560025', landmark: 'Near Church Street Junction' },
    location: { address: 'Brigade Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560025', type: 'Point', coordinates: [77.6038, 12.9724] }
  },
  {
    address: { street: 'Marathahalli Bridge', city: 'Bengaluru', state: 'Karnataka', pincode: '560037', landmark: 'Near Innovative Multiplex' },
    location: { address: 'Marathahalli Bridge', city: 'Bengaluru', state: 'Karnataka', pincode: '560037', type: 'Point', coordinates: [77.7010, 12.9591] }
  },
  {
    address: { street: 'Electronic City Phase 1', city: 'Bengaluru', state: 'Karnataka', pincode: '560100', landmark: 'Near Infosys Campus' },
    location: { address: 'Electronic City Phase 1', city: 'Bengaluru', state: 'Karnataka', pincode: '560100', type: 'Point', coordinates: [77.6700, 12.8452] }
  },
  {
    address: { street: 'BTM Layout 2nd Stage', city: 'Bengaluru', state: 'Karnataka', pincode: '560076', landmark: 'Near Udupi Garden' },
    location: { address: 'BTM Layout 2nd Stage', city: 'Bengaluru', state: 'Karnataka', pincode: '560076', type: 'Point', coordinates: [77.6101, 12.9166] }
  },
  {
    address: { street: 'Malleshwaram 8th Cross', city: 'Bengaluru', state: 'Karnataka', pincode: '560003', landmark: 'Near Mantri Mall' },
    location: { address: 'Malleshwaram 8th Cross', city: 'Bengaluru', state: 'Karnataka', pincode: '560003', type: 'Point', coordinates: [77.5752, 13.0035] }
  },
  {
    address: { street: 'Rajajinagar 1st Block', city: 'Bengaluru', state: 'Karnataka', pincode: '560010', landmark: 'Near Orion Mall' },
    location: { address: 'Rajajinagar 1st Block', city: 'Bengaluru', state: 'Karnataka', pincode: '560010', type: 'Point', coordinates: [77.5550, 12.9913] }
  },
  {
    address: { street: 'JP Nagar 6th Phase', city: 'Bengaluru', state: 'Karnataka', pincode: '560078', landmark: 'Near Big Bazaar' },
    location: { address: 'JP Nagar 6th Phase', city: 'Bengaluru', state: 'Karnataka', pincode: '560078', type: 'Point', coordinates: [77.5850, 12.8914] }
  },
  {
    address: { street: 'Bannerghatta Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560076', landmark: 'Near Meenakshi Mall' },
    location: { address: 'Bannerghatta Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560076', type: 'Point', coordinates: [77.5997, 12.8912] }
  },
  {
    address: { street: 'Sarjapur Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560035', landmark: 'Near Total Mall' },
    location: { address: 'Sarjapur Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560035', type: 'Point', coordinates: [77.6867, 12.9107] }
  }
];

async function migrateStoreLocations() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔌 Connecting to MongoDB...\n');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    const db = client.db(DB_NAME);
    const storesCollection = db.collection('stores');

    // Get all stores
    const stores = await storesCollection.find({}).toArray();
    console.log(`📊 Found ${stores.length} stores to update\n`);

    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];
      // Cycle through location data to give variety
      const locationData = BANGALORE_LOCATIONS[i % BANGALORE_LOCATIONS.length];

      try {
        const updateResult = await storesCollection.updateOne(
          { _id: store._id },
          {
            $set: {
              'address': locationData.address,
              'location': locationData.location
            }
          }
        );

        if (updateResult.modifiedCount > 0) {
          updatedCount++;
          console.log(`✅ Updated: ${store.name} -> ${locationData.address.street}`);
        } else {
          console.log(`⚠️  No change: ${store.name}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error updating ${store.name}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total stores: ${stores.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);

    // Verify a few stores
    console.log('\n📋 VERIFICATION (Sample of updated stores):');
    console.log('='.repeat(60));
    const verifyStores = await storesCollection.find({}).limit(3).toArray();
    verifyStores.forEach((store, index) => {
      console.log(`\n--- ${store.name} ---`);
      console.log('Address:', JSON.stringify(store.address, null, 2));
      console.log('Location:', JSON.stringify(store.location, null, 2));
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the migration
migrateStoreLocations();
