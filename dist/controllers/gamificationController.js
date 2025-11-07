"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGamificationStats = exports.getMyChallengeProgress = exports.completeQuiz = exports.getQuizProgress = exports.submitQuizAnswer = exports.startQuiz = exports.claimScratchCard = exports.scratchCard = exports.createScratchCard = exports.getSpinWheelHistory = exports.getSpinWheelData = exports.getSpinWheelEligibility = exports.spinWheel = exports.createSpinWheel = exports.incrementStreak = exports.getDailyStreak = exports.deductCoins = exports.awardCoins = exports.getCoinTransactions = exports.getCoinBalance = exports.getUserRank = exports.getLeaderboard = exports.getUserBadges = exports.getBadges = exports.unlockAchievement = exports.getUserAchievements = exports.getAchievements = exports.claimChallengeReward = exports.getActiveChallenge = exports.getChallenges = void 0;
const mongoose_1 = require("mongoose");
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const errorHandler_1 = require("../middleware/errorHandler");
// Import services
const challengeService_1 = __importDefault(require("../services/challengeService"));
const Achievement_1 = require("../models/Achievement");
const leaderboardService_1 = __importDefault(require("../services/leaderboardService"));
const coinService_1 = __importDefault(require("../services/coinService"));
const streakService_1 = __importDefault(require("../services/streakService"));
const spinWheelService_1 = __importDefault(require("../services/spinWheelService"));
const quizService_1 = __importDefault(require("../services/quizService"));
const scratchCardService_1 = __importDefault(require("../services/scratchCardService"));
// ========================================
// CHALLENGES
// ========================================
exports.getChallenges = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { type } = req.query;
    const challenges = await challengeService_1.default.getActiveChallenges(type);
    (0, response_1.sendSuccess)(res, challenges, 'Challenges retrieved successfully');
});
exports.getActiveChallenge = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const progress = await challengeService_1.default.getUserProgress(req.user._id.toString(), false);
    (0, response_1.sendSuccess)(res, progress, 'Active challenges retrieved successfully');
});
exports.claimChallengeReward = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { id } = req.params;
    const result = await challengeService_1.default.claimRewards(req.user._id.toString(), id);
    (0, response_1.sendSuccess)(res, result, 'Challenge reward claimed successfully');
});
// ========================================
// ACHIEVEMENTS
// ========================================
exports.getAchievements = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    (0, response_1.sendSuccess)(res, Achievement_1.ACHIEVEMENT_DEFINITIONS.filter(a => a.isActive), 'Achievement definitions retrieved successfully');
});
exports.getUserAchievements = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const achievements = await Achievement_1.UserAchievement.find({ user: userId })
        .sort({ unlocked: -1, progress: -1 });
    (0, response_1.sendSuccess)(res, achievements, 'User achievements retrieved successfully');
});
exports.unlockAchievement = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { achievementId } = req.body;
    const achievement = await Achievement_1.UserAchievement.findOne({
        _id: achievementId,
        user: req.user._id
    });
    if (!achievement) {
        return (0, response_1.sendNotFound)(res, 'Achievement not found');
    }
    if (achievement.unlocked) {
        return (0, response_1.sendBadRequest)(res, 'Achievement already unlocked');
    }
    if (achievement.progress < 100) {
        return (0, response_1.sendBadRequest)(res, 'Achievement requirements not met');
    }
    achievement.unlocked = true;
    achievement.unlockedDate = new Date();
    await achievement.save();
    (0, response_1.sendSuccess)(res, achievement, 'Achievement unlocked successfully');
});
// ========================================
// BADGES (Using achievements system)
// ========================================
exports.getBadges = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const badges = Achievement_1.ACHIEVEMENT_DEFINITIONS.filter(a => a.reward?.badge);
    (0, response_1.sendSuccess)(res, badges, 'Badges retrieved successfully');
});
exports.getUserBadges = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const achievements = await Achievement_1.UserAchievement.find({
        user: userId,
        unlocked: true
    });
    const badges = achievements.filter(a => {
        const def = Achievement_1.ACHIEVEMENT_DEFINITIONS.find(d => d.type === a.type);
        return def?.reward?.badge;
    });
    (0, response_1.sendSuccess)(res, badges, 'User badges retrieved successfully');
});
// ========================================
// LEADERBOARD
// ========================================
exports.getLeaderboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { period = 'monthly', type = 'spending', limit = 10 } = req.query;
    let leaderboard;
    switch (type) {
        case 'spending':
            leaderboard = await leaderboardService_1.default.getSpendingLeaderboard(period, parseInt(limit));
            break;
        case 'reviews':
            leaderboard = await leaderboardService_1.default.getReviewLeaderboard(period, parseInt(limit));
            break;
        case 'referrals':
            leaderboard = await leaderboardService_1.default.getReferralLeaderboard(period, parseInt(limit));
            break;
        case 'cashback':
            leaderboard = await leaderboardService_1.default.getCashbackLeaderboard(period, parseInt(limit));
            break;
        case 'coins':
            leaderboard = await coinService_1.default.getCoinLeaderboard(period, parseInt(limit));
            break;
        default:
            leaderboard = await leaderboardService_1.default.getLeaderboardStats();
    }
    (0, response_1.sendSuccess)(res, leaderboard, 'Leaderboard retrieved successfully');
});
exports.getUserRank = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const { period = 'monthly' } = req.query;
    const ranks = await leaderboardService_1.default.getAllUserRanks(userId, period);
    (0, response_1.sendSuccess)(res, ranks, 'User rank retrieved successfully');
});
// ========================================
// COINS (CURRENCY SYSTEM)
// ========================================
exports.getCoinBalance = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const balance = await coinService_1.default.getCoinBalance(req.user._id.toString());
    (0, response_1.sendSuccess)(res, { balance }, 'Coin balance retrieved successfully');
});
exports.getCoinTransactions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { type, source, limit, offset } = req.query;
    const result = await coinService_1.default.getCoinTransactions(req.user._id.toString(), {
        type: type,
        source: source,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined
    });
    (0, response_1.sendSuccess)(res, result, 'Coin transactions retrieved successfully');
});
exports.awardCoins = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { amount, source, description, metadata } = req.body;
    if (!amount || amount <= 0) {
        return (0, response_1.sendBadRequest)(res, 'Invalid amount');
    }
    const result = await coinService_1.default.awardCoins(req.user._id.toString(), amount, source || 'admin', description || 'Coins awarded', metadata);
    (0, response_1.sendSuccess)(res, result, 'Coins awarded successfully');
});
exports.deductCoins = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { amount, source, description, metadata } = req.body;
    if (!amount || amount <= 0) {
        return (0, response_1.sendBadRequest)(res, 'Invalid amount');
    }
    const result = await coinService_1.default.deductCoins(req.user._id.toString(), amount, source || 'purchase', description || 'Coins spent', metadata);
    (0, response_1.sendSuccess)(res, result, 'Coins deducted successfully');
});
// ========================================
// DAILY STREAK
// ========================================
exports.getDailyStreak = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const streaks = await streakService_1.default.getUserStreaks(userId);
    (0, response_1.sendSuccess)(res, streaks, 'Daily streaks retrieved successfully');
});
exports.incrementStreak = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { type = 'login' } = req.body;
    const result = await streakService_1.default.updateStreak(req.user._id.toString(), type);
    (0, response_1.sendSuccess)(res, result, 'Streak updated successfully');
});
// ========================================
// MINI-GAMES - SPIN WHEEL
// ========================================
exports.createSpinWheel = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const session = await spinWheelService_1.default.createSpinSession(req.user._id.toString());
    (0, response_1.sendSuccess)(res, session, 'Spin wheel session created successfully', 201);
});
exports.spinWheel = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const userId = req.user._id.toString();
    console.log('🎰 [SPIN_WHEEL] Spin request from user:', userId);
    // ✅ FIX: Check daily spin limit instead of 24-hour cooldown
    // Count spins completed TODAY (since midnight UTC)
    const { MiniGame } = await Promise.resolve().then(() => __importStar(require('../models/MiniGame')));
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
        return (0, response_1.sendBadRequest)(res, `Daily spin limit reached (${MAX_DAILY_SPINS} spins per day). Next spin available at midnight UTC (${tomorrow.toISOString()})`);
    }
    console.log(`✅ [SPIN_WHEEL] User eligible: ${spinsToday}/${MAX_DAILY_SPINS} spins used today`);
    // Create a session and immediately spin
    const session = await spinWheelService_1.default.createSpinSession(userId);
    console.log('✅ [SPIN_WHEEL] Session created:', session.sessionId);
    const spinResult = await spinWheelService_1.default.spin(session.sessionId);
    console.log('🎉 [SPIN_WHEEL] Spin result:', spinResult);
    // ✅ FIX: Get user's coin balance from WALLET (single source of truth)
    // This ensures consistency between homepage and spin wheel page
    const { Wallet } = await Promise.resolve().then(() => __importStar(require('../models/Wallet')));
    const wallet = await Wallet.findOne({ user: userId });
    let actualBalance = 0;
    if (wallet) {
        actualBalance = wallet.balance.total;
        console.log(`💰 [SPIN_WHEEL] User balance after spin: ${actualBalance}`);
    }
    else {
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
                label: spinResult.prize
            }
        },
        coinsAdded: spinResult.type === 'coins' ? spinResult.value : 0,
        newBalance: actualBalance // ✅ Return wallet balance (synced with homepage)
    };
    console.log('💰 [SPIN_WHEEL] User balance after spin:', actualBalance);
    (0, response_1.sendSuccess)(res, response, 'Spin completed successfully');
});
exports.getSpinWheelEligibility = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const eligibility = await spinWheelService_1.default.checkEligibility(req.user._id.toString());
    (0, response_1.sendSuccess)(res, eligibility, 'Eligibility checked successfully');
});
exports.getSpinWheelData = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const userId = req.user._id.toString();
    console.log('📊 [SPIN_WHEEL] Getting spin wheel data for user:', userId);
    // Get stats for analytics
    const stats = await spinWheelService_1.default.getSpinStats(userId);
    // Get session data which includes prizes
    const session = await spinWheelService_1.default.createSpinSession(userId).catch(() => null);
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
    const { MiniGame } = await Promise.resolve().then(() => __importStar(require('../models/MiniGame')));
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
        segments: segments.map((s) => ({
            id: s.segment.toString(),
            label: s.prize,
            value: parseInt(s.prize) || 0,
            color: s.color,
            type: 'coins',
            icon: 'star'
        })),
        spinsRemaining // ✅ Now correctly reflects daily usage
    };
    console.log('✅ [SPIN_WHEEL] Spin wheel data retrieved');
    (0, response_1.sendSuccess)(res, data, 'Spin wheel data retrieved successfully');
});
/**
 * GET /api/gamification/spin-wheel/history
 * Get spin wheel history for authenticated user
 */
