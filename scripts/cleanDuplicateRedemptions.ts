/**
 * Script to clean up duplicate active redemptions
 * Keeps only the first (oldest) redemption per user per offer
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function cleanDuplicateRedemptions() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }
    
    const redemptionsCollection = db.collection('offerredemptions');

    // Find all active/pending redemptions
    const activeRedemptions = await redemptionsCollection.find({
      status: { $in: ['active', 'pending'] }
    }).toArray();

    console.log(`📊 Found ${activeRedemptions.length} active redemptions`);

    // Group by user + offer combination
    const userOfferMap = new Map<string, any[]>();

    activeRedemptions.forEach((redemption: any) => {
      const user = String(redemption.user);
      const offer = String(redemption.offer);
      const key = `${user}_${offer}`;

      if (!userOfferMap.has(key)) {
        userOfferMap.set(key, []);
      }
      userOfferMap.get(key)!.push(redemption);
    });

    let duplicatesFound = 0;
    let duplicatesRemoved = 0;

    // For each user+offer combo, keep the oldest and mark others as cancelled
    for (const [key, redemptions] of userOfferMap.entries()) {
      if (redemptions.length > 1) {
        duplicatesFound += redemptions.length - 1;
        
        // Sort by redemptionDate (oldest first)
        redemptions.sort((a, b) => {
          const dateA = new Date(a.redemptionDate || a.createdAt).getTime();
          const dateB = new Date(b.redemptionDate || b.createdAt).getTime();
          return dateA - dateB;
        });

        // Keep the first one, mark others as cancelled
        const [keep, ...toCancel] = redemptions;

        console.log(`\n🔍 User ${key.split('_')[0].substring(0, 8)}... has ${redemptions.length} redemptions for offer ${key.split('_')[1].substring(0, 8)}...`);
        console.log(`   ✅ Keeping: ${keep._id} (${new Date(keep.redemptionDate || keep.createdAt).toISOString()})`);

        for (const duplicate of toCancel) {
          await redemptionsCollection.updateOne(
            { _id: duplicate._id },
            {
              $set: {
                status: 'cancelled',
                cancellationReason: 'Duplicate redemption - removed by cleanup script'
              }
            }
          );
          duplicatesRemoved++;
          console.log(`   ❌ Cancelled duplicate: ${duplicate._id} (${new Date(duplicate.redemptionDate || duplicate.createdAt).toISOString()})`);
        }
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`   📊 Duplicates found: ${duplicatesFound}`);
    console.log(`   🗑️  Duplicates removed: ${duplicatesRemoved}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning duplicates:', error);
    process.exit(1);
  }
}

cleanDuplicateRedemptions();

