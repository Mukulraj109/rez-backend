import { Router } from 'express';
import leaderboardController from '../controllers/leaderboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Leaderboard routes
router.get('/spending', leaderboardController.getSpendingLeaderboard.bind(leaderboardController));
router.get('/reviews', leaderboardController.getReviewLeaderboard.bind(leaderboardController));
router.get('/referrals', leaderboardController.getReferralLeaderboard.bind(leaderboardController));
router.get('/cashback', leaderboardController.getCashbackLeaderboard.bind(leaderboardController));
router.get('/streak', leaderboardController.getStreakLeaderboard.bind(leaderboardController));
router.get('/all', leaderboardController.getAllLeaderboards.bind(leaderboardController));
router.get('/my-rank', leaderboardController.getMyRank.bind(leaderboardController));

export default router;
