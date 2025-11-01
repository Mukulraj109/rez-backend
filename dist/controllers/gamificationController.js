"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeQuiz = exports.getQuizProgress = exports.submitQuizAnswer = exports.startQuiz = exports.claimScratchCard = exports.scratchCard = exports.createScratchCard = exports.getSpinWheelEligibility = exports.spinWheel = exports.createSpinWheel = exports.incrementStreak = exports.getDailyStreak = exports.deductCoins = exports.awardCoins = exports.getCoinTransactions = exports.getCoinBalance = exports.getUserRank = exports.getLeaderboard = exports.getUserBadges = exports.getBadges = exports.unlockAchievement = exports.getUserAchievements = exports.getAchievements = exports.claimChallengeReward = exports.getActiveChallenge = exports.getChallenges = void 0;
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
    const { sessionId } = req.body;
    if (!sessionId) {
        return (0, response_1.sendBadRequest)(res, 'Session ID required');
    }
    const result = await spinWheelService_1.default.spin(sessionId);
    (0, response_1.sendSuccess)(res, result, 'Spin completed successfully');
});
exports.getSpinWheelEligibility = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    const eligibility = await spinWheelService_1.default.checkEligibility(req.user._id.toString());
    (0, response_1.sendSuccess)(res, eligibility, 'Eligibility checked successfully');
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
