import { Request, Response } from 'express';
import gameService from '../services/gameService';

class GameController {
  // ======== SPIN WHEEL ========

  // POST /api/games/spin-wheel/create
  async createSpinWheel(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { earnedFrom } = req.body;

      const session = await gameService.createSpinWheelSession(userId, earnedFrom);

      res.json({
        success: true,
        data: session,
        message: 'Spin wheel session created'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /api/games/spin-wheel/play
  async playSpinWheel(req: Request, res: Response) {
    try {
      const { sessionId } = req.body;

      const session = await gameService.playSpinWheel(sessionId);

      res.json({
        success: true,
        data: session,
        message: 'Spin complete!'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // ======== SCRATCH CARD ========

  // POST /api/games/scratch-card/create
  async createScratchCard(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { earnedFrom } = req.body;

      const session = await gameService.createScratchCardSession(userId, earnedFrom);

      res.json({
        success: true,
        data: session,
        message: 'Scratch card session created'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /api/games/scratch-card/play
  async playScratchCard(req: Request, res: Response) {
    try {
      const { sessionId } = req.body;

      const session = await gameService.playScratchCard(sessionId);

      res.json({
        success: true,
        data: session,
        message: 'Scratch card revealed!'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // ======== QUIZ ========

  // POST /api/games/quiz/create
  async createQuiz(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { questions } = req.body;

      const session = await gameService.createQuizSession(userId, questions);

      res.json({
        success: true,
        data: session,
        message: 'Quiz session created'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /api/games/quiz/submit
  async submitQuiz(req: Request, res: Response) {
    try {
      const { sessionId, answers, correctAnswers } = req.body;

      const session = await gameService.submitQuizAnswers(
        sessionId,
        answers,
        correctAnswers
      );

      res.json({
        success: true,
        data: session,
        message: 'Quiz submitted successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // ======== DAILY TRIVIA ========

  // GET /api/games/daily-trivia
  async getDailyTrivia(req: Request, res: Response) {
    try {
      const trivia = await gameService.getDailyTrivia();

      res.json({
        success: true,
        data: trivia
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /api/games/daily-trivia/answer
  async answerDailyTrivia(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { questionId, answer } = req.body;

      const result = await gameService.answerDailyTrivia(userId, questionId, answer);

      res.json({
        success: true,
        data: result,
        message: result.correct ? 'Correct answer!' : 'Wrong answer'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // ======== GENERAL ========

  // GET /api/games/my-games
  async getMyGames(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { gameType, limit } = req.query;

      const sessions = await gameService.getUserGameSessions(
        userId,
        gameType as string | undefined,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        success: true,
        data: sessions
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/games/pending
  async getPendingGames(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const games = await gameService.getPendingGames(userId);

      res.json({
        success: true,
        data: games
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/games/statistics
  async getGameStatistics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const stats = await gameService.getGameStats(userId);

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

export default new GameController();
