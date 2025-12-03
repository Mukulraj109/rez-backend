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
    },
    // New category for Books & Stationery
    {
        name: 'Books & Stationery',
        slug: 'books-stationery',
        description: 'Books, stationery and office supplies',
        icon: '📖',
        type: 'home_delivery',
        metadata: {
            color: '#9B59B6',
            featured: false,
            tags: ['books', 'stationery', 'office']
        },
        sortOrder: 20,
        isActive: true
    },
    // Jewellery category
    {
        name: 'Jewellery',
        slug: 'jewellery',
        description: 'Jewellery and accessories',
        icon: '💍',
        type: 'going_out',
        metadata: {
            color: '#F1C40F',
            featured: true,
            tags: ['jewellery', 'accessories', 'gold']
        },
        sortOrder: 21,
        isActive: true
    }
];
// Subcategories - will be linked to parent categories after they exist
const subcategoriesToSeed = [
    // Fashion subcategories
    { name: 'Men\'s Clothing', slug: 'mens-clothing', parentSlug: 'fashion', type: 'going_out' },
    { name: 'Women\'s Clothing', slug: 'womens-clothing', parentSlug: 'fashion', type: 'going_out' },
    { name: 'Kids Clothing', slug: 'kids-clothing', parentSlug: 'fashion', type: 'going_out' },
    { name: 'Footwear', slug: 'footwear', parentSlug: 'fashion', type: 'going_out' },
    { name: 'Accessories', slug: 'fashion-accessories', parentSlug: 'fashion', type: 'going_out' },
    // Electronics subcategories
    { name: 'Mobile Phones', slug: 'mobile-phones', parentSlug: 'electronics', type: 'home_delivery' },
    { name: 'Laptops', slug: 'laptops', parentSlug: 'electronics', type: 'home_delivery' },
    { name: 'Tablets', slug: 'tablets', parentSlug: 'electronics', type: 'home_delivery' },
    { name: 'Audio & Headphones', slug: 'audio-headphones', parentSlug: 'electronics', type: 'home_delivery' },
    { name: 'Cameras', slug: 'cameras', parentSlug: 'electronics', type: 'home_delivery' },
    { name: 'TV & Home Entertainment', slug: 'tv-home-entertainment', parentSlug: 'electronics', type: 'home_delivery' },
    { name: 'Computer Accessories', slug: 'computer-accessories', parentSlug: 'electronics', type: 'home_delivery' },
    // Clothing subcategories
    { name: 'Shirts', slug: 'shirts', parentSlug: 'clothing', type: 'home_delivery' },
    { name: 'T-Shirts', slug: 't-shirts', parentSlug: 'clothing', type: 'home_delivery' },
    { name: 'Pants & Jeans', slug: 'pants-jeans', parentSlug: 'clothing', type: 'home_delivery' },
    { name: 'Dresses', slug: 'dresses', parentSlug: 'clothing', type: 'home_delivery' },
    { name: 'Ethnic Wear', slug: 'ethnic-wear', parentSlug: 'clothing', type: 'home_delivery' },
    { name: 'Winter Wear', slug: 'winter-wear', parentSlug: 'clothing', type: 'home_delivery' },
    // Food & Beverage subcategories
    { name: 'Snacks', slug: 'snacks', parentSlug: 'food-beverage', type: 'home_delivery' },
    { name: 'Beverages', slug: 'beverages', parentSlug: 'food-beverage', type: 'home_delivery' },
    { name: 'Dairy Products', slug: 'dairy-products', parentSlug: 'food-beverage', type: 'home_delivery' },
    { name: 'Bakery', slug: 'bakery', parentSlug: 'food-beverage', type: 'home_delivery' },
    { name: 'Frozen Foods', slug: 'frozen-foods', parentSlug: 'food-beverage', type: 'home_delivery' },
    // Home & Garden subcategories
    { name: 'Furniture', slug: 'furniture', parentSlug: 'home-garden', type: 'home_delivery' },
    { name: 'Kitchen & Dining', slug: 'kitchen-dining', parentSlug: 'home-garden', type: 'home_delivery' },
    { name: 'Bedding & Bath', slug: 'bedding-bath', parentSlug: 'home-garden', type: 'home_delivery' },
    { name: 'Home Decor', slug: 'home-decor', parentSlug: 'home-garden', type: 'home_delivery' },
    { name: 'Garden & Outdoor', slug: 'garden-outdoor', parentSlug: 'home-garden', type: 'home_delivery' },
    { name: 'Lighting', slug: 'lighting', parentSlug: 'home-garden', type: 'home_delivery' },
    // Beauty & Health subcategories
    { name: 'Skincare', slug: 'skincare', parentSlug: 'beauty-health', type: 'home_delivery' },
    { name: 'Haircare', slug: 'haircare', parentSlug: 'beauty-health', type: 'home_delivery' },
    { name: 'Makeup', slug: 'makeup', parentSlug: 'beauty-health', type: 'home_delivery' },
    { name: 'Fragrances', slug: 'fragrances', parentSlug: 'beauty-health', type: 'home_delivery' },
    { name: 'Personal Care', slug: 'personal-care', parentSlug: 'beauty-health', type: 'home_delivery' },
    { name: 'Health Supplements', slug: 'health-supplements', parentSlug: 'beauty-health', type: 'home_delivery' },
    // Sports & Outdoors subcategories
    { name: 'Fitness Equipment', slug: 'fitness-equipment', parentSlug: 'sports-outdoors', type: 'home_delivery' },
    { name: 'Sports Clothing', slug: 'sports-clothing', parentSlug: 'sports-outdoors', type: 'home_delivery' },
    { name: 'Cycling', slug: 'cycling', parentSlug: 'sports-outdoors', type: 'home_delivery' },
    { name: 'Camping & Hiking', slug: 'camping-hiking', parentSlug: 'sports-outdoors', type: 'home_delivery' },
    { name: 'Team Sports', slug: 'team-sports', parentSlug: 'sports-outdoors', type: 'home_delivery' },
    // Books & Media subcategories
    { name: 'Fiction', slug: 'fiction', parentSlug: 'books-media', type: 'home_delivery' },
    { name: 'Non-Fiction', slug: 'non-fiction', parentSlug: 'books-media', type: 'home_delivery' },
    { name: 'Educational', slug: 'educational', parentSlug: 'books-media', type: 'home_delivery' },
    { name: 'Comics & Manga', slug: 'comics-manga', parentSlug: 'books-media', type: 'home_delivery' },
    { name: 'Music & Movies', slug: 'music-movies', parentSlug: 'books-media', type: 'home_delivery' },
    // Books & Stationery subcategories
    { name: 'Notebooks & Diaries', slug: 'notebooks-diaries', parentSlug: 'books-stationery', type: 'home_delivery' },
    { name: 'Pens & Pencils', slug: 'pens-pencils', parentSlug: 'books-stationery', type: 'home_delivery' },
    { name: 'Office Supplies', slug: 'office-supplies', parentSlug: 'books-stationery', type: 'home_delivery' },
    { name: 'Art Supplies', slug: 'art-supplies', parentSlug: 'books-stationery', type: 'home_delivery' },
    { name: 'School Supplies', slug: 'school-supplies', parentSlug: 'books-stationery', type: 'home_delivery' },
    // Toys & Games subcategories
    { name: 'Action Figures', slug: 'action-figures', parentSlug: 'toys-games', type: 'home_delivery' },
    { name: 'Board Games', slug: 'board-games', parentSlug: 'toys-games', type: 'home_delivery' },
    { name: 'Video Games', slug: 'video-games', parentSlug: 'toys-games', type: 'home_delivery' },
    { name: 'Educational Toys', slug: 'educational-toys', parentSlug: 'toys-games', type: 'home_delivery' },
    { name: 'Outdoor Toys', slug: 'outdoor-toys', parentSlug: 'toys-games', type: 'home_delivery' },
    // Grocery subcategories
    { name: 'Rice & Grains', slug: 'rice-grains', parentSlug: 'grocery', type: 'home_delivery' },
    { name: 'Pulses & Lentils', slug: 'pulses-lentils', parentSlug: 'grocery', type: 'home_delivery' },
    { name: 'Cooking Oil', slug: 'cooking-oil', parentSlug: 'grocery', type: 'home_delivery' },
    { name: 'Spices & Masala', slug: 'spices-masala', parentSlug: 'grocery', type: 'home_delivery' },
    { name: 'Flour & Atta', slug: 'flour-atta', parentSlug: 'grocery', type: 'home_delivery' },
    // Jewellery subcategories
    { name: 'Gold Jewellery', slug: 'gold-jewellery', parentSlug: 'jewellery', type: 'going_out' },
    { name: 'Silver Jewellery', slug: 'silver-jewellery', parentSlug: 'jewellery', type: 'going_out' },
    { name: 'Diamond Jewellery', slug: 'diamond-jewellery', parentSlug: 'jewellery', type: 'going_out' },
    { name: 'Artificial Jewellery', slug: 'artificial-jewellery', parentSlug: 'jewellery', type: 'going_out' },
    { name: 'Watches', slug: 'watches', parentSlug: 'jewellery', type: 'going_out' },
    // Restaurant subcategories
    { name: 'Fast Food', slug: 'fast-food', parentSlug: 'restaurant', type: 'going_out' },
    { name: 'Fine Dining', slug: 'fine-dining', parentSlug: 'restaurant', type: 'going_out' },
    { name: 'Cafe', slug: 'cafe', parentSlug: 'restaurant', type: 'going_out' },
    { name: 'Street Food', slug: 'street-food', parentSlug: 'restaurant', type: 'going_out' },
    { name: 'Bakery & Desserts', slug: 'bakery-desserts', parentSlug: 'restaurant', type: 'going_out' },
    // Gift subcategories
    { name: 'Birthday Gifts', slug: 'birthday-gifts', parentSlug: 'gift', type: 'going_out' },
    { name: 'Anniversary Gifts', slug: 'anniversary-gifts', parentSlug: 'gift', type: 'going_out' },
    { name: 'Wedding Gifts', slug: 'wedding-gifts', parentSlug: 'gift', type: 'going_out' },
    { name: 'Corporate Gifts', slug: 'corporate-gifts', parentSlug: 'gift', type: 'going_out' },
    { name: 'Personalized Gifts', slug: 'personalized-gifts', parentSlug: 'gift', type: 'going_out' },
    // Pet Supplies subcategories
    { name: 'Dog Supplies', slug: 'dog-supplies', parentSlug: 'pet-supplies', type: 'home_delivery' },
    { name: 'Cat Supplies', slug: 'cat-supplies', parentSlug: 'pet-supplies', type: 'home_delivery' },
    { name: 'Bird Supplies', slug: 'bird-supplies', parentSlug: 'pet-supplies', type: 'home_delivery' },
    { name: 'Fish & Aquarium', slug: 'fish-aquarium', parentSlug: 'pet-supplies', type: 'home_delivery' },
    { name: 'Pet Food', slug: 'pet-food', parentSlug: 'pet-supplies', type: 'home_delivery' },
    // Automotive subcategories
    { name: 'Car Accessories', slug: 'car-accessories', parentSlug: 'automotive', type: 'home_delivery' },
    { name: 'Bike Accessories', slug: 'bike-accessories', parentSlug: 'automotive', type: 'home_delivery' },
    { name: 'Car Care', slug: 'car-care', parentSlug: 'automotive', type: 'home_delivery' },
    { name: 'Tyres & Wheels', slug: 'tyres-wheels', parentSlug: 'automotive', type: 'home_delivery' },
    { name: 'Spare Parts', slug: 'spare-parts', parentSlug: 'automotive', type: 'home_delivery' },
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
        const finalCount = await Category_1.Category.countDocuments({ isActive: true, parentCategory: null });
        console.log(`\n✅ Active parent categories in database: ${finalCount}`);
        // ==================== SEED SUBCATEGORIES ====================
        console.log('\n\n📂 SEEDING SUBCATEGORIES...\n');
        // Get all parent categories with their slugs and IDs
        const allParentCategories = await Category_1.Category.find({ parentCategory: null }).select('_id slug name').lean();
        const parentCategoryMap = new Map(allParentCategories.map((cat) => [cat.slug, cat._id]));
        console.log(`📋 Found ${allParentCategories.length} parent categories to link subcategories`);
        // Check existing subcategories
        const existingSubcategories = await Category_1.Category.find({ parentCategory: { $ne: null } }).select('slug').lean();
        const existingSubcategorySlugs = new Set(existingSubcategories.map((cat) => cat.slug));
        console.log(`📊 Found ${existingSubcategories.length} existing subcategories`);
        // Filter subcategories that need to be created
        const subcategoriesToCreate = subcategoriesToSeed.filter(sub => !existingSubcategorySlugs.has(sub.slug));
        console.log(`🆕 Subcategories to create: ${subcategoriesToCreate.length}`);
        if (subcategoriesToCreate.length === 0) {
            console.log('✅ All subcategories already exist in the database!');
        }
        else {
            // Create missing subcategories
            console.log('\n🌱 Creating subcategories...');
            let subcreatedCount = 0;
            let suberrorCount = 0;
            for (const subcategoryData of subcategoriesToCreate) {
                try {
                    const parentId = parentCategoryMap.get(subcategoryData.parentSlug);
                    if (!parentId) {
                        console.log(`   ⚠️  Skipped: ${subcategoryData.name} - parent "${subcategoryData.parentSlug}" not found`);
                        continue;
                    }
                    const subcategory = new Category_1.Category({
                        name: subcategoryData.name,
                        slug: subcategoryData.slug,
                        description: `${subcategoryData.name} products`,
                        type: subcategoryData.type,
                        parentCategory: parentId,
                        isActive: true,
                        metadata: {
                            featured: false,
                            tags: [subcategoryData.slug.replace(/-/g, ' ')]
                        }
                    });
                    await subcategory.save();
                    console.log(`   ✅ Created: ${subcategoryData.name} → ${subcategoryData.parentSlug}`);
                    subcreatedCount++;
                }
                catch (error) {
                    if (error.code === 11000) {
                        console.log(`   ⚠️  Skipped: ${subcategoryData.name} (${subcategoryData.slug}) - already exists`);
                    }
                    else {
                        console.error(`   ❌ Error creating ${subcategoryData.name}:`, error.message);
                        suberrorCount++;
                    }
                }
            }
            console.log(`\n📈 Subcategories Summary:`);
            console.log(`   ✅ Created: ${subcreatedCount}`);
            console.log(`   ❌ Errors: ${suberrorCount}`);
        }
        // Final verification
        const finalSubcategoryCount = await Category_1.Category.countDocuments({ isActive: true, parentCategory: { $ne: null } });
        const totalCategories = await Category_1.Category.countDocuments({ isActive: true });
        console.log(`\n📊 Final Category Count:`);
        console.log(`   📁 Parent Categories: ${finalCount}`);
        console.log(`   📂 Subcategories: ${finalSubcategoryCount}`);
        console.log(`   📦 Total: ${totalCategories}`);
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
