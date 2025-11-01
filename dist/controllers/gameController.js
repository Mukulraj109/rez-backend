"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const gameService_1 = __importDefault(require("../services/gameService"));
class GameController {
    // ======== SPIN WHEEL ========
    // POST /api/games/spin-wheel/create
    async createSpinWheel(req, res) {
        try {
            const userId = req.user?.id;
            const { earnedFrom } = req.body;
            const session = await gameService_1.default.createSpinWheelSession(userId, earnedFrom);
            res.json({
                success: true,
                data: session,
                message: 'Spin wheel session created'
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    // POST /api/games/spin-wheel/play
    async playSpinWheel(req, res) {
        try {
            const { sessionId } = req.body;
            const session = await gameService_1.default.playSpinWheel(sessionId);
            res.json({
                success: true,
                data: session,
                message: 'Spin complete!'
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    // ======== SCRATCH CARD ========
    // POST /api/games/scratch-card/create
    async createScratchCard(req, res) {
        try {
            const userId = req.user?.id;
            const { earnedFrom } = req.body;
            const session = await gameService_1.default.createScratchCardSession(userId, earnedFrom);
            res.json({
                success: true,
                data: session,
                message: 'Scratch card session created'
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    // POST /api/games/scratch-card/play
    async playScratchCard(req, res) {
        try {
            const { sessionId } = req.body;
            const session = await gameService_1.default.playScratchCard(sessionId);
            res.json({
                success: true,
                data: session,
                message: 'Scratch card revealed!'
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    // ======== QUIZ ========
    // POST /api/games/quiz/create
    async createQuiz(req, res) {
        try {
            const userId = req.user?.id;
            const { questions } = req.body;
            const session = await gameService_1.default.createQuizSession(userId, questions);
            res.json({
                success: true,
                data: session,
                message: 'Quiz session created'
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    // POST /api/games/quiz/submit
    async submitQuiz(req, res) {
        try {
            const { sessionId, answers, correctAnswers } = req.body;
            const session = await gameService_1.default.submitQuizAnswers(sessionId, answers, correctAnswers);
            res.json({
                success: true,
                data: session,
                message: 'Quiz submitted successfully'
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    // ======== DAILY TRIVIA ========
    // GET /api/games/daily-trivia
    async getDailyTrivia(req, res) {
        try {
            const trivia = await gameService_1.default.getDailyTrivia();
            res.json({
                success: true,
                data: trivia
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    // POST /api/games/daily-trivia/answer
    async answerDailyTrivia(req, res) {
        try {
            const userId = req.user?.id;
            const { questionId, answer } = req.body;
            const result = await gameService_1.default.answerDailyTrivia(userId, questionId, answer);
            res.json({
                success: true,
                data: result,
                message: result.correct ? 'Correct answer!' : 'Wrong answer'
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    // ======== GENERAL ========
    // GET /api/games/my-games
    async getMyGames(req, res) {
        try {
            const userId = req.user?.id;
            const { gameType, limit } = req.query;
            const sessions = await gameService_1.default.getUserGameSessions(userId, gameType, limit ? parseInt(limit) : undefined);
            res.json({
                success: true,
                data: sessions
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    // GET /api/games/pending
    async getPendingGames(req, res) {
        try {
            const userId = req.user?.id;
            const games = await gameService_1.default.getPendingGames(userId);
            res.json({
                success: true,
                data: games
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    // GET /api/games/statistics
    async getGameStatistics(req, res) {
        try {
            const userId = req.user?.id;
            const stats = await gameService_1.default.getGameStats(userId);
            res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}
exports.default = new GameController();
