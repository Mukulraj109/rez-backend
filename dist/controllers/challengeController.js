"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const challengeService_1 = __importDefault(require("../services/challengeService"));
class ChallengeController {
    // GET /api/challenges/daily
    async getDailyChallenges(req, res) {
        try {
            const challenges = await challengeService_1.default.getDailyChallenges();
            res.json({
                success: true,
                data: challenges
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    // GET /api/challenges/active
    async getActiveChallenges(req, res) {
        try {
            const { type } = req.query;
            const challenges = await challengeService_1.default.getActiveChallenges(type);
            res.json({
                success: true,
                data: challenges
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    // GET /api/challenges/my-progress
    async getMyProgress(req, res) {
        try {
            const userId = req.user?.id;
            const { includeCompleted } = req.query;
            const progress = await challengeService_1.default.getUserProgress(userId, includeCompleted === 'true');
            res.json({
                success: true,
                data: progress
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    // POST /api/challenges/:id/join
    async joinChallenge(req, res) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            const progress = await challengeService_1.default.joinChallenge(userId, id);
            res.json({
                success: true,
                data: progress,
                message: 'Successfully joined challenge'
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    // POST /api/challenges/:id/claim
    async claimRewards(req, res) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            const result = await challengeService_1.default.claimRewards(userId, id);
            res.json({
                success: true,
                data: result,
                message: 'Rewards claimed successfully'
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    // GET /api/challenges/:id/leaderboard
    async getChallengeLeaderboard(req, res) {
        try {
            const { id } = req.params;
            const limit = parseInt(req.query.limit) || 10;
            const leaderboard = await challengeService_1.default.getChallengeLeaderboard(id, limit);
            res.json({
                success: true,
                data: leaderboard
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    // GET /api/challenges/statistics
    async getStatistics(req, res) {
        try {
            const userId = req.user?.id;
            const stats = await challengeService_1.default.getUserStatistics(userId);
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
    // POST /api/challenges/generate-daily (Admin only)
    async generateDailyChallenges(req, res) {
        try {
            const challenges = await challengeService_1.default.generateDailyChallenges();
            res.json({
                success: true,
                data: challenges,
                message: 'Daily challenges generated successfully'
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
exports.default = new ChallengeController();
