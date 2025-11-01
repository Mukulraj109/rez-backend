"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
// Import all gamification controllers
const gamificationController_1 = require("../controllers/gamificationController");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticate);
// ========================================
// CHALLENGES
// ========================================
router.get('/challenges', gamificationController_1.getChallenges);
router.get('/challenges/active', gamificationController_1.getActiveChallenge);
router.post('/challenges/:id/claim', gamificationController_1.claimChallengeReward);
// ========================================
// ACHIEVEMENTS
// ========================================
router.get('/achievements', gamificationController_1.getAchievements);
router.get('/achievements/user/:userId', gamificationController_1.getUserAchievements);
router.post('/achievements/unlock', gamificationController_1.unlockAchievement);
// ========================================
// BADGES
// ========================================
router.get('/badges', gamificationController_1.getBadges);
router.get('/badges/user/:userId', gamificationController_1.getUserBadges);
// ========================================
// LEADERBOARD
// ========================================
// GET /api/gamification/leaderboard?type=spending&period=weekly&limit=10
// type: spending | reviews | referrals | cashback | coins
// period: daily | weekly | monthly | all-time
router.get('/leaderboard', gamificationController_1.getLeaderboard);
router.get('/leaderboard/rank/:userId', gamificationController_1.getUserRank);
// ========================================
// COINS (CURRENCY SYSTEM)
// ========================================
router.get('/coins/balance', gamificationController_1.getCoinBalance);
router.get('/coins/transactions', gamificationController_1.getCoinTransactions);
router.post('/coins/award', gamificationController_1.awardCoins);
router.post('/coins/deduct', gamificationController_1.deductCoins);
// ========================================
// DAILY STREAK
// ========================================
router.get('/streak/:userId', gamificationController_1.getDailyStreak);
router.post('/streak/increment', gamificationController_1.incrementStreak);
// ========================================
// MINI-GAMES
// ========================================
// Spin Wheel
router.post('/spin-wheel/create', gamificationController_1.createSpinWheel);
router.post('/spin-wheel/spin', gamificationController_1.spinWheel);
router.get('/spin-wheel/eligibility', gamificationController_1.getSpinWheelEligibility);
// Scratch Card
router.post('/scratch-card/create', gamificationController_1.createScratchCard);
router.post('/scratch-card/scratch', gamificationController_1.scratchCard);
router.post('/scratch-card/:id/claim', gamificationController_1.claimScratchCard);
// Quiz Game
router.post('/quiz/start', gamificationController_1.startQuiz);
router.post('/quiz/:quizId/answer', gamificationController_1.submitQuizAnswer);
router.get('/quiz/:quizId/progress', gamificationController_1.getQuizProgress);
router.post('/quiz/:quizId/complete', gamificationController_1.completeQuiz);
exports.default = router;
