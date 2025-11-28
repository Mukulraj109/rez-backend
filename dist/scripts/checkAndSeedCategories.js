"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Category_1 = require("../models/Category");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
const DB_NAME = process.env.DB_NAME || 'test';
// Categories based on what's shown on the frontend home page
const categoriesToSeed = [
    // Going Out categories
    {
        name: 'Fashion',
        slug: 'fashion',
        description: 'Fashion and clothing stores',
        icon: '👗',
        type: 'going_out',
        metadata: {
            color: '#FF6B6B',
            featured: true,
            tags: ['fashion', 'clothing', 'apparel']
        },
        sortOrder: 1,
        isActive: true
    },
    {
        name: 'Fleet Market',
        slug: 'fleet-market',
        description: 'Fleet and automotive market',
        icon: '🚗',
        type: 'going_out',
        metadata: {
            color: '#4ECDC4',
            featured: true,
            tags: ['fleet', 'automotive', 'cars']
        },
        sortOrder: 2,
        isActive: true
    },
    {
        name: 'Gift',
        slug: 'gift',
        description: 'Gift shops and gift items',
        icon: '🎁',
        type: 'going_out',
        metadata: {
            color: '#45B7D1',
            featured: true,
            tags: ['gift', 'presents', 'gifting']
        },
        sortOrder: 3,
        isActive: true
    },
    {
        name: 'Restaurant',
        slug: 'restaurant',
        description: 'Restaurants and dining',
        icon: '🍽️',
        type: 'going_out',
        metadata: {
            color: '#FFA07A',
            featured: true,
            tags: ['restaurant', 'dining', 'food']
        },
        sortOrder: 4,
        isActive: true
    },
    // Home Delivery categories
    {
        name: 'Organic',
        slug: 'organic',
        description: 'Organic products and groceries',
        icon: '🌿',
        type: 'home_delivery',
        metadata: {
            color: '#96CEB4',
            featured: true,
            tags: ['organic', 'natural', 'healthy']
        },
        sortOrder: 5,
        isActive: true
    },
    {
        name: 'Grocery',
        slug: 'grocery',
        description: 'Grocery and daily essentials',
        icon: '🛒',
        type: 'home_delivery',
        metadata: {
            color: '#FFEAA7',
            featured: true,
            tags: ['grocery', 'essentials', 'daily']
        },
        sortOrder: 6,
        isActive: true
    },
    {
        name: 'Medicine',
        slug: 'medicine',
        description: 'Pharmacy and medicine',
        icon: '💊',
        type: 'home_delivery',
        metadata: {
            color: '#DDA0DD',
            featured: true,
            tags: ['medicine', 'pharmacy', 'health']
        },
        sortOrder: 7,
        isActive: true
    },
    {
        name: 'Fruit',
        slug: 'fruit',
        description: 'Fresh fruits and produce',
        icon: '🍎',
        type: 'home_delivery',
        metadata: {
            color: '#FF6B9D',
            featured: true,
            tags: ['fruit', 'fresh', 'produce']
        },
        sortOrder: 8,
        isActive: true
    },
    // Additional common categories for products
    {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronics and gadgets',
        icon: '📱',
        type: 'home_delivery',
        metadata: {
            color: '#FFD93D',
            featured: false,
            tags: ['electronics', 'gadgets', 'tech']
        },
        sortOrder: 9,
        isActive: true
    },
    {
        name: 'Clothing',
        slug: 'clothing',
        description: 'Clothing and apparel',
        icon: '👕',
        type: 'home_delivery',
        metadata: {
            color: '#6BCB77',
            featured: false,
            tags: ['clothing', 'apparel', 'fashion']
        },
        sortOrder: 10,
        isActive: true
    },
    {
        name: 'Food & Beverage',
        slug: 'food-beverage',
        description: 'Food and beverages',
        icon: '🍕',
        type: 'home_delivery',
        metadata: {
            color: '#4ECDC4',
            featured: false,
            tags: ['food', 'beverage', 'drinks']
        },
        sortOrder: 11,
        isActive: true
    },
    {
        name: 'Home & Garden',
        slug: 'home-garden',
        description: 'Home and garden products',
        icon: '🏠',
        type: 'home_delivery',
        metadata: {
            color: '#95E1D3',
            featured: false,
            tags: ['home', 'garden', 'furniture']
        },
        sortOrder: 12,
        isActive: true
    },
    {
        name: 'Beauty & Health',
        slug: 'beauty-health',
        description: 'Beauty and health products',
        icon: '💄',
        type: 'home_delivery',
        metadata: {
            color: '#F38181',
            featured: false,
            tags: ['beauty', 'health', 'cosmetics']
        },
        sortOrder: 13,
        isActive: true
    },
    {
        name: 'Sports & Outdoors',
        slug: 'sports-outdoors',
        description: 'Sports and outdoor equipment',
        icon: '⚽',
        type: 'home_delivery',
        metadata: {
            color: '#AA96DA',
            featured: false,
            tags: ['sports', 'outdoors', 'fitness']
        },
        sortOrder: 14,
        isActive: true
    },
    {
        name: 'Books & Media',
        slug: 'books-media',
        description: 'Books and media products',
        icon: '📚',
        type: 'home_delivery',
        metadata: {
            color: '#FCBAD3',
            featured: false,
            tags: ['books', 'media', 'entertainment']
        },
        sortOrder: 15,
        isActive: true
    },
    {
        name: 'Toys & Games',
        slug: 'toys-games',
        description: 'Toys and games',
        icon: '🎮',
        type: 'home_delivery',
        metadata: {
            color: '#FFD93D',
            featured: false,
            tags: ['toys', 'games', 'entertainment']
        },
        sortOrder: 16,
        isActive: true
    },
    {
        name: 'Automotive',
        slug: 'automotive',
        description: 'Automotive products and accessories',
        icon: '🚙',
        type: 'home_delivery',
        metadata: {
            color: '#95A5A6',
            featured: false,
            tags: ['automotive', 'cars', 'vehicles']
        },
        sortOrder: 17,
        isActive: true
    },
    {
        name: 'Pet Supplies',
        slug: 'pet-supplies',
        description: 'Pet supplies and accessories',
        icon: '🐾',
        type: 'home_delivery',
        metadata: {
            color: '#F39C12',
            featured: false,
            tags: ['pets', 'animals', 'supplies']
        },
        sortOrder: 18,
        isActive: true
    },
    {
        name: 'Other',
        slug: 'other',
        description: 'Other products',
        icon: '📦',
        type: 'general',
        metadata: {
            color: '#BDC3C7',
            featured: false,
            tags: ['other', 'misc']
        },
        sortOrder: 99,
        isActive: true
    }
];
async function checkAndSeedCategories() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        console.log(`   URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
        console.log(`   Database: ${DB_NAME}`);
        // Connect to MongoDB
        await mongoose_1.default.connect(MONGODB_URI, {
            dbName: DB_NAME,
        });
        console.log('✅ Connected to MongoDB');
        // Check existing categories
        const existingCategories = await Category_1.Category.find({}).select('name slug').lean();
        console.log(`\n📊 Found ${existingCategories.length} existing categories in database`);
        if (existingCategories.length > 0) {
            console.log('\n📋 Existing categories:');
            existingCategories.forEach((cat) => {
                console.log(`   - ${cat.name} (${cat.slug})`);
            });
        }
        // Check which categories need to be created
        const existingSlugs = new Set(existingCategories.map((cat) => cat.slug));
        const categoriesToCreate = categoriesToSeed.filter(cat => !existingSlugs.has(cat.slug));
        console.log(`\n🆕 Categories to create: ${categoriesToCreate.length}`);
        if (categoriesToCreate.length === 0) {
            console.log('✅ All categories already exist in the database!');
            await mongoose_1.default.disconnect();
            return;
        }
        // Create missing categories
        console.log('\n🌱 Creating categories...');
        let createdCount = 0;
        let errorCount = 0;
        for (const categoryData of categoriesToCreate) {
            try {
                const category = new Category_1.Category(categoryData);
                await category.save();
                console.log(`   ✅ Created: ${categoryData.name} (${categoryData.slug})`);
                createdCount++;
            }
            catch (error) {
                if (error.code === 11000) {
                    console.log(`   ⚠️  Skipped: ${categoryData.name} (${categoryData.slug}) - already exists`);
                }
                else {
                    console.error(`   ❌ Error creating ${categoryData.name}:`, error.message);
                    errorCount++;
                }
            }
        }
        console.log(`\n📈 Summary:`);
        console.log(`   ✅ Created: ${createdCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📊 Total categories in DB: ${existingCategories.length + createdCount}`);
        // Verify final count
        const finalCount = await Category_1.Category.countDocuments({ isActive: true });
        console.log(`\n✅ Active categories in database: ${finalCount}`);
        await mongoose_1.default.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    }
    catch (error) {
        console.error('❌ Error:', error);
        await mongoose_1.default.disconnect();
        process.exit(1);
    }
}
// Run the script
if (require.main === module) {
    checkAndSeedCategories()
        .then(() => {
        console.log('\n🎉 Script completed successfully!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Script failed:', error);
        process.exit(1);
    });
}
exports.default = checkAndSeedCategories;
