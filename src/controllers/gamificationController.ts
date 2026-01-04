import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError, sendNotFound, sendBadRequest } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

// Import services
import challengeService from '../services/challengeService';
import { UserAchievement, ACHIEVEMENT_DEFINITIONS } from '../models/Achievement';
import leaderboardService from '../services/leaderboardService';
import coinService from '../services/coinService';
import streakService from '../services/streakService';
import spinWheelService from '../services/spinWheelService';
import quizService from '../services/quizService';
import scratchCardService from '../services/scratchCardService';
import SurpriseCoinDrop from '../models/SurpriseCoinDrop';
import UserStreak from '../models/UserStreak';
import { Order } from '../models/Order';
import Review from '../models/Review';
import type { ISocialMediaPost } from '../models/SocialMediaPost';

// ========================================
// CHALLENGES
// ========================================

export const getChallenges = asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.query;

  const challenges = await challengeService.getActiveChallenges(type as string);

  sendSuccess(res, challenges, 'Challenges retrieved successfully');
});

export const getActiveChallenge = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const progress = await challengeService.getUserProgress((req.user._id as Types.ObjectId).toString(), false);

  sendSuccess(res, progress, 'Active challenges retrieved successfully');
});

export const claimChallengeReward = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { id } = req.params;

  const result = await challengeService.claimRewards((req.user._id as Types.ObjectId).toString(), id);

  sendSuccess(res, result, 'Challenge reward claimed successfully');
});

// ========================================
// ACHIEVEMENTS
// ========================================

export const getAchievements = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, ACHIEVEMENT_DEFINITIONS.filter(a => a.isActive), 'Achievement definitions retrieved successfully');
});

export const getUserAchievements = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const achievements = await UserAchievement.find({ user: userId })
    .sort({ unlocked: -1, progress: -1 });

  sendSuccess(res, achievements, 'User achievements retrieved successfully');
});

/**
 * Get current user's achievements (JWT-based, no userId param)
 * GET /api/gamification/achievements/me
 */
export const getMyAchievements = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();

  // Get user's achievement records
  let userAchievements = await UserAchievement.find({ user: userId })
    .sort({ unlocked: -1, progress: -1 });

  // If user has no achievement records, initialize them from definitions
  if (userAchievements.length === 0) {
    const activeDefinitions = ACHIEVEMENT_DEFINITIONS.filter(d => d.isActive);

    // Create achievement records for this user
    const achievementDocs = activeDefinitions.map(def => ({
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

    if (achievementDocs.length > 0) {
      await UserAchievement.insertMany(achievementDocs, { ordered: false }).catch(() => {
        // Ignore duplicate key errors
      });
      userAchievements = await UserAchievement.find({ user: userId })
        .sort({ unlocked: -1, progress: -1 });
    }
  }

  // Calculate summary
  const total = userAchievements.length;
  const unlocked = userAchievements.filter(a => a.unlocked).length;
  const inProgress = userAchievements.filter(a => !a.unlocked && a.progress > 0).length;

  sendSuccess(res, {
    summary: {
      total,
      unlocked,
      inProgress,
      locked: total - unlocked - inProgress,
      completionPercentage: total > 0 ? Math.round((unlocked / total) * 100) : 0
    },
    achievements: userAchievements
  }, 'User achievements retrieved successfully');
});

export const unlockAchievement = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { achievementId } = req.body;

  const achievement = await UserAchievement.findOne({
    _id: achievementId,
    user: req.user._id as Types.ObjectId
  });

  if (!achievement) {
    return sendNotFound(res, 'Achievement not found');
  }

  if (achievement.unlocked) {
    return sendBadRequest(res, 'Achievement already unlocked');
  }

  if (achievement.progress < 100) {
    return sendBadRequest(res, 'Achievement requirements not met');
  }

  achievement.unlocked = true;
  achievement.unlockedDate = new Date();
  await achievement.save();

  sendSuccess(res, achievement, 'Achievement unlocked successfully');
});

// ========================================
// BADGES (Using achievements system)
// ========================================

export const getBadges = asyncHandler(async (req: Request, res: Response) => {
  const badges = ACHIEVEMENT_DEFINITIONS.filter(a => a.reward?.badge);
  sendSuccess(res, badges, 'Badges retrieved successfully');
});

export const getUserBadges = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const achievements = await UserAchievement.find({
    user: userId,
    unlocked: true
  });

  const badges = achievements.filter(a => {
    const def = ACHIEVEMENT_DEFINITIONS.find(d => d.type === a.type);
    return def?.reward?.badge;
  });

  sendSuccess(res, badges, 'User badges retrieved successfully');
});

// ========================================
// LEADERBOARD
// ========================================

