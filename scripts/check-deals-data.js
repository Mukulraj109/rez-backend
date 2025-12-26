/**
 * Database Checker Script for DealsThatSaveMoney Section
 *
 * Run: node scripts/check-deals-data.js
 *
 * This script checks if all required collections have data
 * for the DealsThatSaveMoney homepage section.
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

async function checkDealsData() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log(`✅ Connected to database: ${DB_NAME}\n`);

    const collections = [
      { name: 'exclusivezones', description: 'Exclusive Zones (Student, Corporate, Women, etc.)' },
      { name: 'specialprofiles', description: 'Special Profiles (Defence, Healthcare, etc.)' },
      { name: 'doublecashbackcampaigns', description: 'Double Cashback Campaigns' },
      { name: 'coindrops', description: 'Coin Drop Events' },
      { name: 'bankoffers', description: 'Bank Offers' },
      { name: 'uploadbillstores', description: 'Upload Bill Stores' },
      { name: 'loyaltymilestones', description: 'Loyalty Milestones' },
      { name: 'hotspotareas', description: 'Hotspot Areas' },
      { name: 'offers', description: 'Offers' },
    ];

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Checking collections for DealsThatSaveMoney section:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let missingCollections = [];
    let totalDocuments = 0;

    for (const col of collections) {
      try {
        const count = await mongoose.connection.db.collection(col.name).countDocuments();
        const status = count > 0 ? '✅' : '❌';
        const countStr = count.toString().padStart(4, ' ');
        console.log(`${status} ${col.name.padEnd(25)} │ ${countStr} docs │ ${col.description}`);

        if (count === 0) {
          missingCollections.push(col.name);
        }
        totalDocuments += count;
      } catch (err) {
        console.log(`❌ ${col.name.padEnd(25)} │    0 docs │ ${col.description} (collection not found)`);
        missingCollections.push(col.name);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📈 Total documents found: ${totalDocuments}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (missingCollections.length > 0) {
      console.log('⚠️  Missing data in collections:');
      missingCollections.forEach(col => console.log(`   - ${col}`));
      console.log('\n🔧 To seed missing data, run:');
      console.log('   cd rez-backend');
      console.log('   npm run seed:offers-page:clear\n');
    } else {
      console.log('✨ All collections have data! DealsThatSaveMoney section is ready.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkDealsData();
