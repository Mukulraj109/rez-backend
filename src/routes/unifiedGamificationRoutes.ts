import express from 'express';
import { authenticate } from '../middleware/auth';

// Import all gamification controllers
import {
  getChallenges,
  getActiveChallenge,
  claimChallengeReward,
  getAchievements,
  getUserAchievements,
  unlockAchievement,
  getBadges,
  getUserBadges,
  getLeaderboard,
  getUserRank,
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
  getGamificationStats
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
router.get('/challenges/active', getActiveChallenge);
router.get('/challenges/my-progress', getMyChallengeProgress);
router.post('/challenges/:id/claim', claimChallengeReward);

// ========================================
// ACHIEVEMENTS
// ========================================
router.get('/achievements', getAchievements);
router.get('/achievements/user/:userId', getUserAchievements);
router.post('/achievements/unlock', unlockAchievement);

// ========================================
// BADGES
// ========================================
router.get('/badges', getBadges);
router.get('/badges/user/:userId', getUserBadges);

// ========================================
// LEADERBOARD
// ========================================
// GET /api/gamification/leaderboard?type=spending&period=weekly&limit=10
// type: spending | reviews | referrals | cashback | coins
// period: daily | weekly | monthly | all-time
router.get('/leaderboard', getLeaderboard);
router.get('/leaderboard/rank/:userId', getUserRank);

// ========================================
// COINS (CURRENCY SYSTEM)
// ========================================
router.get('/coins/balance', getCoinBalance);
router.get('/coins/transactions', getCoinTransactions);
router.post('/coins/award', awardCoins);
router.post('/coins/deduct', deductCoins);

// ========================================
// DAILY STREAK
// ========================================
router.get('/streak/:userId', getDailyStreak);
router.post('/streak/increment', incrementStreak);
// New endpoint: Get current user's streak (JWT-based, no userId param)
router.get('/streaks', streakController.getCurrentUserStreak.bind(streakController));

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
router.post('/scratch-card/create', createScratchCard);
router.post('/scratch-card/scratch', scratchCard);
router.post('/scratch-card/:id/claim', claimScratchCard);

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

export default router;
