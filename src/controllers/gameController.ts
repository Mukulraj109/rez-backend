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

  // ======== MEMORY MATCH ========

  // POST /api/games/memory-match/start
  async startMemoryMatch(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { difficulty = 'easy' } = req.body;

      console.log('[MEMORY MATCH START] userId:', userId, 'difficulty:', difficulty);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const result = await gameService.startMemoryMatch(userId, difficulty);

      console.log('[MEMORY MATCH START] Session created:', result.sessionId);

      res.json({
        success: true,
        data: result,
        message: 'Memory Match game started'
      });
    } catch (error: any) {
      console.error('[MEMORY MATCH START] Error:', error.message);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /api/games/memory-match/complete
  async completeMemoryMatch(req: Request, res: Response) {
    try {
      const { sessionId, score, timeSpent, moves } = req.body;

      console.log('[MEMORY MATCH COMPLETE] sessionId:', sessionId, 'score:', score, 'timeSpent:', timeSpent, 'moves:', moves);

      const result = await gameService.completeMemoryMatch(sessionId, score, timeSpent, moves);

      console.log('[MEMORY MATCH COMPLETE] Result:', JSON.stringify(result));

      res.json({
        success: true,
        data: result,
        message: `You earned ${result.coins} coins!`
      });
    } catch (error: any) {
      console.error('[MEMORY MATCH COMPLETE] Error:', error.message);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // ======== COIN HUNT ========

  // POST /api/games/coin-hunt/start
  async startCoinHunt(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const result = await gameService.startCoinHunt(userId);

      res.json({
        success: true,
        data: result,
        message: 'Coin Hunt game started'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /api/games/coin-hunt/complete
  async completeCoinHunt(req: Request, res: Response) {
    try {
      const { sessionId, coinsCollected, score } = req.body;

      const result = await gameService.completeCoinHunt(sessionId, coinsCollected, score);

      res.json({
        success: true,
        data: result,
        message: `You collected ${result.coinsEarned} coins!`
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // ======== GUESS THE PRICE ========

  // POST /api/games/guess-price/start
  async startGuessPrice(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const result = await gameService.startGuessPrice(userId);

      res.json({
        success: true,
        data: result,
        message: 'Guess the Price game started'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // POST /api/games/guess-price/submit
  async submitGuessPrice(req: Request, res: Response) {
    try {
      const { sessionId, guessedPrice } = req.body;

      const result = await gameService.submitGuessPrice(sessionId, guessedPrice);

      res.json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // ======== DAILY LIMITS ========

  // GET /api/games/daily-limits
  async getDailyLimits(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const limits = await gameService.getDailyLimits(userId);

      res.json({
        success: true,
        data: limits
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // GET /api/games/available
  // Returns all available games with play status (supports optional auth)
  async getAvailableGames(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      const games = await gameService.getAvailableGames(userId);

      res.json({
        success: true,
        data: {
          games,
          total: games.length,
          todaysEarnings: games[0]?.todaysEarnings || 0
        },
        message: 'Available games fetched'
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
