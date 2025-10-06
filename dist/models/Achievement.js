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
exports.UserAchievement = exports.ACHIEVEMENT_DEFINITIONS = exports.AchievementCategory = exports.AchievementType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Achievement Types
var AchievementType;
(function (AchievementType) {
    // Order-based achievements
    AchievementType["FIRST_ORDER"] = "FIRST_ORDER";
    AchievementType["ORDERS_10"] = "ORDERS_10";
    AchievementType["ORDERS_50"] = "ORDERS_50";
    AchievementType["ORDERS_100"] = "ORDERS_100";
    AchievementType["FREQUENT_BUYER"] = "FREQUENT_BUYER";
    // Spending-based achievements
    AchievementType["SPENT_1000"] = "SPENT_1000";
    AchievementType["SPENT_5000"] = "SPENT_5000";
    AchievementType["SPENT_10000"] = "SPENT_10000";
    AchievementType["BIG_SPENDER"] = "BIG_SPENDER";
    // Review-based achievements
    AchievementType["FIRST_REVIEW"] = "FIRST_REVIEW";
    AchievementType["REVIEWS_10"] = "REVIEWS_10";
    AchievementType["REVIEWS_25"] = "REVIEWS_25";
    AchievementType["REVIEW_MASTER"] = "REVIEW_MASTER";
    // Video-based achievements
    AchievementType["FIRST_VIDEO"] = "FIRST_VIDEO";
    AchievementType["VIDEOS_10"] = "VIDEOS_10";
    AchievementType["VIEWS_1000"] = "VIEWS_1000";
    AchievementType["VIEWS_10000"] = "VIEWS_10000";
    AchievementType["INFLUENCER"] = "INFLUENCER";
    // Project-based achievements
    AchievementType["FIRST_PROJECT"] = "FIRST_PROJECT";
    AchievementType["PROJECTS_10"] = "PROJECTS_10";
    AchievementType["PROJECT_APPROVED"] = "PROJECT_APPROVED";
    AchievementType["TOP_EARNER"] = "TOP_EARNER";
    // Voucher/Offer achievements
    AchievementType["VOUCHER_REDEEMED"] = "VOUCHER_REDEEMED";
    AchievementType["OFFERS_10"] = "OFFERS_10";
    AchievementType["CASHBACK_EARNED"] = "CASHBACK_EARNED";
    // Referral achievements
    AchievementType["FIRST_REFERRAL"] = "FIRST_REFERRAL";
    AchievementType["REFERRALS_5"] = "REFERRALS_5";
    AchievementType["REFERRALS_10"] = "REFERRALS_10";
    AchievementType["REFERRAL_MASTER"] = "REFERRAL_MASTER";
    // Time-based achievements
    AchievementType["EARLY_BIRD"] = "EARLY_BIRD";
    AchievementType["ONE_YEAR"] = "ONE_YEAR";
    // Activity-based achievements
    AchievementType["ACTIVITY_100"] = "ACTIVITY_100";
    AchievementType["ACTIVITY_500"] = "ACTIVITY_500";
    AchievementType["SUPER_USER"] = "SUPER_USER";
})(AchievementType || (exports.AchievementType = AchievementType = {}));
var AchievementCategory;
(function (AchievementCategory) {
    AchievementCategory["ORDERS"] = "ORDERS";
    AchievementCategory["SPENDING"] = "SPENDING";
    AchievementCategory["REVIEWS"] = "REVIEWS";
    AchievementCategory["VIDEOS"] = "VIDEOS";
    AchievementCategory["PROJECTS"] = "PROJECTS";
    AchievementCategory["VOUCHERS"] = "VOUCHERS";
    AchievementCategory["REFERRALS"] = "REFERRALS";
    AchievementCategory["LOYALTY"] = "LOYALTY";
    AchievementCategory["ACTIVITY"] = "ACTIVITY";
})(AchievementCategory || (exports.AchievementCategory = AchievementCategory = {}));
// User Achievement Schema
const UserAchievementSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: Object.values(AchievementType),
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    icon: {
        type: String,
        required: true
    },
    color: {
        type: String,
        default: '#10B981'
    },
    unlocked: {
        type: Boolean,
        default: false
    },
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    unlockedDate: {
        type: Date
    },
    currentValue: {
        type: Number,
        default: 0
    },
    targetValue: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});
