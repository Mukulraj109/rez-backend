import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import models
import Offer from '../src/models/Offer';
import OfferCategory from '../src/models/OfferCategory';
import HeroBanner from '../src/models/HeroBanner';
import { Store } from '../src/models/Store';

dotenv.config();

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'test';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME
    });
    console.log('✅ Connected to MongoDB');
    console.log(`   Database: ${DB_NAME}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function checkOffersData() {
  console.log('\n🔍 Checking Offers Data in Database...\n');
  console.log('========================================\n');
  
  try {
    // Check Offers
    console.log('📦 OFFERS:');
    const offerCount = await Offer.countDocuments();
    console.log(`   Total Offers: ${offerCount}`);
    
    if (offerCount > 0) {
      console.log('\n   📊 Breakdown by Category:');
      const categories = ['mega', 'student', 'new_arrival', 'trending', 'food', 'fashion', 'electronics', 'general'];
      for (const cat of categories) {
        const count = await Offer.countDocuments({ category: cat });
        if (count > 0) {
          console.log(`      - ${cat}: ${count}`);
        }
      }
      
      console.log('\n   📊 Breakdown by Status:');
      const activeCount = await Offer.countDocuments({ 'validity.isActive': true });
      const inactiveCount = await Offer.countDocuments({ 'validity.isActive': false });
      console.log(`      - Active: ${activeCount}`);
      console.log(`      - Inactive: ${inactiveCount}`);
      
      console.log('\n   📊 Featured/Trending:');
      const featuredCount = await Offer.countDocuments({ 'metadata.featured': true });
      const trendingCount = await Offer.countDocuments({ 'metadata.isTrending': true });
      const newCount = await Offer.countDocuments({ 'metadata.isNew': true });
      console.log(`      - Featured: ${featuredCount}`);
      console.log(`      - Trending: ${trendingCount}`);
      console.log(`      - New: ${newCount}`);
      
      // Sample offers
      console.log('\n   📋 Sample Offers (first 5):');
      const sampleOffers = await Offer.find().limit(5).lean();
      sampleOffers.forEach((offer: any, index) => {
        console.log(`      ${index + 1}. ${offer.title}`);
        console.log(`         Category: ${offer.category}`);
        console.log(`         Cashback: ${offer.cashbackPercentage}%`);
        console.log(`         Store: ${offer.store?.name || 'N/A'}`);
        console.log(`         Active: ${offer.validity?.isActive ? '✅' : '❌'}`);
      });
    } else {
      console.log('   ⚠️  No offers found in database');
    }
    
    // Check Offer Categories
    console.log('\n\n📂 OFFER CATEGORIES:');
    const categoryCount = await OfferCategory.countDocuments();
    console.log(`   Total Categories: ${categoryCount}`);
    
    if (categoryCount > 0) {
      const categories = await OfferCategory.find().lean();
      categories.forEach((cat: any, index) => {
        console.log(`      ${index + 1}. ${cat.name} (${cat.slug})`);
        console.log(`         Active: ${cat.isActive ? '✅' : '❌'}`);
        console.log(`         Priority: ${cat.priority}`);
      });
    } else {
      console.log('   ⚠️  No categories found in database');
    }
    
    // Check Hero Banners
    console.log('\n\n🎯 HERO BANNERS:');
    const bannerCount = await HeroBanner.countDocuments();
    console.log(`   Total Banners: ${bannerCount}`);
    
    if (bannerCount > 0) {
      const banners = await HeroBanner.find().lean();
      banners.forEach((banner: any, index) => {
        console.log(`      ${index + 1}. ${banner.title}`);
        console.log(`         Page: ${banner.metadata?.page || 'N/A'}`);
        console.log(`         Active: ${banner.isActive ? '✅' : '❌'}`);
        console.log(`         Priority: ${banner.priority}`);
      });
    } else {
      console.log('   ⚠️  No hero banners found in database');
    }
    
    // Check Stores
    console.log('\n\n🏪 STORES:');
    const storeCount = await Store.countDocuments();
    console.log(`   Total Stores: ${storeCount}`);
    
    if (storeCount > 0) {
      const stores = await Store.find().limit(10).lean();
      console.log('\n   📋 Sample Stores (first 10):');
      stores.forEach((store: any, index) => {
        console.log(`      ${index + 1}. ${store.name}`);
        console.log(`         Location: ${store.location?.city || 'N/A'}`);
        console.log(`         Active: ${store.isActive ? '✅' : '❌'}`);
        console.log(`         Verified: ${store.verified ? '✅' : '❌'}`);
      });
    } else {
      console.log('   ⚠️  No stores found in database');
    }
    
    // Check if offers have store references
    if (offerCount > 0) {
      console.log('\n\n🔗 OFFER-STORE RELATIONSHIPS:');
      const offersWithStores = await Offer.countDocuments({ 'store.id': { $exists: true, $ne: null } });
      console.log(`   Offers with store reference: ${offersWithStores} / ${offerCount}`);
      
      if (offersWithStores < offerCount) {
        console.log('   ⚠️  Some offers are missing store references!');
      }
    }
    
    // Overall Status
    console.log('\n\n========================================');
    console.log('📊 OVERALL STATUS:\n');
    
    const hasOffers = offerCount > 0;
    const hasCategories = categoryCount > 0;
    const hasBanners = bannerCount > 0;
    const hasStores = storeCount > 0;
    
    const allDataPresent = hasOffers && hasCategories && hasBanners && hasStores;
    
    if (allDataPresent) {
      console.log('✅ All required data is present!');
      console.log('\n   Summary:');
      console.log(`   - Offers: ${offerCount} ✅`);
      console.log(`   - Categories: ${categoryCount} ✅`);
      console.log(`   - Banners: ${bannerCount} ✅`);
      console.log(`   - Stores: ${storeCount} ✅`);
      console.log('\n🎉 Your offers page should work with existing data!');
      console.log('\n💡 Recommendation: TEST the API first');
      console.log('   Test command: curl http://localhost:5001/api/offers/page-data');
    } else {
      console.log('⚠️  Missing some required data:\n');
      if (!hasOffers) console.log('   ❌ Offers: MISSING');
      if (!hasCategories) console.log('   ❌ Categories: MISSING');
      if (!hasBanners) console.log('   ⚠️  Banners: MISSING (optional but recommended)');
      if (!hasStores) console.log('   ❌ Stores: MISSING');
      
      console.log('\n💡 Recommendation: RUN SEED SCRIPT');
      console.log('   Command: npx ts-node scripts/seedOffersProduction.ts');
    }
    
    console.log('\n========================================\n');
    
    return {
      offers: offerCount,
      categories: categoryCount,
      banners: bannerCount,
      stores: storeCount,
      allDataPresent
    };
    
  } catch (error) {
    console.error('\n❌ Error checking data:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectToDatabase();
    await checkOffersData();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the checker
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { checkOffersData };

