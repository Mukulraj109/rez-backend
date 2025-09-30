import { Request, Response } from 'express';
import { UserAchievement, IUserAchievement, ACHIEVEMENT_DEFINITIONS } from '../models/Achievement';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendNotFound, sendBadRequest } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import mongoose from 'mongoose';

// Get all achievements for user
export const getUserAchievements = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const achievements = await UserAchievement.find({ user: req.user._id })
    .sort({ unlocked: -1, progress: -1, createdAt: -1 });

  sendSuccess(res, achievements, 'Achievements retrieved successfully');
});

// Get unlocked achievements
export const getUnlockedAchievements = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const achievements = await UserAchievement.find({
    user: req.user._id,
    unlocked: true
  }).sort({ unlockedDate: -1 });

  sendSuccess(res, achievements, 'Unlocked achievements retrieved successfully');
});

// Get achievement progress
export const getAchievementProgress = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const achievements = await UserAchievement.find({ user: req.user._id });

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

  sendSuccess(res, { summary, achievements }, 'Achievement progress retrieved successfully');
});

// Initialize achievements for user
export const initializeUserAchievements = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = req.user._id;

  // Check if achievements already exist
  const existingCount = await UserAchievement.countDocuments({ user: userId });

  if (existingCount > 0) {
    return sendBadRequest(res, 'Achievements already initialized');
  }

  // Create achievement entries for all defined achievements
  const achievements = ACHIEVEMENT_DEFINITIONS.filter(def => def.isActive).map(def => ({
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

  const created = await UserAchievement.insertMany(achievements);

  sendSuccess(res, created, 'Achievements initialized successfully', 201);
});

// Update achievement progress (typically called by system, not user)
export const updateAchievementProgress = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { achievementId, currentValue } = req.body;

  const achievement = await UserAchievement.findOne({
    _id: achievementId,
    user: req.user._id
  });

  if (!achievement) {
    return sendNotFound(res, 'Achievement not found');
  }

  // Calculate progress percentage
  achievement.currentValue = currentValue;
  achievement.progress = Math.min(100, Math.round((currentValue / achievement.targetValue!) * 100));

  // Check if achievement should be unlocked
  if (achievement.progress >= 100 && !achievement.unlocked) {
    achievement.unlocked = true;
    achievement.unlockedDate = new Date();
  }

  await achievement.save();

  sendSuccess(res, achievement, 'Achievement progress updated successfully');
});

// Recalculate all achievements based on user statistics
export const recalculateAchievements = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = req.user._id;

  // Get user statistics
  const { Order } = await import('../models/Order');
  const { Video } = await import('../models/Video');
  const { Project } = await import('../models/Project');
  const { Review } = await import('../models/Review');
  const OfferRedemption = (await import('../models/OfferRedemption')).default;

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
  const metrics: Record<string, number> = {
    totalOrders: orderStats[0]?.totalOrders || 0,
    totalSpent: orderStats[0]?.totalSpent || 0,
    totalVideos: videoStats[0]?.totalVideos || 0,
    totalVideoViews: videoStats[0]?.totalViews || 0,
    totalProjects: projectStats[0]?.totalProjects || 0,
    projectEarnings: projectStats[0]?.totalEarned || 0,
    totalReviews: reviewCount || 0,
    totalReferrals: req.user.referral?.totalReferrals || 0,
    totalActivity: (
      (orderStats[0]?.totalOrders || 0) +
      (videoStats[0]?.totalVideos || 0) +
      (projectStats[0]?.totalProjects || 0) +
      (reviewCount || 0) +
      (offerCount || 0)
    )
  };

  // Get all user achievements
  const achievements = await UserAchievement.find({ user: userId });

  // Update each achievement based on its metric
  const updates = achievements.map(async (achievement) => {
    const definition = ACHIEVEMENT_DEFINITIONS.find(def => def.type === achievement.type);
    if (!definition) return achievement;

    const currentValue = metrics[definition.requirement.metric] || 0;
    achievement.currentValue = currentValue;
    achievement.progress = Math.min(100, Math.round((currentValue / achievement.targetValue!) * 100));

    // Check if achievement should be unlocked
    if (achievement.progress >= 100 && !achievement.unlocked) {
      achievement.unlocked = true;
      achievement.unlockedDate = new Date();
    }

    return achievement.save();
  });

  await Promise.all(updates);

  const updatedAchievements = await UserAchievement.find({ user: userId })
    .sort({ unlocked: -1, progress: -1 });

  sendSuccess(res, updatedAchievements, 'Achievements recalculated successfully');
});