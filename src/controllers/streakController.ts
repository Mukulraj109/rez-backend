import { Request, Response } from 'express';
import streakService from '../services/streakService';

class StreakController {
  // GET /api/streaks
  async getUserStreaks(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const streaks = await streakService.getUserStreaks(userId);

      res.json({
        success: true,
        data: streaks
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /api/streaks/update
  async updateStreak(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { type } = req.body;

      const result = await streakService.updateStreak(userId, type);

      res.json({
        success: true,
        data: result,
        message: result.milestoneReached
          ? 'Milestone reached!'
          : 'Streak updated'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /api/streaks/claim-milestone
  async claimMilestone(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { type, day } = req.body;

      const result = await streakService.claimMilestone(userId, type, day);

      res.json({
        success: true,
        data: result,
        message: 'Milestone reward claimed!'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /api/streaks/freeze
  async freezeStreak(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { type, days } = req.body;

      const streak = await streakService.freezeStreak(userId, type, days);

      res.json({
        success: true,
        data: streak,
        message: 'Streak frozen successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/streaks/statistics
  async getStreakStatistics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const stats = await streakService.getStreakStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Get current user's login streak (JWT-based, no userId param)
   * GET /api/gamification/streaks
   * @returns User's login streak data with lastLogin timestamp
   */
  async getCurrentUserStreak(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.id || (req.user._id as any)?.toString();

      // Get login streak specifically
      const loginStreak = await streakService.getOrCreateStreak(userId, 'login');

      // Get total earned from all check-ins
      const DailyCheckIn = require('../models/DailyCheckIn').default;
      const totalEarnedResult = await DailyCheckIn.aggregate([
        { $match: { userId: new (require('mongoose').Types.ObjectId)(userId) } },
        { $group: { _id: null, total: { $sum: '$totalEarned' } } }
      ]);
      const totalEarned = totalEarnedResult.length > 0 ? totalEarnedResult[0].total : 0;

      // Check if user has checked in today
      const hasCheckedInToday = await DailyCheckIn.hasCheckedInToday(
        new (require('mongoose').Types.ObjectId)(userId)
      );

      // Format response to match expected structure
      const streakData = {
        streak: loginStreak.currentStreak || 0,
        currentStreak: loginStreak.currentStreak || 0,
        lastLogin: loginStreak.lastActivityDate,
        type: 'login',
        // Additional useful information
        longestStreak: loginStreak.longestStreak || 0,
        totalDays: loginStreak.totalDays || 0,
        frozen: loginStreak.frozen || false,
        freezeExpiresAt: loginStreak.freezeExpiresAt || null,
        streakStartDate: loginStreak.streakStartDate || loginStreak.lastActivityDate,
        // Include total earned and check-in status
        totalEarned: totalEarned,
        hasCheckedInToday: hasCheckedInToday
      };

      res.json({
        success: true,
        data: streakData,
        message: 'Login streak retrieved successfully'
      });
    } catch (error: any) {
      console.error('Error fetching user streak:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch streak data'
      });
    }
  }
}

export default new StreakController();