exports.getSpinWheelHistory = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const userId = req.user._id.toString();
    const limit = parseInt(req.query.limit) || 20;
    console.log('📜 [SPIN_WHEEL] Getting spin history for user:', userId, 'limit:', limit);
    const history = await spinWheelService_1.default.getSpinHistory(userId, limit);
    console.log('✅ [SPIN_WHEEL] Found', history.length, 'spin records');
    (0, response_1.sendSuccess)(res, { history, total: history.length }, 'Spin wheel history retrieved successfully');
});
// ========================================
// MINI-GAMES - SCRATCH CARD
// ========================================
exports.createScratchCard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const session = await scratchCardService_1.default.createScratchCard(req.user._id.toString());
    (0, response_1.sendSuccess)(res, session, 'Scratch card created successfully', 201);
});
exports.scratchCard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { sessionId, cellIndex } = req.body;
    if (!sessionId || cellIndex === undefined) {
        return (0, response_1.sendBadRequest)(res, 'Session ID and cell index required');
    }
    const result = await scratchCardService_1.default.scratchCell(sessionId, cellIndex);
    (0, response_1.sendSuccess)(res, result, 'Cell scratched successfully');
});
exports.claimScratchCard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const result = await scratchCardService_1.default.claimScratchCard(id);
    (0, response_1.sendSuccess)(res, result, 'Scratch card claimed successfully');
});
// ========================================
// MINI-GAMES - QUIZ
// ========================================
exports.startQuiz = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const { difficulty = 'easy', questionCount = 5 } = req.body;
    const quiz = await quizService_1.default.startQuiz(req.user._id.toString(), difficulty, questionCount);
    (0, response_1.sendSuccess)(res, quiz, 'Quiz started successfully', 201);
});
exports.submitQuizAnswer = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { quizId } = req.params;
    const { questionIndex, answer, timeSpent } = req.body;
    if (questionIndex === undefined || answer === undefined) {
        return (0, response_1.sendBadRequest)(res, 'Question index and answer required');
    }
    const result = await quizService_1.default.submitAnswer(quizId, questionIndex, answer, timeSpent || 0);
    (0, response_1.sendSuccess)(res, result, result.correct ? 'Correct answer!' : 'Incorrect answer');
});
exports.getQuizProgress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { quizId } = req.params;
    const progress = await quizService_1.default.getQuizProgress(quizId);
    (0, response_1.sendSuccess)(res, progress, 'Quiz progress retrieved successfully');
});
exports.completeQuiz = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { quizId } = req.params;
    const result = await quizService_1.default.completeQuiz(quizId);
    (0, response_1.sendSuccess)(res, result, 'Quiz completed successfully');
});
// ========================================
// MY PROGRESS (CHALLENGES + STATS)
// ========================================
/**
 * Get user's challenge progress across all challenges
 * GET /api/gamification/challenges/my-progress
 * @returns User's challenge progress with stats
 */
