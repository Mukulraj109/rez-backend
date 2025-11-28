"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedUGCVideos = seedUGCVideos;
const mongoose_1 = __importDefault(require("mongoose"));
const database_1 = require("../config/database");
const Video_1 = require("../models/Video");
const User_1 = require("../models/User");
const Product_1 = require("../models/Product");
const Store_1 = require("../models/Store");
/**
 * Comprehensive UGC Video Seeding Script
 * - Links videos to existing products (doesn't modify product data)
 * - Uses merchant users as creators
 * - Links videos to stores
 * - Creates shoppable video content
 */
async function seedUGCVideos() {
    try {
        console.log('🎬 Starting UGC Video seeding with real product linking...\n');
        // Connect to database
        await (0, database_1.connectDatabase)();
        console.log('✅ Connected to database\n');
        // === STEP 1: Fetch existing data ===
        console.log('📦 Fetching existing data from database...');
        // Get all products (we'll use these for linking)
        const products = await Product_1.Product.find({}).populate('store').lean();
        console.log(`   Found ${products.length} products in database`);
        if (products.length === 0) {
            console.log('❌ No products found! Please seed products first.');
            process.exit(1);
        }
        // Get all stores
        const stores = await Store_1.Store.find({}).lean();
        console.log(`   Found ${stores.length} stores in database`);
        if (stores.length === 0) {
            console.log('❌ No stores found! Please seed stores first.');
            process.exit(1);
        }
        // Get merchant users (users who own stores or have merchant role)
        const merchants = await User_1.User.find({
            $or: [
                { 'role': 'merchant' },
                { 'roles': { $in: ['merchant', 'seller'] } }
            ]
        }).lean();
        console.log(`   Found ${merchants.length} merchant users`);
        // If no merchants, use any user as creator
        const creators = merchants.length > 0 ? merchants : await User_1.User.find({}).limit(5).lean();
        if (creators.length === 0) {
            console.log('❌ No users found! Please seed users first.');
            process.exit(1);
        }
        console.log(`   Using ${creators.length} creators for videos\n`);
        // === STEP 2: Display existing data summary ===
        console.log('📊 Database Summary:');
        console.log(`   Products: ${products.length}`);
        console.log(`   Stores: ${stores.length}`);
        console.log(`   Merchants: ${creators.length}`);
        // Show sample products
        console.log('\n   Sample Products:');
        products.slice(0, 5).forEach((p, i) => {
            console.log(`      ${i + 1}. ${p.name} - ₹${p.basePrice} (${p.store?.name || 'No store'})`);
        });
        console.log('\n   Sample Stores:');
        stores.slice(0, 5).forEach((s, i) => {
            console.log(`      ${i + 1}. ${s.name} - ${s.category || 'General'}`);
        });
        console.log('\n');
        // === STEP 3: Clear existing videos ===
        const existingCount = await Video_1.Video.countDocuments({});
        if (existingCount > 0) {
            console.log(`🗑️  Clearing ${existingCount} existing videos...`);
            await Video_1.Video.deleteMany({});
        }
        // === STEP 4: Create videos with real product links ===
        console.log('\n🎥 Creating videos with product links...\n');
        const videoTemplates = [
            {
                title: `${products[0]?.name || 'Amazing Product'} - Complete Review & Unboxing`,
                description: `Detailed review of ${products[0]?.name}. Check out the amazing features and see if it's worth your money! #ProductReview #Shopping`,
                category: 'review',
                hashtags: ['#ProductReview', '#Unboxing', '#Shopping', '#MustHave'],
                tags: ['review', 'product', 'unboxing', 'shopping'],
                videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/samples/elephants.mp4',
                thumbnail: products[0]?.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
                productCount: 1,
                duration: 180
            },
            {
                title: 'Fashion Haul - Trending Styles You Need This Season!',
                description: 'Check out these trending fashion items! Swipe up to shop the look 👗✨ #FashionHaul #Trending',
                category: 'trending_her',
                hashtags: ['#FashionHaul', '#Trending', '#OOTD', '#Style'],
                tags: ['fashion', 'haul', 'trending', 'style', 'clothing'],
                videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/samples/sea-turtle.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
                productCount: 3,
                duration: 240
            },
            {
                title: 'How to Style These Must-Have Accessories',
                description: 'Quick styling tips with our bestselling accessories! Tap to shop 🛍️ #StyleTips #Accessories',
                category: 'tutorial',
                hashtags: ['#StyleTips', '#Accessories', '#Fashion', '#Tutorial'],
                tags: ['tutorial', 'styling', 'accessories', 'fashion', 'howto'],
                videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/samples/cld-sample-video.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=800',
                productCount: 2,
                duration: 120
            },
            {
                title: 'Top Picks for Men - Bestsellers This Week',
                description: 'Our top-selling products for men this week! Don\'t miss out on these deals 🔥 #MensFashion #Bestsellers',
                category: 'trending_me',
                hashtags: ['#MensFashion', '#Bestsellers', '#Shopping', '#Deals'],
                tags: ['mens', 'fashion', 'bestsellers', 'trending', 'deals'],
                videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/samples/elephants.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=800',
                productCount: 4,
                duration: 200
            },
            {
                title: `${stores[0]?.name || 'Our Store'} - New Arrivals Tour`,
                description: `Tour of our latest arrivals at ${stores[0]?.name}! So many amazing products 😍 #NewArrivals #Shopping`,
                category: 'featured',
                hashtags: ['#NewArrivals', '#Shopping', '#Store', '#MustSee'],
                tags: ['new', 'arrivals', 'store', 'tour', 'products'],
                videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/samples/sea-turtle.mp4',
                thumbnail: stores[0]?.banner || stores[0]?.logo || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
                productCount: 5,
                duration: 300
            },
            {
                title: 'Get Ready With Me - Using Our Beauty Products',
                description: 'Morning routine featuring our skincare and makeup products! Links below 💄 #GRWM #Beauty',
                category: 'trending_her',
                hashtags: ['#GRWM', '#Beauty', '#Skincare', '#Makeup'],
                tags: ['beauty', 'grwm', 'skincare', 'makeup', 'routine'],
                videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/samples/cld-sample-video.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800',
                productCount: 3,
                duration: 180
            },
            {
                title: 'Budget Shopping Tips - Quality Under ₹1000',
                description: 'Found amazing quality products under ₹1000! Proving you don\'t need to spend a lot 💰 #BudgetShopping',
                category: 'article',
                hashtags: ['#BudgetShopping', '#Affordable', '#QualityProducts', '#SavingMoney'],
                tags: ['budget', 'affordable', 'shopping', 'tips', 'quality'],
                videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/samples/elephants.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800',
                productCount: 6,
                duration: 220
            },
            {
                title: 'Unboxing Luxury Items - Worth the Hype?',
                description: 'Unboxing some premium products! Let\'s see if they\'re worth the price 💎 #Luxury #Unboxing',
                category: 'review',
                hashtags: ['#Luxury', '#Unboxing', '#Premium', '#Review'],
                tags: ['luxury', 'unboxing', 'premium', 'review', 'worth'],
                videoUrl: 'https://res.cloudinary.com/demo/video/upload/v1/samples/sea-turtle.mp4',
                thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
                productCount: 2,
                duration: 280
            }
        ];
        const videos = [];
        for (let i = 0; i < videoTemplates.length; i++) {
            const template = videoTemplates[i];
            const creator = creators[i % creators.length];
            // Select random products for this video
            const productCount = Math.min(template.productCount, products.length);
            const selectedProducts = [];
            const selectedStores = new Set();
            // Get random products
            for (let j = 0; j < productCount; j++) {
                const randomIndex = (i + j * 3) % products.length;
                const product = products[randomIndex];
                selectedProducts.push(product._id);
                // Track stores from products
                if (product.store?._id) {
                    selectedStores.add(product.store._id.toString());
                }
            }
            // If no stores from products, add random store
            if (selectedStores.size === 0 && stores.length > 0) {
                selectedStores.add(stores[i % stores.length]._id.toString());
            }
            const video = {
                title: template.title,
                description: template.description,
                creator: creator._id,
                videoUrl: template.videoUrl,
                thumbnail: template.thumbnail,
                category: template.category,
                tags: template.tags,
                hashtags: template.hashtags,
                products: selectedProducts,
                stores: Array.from(selectedStores).map((id) => new mongoose_1.default.Types.ObjectId(id)),
                metadata: {
                    duration: template.duration,
                    resolution: '1080p',
                    format: 'mp4',
                    aspectRatio: '9:16',
                    fps: 30,
                    fileSize: template.duration * 2000000 // Approx 2MB per second
                },
                engagement: {
                    views: Math.floor(Math.random() * 50000) + 1000,
                    likes: [],
                    shares: Math.floor(Math.random() * 500),
                    comments: Math.floor(Math.random() * 100),
                    saves: Math.floor(Math.random() * 200),
                    reports: 0
                },
                analytics: {
                    totalViews: Math.floor(Math.random() * 50000) + 1000,
                    uniqueViews: Math.floor(Math.random() * 40000) + 800,
                    avgWatchTime: template.duration * 0.7, // 70% watch time
                    completionRate: 65 + Math.floor(Math.random() * 25), // 65-90%
                    engagementRate: 5 + Math.floor(Math.random() * 10), // 5-15%
                    shareRate: 2 + Math.floor(Math.random() * 5), // 2-7%
                    likeRate: 10 + Math.floor(Math.random() * 15), // 10-25%
                    likes: Math.floor(Math.random() * 1000),
                    comments: Math.floor(Math.random() * 100),
                    shares: Math.floor(Math.random() * 500),
                    engagement: Math.floor(Math.random() * 2000),
                    viewsByHour: {},
                    viewsByDate: {}
                },
                reports: [],
                reportCount: 0,
                isReported: false,
                isPublished: true,
                isApproved: true,
                isFeatured: i === 0, // First video is featured
                isTrending: [0, 1, 3].includes(i), // First few are trending
                isSponsored: false,
                moderationStatus: 'approved',
                privacy: 'public',
                allowComments: true,
                allowSharing: true,
                publishedAt: new Date(Date.now() - (i + 1) * 86400000), // Spread over days
                likedBy: [],
                comments: []
            };
            videos.push(video);
            const creatorName = creator.profile?.firstName || 'Unknown';
            const productNames = selectedProducts.map((pid) => {
                const p = products.find((pr) => pr._id.toString() === pid.toString());
                return p?.name || 'Product';
            }).slice(0, 2).join(', ');
            console.log(`   ✅ Video ${i + 1}: "${template.title}"`);
            console.log(`      👤 Creator: ${creatorName}`);
            console.log(`      🛍️  Products: ${selectedProducts.length} (${productNames}${selectedProducts.length > 2 ? '...' : ''})`);
            console.log(`      🏪 Stores: ${selectedStores.size}`);
            console.log(`      📹 Category: ${template.category}`);
            console.log('');
        }
        // Insert all videos
        const createdVideos = await Video_1.Video.insertMany(videos);
        console.log(`\n✅ Successfully created ${createdVideos.length} videos!\n`);
        // === STEP 5: Display summary ===
        console.log('📊 Final Summary:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        const categories = {
            'trending_me': 0,
            'trending_her': 0,
            'review': 0,
            'tutorial': 0,
            'article': 0,
            'featured': 0
        };
        let totalProducts = 0;
        let totalViews = 0;
        for (const video of createdVideos) {
            categories[video.category]++;
            totalProducts += video.products.length;
            totalViews += video.engagement.views;
        }
        console.log(`   Total Videos: ${createdVideos.length}`);
        console.log(`   Total Product Links: ${totalProducts}`);
        console.log(`   Total Views: ${totalViews.toLocaleString()}`);
        console.log(`   Featured Videos: ${createdVideos.filter((v) => v.isFeatured).length}`);
        console.log(`   Trending Videos: ${createdVideos.filter((v) => v.isTrending).length}`);
        console.log('');
        console.log('   Videos by Category:');
        Object.entries(categories).forEach(([cat, count]) => {
            if (count > 0) {
                console.log(`      • ${cat}: ${count}`);
            }
        });
        console.log('\n🎉 UGC Video seeding completed successfully!');
        console.log('   Videos are now linked to existing products and stores.');
        console.log('   Ready to test in your app!\n');
    }
    catch (error) {
        console.error('❌ Error seeding UGC videos:', error);
        process.exit(1);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('👋 Disconnected from database');
        process.exit(0);
    }
}
// Run if executed directly
if (require.main === module) {
    seedUGCVideos();
}
