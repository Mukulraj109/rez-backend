/**
 * Fix Product Pricing Structure
 * Migrates products from old 'price' structure to new 'pricing' structure
 * Old: price: { current, original, currency, discount }
 * New: pricing: { selling, original, currency, discount }
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function fixProductPricing() {
  try {
    console.log('🚀 Starting Product Pricing Fix...');
    console.log(`📡 Connecting to MongoDB...`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;
    const productsCollection = db.collection('products');

    // Get all products
    const products = await productsCollection.find({}).toArray();
    console.log(`📦 Found ${products.length} products to process\n`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const product of products) {
      try {
        // Check if product has old 'price' structure
        const hasOldPrice = product.price && (product.price.current !== undefined || product.price.original !== undefined);
        const hasNewPricing = product.pricing && (product.pricing.selling !== undefined || product.pricing.original !== undefined);

        if (hasOldPrice && !hasNewPricing) {
          // Migrate from old to new structure
          const newPricing = {
            original: product.price.original || product.price.current || 0,
            selling: product.price.current || product.price.original || 0,
            discount: product.price.discount || 0,
            currency: product.price.currency || 'INR'
          };

          await productsCollection.updateOne(
            { _id: product._id },
            {
              $set: { pricing: newPricing },
              $unset: { price: "" } // Remove old field
            }
          );

          console.log(`   ✅ Fixed: ${product.name} - ₹${newPricing.selling} (was ₹${product.price.current || 0})`);
          fixedCount++;
        } else if (hasNewPricing) {
          // Already has new pricing structure
          skippedCount++;
        } else if (hasOldPrice && hasNewPricing) {
          // Has both - update pricing from price and remove old
          const newPricing = {
            original: product.price.original || product.pricing.original || 0,
            selling: product.price.current || product.pricing.selling || 0,
            discount: product.price.discount || product.pricing.discount || 0,
            currency: product.price.currency || product.pricing.currency || 'INR'
          };

          await productsCollection.updateOne(
            { _id: product._id },
            {
              $set: { pricing: newPricing },
              $unset: { price: "" }
            }
          );

          console.log(`   ✅ Merged: ${product.name} - ₹${newPricing.selling}`);
          fixedCount++;
        } else {
          // No pricing at all - create default
          const defaultPrice = 100; // Default price
          const newPricing = {
            original: defaultPrice,
            selling: defaultPrice,
            discount: 0,
            currency: 'INR'
          };

          await productsCollection.updateOne(
            { _id: product._id },
            { $set: { pricing: newPricing } }
          );

          console.log(`   ⚠️ Created default: ${product.name} - ₹${defaultPrice}`);
          fixedCount++;
        }
      } catch (err) {
        console.log(`   ❌ Error: ${product.name} - ${err}`);
        errorCount++;
      }
    }

    console.log('\n========================================');
    console.log('📊 FIX SUMMARY');
    console.log('========================================');
    console.log(`Total Products: ${products.length}`);
    console.log(`Fixed: ${fixedCount}`);
    console.log(`Skipped (already correct): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('========================================\n');

    // Verify a sample product
    console.log('📊 VERIFICATION (Sample Products):');
    const sampleProducts = await productsCollection.find({}).limit(5).toArray();
    for (const product of sampleProducts) {
      console.log(`   ${product.name}:`);
      console.log(`      pricing.selling: ${product.pricing?.selling || 'N/A'}`);
      console.log(`      pricing.original: ${product.pricing?.original || 'N/A'}`);
      console.log(`      price (old): ${product.price ? JSON.stringify(product.price) : 'removed'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixProductPricing()
  .then(() => {
    console.log('✅ Product pricing fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
