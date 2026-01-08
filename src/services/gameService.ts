import GameSession, { IGameSession } from '../models/GameSession';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import coinService from './coinService';

// Spin Wheel Prize Configuration
const SPIN_WHEEL_PRIZES = [
  { type: 'coins', value: 50, weight: 30, description: '50 Coins' },
  { type: 'coins', value: 100, weight: 25, description: '100 Coins' },
  { type: 'coins', value: 200, weight: 15, description: '200 Coins' },
  { type: 'coins', value: 500, weight: 10, description: '500 Coins' },
  { type: 'discount', value: 10, weight: 15, description: '10% Off Next Order' },
  { type: 'discount', value: 20, weight: 10, description: '20% Off Next Order' },
  { type: 'free_delivery', value: 1, weight: 20, description: 'Free Delivery' },
  { type: 'cashback_multiplier', value: 1.5, weight: 8, description: '1.5x Cashback' },
  { type: 'cashback_multiplier', value: 2, weight: 5, description: '2x Cashback' },
  { type: 'coins', value: 1000, weight: 2, description: 'JACKPOT - 1000 Coins!' }
] as const;

// Scratch Card Prize Configuration
const SCRATCH_CARD_PRIZES = [
  { type: 'coins', value: 25, weight: 40, description: '25 Coins' },
  { type: 'coins', value: 50, weight: 30, description: '50 Coins' },
  { type: 'coins', value: 100, weight: 20, description: '100 Coins' },
  { type: 'coins', value: 250, weight: 8, description: '250 Coins' },
  { type: 'badge', value: 'lucky_winner', weight: 2, description: 'Lucky Winner Badge!' }
] as const;

// Memory Match Prize Configuration
const MEMORY_MATCH_PRIZES = {
  easy: { baseCoins: 10, perfectBonus: 20, timeBonus: 5 },
  medium: { baseCoins: 25, perfectBonus: 50, timeBonus: 10 },
  hard: { baseCoins: 50, perfectBonus: 100, timeBonus: 20 }
};

// Daily game limits
const DAILY_GAME_LIMITS = {
  memory_match: 3,
  coin_hunt: 3,
  guess_price: 5,
  spin_wheel: 1,
  quiz: 3
};

class GameService {
  // ======== SPIN WHEEL ========

  // Create spin wheel session
  async createSpinWheelSession(
    userId: string,
    earnedFrom: string = 'daily_free'
  ): Promise<IGameSession> {
    // Check daily limit
    if (earnedFrom === 'daily_free') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingToday = await GameSession.countDocuments({
        user: userId,
        gameType: 'spin_wheel',
        earnedFrom: 'daily_free',
        createdAt: { $gte: today }
      });

      if (existingToday > 0) {
        throw new Error('Daily free spin already used');
      }
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    return GameSession.create({
      user: userId,
      gameType: 'spin_wheel',
      sessionId: uuidv4(),
      status: 'pending',
      earnedFrom,
      expiresAt
    });
  }

  // Play spin wheel
  async playSpinWheel(sessionId: string): Promise<IGameSession> {
    const session = await GameSession.findOne({ sessionId });

    if (!session) {
      throw new Error('Game session not found');
    }

    if (session.status === 'completed') {
      throw new Error('Game already played');
    }

    if (session.status === 'expired') {
      throw new Error('Game session expired');
    }

    if (new Date() > session.expiresAt) {
      session.status = 'expired';
      await session.save();
      throw new Error('Game session expired');
    }

    // Determine prize using weighted random selection
    const prize = this.getWeightedRandomPrize(SPIN_WHEEL_PRIZES);

    const result = {
      won: true,
      prize: {
        type: prize.type as any,
        value: prize.value,
        description: prize.description
      }
    };

    await session.complete(result);

    return session;
  }

  // ======== SCRATCH CARD ========

  // Create scratch card session
  async createScratchCardSession(
    userId: string,
    earnedFrom: string
  ): Promise<IGameSession> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

