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
exports.recalculateAchievements = exports.updateAchievementProgress = exports.initializeUserAchievements = exports.getAchievementProgress = exports.getUnlockedAchievements = exports.getUserAchievements = void 0;
const Achievement_1 = require("../models/Achievement");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const errorHandler_1 = require("../middleware/errorHandler");
// Get all achievements for user
exports.getUserAchievements = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const achievements = await Achievement_1.UserAchievement.find({ user: req.user._id })
        .sort({ unlocked: -1, progress: -1, createdAt: -1 });
    (0, response_1.sendSuccess)(res, achievements, 'Achievements retrieved successfully');
});
// Get unlocked achievements
exports.getUnlockedAchievements = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const achievements = await Achievement_1.UserAchievement.find({
        user: req.user._id,
        unlocked: true
    }).sort({ unlockedDate: -1 });
    (0, response_1.sendSuccess)(res, achievements, 'Unlocked achievements retrieved successfully');
});
// Get achievement progress
exports.getAchievementProgress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const achievements = await Achievement_1.UserAchievement.find({ user: req.user._id });
    const total = achievements.length;
    const unlocked = achievements.filter(a => a.unlocked).length;
    const inProgress = achievements.filter(a => !a.unlocked && a.progress > 0).length;
    const summary = {
        total,
        unlocked,
        inProgress,
        locked: total - unlocked,
        completionPercentage: total > 0 ? Math.round((unlocked / total) * 100) : 0
    };
    (0, response_1.sendSuccess)(res, { summary, achievements }, 'Achievement progress retrieved successfully');
});
// Initialize achievements for user
exports.initializeUserAchievements = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const userId = req.user._id;
    // Check if achievements already exist
    const existingCount = await Achievement_1.UserAchievement.countDocuments({ user: userId });
    if (existingCount > 0) {
        return (0, response_1.sendBadRequest)(res, 'Achievements already initialized');
    }
    // Create achievement entries for all defined achievements
    const achievements = Achievement_1.ACHIEVEMENT_DEFINITIONS.filter(def => def.isActive).map(def => ({
        user: userId,
        type: def.type,
        title: def.title,
        description: def.description,
        icon: def.icon,
        color: def.color,
        unlocked: false,
        progress: 0,
        targetValue: def.requirement.target
    }));
    const created = await Achievement_1.UserAchievement.insertMany(achievements);
    (0, response_1.sendSuccess)(res, created, 'Achievements initialized successfully', 201);
});
// Update achievement progress (typically called by system, not user)
exports.updateAchievementProgress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { achievementId, currentValue } = req.body;
    const achievement = await Achievement_1.UserAchievement.findOne({
        _id: achievementId,
        user: req.user._id
    });
    if (!achievement) {
        return (0, response_1.sendNotFound)(res, 'Achievement not found');
    }
    // Calculate progress percentage
    achievement.currentValue = currentValue;
    achievement.progress = Math.min(100, Math.round((currentValue / achievement.targetValue) * 100));
    // Check if achievement should be unlocked
    if (achievement.progress >= 100 && !achievement.unlocked) {
        achievement.unlocked = true;
        achievement.unlockedDate = new Date();
    }
    await achievement.save();
    (0, response_1.sendSuccess)(res, achievement, 'Achievement progress updated successfully');
});
// Recalculate all achievements based on user statistics
exports.recalculateAchievements = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const userId = req.user._id;
    // Get user statistics
    const { Order } = await Promise.resolve().then(() => __importStar(require('../models/Order')));
    const { Video } = await Promise.resolve().then(() => __importStar(require('../models/Video')));
    const { Project } = await Promise.resolve().then(() => __importStar(require('../models/Project')));
    const { Review } = await Promise.resolve().then(() => __importStar(require('../models/Review')));
    const OfferRedemption = (await Promise.resolve().then(() => __importStar(require('../models/OfferRedemption')))).default;
    // Fetch all relevant metrics
    const [orderStats, videoStats, projectStats, reviewCount, offerCount] = await Promise.all([
        Order.aggregate([
            { $match: { user: userId, status: 'delivered' } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: '$totalPrice' }
                }
            }
        ]),
        Video.aggregate([
            { $match: { creator: userId } },
            {
                $group: {
                    _id: null,
                    totalVideos: { $sum: 1 },
                    totalViews: { $sum: '$engagement.views' }
                }
            }
        ]),
        Project.aggregate([
            { $match: { 'submissions.user': userId } },
            { $unwind: '$submissions' },
            { $match: { 'submissions.user': userId } },
            {
                $group: {
                    _id: null,
                    totalProjects: { $sum: 1 },
                    totalEarned: { $sum: { $ifNull: ['$submissions.paidAmount', 0] } }
                }
            }
        ]),
        Review.countDocuments({ user: userId }),
        OfferRedemption.countDocuments({ user: userId })
    ]);
    // Build metrics object
    const metrics = {
        totalOrders: orderStats[0]?.totalOrders || 0,
        totalSpent: orderStats[0]?.totalSpent || 0,
        totalVideos: videoStats[0]?.totalVideos || 0,
        totalVideoViews: videoStats[0]?.totalViews || 0,
        totalProjects: projectStats[0]?.totalProjects || 0,
        projectEarnings: projectStats[0]?.totalEarned || 0,
        totalReviews: reviewCount || 0,
        totalReferrals: req.user.referral?.totalReferrals || 0,
        totalActivity: ((orderStats[0]?.totalOrders || 0) +
            (videoStats[0]?.totalVideos || 0) +
            (projectStats[0]?.totalProjects || 0) +
            (reviewCount || 0) +
            (offerCount || 0))
    };
    // Get all user achievements
    const achievements = await Achievement_1.UserAchievement.find({ user: userId });
    // Update each achievement based on its metric
    const updates = achievements.map(async (achievement) => {
        const definition = Achievement_1.ACHIEVEMENT_DEFINITIONS.find(def => def.type === achievement.type);
        if (!definition)
            return achievement;
        const currentValue = metrics[definition.requirement.metric] || 0;
        achievement.currentValue = currentValue;
        achievement.progress = Math.min(100, Math.round((currentValue / achievement.targetValue) * 100));
        // Check if achievement should be unlocked
        if (achievement.progress >= 100 && !achievement.unlocked) {
            achievement.unlocked = true;
            achievement.unlockedDate = new Date();
        }
        return achievement.save();
    });
    await Promise.all(updates);
    const updatedAchievements = await Achievement_1.UserAchievement.find({ user: userId })
        .sort({ unlocked: -1, progress: -1 });
    (0, response_1.sendSuccess)(res, updatedAchievements, 'Achievements recalculated successfully');
});
