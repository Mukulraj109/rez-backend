"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Partner_1 = __importDefault(require("../models/Partner"));
const User_1 = require("../models/User");
const database_1 = require("../config/database");
// Load environment variables
dotenv_1.default.config();
const seedPartners = async () => {
    try {
        console.log('🌱 [PARTNER SEEDING] Starting partner seeding...');
        // Connect to database
        await (0, database_1.connectDatabase)();
        console.log('✅ [PARTNER SEEDING] Connected to database');
        // Get all users
        const users = await User_1.User.find({ email: { $exists: true } }).limit(10);
        console.log(`📊 [PARTNER SEEDING] Found ${users.length} users`);
        if (users.length === 0) {
            console.log('⚠️ [PARTNER SEEDING] No users found. Please seed users first.');
            return;
        }
        // Clear existing partners (optional - comment out to keep existing data)
        await Partner_1.default.deleteMany({});
        console.log('🗑️ [PARTNER SEEDING] Cleared existing partners');
        // Create partner profiles for each user
        const partnerPromises = users.map(async (user) => {
            try {
                // Check if partner already exists
                const existingPartner = await Partner_1.default.findOne({ userId: user._id });
                if (existingPartner) {
                    console.log(`⏭️ [PARTNER SEEDING] Partner already exists for user: ${user.email}`);
                    return existingPartner;
                }
                const name = user.profile?.firstName
                    ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim()
                    : user.email?.split('@')[0] || 'Partner';
                const userId = user._id;
                const partner = await Partner_1.default.createDefaultPartner(userId.toString(), name, user.email || '', user.profile?.avatar);
                console.log(`✅ [PARTNER SEEDING] Created partner for: ${name}`);
                return partner;
            }
            catch (error) {
                console.error(`❌ [PARTNER SEEDING] Error creating partner for user ${user.email}:`, error);
                return null;
            }
        });
        const createdPartners = await Promise.all(partnerPromises);
        const successCount = createdPartners.filter((p) => p !== null).length;
        console.log('\n🎉 [PARTNER SEEDING] Partner seeding completed!');
        console.log(`✅ Created ${successCount} partner profiles`);
        console.log('\n📊 Summary:');
        console.log(`   Total Users: ${users.length}`);
        console.log(`   Partners Created: ${successCount}`);
        console.log(`   Failed: ${users.length - successCount}`);
        // Display sample partner data
        const samplePartner = await Partner_1.default.findOne().populate('userId', 'email');
        if (samplePartner) {
            console.log('\n📝 Sample Partner Data:');
            console.log(`   Name: ${samplePartner.name}`);
            console.log(`   Email: ${samplePartner.email}`);
            console.log(`   Level: ${samplePartner.currentLevel.name} (${samplePartner.currentLevel.level})`);
            console.log(`   Total Orders: ${samplePartner.totalOrders}`);
            console.log(`   Milestones: ${samplePartner.milestones.length}`);
            console.log(`   Tasks: ${samplePartner.tasks.length}`);
            console.log(`   Jackpot Milestones: ${samplePartner.jackpotProgress.length}`);
            console.log(`   Offers: ${samplePartner.claimableOffers.length}`);
        }
    }
    catch (error) {
        console.error('❌ [PARTNER SEEDING] Error:', error);
        throw error;
    }
    finally {
        // Close database connection
        await mongoose_1.default.connection.close();
        console.log('\n👋 [PARTNER SEEDING] Database connection closed');
    }
};
// Run the seeding if this file is executed directly
if (require.main === module) {
    seedPartners()
        .then(() => {
        console.log('✅ [PARTNER SEEDING] Seeding completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ [PARTNER SEEDING] Seeding failed:', error);
        process.exit(1);
    });
}
exports.default = seedPartners;
