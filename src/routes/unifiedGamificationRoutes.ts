import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';

// Rate limiters for sensitive gamification endpoints
const checkInLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 attempts per minute (idempotent, but prevents abuse)
  message: 'Too many check-in attempts. Please wait a moment.',
});

const challengeJoinLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 join attempts per minute
  message: 'Too many join attempts. Please wait a moment.',
});

const challengeClaimLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 claim attempts per minute
  message: 'Too many claim attempts. Please wait a moment.',
});

const affiliateSubmitLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 submissions per hour
  message: 'Too many submissions. Please try again later.',
});

// Import all gamification controllers
import {
  getChallenges,
  getActiveChallenge,
  getUnifiedChallenges,
  claimChallengeReward,
  joinChallenge,
  getChallengeLeaderboard,
  getAchievements,
  getUserAchievements,
  getMyAchievements,
  getBadges,
  getUserBadges,
  getLeaderboard,
  getUserRank,
  getMyRank,
  getCoinBalance,
  getCoinTransactions,
  awardCoins,
  deductCoins,
  getDailyStreak,
  incrementStreak,
  createSpinWheel,
  spinWheel,
  getSpinWheelEligibility,
  getSpinWheelData,
  getSpinWheelHistory,
  createScratchCard,
  scratchCard,
  claimScratchCard,
  startQuiz,
  submitQuizAnswer,
  getQuizProgress,
  completeQuiz,
  getMyChallengeProgress,
  getGamificationStats,
  getPlayAndEarnData,
  claimSurpriseDrop,
  streakCheckin,
  claimStreakMilestone,
  getStreakMilestones,
  // Affiliate / Share endpoints
  getAffiliateStats,
  getPromotionalPosters,
  getShareSubmissions,
  submitSharePost,
  getStreakBonuses,
  getReviewableItems,
  getBonusOpportunities,
  getCheckinConfigEndpoint
} from '../controllers/gamificationController';

// Import streak controller
import streakController from '../controllers/streakController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ========================================
// CHALLENGES
// ========================================
router.get('/challenges', getChallenges);
router.get('/challenges/unified', getUnifiedChallenges);
router.get('/challenges/active', getActiveChallenge);
router.get('/challenges/my-progress', getMyChallengeProgress);
router.get('/challenges/:id/leaderboard', getChallengeLeaderboard);
router.post('/challenges/:id/claim', challengeClaimLimiter, claimChallengeReward);
router.post('/challenges/:id/join', challengeJoinLimiter, joinChallenge);

// ========================================
// ACHIEVEMENTS
// ========================================
// Moved to standalone route file: achievementRoutes.ts (registered at /api/achievements)
// router.get('/achievements', getAchievements);
// router.get('/achievements/me', getMyAchievements);
// router.get('/achievements/user/:userId', getUserAchievements);
// REMOVED: POST /achievements/unlock — achievement unlocking must be server-driven only

// ========================================
// BADGES
// ========================================
router.get('/badges', getBadges);
router.get('/badges/user/:userId', getUserBadges);

// ========================================
// LEADERBOARD
// ========================================
// Rate limiters for leaderboard (prevents cache-busting spam)
const leaderboardLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many leaderboard requests. Please wait.',
});
const myRankLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many rank requests. Please wait.',
});
// GET /api/gamification/leaderboard?type=spending&period=weekly&limit=10
// type: spending | reviews | referrals | cashback | coins
// period: daily | weekly | monthly | all-time
router.get('/leaderboard', leaderboardLimiter, getLeaderboard);
router.get('/leaderboard/my-rank', myRankLimiter, getMyRank);
router.get('/leaderboard/rank/:userId', myRankLimiter, getUserRank);

// ========================================
// COINS (CURRENCY SYSTEM)
// ========================================
router.get('/coins/balance', getCoinBalance);
router.get('/coins/transactions', getCoinTransactions);
// Admin-only: direct coin manipulation must not be user-callable
router.post('/coins/award', requireAdmin, awardCoins);
router.post('/coins/deduct', requireAdmin, deductCoins);

// ========================================
// DAILY STREAK
// ========================================
// Moved to standalone route file: streakRoutes.ts (registered at /api/streak)
// router.get('/streak/bonuses', getStreakBonuses);
// router.get('/streak/:userId', getDailyStreak);
// router.post('/streak/increment', incrementStreak);
// router.get('/streaks', streakController.getCurrentUserStreak.bind(streakController));
// router.post('/streak/milestone/:day/claim', claimStreakMilestone);
// router.get('/streaks/:type/milestones', getStreakMilestones);

// ========================================
// MINI-GAMES
// ========================================

// Spin Wheel
router.post('/spin-wheel/create', createSpinWheel);
router.post('/spin-wheel/spin', spinWheel);
router.get('/spin-wheel/eligibility', getSpinWheelEligibility);
router.get('/spin-wheel/data', getSpinWheelData);
router.get('/spin-wheel/history', getSpinWheelHistory);

// Scratch Card
// Moved to standalone route file: scratchCardRoutes.ts (registered at /api/scratch-cards)
// Also available via gameRoutes.ts (registered at /api/games)
// router.post('/scratch-card/create', createScratchCard);
// router.post('/scratch-card/scratch', scratchCard);
// router.post('/scratch-card/:id/claim', claimScratchCard);

// Quiz Game
router.post('/quiz/start', startQuiz);
router.post('/quiz/:quizId/answer', submitQuizAnswer);
router.get('/quiz/:quizId/progress', getQuizProgress);
router.post('/quiz/:quizId/complete', completeQuiz);

// ========================================
// GAMIFICATION STATS
// ========================================
// Get complete user gamification statistics
router.get('/stats', getGamificationStats);

// ========================================
// PLAY & EARN HUB
// ========================================
// Get all play & earn data in one call (spin, challenges, streak, surprise drops)
router.get('/play-and-earn', getPlayAndEarnData);

// Bonus Opportunities (time-limited challenges, drops, campaigns)
router.get('/bonus-opportunities', getBonusOpportunities);

// Surprise Coin Drops
router.post('/surprise-drop/claim', claimSurpriseDrop);

// Daily Check-in Config (day rewards, pro tips, etc.)
router.get('/checkin-config', getCheckinConfigEndpoint);

// Daily Streak Check-in — Moved to standalone route file: streakRoutes.ts (registered at /api/streak)
// router.post('/streak/checkin', checkInLimiter, streakCheckin);

// ========================================
// AFFILIATE / SHARE
// ========================================
router.get('/affiliate/stats', getAffiliateStats);
router.get('/affiliate/submissions', getShareSubmissions);
router.post('/affiliate/submit', affiliateSubmitLimiter, submitSharePost);

// Promotional Posters (for sharing)
router.get('/promotional-posters', getPromotionalPosters);

// REVIEWABLE ITEMS
router.get('/reviewable-items', getReviewableItems);

// ========================================
// QUICK ACTIONS (Personalized)
// ========================================
router.get('/quick-actions', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const quickActionService = (await import('../services/quickActionService')).default;
    const actions = await quickActionService.getPersonalized(userId);
    const { sendSuccess } = await import('../utils/response');
    sendSuccess(res, { actions });
  } catch (error: any) {
    console.error('[QUICK ACTIONS] Error:', error);
    const { sendError } = await import('../utils/response');
    sendError(res, error.message || 'Failed to fetch quick actions');
  }
});

export default router;
