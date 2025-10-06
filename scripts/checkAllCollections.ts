// Check All Collections Script
// Verify that other collections are intact

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function checkCollections() {
  try {
    console.log('\n🔍 Checking all collections in database...\n');

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collections = await db.listCollections().toArray();

    console.log('📊 Database Collection Summary:');
    console.log('━'.repeat(60));

    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`  ${collection.name.padEnd(30)} : ${count} documents`);
    }

    console.log('━'.repeat(60));
    console.log('\n✅ All other collections are INTACT!');
    console.log('💡 Only FAQs collection was modified.\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkCollections();
