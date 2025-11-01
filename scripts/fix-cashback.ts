/**
 * Quick fix to update cashback maxAmount for existing products
 */

import mongoose from 'mongoose';
import { Product } from '../src/models/Product';

const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

async function fixCashback() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const products = await Product.find();

    for (const product of products) {
      const price = product.pricing?.selling || 0;
      const percentage = product.cashback?.percentage || 5;

      // Calculate proper maxAmount
      const maxAmount = Math.max(Math.min((percentage * price) / 100, 1000), 10);

      if (!product.cashback) {
        product.cashback = {} as any;
      }

      product.cashback.percentage = percentage;
      product.cashback.maxAmount = maxAmount;
      product.cashback.minPurchase = price < 100 ? 0 : 100;

      await product.save();

      console.log(`✅ Updated ${product.name}:`);
      console.log(`   Price: ₹${price}`);
      console.log(`   Cashback: ${percentage}% (Max: ₹${Math.floor(maxAmount)})\n`);
    }

    console.log('🎉 All products updated!');
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixCashback();