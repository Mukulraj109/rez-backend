"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTNER_LEVELS = exports.LEVEL_OFFERS = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Level-Specific Offers Configuration
exports.LEVEL_OFFERS = {
    PARTNER: [
        {
            title: '10% Off on Electronics',
            description: 'Get 10% discount on all electronics',
            discount: 10,
            category: 'Electronics',
            minPurchase: 1000,
            maxDiscount: 500,
            termsAndConditions: [
                'Valid for 30 days from activation',
                'Minimum purchase of ₹1000',
                'Cannot be combined with other offers'
            ]
        },
        {
            title: '15% Off on Fashion',
            description: 'Get 15% discount on fashion items',
            discount: 15,
            category: 'Fashion',
            minPurchase: 500,
            maxDiscount: 300,
            termsAndConditions: [
                'Valid for 30 days from activation',
                'Minimum purchase of ₹500',
                'Maximum discount ₹300'
            ]
        }
    ],
    INFLUENCER: [
        {
            title: '20% Off on Food Delivery',
            description: 'Get 20% discount on all food orders',
            discount: 20,
            category: 'Food',
            minPurchase: 300,
            maxDiscount: 200,
            termsAndConditions: [
                'Valid for 30 days from activation',
                'Minimum purchase of ₹300',
                'Maximum discount ₹200'
            ]
        },
        {
            title: 'Free Delivery on Orders Above ₹500',
            description: 'Enjoy free delivery on all orders above ₹500',
            discount: 0,
            category: 'Delivery',
            minPurchase: 500,
            maxDiscount: 50,
            termsAndConditions: [
                'Valid for 60 days from activation',
                'Minimum purchase of ₹500',
                'Applicable on all categories'
            ]
        }
    ],
    AMBASSADOR: [
        {
            title: '25% Off on All Categories',
            description: 'Premium discount on all product categories',
            discount: 25,
            category: 'All',
            minPurchase: 1000,
            maxDiscount: 1000,
            termsAndConditions: [
                'Valid for 90 days from activation',
                'Minimum purchase of ₹1000',
                'Maximum discount ₹1000',
                'Exclusive to Ambassador members'
            ]
        },
        {
            title: 'Birthday Month ₹1000 Voucher',
            description: 'Special ₹1000 voucher for your birthday month',
            discount: 1000,
            category: 'Special',
            minPurchase: 0,
            maxDiscount: 1000,
            termsAndConditions: [
                'Valid only during birthday month',
                'No minimum purchase required',
                'One-time use only'
            ]
        }
    ]
};
// Partner Level Configuration
exports.PARTNER_LEVELS = {
    PARTNER: {
        level: 1,
        name: 'Partner',
        requirements: { orders: 15, timeframe: 44 },
        benefits: {
            cashbackRate: 10, // 10% cashback on all orders
            birthdayDiscount: 15, // 15% off during birthday month
            freeDeliveryThreshold: 500, // Free delivery above ₹500
            prioritySupport: true,
            earlyAccessSales: true,
            transactionBonus: {
                every: 11,
                reward: 100 // ₹100 every 11 orders
            },
            descriptions: [
                'Exclusive partner offers',
                'Priority customer support',
                'Early access to sales',
                'Monthly bonus rewards'
            ]
        }
    },
    INFLUENCER: {
        level: 2,
        name: 'Influencer',
        requirements: { orders: 45, timeframe: 44 },
        benefits: {
            cashbackRate: 15, // 15% cashback on all orders
            birthdayDiscount: 20, // 20% off during birthday month
            freeDeliveryThreshold: 0, // Always free delivery
            prioritySupport: true,
            earlyAccessSales: true,
            transactionBonus: {
                every: 11,
                reward: 200 // ₹200 every 11 orders
            },
            descriptions: [
                'All Partner benefits',
                'Higher cashback rates',
                'Exclusive influencer events',
                'Special discount codes',
                'Referral bonuses'
            ]
        }
    },
    AMBASSADOR: {
        level: 3,
        name: 'Ambassador',
        requirements: { orders: 100, timeframe: 90 },
        benefits: {
            cashbackRate: 20, // 20% cashback on all orders
            birthdayDiscount: 25, // 25% off during birthday month
            freeDeliveryThreshold: 0, // Always free delivery
            prioritySupport: true,
            earlyAccessSales: true,
            transactionBonus: {
                every: 11,
                reward: 500 // ₹500 every 11 orders
            },
            descriptions: [
                'All Influencer benefits',
                'VIP customer service',
                'Maximum cashback rates',
                'Quarterly reward packages',
                'Brand collaboration opportunities',
                'Lifetime premium perks'
            ]
        }
    }
};
const PartnerLevelSchema = new mongoose_1.Schema({
    level: { type: Number, required: true, enum: [1, 2, 3] },
    name: {
        type: String,
        required: true,
        enum: ['Partner', 'Influencer', 'Ambassador']
    },
    requirements: {
        orders: { type: Number, required: true },
        timeframe: { type: Number, required: true }
    },
    achievedAt: { type: Date, default: Date.now }
});
const OrderMilestoneSchema = new mongoose_1.Schema({
    orderCount: { type: Number, required: true },
    reward: {
        type: {
            type: String,
            required: true,
            enum: ['cashback', 'discount', 'points', 'voucher']
        },
        value: { type: Number, required: true },
        title: { type: String, required: true },
        description: String
    },
    achieved: { type: Boolean, default: false },
    claimedAt: Date
});
const RewardTaskSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
        type: String,
        required: true,
        enum: ['review', 'purchase', 'referral', 'social', 'profile']
    },
    reward: {
        type: {
            type: String,
            required: true,
            enum: ['cashback', 'discount', 'points', 'voucher']
        },
        value: { type: Number, required: true },
        title: { type: String, required: true }
    },
    progress: {
        current: { type: Number, default: 0 },
        target: { type: Number, required: true }
    },
    completed: { type: Boolean, default: false },
    claimed: { type: Boolean, default: false },
    completedAt: Date,
    claimedAt: Date
});
const JackpotMilestoneSchema = new mongoose_1.Schema({
    spendAmount: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    reward: {
        type: {
            type: String,
            required: true,
            enum: ['cashback', 'discount', 'points', 'voucher', 'product']
        },
        value: { type: Number, required: true },
        title: { type: String, required: true }
    },
    achieved: { type: Boolean, default: false },
    claimedAt: Date
});
const ClaimableOfferSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    discount: { type: Number, required: true },
    category: { type: String, required: true },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    termsAndConditions: [{ type: String }],
    claimed: { type: Boolean, default: false },
    claimedAt: Date,
    voucherCode: String,
    minPurchase: Number,
    maxDiscount: Number
});
const PartnerSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    name: { type: String, required: true },
    email: { type: String, required: false, default: '' },
    avatar: String,
    phoneNumber: String,
    // Level tracking
    currentLevel: {
        type: PartnerLevelSchema,
        required: true,
        default: {
            level: 1,
            name: 'Partner',
            requirements: exports.PARTNER_LEVELS.PARTNER.requirements,
            achievedAt: new Date()
        }
    },
    levelHistory: [PartnerLevelSchema],
    // Order tracking
    totalOrders: { type: Number, default: 0 },
    ordersThisLevel: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    // Time tracking
    joinDate: { type: Date, default: Date.now },
    levelStartDate: { type: Date, default: Date.now },
    validUntil: {
        type: Date,
        default: () => new Date(Date.now() + 44 * 24 * 60 * 60 * 1000) // 44 days from now
    },
    // Milestones & Rewards
    milestones: [OrderMilestoneSchema],
    tasks: [RewardTaskSchema],
    jackpotProgress: [JackpotMilestoneSchema],
    claimableOffers: [ClaimableOfferSchema],
    // Earnings
    earnings: {
        total: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
        paid: { type: Number, default: 0 },
        thisMonth: { type: Number, default: 0 },
        lastMonth: { type: Number, default: 0 }
    },
    // Status
    isActive: { type: Boolean, default: true },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    // Metadata
    lastActivityDate: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: 'partners'
});
// Indexes for performance
PartnerSchema.index({ userId: 1 });
PartnerSchema.index({ email: 1 });
PartnerSchema.index({ 'currentLevel.level': 1 });
PartnerSchema.index({ status: 1, isActive: 1 });
PartnerSchema.index({ validUntil: 1 });
// Methods
PartnerSchema.methods.getDaysRemaining = function () {
    const now = new Date();
    const validUntil = new Date(this.validUntil);
    const diffTime = validUntil.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
};
PartnerSchema.methods.getOrdersNeededForNextLevel = function () {
    const nextLevel = this.currentLevel.level + 1;
    if (nextLevel > 3)
        return 0; // Max level reached
    const nextLevelConfig = Object.values(exports.PARTNER_LEVELS).find((level) => level.level === nextLevel);
    if (!nextLevelConfig)
        return 0;
    return Math.max(0, nextLevelConfig.requirements.orders - this.ordersThisLevel);
};
PartnerSchema.methods.canUpgradeLevel = function () {
    const nextLevel = this.currentLevel.level + 1;
    if (nextLevel > 3)
        return false;
    const nextLevelConfig = Object.values(exports.PARTNER_LEVELS).find((level) => level.level === nextLevel);
    if (!nextLevelConfig)
        return false;
    // Check orders requirement
    const hasEnoughOrders = this.ordersThisLevel >= nextLevelConfig.requirements.orders;
    // Check timeframe requirement (FIXED: Issue #1)
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - this.levelStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const withinTimeframe = daysSinceStart <= this.currentLevel.requirements.timeframe;
    console.log(`📊 [LEVEL CHECK] User ${this.userId}: Orders ${this.ordersThisLevel}/${nextLevelConfig.requirements.orders}, Days ${daysSinceStart}/${this.currentLevel.requirements.timeframe}, Can upgrade: ${hasEnoughOrders && withinTimeframe}`);
    return hasEnoughOrders && withinTimeframe;
};
PartnerSchema.methods.upgradeLevel = function () {
    if (!this.canUpgradeLevel())
        return;
    const nextLevel = this.currentLevel.level + 1;
    const nextLevelConfig = Object.values(exports.PARTNER_LEVELS).find((level) => level.level === nextLevel);
    if (!nextLevelConfig)
        return;
    // Add current level to history
    this.levelHistory.push({ ...this.currentLevel });
    // Update current level
    this.currentLevel = {
        level: nextLevelConfig.level,
        name: nextLevelConfig.name,
        requirements: nextLevelConfig.requirements,
        achievedAt: new Date()
    };
    // Reset level tracking
    this.levelStartDate = new Date();
    this.ordersThisLevel = 0;
    this.validUntil = new Date(Date.now() + nextLevelConfig.requirements.timeframe * 24 * 60 * 60 * 1000);
};
// Check if current level has expired (FIXED: Issue #2)
PartnerSchema.methods.isLevelExpired = function () {
    const now = new Date();
    return now > this.validUntil;
};
// Handle level expiry - reset progress or auto-upgrade (FIXED: Issue #2)
PartnerSchema.methods.handleLevelExpiry = function () {
    if (!this.isLevelExpired())
        return;
    console.log(`⏰ [LEVEL EXPIRY] Level expired for partner ${this.userId}, checking status...`);
    // Check if user met requirements before expiry
    // Note: We check orders only, not timeframe, since it already expired
    const nextLevel = this.currentLevel.level + 1;
    const nextLevelConfig = Object.values(exports.PARTNER_LEVELS).find((level) => level.level === nextLevel);
    if (nextLevelConfig && this.ordersThisLevel >= nextLevelConfig.requirements.orders) {
        // User met order requirements, auto-upgrade them
        const oldLevel = this.currentLevel.name;
        this.upgradeLevel();
        console.log(`✅ [LEVEL EXPIRY] Auto-upgraded ${oldLevel} → ${this.currentLevel.name}`);
    }
    else {
        // User didn't meet requirements, reset progress for current level
        const ordersLost = this.ordersThisLevel;
        this.ordersThisLevel = 0;
        this.levelStartDate = new Date();
        this.validUntil = new Date(Date.now() + this.currentLevel.requirements.timeframe * 24 * 60 * 60 * 1000);
        console.log(`🔄 [LEVEL EXPIRY] Progress reset (lost ${ordersLost} orders), new deadline: ${this.validUntil.toISOString().split('T')[0]}`);
    }
};
// Helper function to generate level-based offers
function generateLevelOffers(level) {
    const offers = [];
    const now = new Date();
    // Add Partner level offers (base for all levels)
    exports.LEVEL_OFFERS.PARTNER.forEach(offer => {
        offers.push({
            ...offer,
            validFrom: now,
            validUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
            claimed: false
        });
    });
    // Add Influencer level offers (level 2+)
    if (level >= 2) {
        exports.LEVEL_OFFERS.INFLUENCER.forEach(offer => {
            offers.push({
                ...offer,
                validFrom: now,
                validUntil: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
                claimed: false
            });
        });
    }
    // Add Ambassador level offers (level 3+)
    if (level >= 3) {
        exports.LEVEL_OFFERS.AMBASSADOR.forEach(offer => {
            offers.push({
                ...offer,
                validFrom: now,
                validUntil: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
                claimed: false
            });
        });
    }
    console.log(`🎁 [OFFERS] Generated ${offers.length} offers for level ${level}`);
    return offers;
}
// Static methods
PartnerSchema.statics.createDefaultPartner = async function (userId, name, email, avatar) {
    // Initialize default milestones
    const defaultMilestones = [
        {
            orderCount: 5,
            reward: {
                type: 'cashback',
                value: 100,
                title: '₹100 Cashback',
                description: 'Complete 5 orders'
            },
            achieved: false
        },
        {
            orderCount: 10,
            reward: {
                type: 'voucher',
                value: 200,
                title: '₹200 Shopping Voucher',
                description: 'Complete 10 orders'
            },
            achieved: false
        },
        {
            orderCount: 15,
            reward: {
                type: 'cashback',
                value: 500,
                title: '₹500 Cashback Bonus',
                description: 'Complete 15 orders and upgrade to Influencer'
            },
            achieved: false
        },
        {
            orderCount: 20,
            reward: {
                type: 'points',
                value: 1000,
                title: '1000 Loyalty Points',
                description: 'Complete 20 orders'
            },
            achieved: false
        }
    ];
    // Initialize default tasks
    const defaultTasks = [
        {
            title: 'Complete Your Profile',
            description: 'Add your profile picture and complete all details',
            type: 'profile',
            reward: {
                type: 'points',
                value: 100,
                title: '100 Points'
            },
            progress: { current: 0, target: 1 },
            completed: false,
            claimed: false
        },
        {
            title: 'Write 5 Reviews',
            description: 'Share your experience with products',
            type: 'review',
            reward: {
                type: 'cashback',
                value: 50,
                title: '₹50 Cashback'
            },
            progress: { current: 0, target: 5 },
            completed: false,
            claimed: false
        },
        {
            title: 'Refer 3 Friends',
            description: 'Invite friends to join REZ',
            type: 'referral',
            reward: {
                type: 'cashback',
                value: 150,
                title: '₹150 Cashback'
            },
            progress: { current: 0, target: 3 },
            completed: false,
            claimed: false
        },
        {
            title: 'Share on Social Media',
            description: 'Share REZ on your social media',
            type: 'social',
            reward: {
                type: 'points',
                value: 200,
                title: '200 Points'
            },
            progress: { current: 0, target: 3 },
            completed: false,
            claimed: false
        }
    ];
    // Initialize jackpot milestones
    const defaultJackpot = [
        {
            spendAmount: 25000,
            title: 'Silver Jackpot',
            description: 'Spend ₹25,000 to unlock',
            reward: {
                type: 'cashback',
                value: 1000,
                title: '₹1000 Cashback'
            },
            achieved: false
        },
        {
            spendAmount: 50000,
            title: 'Gold Jackpot',
            description: 'Spend ₹50,000 to unlock',
            reward: {
                type: 'voucher',
                value: 2500,
                title: '₹2500 Shopping Voucher'
            },
            achieved: false
        },
        {
            spendAmount: 100000,
            title: 'Platinum Jackpot',
            description: 'Spend ₹1,00,000 to unlock',
            reward: {
                type: 'product',
                value: 5000,
                title: 'Premium Gift Hamper Worth ₹5000'
            },
            achieved: false
        }
    ];
    // Initialize default offers
    // Generate level-based offers
    const defaultOffers = generateLevelOffers(1); // Start with Partner level
    const partner = new this({
        userId,
        name,
        email,
        avatar,
        milestones: defaultMilestones,
        tasks: defaultTasks,
        jackpotProgress: defaultJackpot,
        claimableOffers: defaultOffers
    });
    return partner.save();
};
exports.default = mongoose_1.default.model('Partner', PartnerSchema);
