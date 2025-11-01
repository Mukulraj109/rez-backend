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
}

export default new StreakController();