export const getLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const { period = 'monthly', type = 'spending', limit = 10 } = req.query;

  let leaderboard;

  switch (type) {
    case 'spending':
      leaderboard = await leaderboardService.getSpendingLeaderboard(
        period as any,
        parseInt(limit as string)
      );
      break;
    case 'reviews':
      leaderboard = await leaderboardService.getReviewLeaderboard(
        period as any,
        parseInt(limit as string)
      );
      break;
    case 'referrals':
      leaderboard = await leaderboardService.getReferralLeaderboard(
        period as any,
        parseInt(limit as string)
      );
      break;
    case 'cashback':
      leaderboard = await leaderboardService.getCashbackLeaderboard(
        period as any,
        parseInt(limit as string)
      );
      break;
    case 'coins':
      leaderboard = await coinService.getCoinLeaderboard(
        period as any,
        parseInt(limit as string)
      );
      break;
    default:
      leaderboard = await leaderboardService.getLeaderboardStats();
  }

  sendSuccess(res, leaderboard, 'Leaderboard retrieved successfully');
});

export const getUserRank = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { period = 'monthly' } = req.query;

  const ranks = await leaderboardService.getAllUserRanks(userId, period as any);

  sendSuccess(res, ranks, 'User rank retrieved successfully');
});

// ========================================
// COINS (CURRENCY SYSTEM)
// ========================================

export const getCoinBalance = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const balance = await coinService.getCoinBalance((req.user._id as Types.ObjectId).toString());

  sendSuccess(res, { balance }, 'Coin balance retrieved successfully');
});

export const getCoinTransactions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { type, source, limit, offset } = req.query;

  const result = await coinService.getCoinTransactions((req.user._id as Types.ObjectId).toString(), {
    type: type as string,
    source: source as string,
    limit: limit ? parseInt(limit as string) : undefined,
    offset: offset ? parseInt(offset as string) : undefined
  });

  sendSuccess(res, result, 'Coin transactions retrieved successfully');
});

export const awardCoins = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { amount, source, description, metadata } = req.body;

  if (!amount || amount <= 0) {
    return sendBadRequest(res, 'Invalid amount');
  }

  const result = await coinService.awardCoins(
    (req.user._id as Types.ObjectId).toString(),
    amount,
    source || 'admin',
    description || 'Coins awarded',
    metadata
  );

  sendSuccess(res, result, 'Coins awarded successfully');
});

export const deductCoins = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { amount, source, description, metadata } = req.body;

  if (!amount || amount <= 0) {
    return sendBadRequest(res, 'Invalid amount');
  }

  const result = await coinService.deductCoins(
    (req.user._id as Types.ObjectId).toString(),
    amount,
    source || 'purchase',
    description || 'Coins spent',
    metadata
  );

  sendSuccess(res, result, 'Coins deducted successfully');
});

// ========================================
// DAILY STREAK
// ========================================

export const getDailyStreak = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const streaks = await streakService.getUserStreaks(userId);

  sendSuccess(res, streaks, 'Daily streaks retrieved successfully');
});

export const incrementStreak = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { type = 'login' } = req.body;

  const result = await streakService.updateStreak((req.user._id as Types.ObjectId).toString(), type);

  sendSuccess(res, result, 'Streak updated successfully');
});

// ========================================
// MINI-GAMES - SPIN WHEEL
// ========================================

export const createSpinWheel = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const session = await spinWheelService.createSpinSession((req.user._id as Types.ObjectId).toString());

  sendSuccess(res, session, 'Spin wheel session created successfully', 201);
});