// Indexes
UserAchievementSchema.index({ user: 1, type: 1 }, { unique: true });
UserAchievementSchema.index({ user: 1, unlocked: 1 });
UserAchievementSchema.index({ user: 1, progress: -1 });
// Achievement Definitions (Master List)
exports.ACHIEVEMENT_DEFINITIONS = [
    // Order Achievements
    {
        type: AchievementType.FIRST_ORDER,
        category: AchievementCategory.ORDERS,
        title: 'First Order',
        description: 'Completed your first order',
        icon: 'cart',
        color: '#10B981',
        requirement: { metric: 'totalOrders', target: 1 },
        reward: { coins: 50 },
        order: 1,
        isActive: true
    },
    {
        type: AchievementType.ORDERS_10,
        category: AchievementCategory.ORDERS,
        title: '10 Orders',
        description: 'Completed 10 orders',
        icon: 'cart',
        color: '#10B981',
        requirement: { metric: 'totalOrders', target: 10 },
        reward: { coins: 100 },
        order: 2,
        isActive: true
    },
    {
        type: AchievementType.ORDERS_50,
        category: AchievementCategory.ORDERS,
        title: '50 Orders',
        description: 'Completed 50 orders',
        icon: 'cart',
        color: '#F59E0B',
        requirement: { metric: 'totalOrders', target: 50 },
        reward: { coins: 500 },
        order: 3,
        isActive: true
    },
    {
        type: AchievementType.FREQUENT_BUYER,
        category: AchievementCategory.ORDERS,
        title: 'Frequent Buyer',
        description: 'Completed 100+ orders',
        icon: 'medal',
        color: '#F59E0B',
        requirement: { metric: 'totalOrders', target: 100 },
        reward: { coins: 1000 },
        order: 4,
        isActive: true
    },
    // Spending Achievements
    {
        type: AchievementType.SPENT_1000,
        category: AchievementCategory.SPENDING,
        title: 'First ₹1000',
        description: 'Spent ₹1000 on the platform',
        icon: 'cash',
        color: '#10B981',
        requirement: { metric: 'totalSpent', target: 1000 },
        reward: { cashback: 50 },
        order: 5,
        isActive: true
    },
    {
        type: AchievementType.SPENT_5000,
        category: AchievementCategory.SPENDING,
        title: '₹5000 Milestone',
        description: 'Spent ₹5000 on the platform',
        icon: 'wallet',
        color: '#F59E0B',
        requirement: { metric: 'totalSpent', target: 5000 },
        reward: { cashback: 200 },
        order: 6,
        isActive: true
    },
    {
        type: AchievementType.BIG_SPENDER,
        category: AchievementCategory.SPENDING,
        title: 'Big Spender',
        description: 'Spent ₹10000+ on the platform',
        icon: 'diamond',
        color: '#8B5CF6',
        requirement: { metric: 'totalSpent', target: 10000 },
        reward: { cashback: 500 },
        order: 7,
        isActive: true
    },
    // Review Achievements
    {
        type: AchievementType.FIRST_REVIEW,
        category: AchievementCategory.REVIEWS,
        title: 'First Review',
        description: 'Submitted your first review',
        icon: 'star',
        color: '#10B981',
        requirement: { metric: 'totalReviews', target: 1 },
        reward: { coins: 25 },
        order: 8,
        isActive: true
    },
    {
        type: AchievementType.REVIEWS_25,
        category: AchievementCategory.REVIEWS,
        title: 'Review Master',
        description: 'Written 25+ reviews',
        icon: 'star',
        color: '#EC4899',
        requirement: { metric: 'totalReviews', target: 25 },
        reward: { coins: 250 },
        order: 9,
        isActive: true
    },
    // Video Achievements
    {
        type: AchievementType.FIRST_VIDEO,
        category: AchievementCategory.VIDEOS,
        title: 'First Video',
        description: 'Created your first video',
        icon: 'videocam',
        color: '#10B981',
        requirement: { metric: 'totalVideos', target: 1 },
        reward: { coins: 100 },
        order: 10,
        isActive: true
    },
    {
        type: AchievementType.VIEWS_10000,
        category: AchievementCategory.VIDEOS,
        title: 'Influencer',
        description: '10K+ video views',
        icon: 'eye',
        color: '#8B5CF6',
        requirement: { metric: 'totalVideoViews', target: 10000 },
        reward: { coins: 1000 },
        order: 11,
        isActive: true
    },
    // Project Achievements
    {
        type: AchievementType.FIRST_PROJECT,
        category: AchievementCategory.PROJECTS,
        title: 'First Project',
        description: 'Completed your first project',
        icon: 'briefcase',
        color: '#10B981',
        requirement: { metric: 'totalProjects', target: 1 },
        reward: { coins: 50 },
        order: 12,
        isActive: true
    },
    {
        type: AchievementType.TOP_EARNER,
        category: AchievementCategory.PROJECTS,
        title: 'Top Earner',
        description: 'Earned ₹5000+ from projects',
        icon: 'trophy',
        color: '#F59E0B',
        requirement: { metric: 'projectEarnings', target: 5000 },
        reward: { coins: 500 },
        order: 13,
        isActive: true
    },
    // Referral Achievements
    {
        type: AchievementType.FIRST_REFERRAL,
        category: AchievementCategory.REFERRALS,
        title: 'First Referral',
        description: 'Referred your first friend',
        icon: 'people',
        color: '#10B981',
        requirement: { metric: 'totalReferrals', target: 1 },
        reward: { coins: 100 },
        order: 14,
        isActive: true
    },
    {
        type: AchievementType.REFERRALS_10,
        category: AchievementCategory.REFERRALS,
        title: 'Referral Master',
        description: 'Referred 10+ friends',
        icon: 'share-social',
        color: '#EC4899',
        requirement: { metric: 'totalReferrals', target: 10 },
        reward: { coins: 1000 },
        order: 15,
        isActive: true
    },
    // Time-based Achievements
    {
        type: AchievementType.EARLY_BIRD,
        category: AchievementCategory.LOYALTY,
        title: 'Early Bird',
        description: 'Joined in the first month',
        icon: 'time',
        color: '#10B981',
        requirement: { metric: 'daysActive', target: 30 },
        reward: { coins: 200 },
        order: 16,
        isActive: true
    },
    // Activity Achievements
    {
        type: AchievementType.ACTIVITY_100,
        category: AchievementCategory.ACTIVITY,
        title: 'Active User',
        description: '100+ total activities',
        icon: 'flash',
        color: '#F59E0B',
        requirement: { metric: 'totalActivity', target: 100 },
        reward: { coins: 500 },
        order: 17,
        isActive: true
    },
    {
        type: AchievementType.SUPER_USER,
        category: AchievementCategory.ACTIVITY,
        title: 'Super User',
        description: '500+ total activities',
        icon: 'rocket',
        color: '#8B5CF6',
        requirement: { metric: 'totalActivity', target: 500 },
        reward: { coins: 2000 },
        order: 18,
        isActive: true
    }
];
exports.UserAchievement = mongoose_1.default.model('UserAchievement', UserAchievementSchema);