    return GameSession.create({
      user: userId,
      gameType: 'scratch_card',
      sessionId: uuidv4(),
      status: 'pending',
      earnedFrom,
      expiresAt
    });
  }

  // Play scratch card
  async playScratchCard(sessionId: string): Promise<IGameSession> {
    const session = await GameSession.findOne({ sessionId });

    if (!session) {
      throw new Error('Game session not found');
    }

    if (session.status === 'completed') {
      throw new Error('Game already played');
    }

    if (session.status === 'expired' || new Date() > session.expiresAt) {
      session.status = 'expired';
      await session.save();
      throw new Error('Game session expired');
    }

    // Determine prize
    const prize = this.getWeightedRandomPrize(SCRATCH_CARD_PRIZES);

    const result = {
      won: true,
      prize: {
        type: prize.type as any,
        value: prize.value,
        description: prize.description
      }
    };

    await session.complete(result);

    return session;
  }

  // ======== QUIZ ========

  // Create quiz session
  async createQuizSession(
    userId: string,
    questions: any[]
  ): Promise<IGameSession> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    const session = await GameSession.create({
      user: userId,
      gameType: 'quiz',
      sessionId: uuidv4(),
      status: 'pending',
      earnedFrom: 'daily_quiz',
      expiresAt
    });

    return session;
  }

  // Submit quiz answers
  async submitQuizAnswers(
    sessionId: string,
    answers: { questionId: string; answer: string }[],
    correctAnswers: { questionId: string; answer: string }[]
  ): Promise<IGameSession> {
    const session = await GameSession.findOne({ sessionId });

    if (!session) {
      throw new Error('Game session not found');
    }

    if (session.status === 'completed') {
      throw new Error('Quiz already submitted');
    }

    if (new Date() > session.expiresAt) {
      session.status = 'expired';
      await session.save();
      throw new Error('Quiz session expired');
    }

    // Calculate score
    let correct = 0;
    answers.forEach(userAnswer => {
      const correctAnswer = correctAnswers.find(
        ca => ca.questionId === userAnswer.questionId
      );
      if (correctAnswer && correctAnswer.answer === userAnswer.answer) {
        correct++;
      }
    });

    const score = correct;
    const total = correctAnswers.length;
    const percentage = (correct / total) * 100;

    // Calculate coins based on score
    const coinsPerCorrect = 10;
    const bonusForPerfect = percentage === 100 ? 50 : 0;
    const coins = (score * coinsPerCorrect) + bonusForPerfect;

    const result = {
      won: score > 0,
      prize: coins > 0 ? {
        type: 'coins' as const,
        value: coins,
        description: `${coins} Coins for ${score}/${total} correct!`
      } : undefined,
      score: percentage
    };

    await session.complete(result);

    return session;
  }

  // ======== DAILY TRIVIA ========

  // Get daily trivia question
  async getDailyTrivia(): Promise<any> {
    // Questions pool (in production, fetch from database)
    const triviaQuestions = [
      {
        id: '1',
        question: 'What is the capital of France?',
        options: ['London', 'Paris', 'Berlin', 'Madrid'],
        correctAnswer: 'Paris',
        category: 'Geography'
      },
      {
        id: '2',
        question: 'How many days are there in a week?',
        options: ['5', '6', '7', '8'],
        correctAnswer: '7',
        category: 'General'
      }
      // Add more questions
    ];

    // Select random question
    const question = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];

    return {
      id: question.id,
      question: question.question,
      options: question.options,
      category: question.category,
      reward: 20 // coins for correct answer
    };
  }

  // Answer daily trivia
  async answerDailyTrivia(
    userId: string,
    questionId: string,
    answer: string
  ): Promise<{ correct: boolean; coins: number }> {
    // Check if already answered today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingToday = await GameSession.countDocuments({
      user: userId,
      gameType: 'daily_trivia',
      createdAt: { $gte: today }
    });

    if (existingToday > 0) {
      throw new Error('Daily trivia already answered today');
    }

    // Get correct answer (in production, fetch from database)
    const triviaQuestions: any = {
      '1': 'Paris',
      '2': '7'
    };

    const correctAnswer = triviaQuestions[questionId];
    const isCorrect = answer === correctAnswer;

    const coins = isCorrect ? 20 : 0;

    // Create game session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    await GameSession.create({
      user: userId,
      gameType: 'daily_trivia',
      sessionId: uuidv4(),
      status: 'completed',
      earnedFrom: 'daily_trivia',
      expiresAt,
      result: {
        won: isCorrect,
        prize: isCorrect ? {
          type: 'coins',
          value: coins,
          description: `${coins} Coins for correct answer!`
        } : undefined
      }
    });

    return {
      correct: isCorrect,
      coins
    };
  }

  // ======== GENERAL ========

  // Get user's game sessions
  async getUserGameSessions(
    userId: string,
    gameType?: string,
    limit: number = 20
  ): Promise<IGameSession[]> {
    const query: any = { user: userId };

    if (gameType) {
      query.gameType = gameType;
    }

    return GameSession.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  // Get pending games for user
  async getPendingGames(userId: string): Promise<IGameSession[]> {
    const now = new Date();

    return GameSession.find({
      user: userId,
      status: 'pending',
      expiresAt: { $gt: now }
    })
      .sort({ createdAt: 1 })
      .exec();
  }

  // Get game statistics
  async getGameStats(userId: string): Promise<any> {
    const stats = await GameSession.aggregate([
      {
        $match: { user: userId, status: 'completed' }
      },
      {
        $group: {
          _id: '$gameType',
          totalPlayed: { $sum: 1 },
          totalWon: {
            $sum: { $cond: ['$result.won', 1, 0] }
          },
          totalCoins: {
            $sum: {
              $cond: [
                { $eq: ['$result.prize.type', 'coins'] },
                '$result.prize.value',
                0
              ]
            }
          }
        }
      }
    ]);

    const gameStats: any = {
      spin_wheel: { totalPlayed: 0, totalWon: 0, totalCoins: 0 },
      scratch_card: { totalPlayed: 0, totalWon: 0, totalCoins: 0 },
      quiz: { totalPlayed: 0, totalWon: 0, totalCoins: 0 },
      daily_trivia: { totalPlayed: 0, totalWon: 0, totalCoins: 0 }
    };

    stats.forEach(stat => {
      gameStats[stat._id] = {
        totalPlayed: stat.totalPlayed,
        totalWon: stat.totalWon,
        totalCoins: stat.totalCoins,
        winRate: Math.round((stat.totalWon / stat.totalPlayed) * 100)
      };
    });

    return gameStats;
  }

  // ======== MEMORY MATCH ========

  // Start memory match game
  async startMemoryMatch(
    userId: string,
    difficulty: 'easy' | 'medium' | 'hard' = 'easy'
  ): Promise<any> {
    // Check daily limit
    const playsRemaining = await this.getDailyPlaysRemaining(userId, 'memory_match');
    if (playsRemaining <= 0) {
      throw new Error('Daily limit reached for Memory Match');
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minute expiry

    // Generate card pairs based on difficulty
    const pairCounts = { easy: 6, medium: 8, hard: 12 };
    const pairs = pairCounts[difficulty];

    const session = await GameSession.create({
      user: userId,
      gameType: 'memory_match',
      sessionId: uuidv4(),
      status: 'playing',
      earnedFrom: 'game_play',
      expiresAt,
      metadata: {
        difficulty,
        pairs,
        startTime: new Date()
      }
    });

    return {
      sessionId: session.sessionId,
      difficulty,
      pairs,
      expiresAt,
      rewards: MEMORY_MATCH_PRIZES[difficulty]
    };
  }

  // Complete memory match game
  async completeMemoryMatch(
    sessionId: string,
    score: number,
    timeSpent: number,
    moves: number
  ): Promise<any> {
    const session = await GameSession.findOne({ sessionId });

    if (!session) {
      throw new Error('Game session not found');
    }

    if (session.status === 'completed') {
      throw new Error('Game already completed');
    }

    const userId = session.user.toString();
    const metadata = session.metadata as any;
    const difficulty = metadata?.difficulty || 'easy';
    const prizes = MEMORY_MATCH_PRIZES[difficulty as keyof typeof MEMORY_MATCH_PRIZES];
    const pairs = metadata?.pairs || 6;

    // Calculate coins
    let coins = prizes.baseCoins;

    // Perfect match bonus (no wrong moves)
    if (moves === pairs) {
      coins += prizes.perfectBonus;
    }

    // Time bonus (complete within 30 seconds)
    if (timeSpent < 30) {
      coins += prizes.timeBonus;
    }

    const result = {
      won: true,
      prize: {
        type: 'coins' as const,
        value: coins,
        description: `${coins} Coins earned!`
      },
      score
    };

    await session.complete(result);

    // Credit coins to user's wallet
    let newBalance = 0;
    if (coins > 0) {
      const coinResult = await coinService.awardCoins(
        userId,
        coins,
        'memory_match',
        `Memory Match game: ${coins} coins earned!`,
        { sessionId, timeSpent, moves, perfectMatch: moves === pairs }
      );
      newBalance = coinResult.newBalance;
    }

    return {
      sessionId,
      coins,
      score,
      timeSpent,
      moves,
      perfectMatch: moves === pairs,
      timeBonus: timeSpent < 30,
      newBalance // Return updated wallet balance
    };
  }

  // ======== COIN HUNT ========

  // Start coin hunt game
  async startCoinHunt(userId: string): Promise<any> {
    // Check daily limit
    const playsRemaining = await this.getDailyPlaysRemaining(userId, 'coin_hunt');
    if (playsRemaining <= 0) {
      throw new Error('Daily limit reached for Coin Hunt');
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minute expiry

    // Generate coin positions (in production, could be more dynamic)
    const coins = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      value: Math.random() < 0.1 ? 10 : Math.random() < 0.3 ? 5 : 1,
      x: Math.random() * 100,
      y: Math.random() * 100
    }));

    const session = await GameSession.create({
      user: userId,
      gameType: 'coin_hunt',
      sessionId: uuidv4(),
      status: 'playing',
      earnedFrom: 'game_play',
      expiresAt,
      metadata: {
        totalCoins: coins.length,
        maxValue: coins.reduce((sum, c) => sum + c.value, 0),
        startTime: new Date()
      }
    });

    return {
      sessionId: session.sessionId,
      coins,
      duration: 60, // 60 seconds to collect
      expiresAt
    };
  }

  // Complete coin hunt game
  async completeCoinHunt(
    sessionId: string,
    coinsCollected: number,
    score: number
  ): Promise<any> {
    const session = await GameSession.findOne({ sessionId });

    if (!session) {
      throw new Error('Game session not found');
    }

    if (session.status === 'completed') {
      throw new Error('Game already completed');
    }

    const userId = session.user.toString();

    const result = {
      won: coinsCollected > 0,
      prize: coinsCollected > 0 ? {
        type: 'coins' as const,
        value: score,
        description: `${score} Coins collected!`
      } : undefined,
      score
    };

    await session.complete(result);

    // Credit coins to user's wallet
    let newBalance = 0;
    if (score > 0) {
      const coinResult = await coinService.awardCoins(
        userId,
        score,
        'coin_hunt',
        `Coin Hunt game: ${score} coins collected!`,
        { sessionId, coinsCollected }
      );
      newBalance = coinResult.newBalance;
    }

    return {
      sessionId,
      coinsCollected,
      coinsEarned: score,
      success: true,
      newBalance // Return updated wallet balance
    };
  }

  // ======== GUESS THE PRICE ========

  // Start guess price game
  async startGuessPrice(userId: string): Promise<any> {
    // Check daily limit
    const playsRemaining = await this.getDailyPlaysRemaining(userId, 'guess_price');
    if (playsRemaining <= 0) {
      throw new Error('Daily limit reached for Guess the Price');
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // Sample products (in production, fetch from database)
    const products = [
      { id: '1', name: 'Wireless Earbuds', image: '/products/earbuds.jpg', actualPrice: 2499 },
      { id: '2', name: 'Smart Watch', image: '/products/watch.jpg', actualPrice: 4999 },
      { id: '3', name: 'Bluetooth Speaker', image: '/products/speaker.jpg', actualPrice: 1799 },
      { id: '4', name: 'Power Bank 20000mAh', image: '/products/powerbank.jpg', actualPrice: 1299 },
      { id: '5', name: 'Gaming Mouse', image: '/products/mouse.jpg', actualPrice: 899 }
    ];

    const product = products[Math.floor(Math.random() * products.length)];

    const session = await GameSession.create({
      user: userId,
      gameType: 'guess_price',
      sessionId: uuidv4(),
      status: 'playing',
      earnedFrom: 'game_play',
      expiresAt,
      metadata: {
        productId: product.id,
        productName: product.name,
        actualPrice: product.actualPrice,
        startTime: new Date()
      }
    });

    return {
      sessionId: session.sessionId,
      product: {
        id: product.id,
        name: product.name,
        image: product.image
      },
      priceRange: {
        min: Math.floor(product.actualPrice * 0.5),
        max: Math.floor(product.actualPrice * 1.5)
      },
      expiresAt
    };
  }

  // Submit guess price answer
  async submitGuessPrice(
    sessionId: string,
    guessedPrice: number
  ): Promise<any> {
    const session = await GameSession.findOne({ sessionId });

    if (!session) {
      throw new Error('Game session not found');
    }

    if (session.status === 'completed') {
      throw new Error('Game already completed');
    }

    const userId = session.user.toString();
    const metadata = session.metadata as any;
    const actualPrice = metadata?.actualPrice || 0;

    // Calculate accuracy
    const difference = Math.abs(guessedPrice - actualPrice);
    const accuracy = Math.max(0, 100 - (difference / actualPrice * 100));

    // Calculate coins based on accuracy
    let coins = 0;
    let message = '';

    if (accuracy >= 95) {
      coins = 50;
      message = 'Perfect! You nailed it!';
    } else if (accuracy >= 85) {
      coins = 30;
      message = 'Excellent guess!';
    } else if (accuracy >= 70) {
      coins = 20;
      message = 'Good guess!';
    } else if (accuracy >= 50) {
      coins = 10;
      message = 'Close enough!';
    } else {
      coins = 5;
      message = 'Better luck next time!';
    }

    const result = {
      won: true,
      prize: {
        type: 'coins' as const,
        value: coins,
        description: `${coins} Coins earned!`
      },
      score: Math.round(accuracy)
    };

    await session.complete(result);

    // Credit coins to user's wallet
    let newBalance = 0;
    if (coins > 0) {
      const coinResult = await coinService.awardCoins(
        userId,
        coins,
        'guess_price',
        `Guess the Price game: ${coins} coins earned!`,
        { sessionId, accuracy: Math.round(accuracy), guessedPrice, actualPrice }
      );
      newBalance = coinResult.newBalance;
    }

    return {
      sessionId,
      guessedPrice,
      actualPrice,
      accuracy: Math.round(accuracy),
      coins,
      message,
      productName: metadata?.productName,
      newBalance // Return updated wallet balance
    };
  }

  // ======== DAILY LIMITS ========

  // Get remaining plays for a game type
  async getDailyPlaysRemaining(userId: string, gameType: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const playedToday = await GameSession.countDocuments({
      user: userId,
      gameType,
      createdAt: { $gte: today }
    });

    const limit = DAILY_GAME_LIMITS[gameType as keyof typeof DAILY_GAME_LIMITS] || 3;
    return Math.max(0, limit - playedToday);
  }

  // Get all daily limits status
  async getDailyLimits(userId: string): Promise<any> {
    const gameTypes = Object.keys(DAILY_GAME_LIMITS);

    const limits = await Promise.all(
      gameTypes.map(async gameType => ({
        gameType,
        limit: DAILY_GAME_LIMITS[gameType as keyof typeof DAILY_GAME_LIMITS],
        remaining: await this.getDailyPlaysRemaining(userId, gameType)
      }))
    );

    return limits.reduce((acc, item) => {
      acc[item.gameType] = {
        limit: item.limit,
        remaining: item.remaining,
        played: item.limit - item.remaining
      };
      return acc;
    }, {} as any);
  }

  // Helper: Weighted random selection
  private getWeightedRandomPrize(prizes: readonly any[]): any {
    const totalWeight = prizes.reduce((sum, prize) => sum + prize.weight, 0);
    let random = Math.random() * totalWeight;

    for (const prize of prizes) {
      random -= prize.weight;
      if (random <= 0) {
        return prize;
      }
    }

    return prizes[0]; // Fallback
  }

  // Expire old sessions (run via cron)
  async expireOldSessions(): Promise<number> {
    const result = await GameSession.expireSessions();
    return result.modifiedCount || 0;
  }

  // Get today's total earnings for a user
  async getTodaysEarnings(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await GameSession.aggregate([
      {
        $match: {
          user: userId,
          status: 'completed',
          createdAt: { $gte: today },
          'result.prize.type': 'coins'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$result.prize.value' }
        }
      }
    ]);

    return result[0]?.total || 0;
  }

  // Get available games with status (for frontend display)
  async getAvailableGames(userId?: string): Promise<any[]> {
    const games = [
      {
        id: 'spin-wheel',
        title: 'Spin & Win',
        description: 'Spin the wheel to win coins and rewards',
        icon: '🎰',
        path: '/explore/spin-win',
        maxDaily: DAILY_GAME_LIMITS.spin_wheel,
        reward: 'Up to 1000 coins'
      },
      {
        id: 'memory-match',
        title: 'Memory Match',
        description: 'Match pairs to earn coins',
        icon: '🧠',
        path: '/playandearn/memorymatch',
        maxDaily: DAILY_GAME_LIMITS.memory_match,
        reward: 'Up to 170 coins'
      },
      {
        id: 'coin-hunt',
        title: 'Coin Hunt',
        description: 'Collect coins before time runs out',
        icon: '🪙',
        path: '/playandearn/coinhunt',
        maxDaily: DAILY_GAME_LIMITS.coin_hunt,
        reward: 'Up to 50 coins'
      },
      {
        id: 'guess-price',
        title: 'Guess the Price',
        description: 'Guess product prices to win',
        icon: '🏷️',
        path: '/playandearn/guessprice',
        maxDaily: DAILY_GAME_LIMITS.guess_price,
        reward: 'Up to 50 coins'
      },
      {
        id: 'quiz',
        title: 'Daily Quiz',
        description: 'Test your knowledge',
        icon: '❓',
        path: '/playandearn/quiz',
        maxDaily: DAILY_GAME_LIMITS.quiz,
        reward: 'Up to 150 coins'
      },
      {
        id: 'scratch-card',
        title: 'Scratch & Win',
        description: 'Scratch to reveal prizes',
        icon: '🎫',
        path: '/playandearn/luckydraw',
        maxDaily: 0, // Earned through other activities
        reward: 'Up to 250 coins'
      }
    ];

    // If user is authenticated, add their remaining plays
    if (userId) {
      const limits = await this.getDailyLimits(userId);
      const todaysEarnings = await this.getTodaysEarnings(userId);

      return games.map(game => {
        const gameTypeKey = game.id.replace('-', '_');
        const limitData = limits[gameTypeKey];

        return {
          ...game,
          playsRemaining: limitData?.remaining ?? game.maxDaily,
          playsUsed: limitData?.played ?? 0,
          isAvailable: limitData ? limitData.remaining > 0 : true,
          todaysEarnings: todaysEarnings
        };
      });
    }

    // For unauthenticated users, return games with default availability
    return games.map(game => ({
      ...game,
      playsRemaining: game.maxDaily,
      playsUsed: 0,
      isAvailable: true,
      todaysEarnings: 0
    }));
  }
}

export default new GameService();