export const spinWheel = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  console.log('🎰 [SPIN_WHEEL] Spin request from user:', userId);

  // ✅ FIX: Check daily spin limit instead of 24-hour cooldown
  // Count spins completed TODAY (since midnight UTC)
  const { MiniGame } = await import('../models/MiniGame');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const spinsToday = await MiniGame.countDocuments({
    user: userId,
    gameType: 'spin_wheel',
    status: 'completed',
    completedAt: { $gte: today }
  });

  const MAX_DAILY_SPINS = 3;
  if (spinsToday >= MAX_DAILY_SPINS) {
    console.log(`❌ [SPIN_WHEEL] Daily limit reached: ${spinsToday}/${MAX_DAILY_SPINS} spins used today`);
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return sendBadRequest(res, `Daily spin limit reached (${MAX_DAILY_SPINS} spins per day). Next spin available at midnight UTC (${tomorrow.toISOString()})`);
  }

  console.log(`✅ [SPIN_WHEEL] User eligible: ${spinsToday}/${MAX_DAILY_SPINS} spins used today`);

  // Create a session and immediately spin
  const session = await spinWheelService.createSpinSession(userId);
  console.log('✅ [SPIN_WHEEL] Session created:', session.sessionId);

  const spinResult = await spinWheelService.spin(session.sessionId);
  console.log('🎉 [SPIN_WHEEL] Spin result:', spinResult);

  // ✅ FIX: Get user's coin balance from WALLET (single source of truth)
  // This ensures consistency between homepage and spin wheel page
  const { Wallet } = await import('../models/Wallet');
  const wallet = await Wallet.findOne({ user: userId });

  let actualBalance = 0;
  if (wallet) {
    actualBalance = wallet.balance.total;
    console.log(`💰 [SPIN_WHEEL] User balance after spin: ${actualBalance}`);
  } else {
    console.warn(`⚠️ [SPIN_WHEEL] Wallet not found for user ${userId}`);
  }

  // Format response to match frontend expectations
  const response = {
    result: {
      segment: {
        id: spinResult.segment.toString(),
        label: spinResult.prize,
        value: spinResult.value,
        color: '#8B5CF6', // Default color
        type: spinResult.type,
        icon: 'star'
      },
      prize: {
        type: spinResult.type,
        value: spinResult.value,
        label: spinResult.prize,
        // ✅ NEW: Include coupon details for frontend display
        couponDetails: spinResult.couponMetadata ? {
          storeName: spinResult.couponMetadata.storeName,
          storeId: spinResult.couponMetadata.storeId,
          productName: spinResult.couponMetadata.productName || null,
          productId: spinResult.couponMetadata.productId || null,
          productImage: spinResult.couponMetadata.productImage || null,
          isProductSpecific: spinResult.couponMetadata.isProductSpecific,
          applicableOn: spinResult.couponMetadata.isProductSpecific
            ? `${spinResult.couponMetadata.productName} from ${spinResult.couponMetadata.storeName}`
            : `Any product from ${spinResult.couponMetadata.storeName}`
        } : null
      }
    },
    coinsAdded: spinResult.type === 'coins' ? spinResult.value : 0,
    newBalance: actualBalance // ✅ Return wallet balance (synced with homepage)
  };

  console.log('💰 [SPIN_WHEEL] User balance after spin:', actualBalance);
  sendSuccess(res, response, 'Spin completed successfully');
});

export const getSpinWheelEligibility = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const eligibility = await spinWheelService.checkEligibility((req.user._id as Types.ObjectId).toString());

  sendSuccess(res, eligibility, 'Eligibility checked successfully');
});

export const getSpinWheelData = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  console.log('📊 [SPIN_WHEEL] Getting spin wheel data for user:', userId);

  // Get stats for analytics
  const stats = await spinWheelService.getSpinStats(userId);

  // Get session data which includes prizes
  const session = await spinWheelService.createSpinSession(userId).catch(() => null);

  const segments = session?.prizes || [
    { segment: 1, prize: '50 Coins', color: '#10B981' },
    { segment: 2, prize: '100 Coins', color: '#3B82F6' },
    { segment: 3, prize: '5% Cashback', color: '#F59E0B' },
    { segment: 4, prize: '200 Coins', color: '#10B981' },
    { segment: 5, prize: '10% Discount', color: '#EC4899' },
    { segment: 6, prize: '500 Coins', color: '#8B5CF6' },
    { segment: 7, prize: '₹50 Voucher', color: '#F59E0B' },
    { segment: 8, prize: '1000 Coins', color: '#EF4444' }
  ];

  // ✅ FIX: Count actual spins completed TODAY (since midnight UTC)
  // This replaces the broken cooldown-based logic
  const { MiniGame } = await import('../models/MiniGame');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Midnight UTC

  const spinsToday = await MiniGame.countDocuments({
    user: userId,
    gameType: 'spin_wheel',
    status: 'completed',
    completedAt: { $gte: today }
  });

  const MAX_DAILY_SPINS = 3;
  const spinsRemaining = Math.max(0, MAX_DAILY_SPINS - spinsToday);

  console.log(`📊 [SPIN_WHEEL] User ${userId}: ${spinsToday} spins used today, ${spinsRemaining} remaining`);

  const data = {
    segments: segments.map((s: any) => ({
      id: s.segment.toString(),
      label: s.prize,
      value: parseInt(s.prize) || 0,
      color: s.color,
      type: 'coins',
      icon: 'star'
    })),
    spinsRemaining, // ✅ Now correctly reflects daily usage
    stats // ✅ Include stats (totalCoinsWon, totalSpins, etc.) for earnings calculation
  };

  console.log('✅ [SPIN_WHEEL] Spin wheel data retrieved');
  sendSuccess(res, data, 'Spin wheel data retrieved successfully');
});

/**
 * GET /api/gamification/spin-wheel/history
 * Get spin wheel history for authenticated user
 */
export const getSpinWheelHistory = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const limit = parseInt(req.query.limit as string) || 20;

  console.log('📜 [SPIN_WHEEL] Getting spin history for user:', userId, 'limit:', limit);

  const history = await spinWheelService.getSpinHistory(userId, limit);

  console.log('✅ [SPIN_WHEEL] Found', history.length, 'spin records');

  sendSuccess(res, { history, total: history.length }, 'Spin wheel history retrieved successfully');
});

// ========================================
// MINI-GAMES - SCRATCH CARD
// ========================================

