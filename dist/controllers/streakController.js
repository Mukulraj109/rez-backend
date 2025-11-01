"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const streakService_1 = __importDefault(require("../services/streakService"));
class StreakController {
    // GET /api/streaks
    async getUserStreaks(req, res) {
        try {
            const userId = req.user?.id;
            const streaks = await streakService_1.default.getUserStreaks(userId);
            res.json({
                success: true,
                data: streaks
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    // POST /api/streaks/update
    async updateStreak(req, res) {
        try {
            const userId = req.user?.id;
            const { type } = req.body;
            const result = await streakService_1.default.updateStreak(userId, type);
            res.json({
                success: true,
                data: result,
                message: result.milestoneReached
                    ? 'Milestone reached!'
                    : 'Streak updated'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    // POST /api/streaks/claim-milestone
    async claimMilestone(req, res) {
        try {
            const userId = req.user?.id;
            const { type, day } = req.body;
            const result = await streakService_1.default.claimMilestone(userId, type, day);
            res.json({
                success: true,
                data: result,
                message: 'Milestone reward claimed!'
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    // POST /api/streaks/freeze
    async freezeStreak(req, res) {
        try {
            const userId = req.user?.id;
            const { type, days } = req.body;
            const streak = await streakService_1.default.freezeStreak(userId, type, days);
            res.json({
                success: true,
                data: streak,
                message: 'Streak frozen successfully'
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    // GET /api/streaks/statistics
    async getStreakStatistics(req, res) {
        try {
            const userId = req.user?.id;
            const stats = await streakService_1.default.getStreakStats(userId);
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
exports.default = new StreakController();
