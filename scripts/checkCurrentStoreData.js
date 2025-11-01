const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function checkStores() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Store = mongoose.model('Store', new mongoose.Schema({}, { strict: false }));
    const stores = await Store.find().limit(5);

    console.log('\n📊 Found', stores.length, 'stores\n');

    stores.forEach((store, index) => {
      console.log(`\nStore ${index + 1}:`);
      console.log('  ID:', store._id.toString());
      console.log('  Name:', store.name);
      console.log('  Description:', store.description ? 'Yes' : 'No');
      console.log('  Logo:', store.logo ? 'Yes' : 'No');
      console.log('  Banner:', store.banner ? 'Yes' : 'No');
      console.log('  Videos:', store.videos && store.videos.length > 0 ? `${store.videos.length} videos` : 'No videos');
      console.log('  Contact:', store.contact ? JSON.stringify(store.contact) : 'No contact');
      console.log('  Offers/Cashback:', store.offers?.cashback ? `${store.offers.cashback}%` : 'No cashback');
      console.log('  Operational Hours:', store.operationalInfo?.hours ? 'Yes' : 'No');
      console.log('  Rating:', store.ratings?.average || 0);
      console.log('  Review Count:', store.ratings?.count || 0);
      console.log('  Category:', store.category);
      console.log('  Location:', store.location ? `${store.location.city}, ${store.location.state}` : 'No location');
    });

    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkStores();
