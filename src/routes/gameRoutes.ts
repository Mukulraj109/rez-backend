import { Router } from 'express';
import gameController from '../controllers/gameController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

// ======== PUBLIC/OPTIONAL AUTH ROUTES ========
// Get available games with status (works for logged in and anonymous users)
router.get('/available', optionalAuth, gameController.getAvailableGames.bind(gameController));

// All routes below require authentication
router.use(authenticate);

// ======== SPIN WHEEL ========
router.post('/spin-wheel/create', gameController.createSpinWheel.bind(gameController));
router.post('/spin-wheel/play', gameController.playSpinWheel.bind(gameController));

// ======== SCRATCH CARD ========
router.post('/scratch-card/create', gameController.createScratchCard.bind(gameController));
router.post('/scratch-card/play', gameController.playScratchCard.bind(gameController));

// ======== QUIZ ========
router.post('/quiz/create', gameController.createQuiz.bind(gameController));
router.post('/quiz/submit', gameController.submitQuiz.bind(gameController));

// ======== DAILY TRIVIA ========
router.get('/daily-trivia', gameController.getDailyTrivia.bind(gameController));
router.post('/daily-trivia/answer', gameController.answerDailyTrivia.bind(gameController));

// ======== MEMORY MATCH ========
router.post('/memory-match/start', gameController.startMemoryMatch.bind(gameController));
router.post('/memory-match/complete', gameController.completeMemoryMatch.bind(gameController));

// ======== COIN HUNT ========
router.post('/coin-hunt/start', gameController.startCoinHunt.bind(gameController));
router.post('/coin-hunt/complete', gameController.completeCoinHunt.bind(gameController));

// ======== GUESS THE PRICE ========
router.post('/guess-price/start', gameController.startGuessPrice.bind(gameController));
router.post('/guess-price/submit', gameController.submitGuessPrice.bind(gameController));

// ======== GENERAL ========
router.get('/my-games', gameController.getMyGames.bind(gameController));
router.get('/pending', gameController.getPendingGames.bind(gameController));
router.get('/statistics', gameController.getGameStatistics.bind(gameController));
router.get('/daily-limits', gameController.getDailyLimits.bind(gameController));

export default router;
