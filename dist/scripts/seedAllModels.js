"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAllModels = seedAllModels;
const child_process_1 = require("child_process");
async function seedAllModels() {
    try {
        console.log('🚀 Starting comprehensive database seeding...');
        console.log('=====================================\n');
        // Step 1: Seed basic models first (users, categories, stores, products)
        console.log('📋 Step 1: Basic Models (Users, Categories, Stores, Products)');
        console.log('──────────────────────────────────────────────────────────');
        await seedData();
        console.log('✅ Basic models seeded successfully\n');
        // Wait a moment for the database to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Step 2: Seed dependent models
        console.log('📋 Step 2: Dependent Models');
        console.log('──────────────────────────────────────────────────────────');
        console.log('🛒 Seeding Carts...');
        await seedCarts();
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('📦 Seeding Orders...');
        await seedOrders();
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('🎥 Seeding Videos...');
        await seedVideos();
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('⭐ Seeding Reviews...');
        await seedReviews();
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('💝 Seeding Wishlists...');
        await seedWishlists();
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('🔔 Seeding Notifications...');
        await seedNotifications();
        console.log('\n=====================================');
        console.log('🎉 ALL MODELS SEEDED SUCCESSFULLY!');
        console.log('=====================================');
        console.log('\n📊 Final Database Summary:');
        console.log('👤 Users: 2+ with complete profiles');
        console.log('📂 Categories: 3 (Electronics, Fashion, Food)');
        console.log('🏪 Stores: 2 with full business details');
        console.log('📦 Products: 2+ with rich data & relationships');
        console.log('🛒 Carts: Multiple with user-product relationships');
        console.log('📋 Orders: Multiple with complete order lifecycle');
        console.log('🎥 Videos: 6 content videos with engagement data');
        console.log('⭐ Reviews: Multiple product reviews with ratings');
        console.log('💝 Wishlists: User wishlists with product preferences');
        console.log('🔔 Notifications: User notifications across all types');
        console.log('\n✅ Your backend is now fully populated with interconnected dummy data!');
        console.log('🚀 Ready for comprehensive frontend testing!');
    }
    catch (error) {
        console.error('❌ Error in comprehensive seeding:', error);
        process.exit(1);
    }
}
// Override the individual seeding functions to prevent duplicate database connections
async function seedData() {
    // This will be handled by the individual seeding scripts
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)('npm run seed:simple', (error, stdout, stderr) => {
            if (error) {
                console.error('Error running basic seeding:', error);
                reject(error);
            }
            else {
                console.log(stdout);
                resolve(stdout);
            }
        });
    });
}
async function seedCarts() {
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)('npx ts-node src/scripts/seedCarts.ts', (error, stdout, stderr) => {
            if (error) {
                console.error('Error seeding carts:', error);
                reject(error);
            }
            else {
                console.log(stdout);
                resolve(stdout);
            }
        });
    });
}
async function seedOrders() {
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)('npx ts-node src/scripts/seedOrders.ts', (error, stdout, stderr) => {
            if (error) {
                console.error('Error seeding orders:', error);
                reject(error);
            }
            else {
                console.log(stdout);
                resolve(stdout);
            }
        });
    });
}
async function seedVideos() {
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)('npx ts-node src/scripts/seedVideos.ts', (error, stdout, stderr) => {
            if (error) {
                console.error('Error seeding videos:', error);
                reject(error);
            }
            else {
                console.log(stdout);
                resolve(stdout);
            }
        });
    });
}
async function seedReviews() {
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)('npx ts-node src/scripts/seedReviews.ts', (error, stdout, stderr) => {
            if (error) {
                console.error('Error seeding reviews:', error);
                reject(error);
            }
            else {
                console.log(stdout);
                resolve(stdout);
            }
        });
    });
}
async function seedWishlists() {
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)('npx ts-node src/scripts/seedWishlists.ts', (error, stdout, stderr) => {
            if (error) {
                console.error('Error seeding wishlists:', error);
                reject(error);
            }
            else {
                console.log(stdout);
                resolve(stdout);
            }
        });
    });
}
async function seedNotifications() {
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)('npx ts-node src/scripts/seedNotifications.ts', (error, stdout, stderr) => {
            if (error) {
                console.error('Error seeding notifications:', error);
                reject(error);
            }
            else {
                console.log(stdout);
                resolve(stdout);
            }
        });
    });
}
if (require.main === module) {
    seedAllModels();
}