export const createScratchCard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const session = await scratchCardService.createScratchCard((req.user._id as Types.ObjectId).toString());

  sendSuccess(res, session, 'Scratch card created successfully', 201);
});

export const scratchCard = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, cellIndex } = req.body;

  if (!sessionId || cellIndex === undefined) {
    return sendBadRequest(res, 'Session ID and cell index required');
  }

  const result = await scratchCardService.scratchCell(sessionId, cellIndex);

  sendSuccess(res, result, 'Cell scratched successfully');
});

export const claimScratchCard = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await scratchCardService.claimScratchCard(id);

  sendSuccess(res, result, 'Scratch card claimed successfully');
});

// ========================================
// MINI-GAMES - QUIZ
// ========================================

export const startQuiz = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { difficulty = 'easy', questionCount = 5 } = req.body;

  const quiz = await quizService.startQuiz(
    (req.user._id as Types.ObjectId).toString(),
    difficulty,
    questionCount
  );

  sendSuccess(res, quiz, 'Quiz started successfully', 201);
});

export const submitQuizAnswer = asyncHandler(async (req: Request, res: Response) => {
  const { quizId } = req.params;
  const { questionIndex, answer, timeSpent } = req.body;

  if (questionIndex === undefined || answer === undefined) {
    return sendBadRequest(res, 'Question index and answer required');
  }

  const result = await quizService.submitAnswer(quizId, questionIndex, answer, timeSpent || 0);

  sendSuccess(res, result, result.correct ? 'Correct answer!' : 'Incorrect answer');
});

export const getQuizProgress = asyncHandler(async (req: Request, res: Response) => {
  const { quizId } = req.params;

  const progress = await quizService.getQuizProgress(quizId);

  sendSuccess(res, progress, 'Quiz progress retrieved successfully');
});

export const completeQuiz = asyncHandler(async (req: Request, res: Response) => {
  const { quizId } = req.params;

  const result = await quizService.completeQuiz(quizId);

  sendSuccess(res, result, 'Quiz completed successfully');
});

// ========================================
// MY PROGRESS (CHALLENGES + STATS)
// ========================================

/**
 * Get user's challenge progress across all challenges
 * GET /api/gamification/challenges/my-progress
 * @returns User's challenge progress with stats
 */
export const getMyChallengeProgress = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();

  // Get all user's challenge progress
  const allProgress = await challengeService.getUserProgress(userId, true);

  // Calculate statistics
  const stats = {
    completed: allProgress.filter(p => p.completed).length,
    active: allProgress.filter(p => !p.completed && (p.challenge as any)?.active).length,
    expired: allProgress.filter(p => !p.completed && !(p.challenge as any)?.active).length,
    totalCoinsEarned: allProgress
      .filter(p => p.rewardsClaimed)
      .reduce((sum, p) => sum + ((p.challenge as any)?.rewards?.coins || 0), 0)
  };

  const result = {
    challenges: allProgress,
    stats
  };

  sendSuccess(res, result, 'Challenge progress retrieved successfully');
});

// ========================================
// GAMIFICATION STATS
// ========================================

/**
 * Get user's complete gamification statistics
 * GET /api/gamification/stats
 * @returns Complete user gamification stats including games, coins, achievements, streaks, and rank
 */
export const getGamificationStats = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();

  // Fetch all stats in parallel for better performance
  const [
    coinBalance,
    streaks,
    challengeStats,
    achievements,
    userRanks,
    gameSessions
  ] = await Promise.all([
    // Get coin balance
    coinService.getCoinBalance(userId),

    // Get streaks
    streakService.getUserStreaks(userId),

    // Get challenge statistics
    challengeService.getUserStatistics(userId),

    // Get achievements
    UserAchievement.find({ user: userId, unlocked: true }).countDocuments(),

    // Get user ranks
    leaderboardService.getAllUserRanks(userId, 'month'),

    // Get game session stats
    (async () => {
      const GameSession = (await import('../models/GameSession')).default;
      return GameSession.aggregate([
        { $match: { user: new Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalGames: { $sum: 1 },
            gamesWon: {
              $sum: { $cond: [{ $eq: ['$result.won', true] }, 1, 0] }
            }
          }
        }
      ]);
    })()
  ]);

  // Format game session stats
  const gameStats = gameSessions.length > 0 ? gameSessions[0] : { totalGames: 0, gamesWon: 0 };

  // Build comprehensive stats object
  const stats = {
    // Games stats
    gamesPlayed: gameStats.totalGames || 0,
    gamesWon: gameStats.gamesWon || 0,

    // Coins stats
    totalCoins: coinBalance || 0,

    // Achievements stats
    achievements: achievements || 0,

    // Streak stats
    streak: streaks.login?.current || 0,
    longestStreak: streaks.login?.longest || 0,

    // Challenge stats
    challengesCompleted: challengeStats.completedChallenges || 0,
    challengesActive: challengeStats.totalChallenges - (challengeStats.completedChallenges || 0),

    // Rank stats (using spending rank as primary)
    rank: userRanks.spending?.rank || 0,
    allRanks: {
      spending: userRanks.spending?.rank || 0,
      reviews: userRanks.reviews?.rank || 0,
      referrals: userRanks.referrals?.rank || 0,
      coins: userRanks.coins?.rank || 0,
      cashback: userRanks.cashback?.rank || 0
    }
  };

  sendSuccess(res, stats, 'Gamification stats retrieved successfully');
});

