const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function checkStoreVideos() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Store = mongoose.model('Store', new mongoose.Schema({}, { strict: false }));

    // Get TechMart Electronics specifically
    const techMart = await Store.findOne({ name: 'TechMart Electronics' });

    if (!techMart) {
      console.log('❌ TechMart Electronics not found');
      await mongoose.connection.close();
      return;
    }

    console.log('🏪 Store:', techMart.name);
    console.log('📍 ID:', techMart._id.toString());
    console.log('');
    console.log('🎥 Videos in Database:\n');

    if (techMart.videos && techMart.videos.length > 0) {
      techMart.videos.forEach((video, index) => {
        console.log(`Video ${index + 1}:`);
        console.log('  URL:', video.url);
        console.log('  Thumbnail:', video.thumbnail);
        console.log('  Title:', video.title);
        console.log('  Duration:', video.duration, 'seconds');
        console.log('');
      });
      console.log(`✅ Total: ${techMart.videos.length} videos found in database`);
    } else {
      console.log('❌ No videos found in database');
    }

    console.log('\n📊 Complete Store Data:\n');
    console.log('Description:', techMart.description ? '✅' : '❌');
    console.log('Banner:', techMart.banner ? '✅' : '❌');
    console.log('Logo:', techMart.logo ? '✅' : '❌');
    console.log('Contact:', techMart.contact ? '✅' : '❌');
    console.log('Offers/Cashback:', techMart.offers?.cashback ? `${techMart.offers.cashback}%` : '❌');
    console.log('Rating:', techMart.ratings?.average || 0);
    console.log('Reviews:', techMart.ratings?.count || 0);

    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkStoreVideos();
