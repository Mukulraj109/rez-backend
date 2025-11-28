import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Offer from '../src/models/Offer';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function fixNewArrivals() {
  console.log('\n🔧 Fixing New Arrivals Section...\n');
  
  try {
    // Check current new arrivals
    const currentNewArrivals = await Offer.countDocuments({ category: 'new_arrival' });
    console.log(`   Current new arrivals: ${currentNewArrivals}`);
    
    // Update 3 recent food/fashion offers to be new arrivals
    const offersToUpdate = await Offer.find({
      category: { $in: ['food', 'fashion', 'general'] },
      'metadata.isNew': { $ne: true }
    })
    .sort({ createdAt: -1 })
    .limit(3);
    
    if (offersToUpdate.length > 0) {
      console.log(`\n   Updating ${offersToUpdate.length} offers to new arrivals:\n`);
      
      for (const offer of offersToUpdate) {
        console.log(`   - ${offer.title} (${offer.category} → new_arrival)`);
        
        await Offer.updateOne(
          { _id: offer._id },
          { 
            $set: { 
              category: 'new_arrival',
              'metadata.isNew': true
            }
          }
        );
      }
      
      console.log('\n   ✅ Updated offers to new_arrival category');
    } else {
      console.log('   ⚠️  No suitable offers found to update');
    }
    
    // Verify the fix
    const newNewArrivals = await Offer.countDocuments({ category: 'new_arrival' });
    console.log(`\n   📊 New arrivals after fix: ${newNewArrivals}`);
    
    if (newNewArrivals >= 4) {
      console.log('   ✅ New Arrivals section is now properly populated!\n');
    } else {
      console.log('   ⚠️  Still need more new arrivals (target: 4+)\n');
    }
    
  } catch (error) {
    console.error('❌ Error fixing new arrivals:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectToDatabase();
    await fixNewArrivals();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { fixNewArrivals };

