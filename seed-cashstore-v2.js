/**
 * Cash Store Seed Script v2
 * Run: node seed-cashstore-v2.js
 *
 * Seeds properly structured offers for Cash Store category filtering.
 */

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

// Helper to create properly structured offer
const createOffer = (data) => ({
  title: data.title,
  subtitle: data.subtitle || '',
  description: data.description || `Shop at ${data.storeName} and earn cashback`,
  image: data.logo,
  category: data.category,
  type: 'cashback',
  cashbackPercentage: data.cashback,
  originalPrice: 1000,
  discountedPrice: 1000 - (1000 * data.discount / 100),
  location: {
    type: 'Point',
    coordinates: [77.5946, 12.9716], // Bangalore coordinates
  },
  store: {
    id: data.storeId,
    name: data.storeName,
    logo: data.logo,
    rating: data.rating || 4.3,
    verified: true,
  },
  validity: {
    startDate: new Date(),
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    isActive: true,
  },
  engagement: {
    likesCount: Math.floor(Math.random() * 500) + 100,
    sharesCount: Math.floor(Math.random() * 100) + 20,
    viewsCount: Math.floor(Math.random() * 2000) + 500,
    isLikedByUser: false,
  },
  restrictions: {
    minOrderValue: 0,
    maxDiscountAmount: 500,
    applicableOn: ['all'],
    excludedProducts: [],
    userTypeRestriction: 'all',
  },
  metadata: {
    isNew: data.isNew || false,
    isTrending: data.isTrending || false,
    isBestSeller: data.isBestSeller || false,
    isSpecial: false,
    priority: data.priority || 5,
    tags: [data.category, 'cashback'],
    featured: data.featured || false,
    flashSale: {
      isActive: false,
    },
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Cash Store offers with all categories
const cashStoreData = [
  // FASHION (Featured + Trending)
  { title: 'Myntra Fashion Sale', subtitle: 'Upto 70% off', storeName: 'Myntra', storeId: 'myntra-001', logo: 'https://logo.clearbit.com/myntra.com', category: 'fashion', cashback: 8, discount: 70, rating: 4.5, featured: true, isTrending: true, priority: 10 },
  { title: 'AJIO Style Fest', subtitle: 'Best fashion deals', storeName: 'AJIO', storeId: 'ajio-001', logo: 'https://logo.clearbit.com/ajio.com', category: 'fashion', cashback: 12, discount: 50, rating: 4.3, featured: true, priority: 9 },
  { title: 'H&M Collection', subtitle: 'New arrivals', storeName: 'H&M', storeId: 'hm-001', logo: 'https://logo.clearbit.com/hm.com', category: 'fashion', cashback: 5, discount: 30, rating: 4.4, featured: false, priority: 7 },

  // ELECTRONICS (Featured + High Cashback)
  { title: 'Amazon Electronics', subtitle: 'Best deals', storeName: 'Amazon', storeId: 'amazon-001', logo: 'https://logo.clearbit.com/amazon.in', category: 'electronics', cashback: 5, discount: 40, rating: 4.7, featured: true, isTrending: true, priority: 10 },
  { title: 'Flipkart Big Billion', subtitle: 'Lowest prices', storeName: 'Flipkart', storeId: 'flipkart-001', logo: 'https://logo.clearbit.com/flipkart.com', category: 'electronics', cashback: 7, discount: 60, rating: 4.6, featured: true, isTrending: true, priority: 9 },
  { title: 'Croma Tech Fest', subtitle: 'Premium electronics', storeName: 'Croma', storeId: 'croma-001', logo: 'https://logo.clearbit.com/croma.com', category: 'electronics', cashback: 4, discount: 25, rating: 4.2, featured: false, priority: 6 },
  { title: 'Reliance Digital', subtitle: 'Electronics & Appliances', storeName: 'Reliance Digital', storeId: 'reliance-001', logo: 'https://logo.clearbit.com/reliancedigital.in', category: 'electronics', cashback: 6, discount: 35, rating: 4.3, featured: true, priority: 8 },

  // FOOD (High Cashback)
  { title: 'Swiggy Food Fest', subtitle: 'Order & earn cashback', storeName: 'Swiggy', storeId: 'swiggy-001', logo: 'https://logo.clearbit.com/swiggy.com', category: 'food', cashback: 15, discount: 50, rating: 4.4, featured: true, isTrending: true, priority: 9 },
  { title: 'Zomato Offers', subtitle: 'Food delivery deals', storeName: 'Zomato', storeId: 'zomato-001', logo: 'https://logo.clearbit.com/zomato.com', category: 'food', cashback: 12, discount: 40, rating: 4.5, featured: true, isTrending: true, priority: 8 },
  { title: 'Dominos Pizza', subtitle: 'Buy 1 Get 1', storeName: 'Dominos', storeId: 'dominos-001', logo: 'https://logo.clearbit.com/dominos.co.in', category: 'food', cashback: 10, discount: 50, rating: 4.2, featured: false, priority: 7 },

  // TRAVEL
  { title: 'MakeMyTrip Deals', subtitle: 'Flights & hotels', storeName: 'MakeMyTrip', storeId: 'mmt-001', logo: 'https://logo.clearbit.com/makemytrip.com', category: 'travel', cashback: 8, discount: 25, rating: 4.3, featured: true, isTrending: true, priority: 8 },
  { title: 'Goibibo Travel', subtitle: 'Lowest fare', storeName: 'Goibibo', storeId: 'goibibo-001', logo: 'https://logo.clearbit.com/goibibo.com', category: 'travel', cashback: 6, discount: 20, rating: 4.2, featured: true, priority: 7 },
  { title: 'OYO Rooms', subtitle: 'Budget hotels', storeName: 'OYO', storeId: 'oyo-001', logo: 'https://logo.clearbit.com/oyorooms.com', category: 'travel', cashback: 10, discount: 40, rating: 4.0, featured: false, priority: 6 },

  // BEAUTY (High Cashback)
  { title: 'Nykaa Beauty Sale', subtitle: 'Premium cosmetics', storeName: 'Nykaa', storeId: 'nykaa-001', logo: 'https://logo.clearbit.com/nykaa.com', category: 'beauty', cashback: 10, discount: 50, rating: 4.5, featured: true, isTrending: true, priority: 9 },
  { title: 'Mamaearth Natural', subtitle: 'Natural products', storeName: 'Mamaearth', storeId: 'mamaearth-001', logo: 'https://logo.clearbit.com/mamaearth.in', category: 'beauty', cashback: 15, discount: 35, rating: 4.4, featured: true, priority: 8 },

  // GROCERIES
  { title: 'BigBasket Groceries', subtitle: 'Daily essentials', storeName: 'BigBasket', storeId: 'bigbasket-001', logo: 'https://logo.clearbit.com/bigbasket.com', category: 'groceries', cashback: 5, discount: 20, rating: 4.3, featured: true, priority: 7 },
  { title: 'JioMart Deals', subtitle: 'Groceries at doorstep', storeName: 'JioMart', storeId: 'jiomart-001', logo: 'https://logo.clearbit.com/jiomart.com', category: 'groceries', cashback: 8, discount: 30, rating: 4.1, featured: true, isTrending: true, priority: 8 },
  { title: 'Blinkit Quick', subtitle: '10 min delivery', storeName: 'Blinkit', storeId: 'blinkit-001', logo: 'https://logo.clearbit.com/blinkit.com', category: 'groceries', cashback: 6, discount: 25, rating: 4.2, featured: false, isTrending: true, priority: 6 },

  // SHOPPING (High Cashback)
  { title: 'Meesho Deals', subtitle: 'Affordable shopping', storeName: 'Meesho', storeId: 'meesho-001', logo: 'https://logo.clearbit.com/meesho.com', category: 'shopping', cashback: 10, discount: 60, rating: 4.0, featured: true, isTrending: true, priority: 7 },
  { title: 'Shopsy Sale', subtitle: 'Budget shopping', storeName: 'Shopsy', storeId: 'shopsy-001', logo: 'https://logo.clearbit.com/shopsy.in', category: 'shopping', cashback: 12, discount: 70, rating: 3.9, featured: false, priority: 5 },

  // ENTERTAINMENT
  { title: 'BookMyShow', subtitle: 'Movies & Events', storeName: 'BookMyShow', storeId: 'bms-001', logo: 'https://logo.clearbit.com/bookmyshow.com', category: 'entertainment', cashback: 8, discount: 20, rating: 4.4, featured: true, isTrending: true, priority: 8 },
  { title: 'PVR Cinemas', subtitle: 'Movie tickets', storeName: 'PVR Cinemas', storeId: 'pvr-001', logo: 'https://logo.clearbit.com/pvrcinemas.com', category: 'entertainment', cashback: 5, discount: 15, rating: 4.3, featured: false, priority: 5 },

  // FINANCE
  { title: 'PhonePe Rewards', subtitle: 'Pay & earn', storeName: 'PhonePe', storeId: 'phonepe-001', logo: 'https://logo.clearbit.com/phonepe.com', category: 'finance', cashback: 3, discount: 10, rating: 4.5, featured: true, priority: 6 },
  { title: 'Paytm Offers', subtitle: 'Recharge & bills', storeName: 'Paytm', storeId: 'paytm-001', logo: 'https://logo.clearbit.com/paytm.com', category: 'finance', cashback: 4, discount: 15, rating: 4.2, featured: true, priority: 6 },
];

async function seedCashStore() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const offersCollection = db.collection('offers');

    // Delete old seeded offers (by store IDs we created)
    const storeIds = cashStoreData.map(d => d.storeId);
    const deleteResult = await offersCollection.deleteMany({
      'store.id': { $in: storeIds }
    });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} old seeded offers\n`);

    // Create new offers
    const offers = cashStoreData.map(createOffer);

    console.log('🌱 Seeding Cash Store offers...');
    console.log(`   Inserting ${offers.length} offers...\n`);

    const result = await offersCollection.insertMany(offers);
    console.log(`✅ Inserted ${result.insertedCount} offers\n`);

    // Verify
    const categories = await offersCollection.distinct('category');
    console.log('📊 Categories in database:');
    console.log(`   ${categories.join(', ')}\n`);

    // Count featured
    const featuredCount = await offersCollection.countDocuments({ 'metadata.featured': true });
    const trendingCount = await offersCollection.countDocuments({ 'metadata.isTrending': true });
    const highCashbackCount = await offersCollection.countDocuments({ cashbackPercentage: { $gte: 10 } });

    console.log('📈 Filter counts:');
    console.log(`   Featured (Popular): ${featuredCount}`);
    console.log(`   Trending: ${trendingCount}`);
    console.log(`   High Cashback (10%+): ${highCashbackCount}`);

    console.log('\n✅ Seeding complete! Restart your frontend to test.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

seedCashStore();
