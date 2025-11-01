import { Request, Response } from 'express';
import challengeService from '../services/challengeService';

class ChallengeController {
  // GET /api/challenges/daily
  async getDailyChallenges(req: Request, res: Response) {
    try {
      const challenges = await challengeService.getDailyChallenges();

      res.json({
        success: true,
        data: challenges
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/challenges/active
  async getActiveChallenges(req: Request, res: Response) {
    try {
      const { type } = req.query;

      const challenges = await challengeService.getActiveChallenges(
        type as string | undefined
      );

      res.json({
        success: true,
        data: challenges
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/challenges/my-progress
  async getMyProgress(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { includeCompleted } = req.query;

      const progress = await challengeService.getUserProgress(
        userId,
        includeCompleted === 'true'
      );

      res.json({
        success: true,
        data: progress
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /api/challenges/:id/join
  async joinChallenge(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const progress = await challengeService.joinChallenge(userId, id);

      res.json({
        success: true,
        data: progress,
        message: 'Successfully joined challenge'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /api/challenges/:id/claim
  async claimRewards(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const result = await challengeService.claimRewards(userId, id);

      res.json({
        success: true,
        data: result,
        message: 'Rewards claimed successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/challenges/:id/leaderboard
  async getChallengeLeaderboard(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const leaderboard = await challengeService.getChallengeLeaderboard(id, limit);

      res.json({
        success: true,
        data: leaderboard
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/challenges/statistics
  async getStatistics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const stats = await challengeService.getUserStatistics(userId);

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

  // POST /api/challenges/generate-daily (Admin only)
  async generateDailyChallenges(req: Request, res: Response) {
    try {
      const challenges = await challengeService.generateDailyChallenges();

      res.json({
        success: true,
        data: challenges,
        message: 'Daily challenges generated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new ChallengeController();
