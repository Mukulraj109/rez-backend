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
  createScratchCard,
  scratchCard,
  claimScratchCard,
  startQuiz,
  submitQuizAnswer,
  getQuizProgress,
  completeQuiz
} from '../controllers/gamificationController';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ========================================
// CHALLENGES
// ========================================
router.get('/challenges', getChallenges);
router.get('/challenges/active', getActiveChallenge);
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

// ========================================
// MINI-GAMES
// ========================================

// Spin Wheel
router.post('/spin-wheel/create', createSpinWheel);
router.post('/spin-wheel/spin', spinWheel);
router.get('/spin-wheel/eligibility', getSpinWheelEligibility);

// Scratch Card
router.post('/scratch-card/create', createScratchCard);
router.post('/scratch-card/scratch', scratchCard);
router.post('/scratch-card/:id/claim', claimScratchCard);

// Quiz Game
router.post('/quiz/start', startQuiz);
router.post('/quiz/:quizId/answer', submitQuizAnswer);
router.get('/quiz/:quizId/progress', getQuizProgress);
router.post('/quiz/:quizId/complete', completeQuiz);

export default router;
