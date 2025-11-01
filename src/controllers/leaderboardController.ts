import { Request, Response } from 'express';
import leaderboardService from '../services/leaderboardService';

class LeaderboardController {
  // GET /api/leaderboard/spending
  async getSpendingLeaderboard(req: Request, res: Response) {
    try {
      const period = (req.query.period as 'week' | 'month' | 'all') || 'month';
      const limit = parseInt(req.query.limit as string) || 10;

      const leaderboard = await leaderboardService.getSpendingLeaderboard(period, limit);

      res.json({
        success: true,
        data: leaderboard,
        period
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/leaderboard/reviews
  async getReviewLeaderboard(req: Request, res: Response) {
    try {
      const period = (req.query.period as 'week' | 'month' | 'all') || 'month';
      const limit = parseInt(req.query.limit as string) || 10;

      const leaderboard = await leaderboardService.getReviewLeaderboard(period, limit);

      res.json({
        success: true,
        data: leaderboard,
        period
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/leaderboard/referrals
  async getReferralLeaderboard(req: Request, res: Response) {
    try {
      const period = (req.query.period as 'week' | 'month' | 'all') || 'month';
      const limit = parseInt(req.query.limit as string) || 10;

      const leaderboard = await leaderboardService.getReferralLeaderboard(period, limit);

      res.json({
        success: true,
        data: leaderboard,
        period
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/leaderboard/cashback
  async getCashbackLeaderboard(req: Request, res: Response) {
    try {
      const period = (req.query.period as 'week' | 'month' | 'all') || 'month';
      const limit = parseInt(req.query.limit as string) || 10;

      const leaderboard = await leaderboardService.getCashbackLeaderboard(period, limit);

      res.json({
        success: true,
        data: leaderboard,
        period
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/leaderboard/streak
  async getStreakLeaderboard(req: Request, res: Response) {
    try {
      const type = (req.query.type as 'login' | 'order' | 'review') || 'login';
      const limit = parseInt(req.query.limit as string) || 10;

      const leaderboard = await leaderboardService.getStreakLeaderboard(type, limit);

      res.json({
        success: true,
        data: leaderboard,
        type
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/leaderboard/all
  async getAllLeaderboards(req: Request, res: Response) {
    try {
      const stats = await leaderboardService.getLeaderboardStats();

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

  // GET /api/leaderboard/my-rank
  async getMyRank(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const period = (req.query.period as 'week' | 'month' | 'all') || 'month';

      const ranks = await leaderboardService.getAllUserRanks(userId, period);

      res.json({
        success: true,
        data: ranks,
        period
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new LeaderboardController();