exports.getMyChallengeProgress = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const userId = req.user._id.toString();
    // Get all user's challenge progress
    const allProgress = await challengeService_1.default.getUserProgress(userId, true);
    // Calculate statistics
    const stats = {
        completed: allProgress.filter(p => p.completed).length,
        active: allProgress.filter(p => !p.completed && p.challenge?.active).length,
        expired: allProgress.filter(p => !p.completed && !p.challenge?.active).length,
        totalCoinsEarned: allProgress
            .filter(p => p.rewardsClaimed)
            .reduce((sum, p) => sum + (p.challenge?.rewards?.coins || 0), 0)
    };
    const result = {
        challenges: allProgress,
        stats
    };
    (0, response_1.sendSuccess)(res, result, 'Challenge progress retrieved successfully');
});
// ========================================
// GAMIFICATION STATS
// ========================================
/**
 * Get user's complete gamification statistics
 * GET /api/gamification/stats
 * @returns Complete user gamification stats including games, coins, achievements, streaks, and rank
 */
exports.getGamificationStats = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const userId = req.user._id.toString();
    // Fetch all stats in parallel for better performance
    const [coinBalance, streaks, challengeStats, achievements, userRanks, gameSessions] = await Promise.all([
        // Get coin balance
        coinService_1.default.getCoinBalance(userId),
        // Get streaks
        streakService_1.default.getUserStreaks(userId),
        // Get challenge statistics
        challengeService_1.default.getUserStatistics(userId),
        // Get achievements
        Achievement_1.UserAchievement.find({ user: userId, unlocked: true }).countDocuments(),
        // Get user ranks
        leaderboardService_1.default.getAllUserRanks(userId, 'month'),
        // Get game session stats
        (async () => {
            const GameSession = (await Promise.resolve().then(() => __importStar(require('../models/GameSession')))).default;
            return GameSession.aggregate([
                { $match: { user: new mongoose_1.Types.ObjectId(userId) } },
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
    (0, response_1.sendSuccess)(res, stats, 'Gamification stats retrieved successfully');
});