// ========================================
// PLAY & EARN HUB
// ========================================

/**
 * Get all play & earn hub data in one call
 * GET /api/gamification/play-and-earn
 * @returns Combined data for daily spin, challenges, streak, and surprise drops
 */
export const getPlayAndEarnData = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();

  // Get today's date for spin count
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const MAX_DAILY_SPINS = 3;

  // Import MiniGame for spin count
  const { MiniGame } = await import('../models/MiniGame');

  // Fetch all data in parallel with individual error handling
  let spinEligibility: { eligible: boolean; nextAvailableAt?: Date | null; reason?: string } = { eligible: false, nextAvailableAt: null };
  let spinsToday = 0;
  let lastSpin = null;
  let activeChallenges: any[] = [];
  let userStreaks: any[] = [];
  let availableDrops: any[] = [];
  let coinBalance = 0;

  try {
    spinEligibility = await spinWheelService.checkEligibility(userId);
  } catch (err) {
    // Spin eligibility check failed, use defaults
  }

  try {
    spinsToday = await MiniGame.countDocuments({
      user: userId,
      gameType: 'spin_wheel',
      status: 'completed',
      completedAt: { $gte: today }
    });
  } catch (err) {
    // Count spins failed, use default
  }

  try {
    lastSpin = await MiniGame.findOne({
      user: userId,
      gameType: 'spin_wheel',
      status: 'completed'
    }).sort({ completedAt: -1 }).select('completedAt');
  } catch (err) {
    // Get last spin failed
  }

  try {
    activeChallenges = await challengeService.getUserProgress(userId, false);
  } catch (err) {
    // Get challenges failed
  }

  try {
    userStreaks = await streakService.getUserStreaks(userId);
  } catch (err) {
    // Get streaks failed
  }

  try {
    availableDrops = await (SurpriseCoinDrop as any).getAvailableDrops(userId);
  } catch (err) {
    // Get drops failed
  }

  try {
    coinBalance = await coinService.getCoinBalance(userId);
  } catch (err) {
    // Get coin balance failed
  }

  const spinsRemaining = Math.max(0, MAX_DAILY_SPINS - spinsToday);

  // Get the most significant available drop (if any)
  const activeDrop = Array.isArray(availableDrops) && availableDrops.length > 0 ? availableDrops[0] : null;

  // Calculate completed today (reuse today variable from above)
  const todayStart = new Date(today);
  const challengesArray = Array.isArray(activeChallenges) ? activeChallenges : [];
  const completedToday = challengesArray.filter(
    (c: any) => c.completed && new Date(c.updatedAt) >= todayStart
  ).length;

  // Find the app_open streak or fallback to login streak
  const streaksArray = Array.isArray(userStreaks) ? userStreaks : [];
  const appOpenStreak = streaksArray.find((s: any) => s.type === 'app_open') ||
                        streaksArray.find((s: any) => s.type === 'login');

  // Check if user has checked in today
  const lastActivity = appOpenStreak ? new Date(appOpenStreak.lastActivityDate) : null;
  const todayCheckedIn = lastActivity
    ? lastActivity.setHours(0, 0, 0, 0) === todayStart.getTime()
    : false;

  // Find next milestone
  const currentStreak = appOpenStreak?.currentStreak || 0;
  const milestones = [
    { day: 3, coins: 50 },
    { day: 7, coins: 200 },
    { day: 14, coins: 500 },
    { day: 30, coins: 2000 },
    { day: 60, coins: 5000 },
    { day: 100, coins: 10000 }
  ];
  const nextMilestone = milestones.find(m => m.day > currentStreak) || milestones[milestones.length - 1];

  const data = {
    dailySpin: {
      spinsRemaining,
      maxSpins: MAX_DAILY_SPINS,
      lastSpinAt: lastSpin?.completedAt || null,
      canSpin: (spinEligibility?.eligible ?? false) && spinsRemaining > 0,
      nextSpinAt: spinEligibility?.nextAvailableAt || null
    },
    challenges: {
      active: challengesArray
        .filter((c: any) => !c.completed)
        .slice(0, 3)
        .map((c: any) => ({
          id: c._id || c.challenge?._id,
          title: c.challenge?.title || 'Challenge',
          progress: {
            current: c.progress || 0,
            target: c.challenge?.requirements?.target || 100,
            percentage: Math.round((c.progress || 0) / (c.challenge?.requirements?.target || 100) * 100)
          },
          reward: c.challenge?.rewards?.coins || 0,
          expiresAt: c.challenge?.endDate
        })),
      totalActive: challengesArray.filter((c: any) => !c.completed).length,
      completedToday
    },
    streak: {
      type: appOpenStreak?.type || 'app_open',
      currentStreak: currentStreak,
      longestStreak: appOpenStreak?.longestStreak || 0,
      nextMilestone,
      todayCheckedIn
    },
    surpriseDrop: activeDrop ? {
      id: activeDrop._id,
      available: true,
      coins: activeDrop.coins,
      message: activeDrop.message,
      expiresAt: activeDrop.expiresAt,
      reason: activeDrop.reason
    } : {
      available: false,
      coins: 0,
      message: null,
      expiresAt: null
    },
    coinBalance
  };

  sendSuccess(res, data, 'Play & Earn data retrieved successfully');
});

