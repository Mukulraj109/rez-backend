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
