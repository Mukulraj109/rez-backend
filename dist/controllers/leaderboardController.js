"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const leaderboardService_1 = __importDefault(require("../services/leaderboardService"));
class LeaderboardController {
    // GET /api/leaderboard/spending
    async getSpendingLeaderboard(req, res) {
        try {
            const period = req.query.period || 'month';
            const limit = parseInt(req.query.limit) || 10;
            const leaderboard = await leaderboardService_1.default.getSpendingLeaderboard(period, limit);
            res.json({
                success: true,
                data: leaderboard,
                period
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    // GET /api/leaderboard/reviews
    async getReviewLeaderboard(req, res) {
        try {
            const period = req.query.period || 'month';
            const limit = parseInt(req.query.limit) || 10;
            const leaderboard = await leaderboardService_1.default.getReviewLeaderboard(period, limit);
            res.json({
                success: true,
                data: leaderboard,
                period
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    // GET /api/leaderboard/referrals
    async getReferralLeaderboard(req, res) {
        try {
            const period = req.query.period || 'month';
            const limit = parseInt(req.query.limit) || 10;
            const leaderboard = await leaderboardService_1.default.getReferralLeaderboard(period, limit);
            res.json({
                success: true,
                data: leaderboard,
                period
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    // GET /api/leaderboard/cashback
    async getCashbackLeaderboard(req, res) {
        try {
            const period = req.query.period || 'month';
            const limit = parseInt(req.query.limit) || 10;
            const leaderboard = await leaderboardService_1.default.getCashbackLeaderboard(period, limit);
            res.json({
                success: true,
                data: leaderboard,
                period
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    // GET /api/leaderboard/streak
    async getStreakLeaderboard(req, res) {
        try {
            const type = req.query.type || 'login';
            const limit = parseInt(req.query.limit) || 10;
            const leaderboard = await leaderboardService_1.default.getStreakLeaderboard(type, limit);
            res.json({
                success: true,
                data: leaderboard,
                type
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    // GET /api/leaderboard/all
    async getAllLeaderboards(req, res) {
        try {
            const stats = await leaderboardService_1.default.getLeaderboardStats();
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
    // GET /api/leaderboard/my-rank
    async getMyRank(req, res) {
        try {
            const userId = req.user?.id;
            const period = req.query.period || 'month';
            const ranks = await leaderboardService_1.default.getAllUserRanks(userId, period);
            res.json({
                success: true,
                data: ranks,
                period
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
exports.default = new LeaderboardController();