/**
 * Claim a surprise coin drop
 * POST /api/gamification/surprise-drop/claim
 */
export const claimSurpriseDrop = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { dropId } = req.body;
  const userId = (req.user._id as Types.ObjectId).toString();

  if (!dropId) {
    return sendBadRequest(res, 'Drop ID is required');
  }

  // Claim the drop
  const claimedDrop = await (SurpriseCoinDrop as any).claimDrop(dropId, userId);

  if (!claimedDrop) {
    return sendNotFound(res, 'Drop not found, already claimed, or expired');
  }

  // Award coins to user
  const result = await coinService.awardCoins(
    userId,
    claimedDrop.coins,
    'surprise_drop',
    claimedDrop.message,
    { dropId: claimedDrop._id, reason: claimedDrop.reason }
  );

  sendSuccess(res, {
    coins: claimedDrop.coins,
    newBalance: result.balance,
    message: `You claimed ${claimedDrop.coins} surprise coins!`
  }, 'Surprise drop claimed successfully');
});

/**
 * Check in for daily streak
 * POST /api/gamification/streak/checkin
 */
export const streakCheckin = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();

  // Get or create app_open streak
  let streak = await UserStreak.findOne({ user: userId, type: 'app_open' });

  if (!streak) {
    // Create new streak
    streak = new UserStreak({
      user: userId,
      type: 'app_open',
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: new Date(0), // Set to past to trigger increment
      streakStartDate: new Date(),
      totalDays: 0,
      milestones: [
        { day: 3, coinsReward: 50, rewardsClaimed: false },
        { day: 7, coinsReward: 200, rewardsClaimed: false },
        { day: 14, coinsReward: 500, rewardsClaimed: false },
        { day: 30, coinsReward: 2000, badgeReward: 'streak_master', rewardsClaimed: false },
        { day: 60, coinsReward: 5000, rewardsClaimed: false },
        { day: 100, coinsReward: 10000, badgeReward: 'loyalty_legend', rewardsClaimed: false }
      ]
    });
  }

  // Check if already checked in today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastActivity = new Date(streak.lastActivityDate);
  lastActivity.setHours(0, 0, 0, 0);

  if (lastActivity.getTime() === today.getTime()) {
    return sendSuccess(res, {
      streakUpdated: false,
      currentStreak: streak.currentStreak,
      coinsEarned: 0,
      milestoneReached: null,
      message: 'Already checked in today'
    }, 'Already checked in today');
  }

  // Update streak
  await streak.updateStreak();

  // Check for milestone rewards
  let milestoneReached = null;
  let coinsEarned = 10; // Base daily check-in coins

  for (const milestone of streak.milestones) {
    if (
      streak.currentStreak >= milestone.day &&
      !milestone.rewardsClaimed
    ) {
      milestoneReached = {
        day: milestone.day,
        coins: milestone.coinsReward,
        badge: milestone.badgeReward
      };
      coinsEarned += milestone.coinsReward;

      // Mark as claimed
      milestone.rewardsClaimed = true;
      milestone.claimedAt = new Date();
    }
  }

  await streak.save();

  // Award coins
  const result = await coinService.awardCoins(
    userId,
    coinsEarned,
    'daily_login',
    milestoneReached
      ? `Day ${streak.currentStreak} streak + Day ${milestoneReached.day} milestone!`
      : `Day ${streak.currentStreak} streak bonus`,
    { streakDay: streak.currentStreak, milestone: milestoneReached }
  );

  sendSuccess(res, {
    streakUpdated: true,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    coinsEarned,
    milestoneReached,
    newBalance: result.balance,
    message: milestoneReached
      ? `Congratulations! You reached Day ${milestoneReached.day} milestone!`
      : `Day ${streak.currentStreak} streak! +${coinsEarned} coins`
  }, 'Streak check-in successful');
});

// ========================================
// AFFILIATE / SHARE ENDPOINTS
// ========================================

/**
 * Get affiliate performance stats
 * GET /api/gamification/affiliate/stats
 */
