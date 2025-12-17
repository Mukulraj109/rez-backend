/**
 * Cash Store Seed Script
 * Run: node seed-cashstore.js
 *
 * Seeds the database with sample offers for Cash Store category filtering.
 */

const mongoose = require('mongoose');

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://mukulraj756:O71qVcqwpJQvXzWi@cluster0.aulqar3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'test';

// Sample Cash Store Offers with proper categories
const cashStoreOffers = [
  // FASHION (5 offers)
  {
    title: 'Myntra Fashion Sale',
    subtitle: 'Upto 70% off on fashion',
    category: 'fashion',
    cashbackPercentage: 8,
    discountType: 'percentage',
    discountValue: 70,
    store: {
      id: 'myntra-001',
      name: 'Myntra',
      logo: 'https://logo.clearbit.com/myntra.com',
      rating: 4.5,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: true,
      isTrending: true,
      priority: 10,
    },
    isActive: true,
  },
  {
    title: 'AJIO Style Sale',
    subtitle: 'Fashion at best prices',
    category: 'fashion',
    cashbackPercentage: 12,
    discountType: 'percentage',
    discountValue: 50,
    store: {
      id: 'ajio-001',
      name: 'AJIO',
      logo: 'https://logo.clearbit.com/ajio.com',
      rating: 4.3,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: true,
      isTrending: false,
      priority: 8,
    },
    isActive: true,
  },
  {
    title: 'H&M Collection',
    subtitle: 'New arrivals',
    category: 'fashion',
    cashbackPercentage: 5,
    discountType: 'percentage',
    discountValue: 30,
    store: {
      id: 'hm-001',
      name: 'H&M',
      logo: 'https://logo.clearbit.com/hm.com',
      rating: 4.4,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: false,
      isTrending: false,
      priority: 5,
    },
    isActive: true,
  },

  // ELECTRONICS (5 offers)
  {
    title: 'Amazon Electronics Sale',
    subtitle: 'Best deals on electronics',
    category: 'electronics',
    cashbackPercentage: 5,
    discountType: 'percentage',
    discountValue: 40,
    store: {
      id: 'amazon-001',
      name: 'Amazon',
      logo: 'https://logo.clearbit.com/amazon.in',
      rating: 4.7,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: true,
      isTrending: true,
      priority: 10,
    },
    isActive: true,
  },
  {
    title: 'Flipkart Big Billion',
    subtitle: 'Electronics at lowest prices',
    category: 'electronics',
    cashbackPercentage: 7,
    discountType: 'percentage',
    discountValue: 60,
    store: {
      id: 'flipkart-001',
      name: 'Flipkart',
      logo: 'https://logo.clearbit.com/flipkart.com',
      rating: 4.6,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: true,
      isTrending: true,
      priority: 9,
    },
    isActive: true,
  },
  {
    title: 'Croma Tech Fest',
    subtitle: 'Premium electronics',
    category: 'electronics',
    cashbackPercentage: 4,
    discountType: 'percentage',
    discountValue: 25,
    store: {
      id: 'croma-001',
      name: 'Croma',
      logo: 'https://logo.clearbit.com/croma.com',
      rating: 4.2,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: false,
      isTrending: false,
      priority: 5,
    },
    isActive: true,
  },
  {
    title: 'Reliance Digital Deals',
    subtitle: 'Electronics & Appliances',
    category: 'electronics',
    cashbackPercentage: 6,
    discountType: 'percentage',
    discountValue: 35,
    store: {
      id: 'reliance-001',
      name: 'Reliance Digital',
      logo: 'https://logo.clearbit.com/reliancedigital.in',
      rating: 4.3,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: true,
      isTrending: false,
      priority: 7,
    },
    isActive: true,
  },

  // FOOD (4 offers)
  {
    title: 'Swiggy Food Fest',
    subtitle: 'Order food & earn cashback',
    category: 'food',
    cashbackPercentage: 15,
    discountType: 'percentage',
    discountValue: 50,
    store: {
      id: 'swiggy-001',
      name: 'Swiggy',
      logo: 'https://logo.clearbit.com/swiggy.com',
      rating: 4.4,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: true,
      isTrending: true,
      priority: 9,
    },
    isActive: true,
  },
  {
    title: 'Zomato Offers',
    subtitle: 'Food delivery deals',
    category: 'food',
    cashbackPercentage: 12,
    discountType: 'percentage',
    discountValue: 40,
    store: {
      id: 'zomato-001',
      name: 'Zomato',
      logo: 'https://logo.clearbit.com/zomato.com',
      rating: 4.5,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: true,
      isTrending: true,
      priority: 8,
    },
    isActive: true,
  },
  {
    title: 'Dominos Pizza Party',
    subtitle: 'Buy 1 Get 1 Free',
    category: 'food',
    cashbackPercentage: 10,
    discountType: 'percentage',
    discountValue: 50,
    store: {
      id: 'dominos-001',
      name: 'Dominos',
      logo: 'https://logo.clearbit.com/dominos.co.in',
      rating: 4.2,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: false,
      isTrending: false,
      priority: 6,
    },
    isActive: true,
  },

  // TRAVEL (4 offers)
  {
    title: 'MakeMyTrip Deals',
    subtitle: 'Book flights & hotels',
    category: 'travel',
    cashbackPercentage: 8,
    discountType: 'percentage',
    discountValue: 25,
    store: {
      id: 'mmt-001',
      name: 'MakeMyTrip',
      logo: 'https://logo.clearbit.com/makemytrip.com',
      rating: 4.3,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: true,
      isTrending: true,
      priority: 8,
    },
    isActive: true,
  },
  {
    title: 'Goibibo Travel Sale',
    subtitle: 'Lowest fare guarantee',
    category: 'travel',
    cashbackPercentage: 6,
    discountType: 'percentage',
    discountValue: 20,
    store: {
      id: 'goibibo-001',
      name: 'Goibibo',
      logo: 'https://logo.clearbit.com/goibibo.com',
      rating: 4.2,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: true,
      isTrending: false,
      priority: 7,
    },
    isActive: true,
  },
  {
    title: 'OYO Rooms',
    subtitle: 'Budget hotels',
    category: 'travel',
    cashbackPercentage: 10,
    discountType: 'percentage',
    discountValue: 40,
    store: {
      id: 'oyo-001',
      name: 'OYO',
      logo: 'https://logo.clearbit.com/oyorooms.com',
      rating: 4.0,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: false,
      isTrending: false,
      priority: 5,
    },
    isActive: true,
  },

  // BEAUTY (3 offers)
  {
    title: 'Nykaa Beauty Sale',
    subtitle: 'Premium cosmetics',
    category: 'beauty',
    cashbackPercentage: 10,
    discountType: 'percentage',
    discountValue: 50,
    store: {
      id: 'nykaa-001',
      name: 'Nykaa',
      logo: 'https://logo.clearbit.com/nykaa.com',
      rating: 4.5,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: true,
      isTrending: true,
      priority: 9,
    },
    isActive: true,
  },
  {
    title: 'Mamaearth Natural',
    subtitle: 'Natural beauty products',
    category: 'beauty',
    cashbackPercentage: 15,
    discountType: 'percentage',
    discountValue: 35,
    store: {
      id: 'mamaearth-001',
      name: 'Mamaearth',
      logo: 'https://logo.clearbit.com/mamaearth.in',
      rating: 4.4,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: true,
      isTrending: false,
      priority: 7,
    },
    isActive: true,
  },

  // GROCERIES (3 offers)
  {
    title: 'BigBasket Groceries',
    subtitle: 'Daily essentials',
    category: 'groceries',
    cashbackPercentage: 5,
    discountType: 'percentage',
    discountValue: 20,
    store: {
      id: 'bigbasket-001',
      name: 'BigBasket',
      logo: 'https://logo.clearbit.com/bigbasket.com',
      rating: 4.3,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: true,
      isTrending: false,
      priority: 7,
    },
    isActive: true,
  },
  {
    title: 'JioMart Deals',
    subtitle: 'Groceries at doorstep',
    category: 'groceries',
    cashbackPercentage: 8,
    discountType: 'percentage',
    discountValue: 30,
    store: {
      id: 'jiomart-001',
      name: 'JioMart',
      logo: 'https://logo.clearbit.com/jiomart.com',
      rating: 4.1,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: true,
      isTrending: true,
      priority: 8,
    },
    isActive: true,
  },
  {
    title: 'Blinkit Quick',
    subtitle: '10 minute delivery',
    category: 'groceries',
    cashbackPercentage: 6,
    discountType: 'percentage',
    discountValue: 25,
    store: {
      id: 'blinkit-001',
      name: 'Blinkit',
      logo: 'https://logo.clearbit.com/blinkit.com',
      rating: 4.2,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: false,
      isTrending: true,
      priority: 6,
    },
    isActive: true,
  },

  // SHOPPING (3 offers)
  {
    title: 'Meesho Deals',
    subtitle: 'Affordable shopping',
    category: 'shopping',
    cashbackPercentage: 10,
    discountType: 'percentage',
    discountValue: 60,
    store: {
      id: 'meesho-001',
      name: 'Meesho',
      logo: 'https://logo.clearbit.com/meesho.com',
      rating: 4.0,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: true,
      isTrending: true,
      priority: 7,
    },
    isActive: true,
  },
  {
    title: 'Shopsy Sale',
    subtitle: 'Budget shopping',
    category: 'shopping',
    cashbackPercentage: 12,
    discountType: 'percentage',
    discountValue: 70,
    store: {
      id: 'shopsy-001',
      name: 'Shopsy',
      logo: 'https://logo.clearbit.com/shopsy.in',
      rating: 3.9,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: false,
      isTrending: false,
      priority: 5,
    },
    isActive: true,
  },

  // ENTERTAINMENT (2 offers)
  {
    title: 'BookMyShow',
    subtitle: 'Movies & Events',
    category: 'entertainment',
    cashbackPercentage: 8,
    discountType: 'percentage',
    discountValue: 20,
    store: {
      id: 'bms-001',
      name: 'BookMyShow',
      logo: 'https://logo.clearbit.com/bookmyshow.com',
      rating: 4.4,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: true,
      isTrending: true,
      priority: 8,
    },
    isActive: true,
  },
  {
    title: 'PVR Cinemas',
    subtitle: 'Movie tickets',
    category: 'entertainment',
    cashbackPercentage: 5,
    discountType: 'percentage',
    discountValue: 15,
    store: {
      id: 'pvr-001',
      name: 'PVR Cinemas',
      logo: 'https://logo.clearbit.com/pvrcinemas.com',
      rating: 4.3,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: false,
      isTrending: false,
      priority: 5,
    },
    isActive: true,
  },

  // FINANCE (2 offers)
  {
    title: 'PhonePe Rewards',
    subtitle: 'Pay & earn cashback',
    category: 'finance',
    cashbackPercentage: 3,
    discountType: 'percentage',
    discountValue: 10,
    store: {
      id: 'phonepe-001',
      name: 'PhonePe',
      logo: 'https://logo.clearbit.com/phonepe.com',
      rating: 4.5,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: true,
      isTrending: false,
      priority: 6,
    },
    isActive: true,
  },
  {
    title: 'Paytm Offers',
    subtitle: 'Recharge & bills',
    category: 'finance',
    cashbackPercentage: 4,
    discountType: 'percentage',
    discountValue: 15,
    store: {
      id: 'paytm-001',
      name: 'Paytm',
      logo: 'https://logo.clearbit.com/paytm.com',
      rating: 4.2,
      verified: true,
    },
    validity: {
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    metadata: {
      featured: true,
      isTrending: false,
      priority: 6,
    },
    isActive: true,
  },
];

async function seedCashStore() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const offersCollection = db.collection('offers');

    // Add timestamps
    const offersWithTimestamps = cashStoreOffers.map(offer => ({
      ...offer,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    console.log('🌱 Seeding Cash Store offers...');
    console.log(`   Inserting ${offersWithTimestamps.length} offers...\n`);

    const result = await offersCollection.insertMany(offersWithTimestamps);
    console.log(`✅ Inserted ${result.insertedCount} offers\n`);

    // Verify categories
    const categories = await offersCollection.distinct('category');
    console.log('📊 Categories now in database:');
    console.log(`   ${categories.join(', ')}\n`);

    // Count by category
    console.log('📈 Offers by category:');
    for (const category of categories) {
      const count = await offersCollection.countDocuments({ category });
      console.log(`   ${category}: ${count}`);
    }

    console.log('\n✅ Seeding complete!');
    console.log('   You can now test the Cash Store category filters.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

seedCashStore();
