"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const GameSession_1 = __importDefault(require("../models/GameSession"));
// @ts-ignore
const uuid_1 = require("uuid");
// Spin Wheel Prize Configuration
const SPIN_WHEEL_PRIZES = [
    { type: 'coins', value: 50, weight: 30, description: '50 Coins' },
    { type: 'coins', value: 100, weight: 25, description: '100 Coins' },
    { type: 'coins', value: 200, weight: 15, description: '200 Coins' },
    { type: 'coins', value: 500, weight: 10, description: '500 Coins' },
    { type: 'discount', value: 10, weight: 15, description: '10% Off Next Order' },
    { type: 'discount', value: 20, weight: 10, description: '20% Off Next Order' },
    { type: 'free_delivery', value: 1, weight: 20, description: 'Free Delivery' },
    { type: 'cashback_multiplier', value: 1.5, weight: 8, description: '1.5x Cashback' },
    { type: 'cashback_multiplier', value: 2, weight: 5, description: '2x Cashback' },
    { type: 'coins', value: 1000, weight: 2, description: 'JACKPOT - 1000 Coins!' }
];
// Scratch Card Prize Configuration
const SCRATCH_CARD_PRIZES = [
    { type: 'coins', value: 25, weight: 40, description: '25 Coins' },
    { type: 'coins', value: 50, weight: 30, description: '50 Coins' },
    { type: 'coins', value: 100, weight: 20, description: '100 Coins' },
    { type: 'coins', value: 250, weight: 8, description: '250 Coins' },
    { type: 'badge', value: 'lucky_winner', weight: 2, description: 'Lucky Winner Badge!' }
];
class GameService {
    // ======== SPIN WHEEL ========
    // Create spin wheel session
    async createSpinWheelSession(userId, earnedFrom = 'daily_free') {
        // Check daily limit
        if (earnedFrom === 'daily_free') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const existingToday = await GameSession_1.default.countDocuments({
                user: userId,
                gameType: 'spin_wheel',
                earnedFrom: 'daily_free',
                createdAt: { $gte: today }
            });
            if (existingToday > 0) {
                throw new Error('Daily free spin already used');
            }
        }
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry
        return GameSession_1.default.create({
            user: userId,
            gameType: 'spin_wheel',
            sessionId: (0, uuid_1.v4)(),
            status: 'pending',
            earnedFrom,
            expiresAt
        });
    }
    // Play spin wheel
    async playSpinWheel(sessionId) {
        const session = await GameSession_1.default.findOne({ sessionId });
        if (!session) {
            throw new Error('Game session not found');
        }
        if (session.status === 'completed') {
            throw new Error('Game already played');
        }
        if (session.status === 'expired') {
            throw new Error('Game session expired');
        }
        if (new Date() > session.expiresAt) {
            session.status = 'expired';
            await session.save();
            throw new Error('Game session expired');
        }
        // Determine prize using weighted random selection
        const prize = this.getWeightedRandomPrize(SPIN_WHEEL_PRIZES);
        const result = {
            won: true,
            prize: {
                type: prize.type,
                value: prize.value,
                description: prize.description
            }
        };
        await session.complete(result);
        return session;
    }
    // ======== SCRATCH CARD ========
    // Create scratch card session
    async createScratchCardSession(userId, earnedFrom) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry
        return GameSession_1.default.create({
            user: userId,
            gameType: 'scratch_card',
            sessionId: (0, uuid_1.v4)(),
            status: 'pending',
            earnedFrom,
            expiresAt
        });
    }
    // Play scratch card
    async playScratchCard(sessionId) {
        const session = await GameSession_1.default.findOne({ sessionId });
        if (!session) {
            throw new Error('Game session not found');
        }
        if (session.status === 'completed') {
            throw new Error('Game already played');
        }
        if (session.status === 'expired' || new Date() > session.expiresAt) {
            session.status = 'expired';
            await session.save();
            throw new Error('Game session expired');
        }
        // Determine prize
        const prize = this.getWeightedRandomPrize(SCRATCH_CARD_PRIZES);
        const result = {
            won: true,
            prize: {
                type: prize.type,
                value: prize.value,
                description: prize.description
            }
        };
        await session.complete(result);
        return session;
    }
    // ======== QUIZ ========
    // Create quiz session
    async createQuizSession(userId, questions) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry
        const session = await GameSession_1.default.create({
            user: userId,
            gameType: 'quiz',
            sessionId: (0, uuid_1.v4)(),
            status: 'pending',
            earnedFrom: 'daily_quiz',
            expiresAt
        });
        return session;
    }
    // Submit quiz answers
    async submitQuizAnswers(sessionId, answers, correctAnswers) {
        const session = await GameSession_1.default.findOne({ sessionId });
        if (!session) {
            throw new Error('Game session not found');
        }
        if (session.status === 'completed') {
            throw new Error('Quiz already submitted');
        }
        if (new Date() > session.expiresAt) {
            session.status = 'expired';
            await session.save();
            throw new Error('Quiz session expired');
        }
        // Calculate score
        let correct = 0;
        answers.forEach(userAnswer => {
            const correctAnswer = correctAnswers.find(ca => ca.questionId === userAnswer.questionId);
            if (correctAnswer && correctAnswer.answer === userAnswer.answer) {
                correct++;
            }
        });
        const score = correct;
        const total = correctAnswers.length;
        const percentage = (correct / total) * 100;
        // Calculate coins based on score
        const coinsPerCorrect = 10;
        const bonusForPerfect = percentage === 100 ? 50 : 0;
        const coins = (score * coinsPerCorrect) + bonusForPerfect;
        const result = {
            won: score > 0,
            prize: coins > 0 ? {
                type: 'coins',
                value: coins,
                description: `${coins} Coins for ${score}/${total} correct!`
            } : undefined,
            score: percentage
        };
        await session.complete(result);
        return session;
    }
    // ======== DAILY TRIVIA ========
    // Get daily trivia question
    async getDailyTrivia() {
        // Questions pool (in production, fetch from database)
        const triviaQuestions = [
            {
                id: '1',
                question: 'What is the capital of France?',
                options: ['London', 'Paris', 'Berlin', 'Madrid'],
                correctAnswer: 'Paris',
                category: 'Geography'
            },
            {
                id: '2',
                question: 'How many days are there in a week?',
                options: ['5', '6', '7', '8'],
                correctAnswer: '7',
                category: 'General'
            }
            // Add more questions
        ];
        // Select random question
        const question = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
        return {
            id: question.id,
            question: question.question,
            options: question.options,
            category: question.category,
            reward: 20 // coins for correct answer
        };
    }
    // Answer daily trivia
    async answerDailyTrivia(userId, questionId, answer) {
        // Check if already answered today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existingToday = await GameSession_1.default.countDocuments({
            user: userId,
            gameType: 'daily_trivia',
            createdAt: { $gte: today }
        });
        if (existingToday > 0) {
            throw new Error('Daily trivia already answered today');
        }
        // Get correct answer (in production, fetch from database)
        const triviaQuestions = {
            '1': 'Paris',
            '2': '7'
        };
        const correctAnswer = triviaQuestions[questionId];
        const isCorrect = answer === correctAnswer;
        const coins = isCorrect ? 20 : 0;
        // Create game session
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1);
        await GameSession_1.default.create({
            user: userId,
            gameType: 'daily_trivia',
            sessionId: (0, uuid_1.v4)(),
            status: 'completed',
            earnedFrom: 'daily_trivia',
            expiresAt,
            result: {
                won: isCorrect,
                prize: isCorrect ? {
                    type: 'coins',
                    value: coins,
                    description: `${coins} Coins for correct answer!`
                } : undefined
            }
        });
        return {
            correct: isCorrect,
            coins
        };
    }
    // ======== GENERAL ========
    // Get user's game sessions
    async getUserGameSessions(userId, gameType, limit = 20) {
        const query = { user: userId };
        if (gameType) {
            query.gameType = gameType;
        }
        return GameSession_1.default.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }
    // Get pending games for user
    async getPendingGames(userId) {
        const now = new Date();
        return GameSession_1.default.find({
            user: userId,
            status: 'pending',
            expiresAt: { $gt: now }
        })
            .sort({ createdAt: 1 })
            .exec();
    }
    // Get game statistics
    async getGameStats(userId) {
        const stats = await GameSession_1.default.aggregate([
            {
                $match: { user: userId, status: 'completed' }
            },
            {
                $group: {
                    _id: '$gameType',
                    totalPlayed: { $sum: 1 },
                    totalWon: {
                        $sum: { $cond: ['$result.won', 1, 0] }
                    },
                    totalCoins: {
                        $sum: {
                            $cond: [
                                { $eq: ['$result.prize.type', 'coins'] },
                                '$result.prize.value',
                                0
                            ]
                        }
                    }
                }
            }
        ]);
        const gameStats = {
            spin_wheel: { totalPlayed: 0, totalWon: 0, totalCoins: 0 },
            scratch_card: { totalPlayed: 0, totalWon: 0, totalCoins: 0 },
            quiz: { totalPlayed: 0, totalWon: 0, totalCoins: 0 },
            daily_trivia: { totalPlayed: 0, totalWon: 0, totalCoins: 0 }
        };
        stats.forEach(stat => {
            gameStats[stat._id] = {
                totalPlayed: stat.totalPlayed,
                totalWon: stat.totalWon,
                totalCoins: stat.totalCoins,
                winRate: Math.round((stat.totalWon / stat.totalPlayed) * 100)
            };
        });
        return gameStats;
    }
    // Helper: Weighted random selection
    getWeightedRandomPrize(prizes) {
        const totalWeight = prizes.reduce((sum, prize) => sum + prize.weight, 0);
        let random = Math.random() * totalWeight;
        for (const prize of prizes) {
            random -= prize.weight;
            if (random <= 0) {
                return prize;
            }
        }
        return prizes[0]; // Fallback
    }
    // Expire old sessions (run via cron)
    async expireOldSessions() {
        const result = await GameSession_1.default.expireSessions();
        return result.modifiedCount || 0;
    }
}
exports.default = new GameService();