export const getAffiliateStats = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();

  // Import models
  const Referral = (await import('../models/Referral')).default;
  const SocialMediaPost = (await import('../models/SocialMediaPost')).default;

  // Get referral stats
  const referrals = await Referral.find({ referrer: userId });
  const completedReferrals = referrals.filter(r => r.status === 'completed' || r.status === 'qualified');

  // Get social media post stats
  const posts = await SocialMediaPost.find({ user: userId });
  const approvedPosts = posts.filter(p => p.status === 'approved' || p.status === 'credited');

  // Calculate stats
  const totalShares = posts.length;
  const appDownloads = referrals.filter(r => r.status !== 'pending').length;
  const purchases = completedReferrals.length;
  const commissionEarned = completedReferrals.reduce((sum, r) => sum + (r.rewards?.referrerAmount || 0), 0) +
    approvedPosts.reduce((sum, p) => sum + (p.cashbackAmount || 0), 0);

  sendSuccess(res, {
    totalShares,
    appDownloads,
    purchases,
    commissionEarned,
  }, 'Affiliate stats retrieved successfully');
});

/**
 * Get promotional posters for sharing
 * GET /api/gamification/promotional-posters
 */
export const getPromotionalPosters = asyncHandler(async (req: Request, res: Response) => {
  // Import HeroBanner model
  const HeroBanner = (await import('../models/HeroBanner')).default;

  // Get active banners that can be used as promotional posters
  const now = new Date();
  const banners = await HeroBanner.find({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    'metadata.tags': { $in: ['promotional', 'shareable', 'poster'] }
  }).sort({ priority: -1 }).limit(10);

  // If no promotional banners found, get any active banners
  let posters = banners;
  if (posters.length === 0) {
    posters = await HeroBanner.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
    }).sort({ priority: -1 }).limit(4);
  }

  // Transform to frontend format
  const formattedPosters = posters.map(banner => ({
    id: banner._id.toString(),
    title: banner.title,
    subtitle: banner.subtitle || banner.description || '',
    image: banner.image,
    colors: [banner.backgroundColor, banner.backgroundColor], // Use single color as gradient
    shareBonus: 50, // Default share bonus
    isActive: banner.isActive,
  }));

  // If still no posters, return default promotional posters
  if (formattedPosters.length === 0) {
    const defaultPosters = [
      { id: '1', title: 'Mega Sale', subtitle: 'Up to 70% off + Extra Cashback', image: 'https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=500', colors: ['#F97316', '#EF4444'], shareBonus: 50, isActive: true },
      { id: '2', title: 'Weekend Bonanza', subtitle: '3X Coins on All Purchases', image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=500', colors: ['#A855F7', '#EC4899'], shareBonus: 30, isActive: true },
      { id: '3', title: 'New User Special', subtitle: 'Get Rs.500 Welcome Bonus', image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=500', colors: ['#3B82F6', '#06B6D4'], shareBonus: 100, isActive: true },
      { id: '4', title: 'Flash Sale Today', subtitle: 'Limited Time Mega Deals', image: 'https://images.unsplash.com/photo-1607082350899-7e105aa886ae?w=500', colors: ['#22C55E', '#14B8A6'], shareBonus: 40, isActive: true },
    ];
    return sendSuccess(res, { posters: defaultPosters }, 'Default promotional posters retrieved');
  }

  sendSuccess(res, { posters: formattedPosters }, 'Promotional posters retrieved successfully');
});

/**
 * Get user's share submissions history
 * GET /api/gamification/affiliate/submissions
 */
export const getShareSubmissions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();

  // Import SocialMediaPost model
  const SocialMediaPost = (await import('../models/SocialMediaPost')).default;

  // Get user's submissions
  const posts = await SocialMediaPost.find({ user: userId })
    .sort({ submittedAt: -1 })
    .limit(50) as ISocialMediaPost[];

  // Transform to frontend format
  const submissions = posts.map(post => ({
    id: (post._id as string).toString(),
    posterTitle: post.metadata?.orderNumber ? `Order #${post.metadata.orderNumber}` : 'Promotional Poster',
    posterId: post.metadata?.postId,
    postUrl: post.postUrl,
    platform: post.platform,
    status: post.status === 'credited' ? 'approved' : post.status,
    submittedAt: post.submittedAt.toISOString(),
    approvedAt: post.reviewedAt?.toISOString(),
    shareBonus: post.cashbackAmount || 0,
    rejectionReason: post.rejectionReason,
  }));

  sendSuccess(res, { submissions }, 'Share submissions retrieved successfully');
});

/**
 * Submit a shared post for review
 * POST /api/gamification/affiliate/submit
 */
