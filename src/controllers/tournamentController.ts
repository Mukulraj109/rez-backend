import { Request, Response } from 'express';
import tournamentService from '../services/tournamentService';

class TournamentController {
  // GET /api/tournaments
  async getTournaments(req: Request, res: Response) {
    try {
      const { status, type, limit = 20, offset = 0 } = req.query;

      const result = await tournamentService.getTournaments(
        status as any,
        type as any,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        success: true,
        data: result.tournaments,
        pagination: {
          total: result.total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/tournaments/featured
  async getFeaturedTournaments(req: Request, res: Response) {
    try {
      const { limit = 5 } = req.query;

      const tournaments = await tournamentService.getFeaturedTournaments(
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: tournaments
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/tournaments/:id
  async getTournamentById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const tournament = await tournamentService.getTournamentById(id);

      res.json({
        success: true,
        data: tournament
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /api/tournaments/:id/join
  async joinTournament(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const tournament = await tournamentService.joinTournament(id, userId);

      res.json({
        success: true,
        data: {
          tournamentId: tournament._id,
          name: tournament.name,
          participantsCount: tournament.participants.length
        },
        message: 'Successfully joined the tournament!'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /api/tournaments/:id/leave
  async leaveTournament(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      await tournamentService.leaveTournament(id, userId);

      res.json({
        success: true,
        message: 'Left the tournament'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/tournaments/:id/leaderboard
  async getTournamentLeaderboard(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { limit = 100 } = req.query;

      const leaderboard = await tournamentService.getTournamentLeaderboard(
        id,
        parseInt(limit as string)
      );

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

  // GET /api/tournaments/:id/my-rank
  async getMyRankInTournament(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const rank = await tournamentService.getUserRankInTournament(id, userId);

      if (!rank) {
        return res.status(404).json({
          success: false,
          message: 'Not a participant in this tournament'
        });
      }

      res.json({
        success: true,
        data: rank
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/tournaments/my-tournaments
  async getMyTournaments(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const tournaments = await tournamentService.getUserTournaments(userId);

      res.json({
        success: true,
        data: tournaments
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new TournamentController();
