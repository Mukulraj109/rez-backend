// Quick script to check store data in database
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    console.log('\n=== Store Location Analysis ===\n');

    // Get city distribution
    const cities = await db.collection('stores').aggregate([
        { $group: { _id: '$location.city', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]).toArray();

    console.log('City Distribution:');
    cities.forEach(c => console.log(`  ${c._id || 'NULL'}: ${c.count}`));

    // Check stores without location.city
    const noCity = await db.collection('stores').countDocuments({
        $or: [
            { 'location.city': { $exists: false } },
            { 'location.city': null },
            { 'location.city': '' }
        ]
    });
    console.log(`\nStores without city: ${noCity}`);

    // Sample of stores
    console.log('\n=== Sample Stores ===');
    const samples = await db.collection('stores').find({})
        .project({ name: 1, 'location.city': 1, isActive: 1, isFeatured: 1 })
        .limit(15)
        .toArray();

    samples.forEach(s => {
        console.log(`  ${s.name} | city: "${s.location?.city}" | active: ${s.isActive} | featured: ${s.isFeatured}`);
    });

    // Check products linked to Dubai stores
    console.log('\n=== Products by Store Region ===');
    const dubaiStores = await db.collection('stores').find({ 'location.city': 'Dubai' }).project({ _id: 1 }).toArray();
    const dubaiStoreIds = dubaiStores.map(s => s._id);
    const dubaiProducts = await db.collection('products').countDocuments({ store: { $in: dubaiStoreIds }, isActive: true });
    console.log(`Dubai products: ${dubaiProducts}`);

    // Total products
    const totalProducts = await db.collection('products').countDocuments({ isActive: true });
    console.log(`Total active products: ${totalProducts}`);

    await mongoose.disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