export const submitSharePost = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const { posterId, posterTitle, postUrl, platform, shareBonus } = req.body;

  if (!postUrl || !platform) {
    return sendBadRequest(res, 'Post URL and platform are required');
  }

  // Validate URL
  try {
    new URL(postUrl);
  } catch {
    return sendBadRequest(res, 'Invalid post URL');
  }

  // Import SocialMediaPost model
  const SocialMediaPost = (await import('../models/SocialMediaPost')).default;

  // Check for duplicate submission
  const existingPost = await SocialMediaPost.findOne({
    user: userId,
    postUrl: postUrl,
    status: { $in: ['pending', 'approved', 'credited'] }
  });

  if (existingPost) {
    return sendBadRequest(res, 'This post has already been submitted');
  }

  // Create new submission
  const newPost = new SocialMediaPost({
    user: userId,
    platform: platform.toLowerCase(),
    postUrl,
    status: 'pending',
    cashbackAmount: shareBonus || 50,
    cashbackPercentage: 5,
    submittedAt: new Date(),
    metadata: {
      postId: posterId,
      orderNumber: posterTitle,
    }
  }) as ISocialMediaPost;

  await newPost.save();

  // Return formatted submission
  const submission = {
    id: (newPost._id as string).toString(),
    posterTitle: posterTitle || 'Promotional Poster',
    posterId,
    postUrl,
    platform,
    status: 'pending',
    submittedAt: newPost.submittedAt.toISOString(),
    shareBonus: newPost.cashbackAmount,
  };

  sendSuccess(res, { submission }, 'Post submitted for review successfully', 201);
});

/**
 * Get streak bonus milestones
 * GET /api/gamification/streak/bonuses
 */
export const getStreakBonuses = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();

  // Get user's streak
  const streak = await UserStreak.findOne({ user: userId, type: 'app_open' }) ||
                 await UserStreak.findOne({ user: userId, type: 'login' });

  const currentStreak = streak?.currentStreak || 0;

  // Define streak bonuses with achieved status
  const bonuses = [
    { days: 7, reward: 100, achieved: currentStreak >= 7 },
    { days: 30, reward: 500, achieved: currentStreak >= 30 },
    { days: 100, reward: 2000, achieved: currentStreak >= 100 },
  ];

  // If user has milestones, use those instead
  if (streak?.milestones && streak.milestones.length > 0) {
    const userBonuses = streak.milestones
      .filter(m => [7, 30, 100].includes(m.day))
      .map(m => ({
        days: m.day,
        reward: m.coinsReward,
        achieved: m.rewardsClaimed || currentStreak >= m.day,
      }));

    if (userBonuses.length > 0) {
      return sendSuccess(res, { bonuses: userBonuses }, 'Streak bonuses retrieved successfully');
    }
  }

  sendSuccess(res, { bonuses }, 'Streak bonuses retrieved successfully');
});

/**
 * Get reviewable items for user
 * Items the user has purchased/visited but hasn't reviewed yet
 * GET /api/gamification/reviewable-items
 */
export const getReviewableItems = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();

  // Get user's completed orders
  const completedOrders = await Order.find({
    user: userId,
    status: { $in: ['completed', 'delivered'] }
  })
    .populate('store', 'name logo category images')
    .populate('items.product', 'name images category pricing')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // Get user's existing reviews to filter out already reviewed items
  const existingReviews = await Review.find({ user: userId }).select('store product').lean();
  const reviewedStoreIds = new Set(existingReviews.map(r => r.store?.toString()).filter(Boolean));
  const reviewedProductIds = new Set(existingReviews.map(r => r.product?.toString()).filter(Boolean));

  const reviewableItems: any[] = [];

  // Process orders to find reviewable stores and products
  for (const order of completedOrders) {
    const store = (order as any).store;
    const orderDate = new Date(order.createdAt);
    const daysAgo = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

    // Add store if not reviewed
    if (store && !reviewedStoreIds.has(store._id.toString())) {
      reviewedStoreIds.add(store._id.toString()); // Prevent duplicates
      reviewableItems.push({
        id: store._id.toString(),
        type: 'store',
        name: store.name || 'Store',
        image: store.logo || store.images?.[0]?.url || null,
        category: store.category || 'General',
        visitDate: `${daysAgo} days ago`,
        coins: 50, // Base coins for store review
        hasReceipt: true,
      });
    }

    // Add products from the order if not reviewed
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        const product = item.product as any;
        if (product && !reviewedProductIds.has(product._id.toString())) {
          reviewedProductIds.add(product._id.toString()); // Prevent duplicates
          reviewableItems.push({
            id: product._id.toString(),
            type: 'product',
            name: product.name || 'Product',
            image: product.images?.[0]?.url || null,
            category: product.category || 'General',
            purchaseDate: `${daysAgo} days ago`,
            coins: 75, // Higher coins for product review
            brand: product.brand || null,
          });
        }
      }
    }
  }

  // Calculate potential earnings
  const potentialEarnings = reviewableItems.reduce((sum, item) => sum + (item.coins || 0), 0);

  sendSuccess(res, {
    items: reviewableItems.slice(0, 20), // Limit to 20 items
    totalPending: reviewableItems.length,
    potentialEarnings,
  }, 'Reviewable items retrieved successfully');
});
