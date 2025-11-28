// Migration Script: Add merchant-store linking fields to Discount model
// This script updates existing discounts with default values for new fields:
// - scope: 'global'
// - createdByType: 'user'
// - merchantId: undefined (optional)
// - storeId: undefined (optional)

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Discount from '../models/Discount';

// Load environment variables
dotenv.config();

async function migrateDiscounts() {
  try {
    // MongoDB Connection Configuration
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    const dbName = process.env.DB_NAME || 'test';
    
    // Construct connection string with database name
    // Format: mongodb+srv://...@host/dbname?options
    let connectionString: string;
    if (mongoUri.includes('/?') || mongoUri.endsWith('/')) {
      // Connection string ends with / or /? - insert database name
      connectionString = mongoUri.replace(/\/(\?|$)/, `/${dbName}$1`);
    } else if (mongoUri.includes('?')) {
      // Connection string has query params but no database
      const [base, query] = mongoUri.split('?');
      connectionString = `${base}/${dbName}?${query}`;
    } else {
      // No query params, just append database
      connectionString = `${mongoUri}/${dbName}`;
    }

    console.log('🔄 Connecting to MongoDB...');
    console.log(`   Database: ${dbName}`);
    console.log(`   URI: ${mongoUri.split('@')[0]}@***`);
    await mongoose.connect(connectionString);
    console.log('✅ Connected to MongoDB');

    // Find all discounts that don't have scope or createdByType set
    const discountsToUpdate = await Discount.find({
      $or: [
        { scope: { $exists: false } },
        { createdByType: { $exists: false } }
      ]
    });

    console.log(`📊 Found ${discountsToUpdate.length} discounts to migrate`);

    if (discountsToUpdate.length === 0) {
      console.log('✅ No discounts need migration. All discounts are up to date.');
      await mongoose.disconnect();
      return;
    }

    // Update all discounts with default values
    const updateResult = await Discount.updateMany(
      {
        $or: [
          { scope: { $exists: false } },
          { createdByType: { $exists: false } }
        ]
      },
      {
        $set: {
          scope: 'global',
          createdByType: 'user'
        }
      }
    );

    console.log(`✅ Migration completed successfully!`);
    console.log(`   - Updated ${updateResult.modifiedCount} discounts`);
    console.log(`   - All discounts now have scope: 'global' and createdByType: 'user'`);

    // Verify migration
    const remaining = await Discount.countDocuments({
      $or: [
        { scope: { $exists: false } },
        { createdByType: { $exists: false } }
      ]
    });

    if (remaining === 0) {
      console.log('✅ Verification passed: All discounts have been migrated');
    } else {
      console.warn(`⚠️  Warning: ${remaining} discounts still need migration`);
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration if script is executed directly
if (require.main === module) {
  migrateDiscounts()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export default migrateDiscounts;

