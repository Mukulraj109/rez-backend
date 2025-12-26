const mongoose = require('mongoose');

const uri = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

async function updateFlashSales() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Get current time
    const now = new Date();
    console.log(`Current time: ${now.toISOString()}`);

    // Set new times: start now, end in 24 hours
    const newStartTime = now;
    const newEndTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    console.log(`New start time: ${newStartTime.toISOString()}`);
    console.log(`New end time: ${newEndTime.toISOString()}`);

    // Update all flash sale offers using native collection
    const db = mongoose.connection.db;
    const offersCollection = db.collection('offers');

    const result = await offersCollection.updateMany(
      { 'metadata.flashSale.isActive': true },
      {
        $set: {
          'metadata.flashSale.startTime': newStartTime,
          'metadata.flashSale.endTime': newEndTime,
          'status': 'active'
        }
      }
    );

    console.log(`\nUpdated ${result.modifiedCount} flash sale offers`);

    // Verify the updates
    const updatedOffers = await offersCollection.find({
      'metadata.flashSale.isActive': true
    }).toArray();

    console.log('\n=== Updated Flash Sale Offers ===');
    updatedOffers.forEach((offer, index) => {
      const flashSale = offer.metadata?.flashSale || {};
      console.log(`\n[${index + 1}] ${offer.title}`);
      console.log(`    Start Time: ${flashSale.startTime}`);
      console.log(`    End Time: ${flashSale.endTime}`);
      console.log(`    Is Active: ${flashSale.isActive}`);
      console.log(`    Status: ${offer.status}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

updateFlashSales();
