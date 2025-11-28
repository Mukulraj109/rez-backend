const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB connection details
const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

async function exportStoresData() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔌 Connecting to MongoDB...\n');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    const db = client.db(DB_NAME);
    const storesCollection = db.collection('stores');

    console.log('📥 Exporting stores data...\n');

    // Get all stores
    const allStores = await storesCollection.find({}).toArray();

    // Export as JSON
    const outputPath = path.join(__dirname, 'stores-export.json');
    fs.writeFileSync(outputPath, JSON.stringify(allStores, null, 2));

    console.log(`✅ Exported ${allStores.length} stores to: ${outputPath}\n`);

    // Create a simplified version for quick reference
    const simplifiedStores = allStores.map(store => ({
      id: store._id,
      name: store.name,
      slug: store.slug,
      category: store.category,
      location: {
        address: store.location?.address,
        city: store.location?.city,
        coordinates: store.location?.coordinates
      },
      rating: store.ratings?.average,
      reviewCount: store.ratings?.count,
      deliveryTime: store.operationalInfo?.deliveryTime,
      minimumOrder: store.operationalInfo?.minimumOrder,
      deliveryFee: store.operationalInfo?.deliveryFee,
      cashback: store.offers?.cashback,
      partnerLevel: store.offers?.partnerLevel,
      paymentMethods: store.operationalInfo?.paymentMethods,
      isActive: store.isActive,
      isFeatured: store.isFeatured,
      isVerified: store.isVerified,
      tags: store.tags,
      contact: store.contact
    }));

    const simplifiedPath = path.join(__dirname, 'stores-simplified.json');
    fs.writeFileSync(simplifiedPath, JSON.stringify(simplifiedStores, null, 2));

    console.log(`✅ Created simplified version: ${simplifiedPath}\n`);

    // Create CSV for Excel
    const csvHeaders = [
      'ID', 'Name', 'Slug', 'Category', 'Address', 'City', 'Rating',
      'Reviews', 'Delivery Time', 'Min Order', 'Delivery Fee', 'Cashback %',
      'Partner Level', 'Active', 'Featured', 'Verified'
    ].join(',');

    const csvRows = allStores.map(store => [
      store._id,
      `"${store.name}"`,
      store.slug,
      store.category,
      `"${store.location?.address || ''}"`,
      store.location?.city || '',
      store.ratings?.average || '',
      store.ratings?.count || '',
      `"${store.operationalInfo?.deliveryTime || ''}"`,
      store.operationalInfo?.minimumOrder || '',
      store.operationalInfo?.deliveryFee || '',
      store.offers?.cashback || '',
      store.offers?.partnerLevel || '',
      store.isActive,
      store.isFeatured,
      store.isVerified
    ].join(','));

    const csvContent = [csvHeaders, ...csvRows].join('\n');
    const csvPath = path.join(__dirname, 'stores-export.csv');
    fs.writeFileSync(csvPath, csvContent);

    console.log(`✅ Created CSV version: ${csvPath}\n`);

    console.log('═'.repeat(80));
    console.log('📊 Export Summary:');
    console.log('═'.repeat(80));
    console.log(`  • Full JSON export: stores-export.json (${allStores.length} stores)`);
    console.log(`  • Simplified JSON: stores-simplified.json`);
    console.log(`  • CSV for Excel: stores-export.csv`);
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('❌ Error exporting stores:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed\n');
  }
}

// Run the export
exportStoresData()
  .then(() => {
    console.log('✅ Export complete!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
