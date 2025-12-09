/**
 * Script to update all stores with the new 11 category structure
 *
 * This script:
 * 1. Fetches all stores from the database
 * 2. Shows their current category assignments
 * 3. Assigns them to the new 11 main categories based on their name/type
 *
 * Run: npx ts-node src/scripts/updateStoreCategories.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

// Category keywords for auto-assignment
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'food-dining': ['restaurant', 'cafe', 'food', 'dining', 'pizza', 'burger', 'biryani', 'chicken', 'chinese', 'italian', 'mexican', 'indian', 'bakery', 'cake', 'sweet', 'dessert', 'ice cream', 'coffee', 'tea', 'juice', 'smoothie', 'fast food', 'qsr', 'kitchen', 'dhaba', 'hotel', 'canteen', 'mess', 'tiffin'],
  'grocery-essentials': ['grocery', 'supermarket', 'kirana', 'mart', 'vegetables', 'fruits', 'meat', 'fish', 'dairy', 'milk', 'egg', 'bread', 'rice', 'flour', 'oil', 'spices', 'provisions', 'general store', 'departmental'],
  'beauty-wellness': ['salon', 'spa', 'beauty', 'parlour', 'parlor', 'cosmetic', 'makeup', 'skincare', 'hair', 'nail', 'massage', 'wellness', 'grooming', 'facial', 'waxing', 'threading'],
  'healthcare': ['pharmacy', 'medical', 'medicine', 'clinic', 'hospital', 'doctor', 'dental', 'dentist', 'diagnostic', 'lab', 'pathology', 'physiotherapy', 'ayurveda', 'homeopathy', 'optical', 'eye', 'health'],
  'fashion': ['fashion', 'clothing', 'clothes', 'apparel', 'garment', 'dress', 'shirt', 'jeans', 'saree', 'kurti', 'footwear', 'shoes', 'sandals', 'bag', 'watch', 'jewelry', 'jewellery', 'accessory', 'accessories', 'boutique', 'tailor'],
  'fitness-sports': ['gym', 'fitness', 'yoga', 'zumba', 'crossfit', 'sports', 'cricket', 'football', 'badminton', 'swimming', 'martial arts', 'karate', 'boxing', 'workout', 'exercise'],
  'education-learning': ['school', 'college', 'coaching', 'tuition', 'classes', 'academy', 'institute', 'training', 'education', 'learning', 'music', 'dance', 'art', 'craft', 'language', 'computer', 'skill'],
  'home-services': ['plumber', 'plumbing', 'electrician', 'electrical', 'carpenter', 'carpentry', 'ac repair', 'appliance', 'cleaning', 'pest control', 'painting', 'renovation', 'shifting', 'packers', 'movers', 'laundry', 'dry clean', 'repair', 'service'],
  'travel-experiences': ['travel', 'tour', 'hotel', 'resort', 'homestay', 'taxi', 'cab', 'car rental', 'bike rental', 'bus', 'flight', 'ticket', 'booking', 'holiday', 'vacation', 'trip'],
  'entertainment': ['movie', 'cinema', 'theatre', 'theater', 'gaming', 'game', 'play', 'fun', 'entertainment', 'event', 'party', 'dj', 'music', 'concert', 'show', 'amusement', 'park'],
  'financial-lifestyle': ['bank', 'finance', 'insurance', 'loan', 'investment', 'recharge', 'bill payment', 'money transfer', 'atm', 'gold', 'silver']
};

async function updateStoreCategories() {
  try {
    console.log('🚀 Starting store category update...');
    console.log(`📡 Connecting to MongoDB...`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    // Get Category model
    const Category = mongoose.model('Category', new mongoose.Schema({
      name: String,
      slug: String,
      parentCategory: mongoose.Schema.Types.ObjectId,
      childCategories: [mongoose.Schema.Types.ObjectId],
      isActive: Boolean
    }));

    // Get Store model
    const Store = mongoose.model('Store', new mongoose.Schema({
      name: String,
      slug: String,
      description: String,
      category: mongoose.Schema.Types.ObjectId,
      categories: [mongoose.Schema.Types.ObjectId],
      tags: [String],
      isActive: Boolean
    }));

    // Fetch all main categories (those without parentCategory)
    const mainCategories = await Category.find({ parentCategory: { $exists: false } }).lean();
    console.log(`📦 Found ${mainCategories.length} main categories:`);
    mainCategories.forEach((cat: any) => {
      console.log(`   - ${cat.name} (${cat.slug}) - ID: ${cat._id}`);
    });

    // Create a map of slug to category ID
    const categoryMap = new Map<string, mongoose.Types.ObjectId>();
    mainCategories.forEach((cat: any) => {
      categoryMap.set(cat.slug, cat._id);
    });

    // Fetch all stores
    const stores = await Store.find({}).lean();
    console.log(`\n📦 Found ${stores.length} stores in database\n`);

    if (stores.length === 0) {
      console.log('❌ No stores found in database!');
      return;
    }

    // Show current store categories
    console.log('========================================');
    console.log('CURRENT STORE CATEGORIES');
    console.log('========================================');

    for (const store of stores.slice(0, 20)) { // Show first 20
      const s = store as any;
      console.log(`📍 ${s.name}`);
      console.log(`   Category ID: ${s.category || 'None'}`);
      console.log(`   Tags: ${s.tags?.join(', ') || 'None'}`);
      console.log('');
    }

    if (stores.length > 20) {
      console.log(`... and ${stores.length - 20} more stores\n`);
    }

    // Function to determine category based on store name/description/tags
    function determineCategory(store: any): string {
      const searchText = `${store.name} ${store.description || ''} ${(store.tags || []).join(' ')}`.toLowerCase();

      for (const [categorySlug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        for (const keyword of keywords) {
          if (searchText.includes(keyword.toLowerCase())) {
            return categorySlug;
          }
        }
      }

      // Default to food-dining if no match (most common)
      return 'food-dining';
    }

    // Update stores with new categories
    console.log('========================================');
    console.log('UPDATING STORE CATEGORIES');
    console.log('========================================\n');

    const categoryAssignments: Record<string, number> = {};
    let updatedCount = 0;

    for (const store of stores) {
      const s = store as any;
      const categorySlug = determineCategory(s);
      const categoryId = categoryMap.get(categorySlug);

      if (!categoryId) {
        console.log(`⚠️  No category found for slug: ${categorySlug}`);
        continue;
      }

      // Update the store
      await Store.updateOne(
        { _id: s._id },
        {
          $set: {
            category: categoryId,
            categories: [categoryId]
          }
        }
      );

      categoryAssignments[categorySlug] = (categoryAssignments[categorySlug] || 0) + 1;
      updatedCount++;

      console.log(`✅ ${s.name} -> ${categorySlug}`);
    }

    // Summary
    console.log('\n========================================');
    console.log('📊 UPDATE SUMMARY');
    console.log('========================================');
    console.log(`Total stores updated: ${updatedCount}`);
    console.log('\nCategory distribution:');
    for (const [category, count] of Object.entries(categoryAssignments).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${category}: ${count} stores`);
    }

    // Verify by fetching stores with food-dining category
    const foodDiningId = categoryMap.get('food-dining');
    if (foodDiningId) {
      const foodStores = await Store.countDocuments({ category: foodDiningId });
      console.log(`\n✅ Verification: ${foodStores} stores now have food-dining category`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

updateStoreCategories()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
