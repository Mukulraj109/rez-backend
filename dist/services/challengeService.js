"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Challenge_1 = __importDefault(require("../models/Challenge"));
const UserChallengeProgress_1 = __importDefault(require("../models/UserChallengeProgress"));
const challengeTemplates_1 = __importDefault(require("../config/challengeTemplates"));
const Wallet_1 = require("../models/Wallet");
const Transaction_1 = require("../models/Transaction");
const mongoose_1 = __importDefault(require("mongoose"));
class ChallengeService {
    // Get active challenges
    async getActiveChallenges(type) {
        const now = new Date();
        const query = {
            active: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        };
        if (type) {
            query.type = type;
        }
        return Challenge_1.default.find(query)
            .sort({ featured: -1, difficulty: 1, endDate: 1 })
            .exec();
    }
    // Get today's daily challenges
    async getDailyChallenges() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return Challenge_1.default.find({
            type: 'daily',
            active: true,
            startDate: { $gte: today, $lt: tomorrow }
        }).exec();
    }
    // Get user's challenge progress
    async getUserProgress(userId, includeCompleted = true) {
        const query = { user: userId };
        if (!includeCompleted) {
            query.completed = false;
        }
        return UserChallengeProgress_1.default.find(query)
            .populate('challenge')
            .sort({ completed: 1, lastUpdatedAt: -1 })
            .exec();
    }
    // Join a challenge
    async joinChallenge(userId, challengeId) {
        // Check if challenge exists and is active
        const challenge = await Challenge_1.default.findById(challengeId);
        if (!challenge) {
            throw new Error('Challenge not found');
        }
        if (!challenge.isActive()) {
            throw new Error('Challenge is not active');
        }
        if (!challenge.canJoin()) {
            throw new Error('Challenge is full');
        }
        // Check if user already joined
        const existing = await UserChallengeProgress_1.default.findOne({
            user: userId,
            challenge: challengeId
        });
        if (existing) {
            return existing;
        }
        // Create progress record
        const progress = await UserChallengeProgress_1.default.create({
            user: userId,
            challenge: challengeId,
            progress: 0,
            target: challenge.requirements.target,
            startedAt: new Date()
        });
        // Update participant count
        await Challenge_1.default.findByIdAndUpdate(challengeId, {
            $inc: { participantCount: 1 }
        });
        return progress;
    }
    // Update challenge progress
    async updateProgress(userId, action, amount = 1, metadata) {
        // Find all active challenges for this action
        const now = new Date();
        const challenges = await Challenge_1.default.find({
            'requirements.action': action,
            active: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        });
        const updates = [];
        for (const challenge of challenges) {
            // Check if user has joined
            let progress = await UserChallengeProgress_1.default.findOne({
                user: userId,
                challenge: challenge._id
            });
            // Auto-join if not joined
            if (!progress) {
                progress = await this.joinChallenge(userId, String(challenge._id));
            }
            // Skip if already completed
            if (progress?.completed)
                continue;
            // Apply filters if specified
            if (challenge.requirements.stores && metadata?.storeId) {
                const storeIds = challenge.requirements.stores.map(s => s.toString());
                if (!storeIds.includes(metadata.storeId.toString()))
                    continue;
            }
            if (challenge.requirements.categories && metadata?.category) {
                if (!challenge.requirements.categories.includes(metadata.category))
                    continue;
            }
            if (challenge.requirements.minAmount && metadata?.amount) {
                if (metadata.amount < challenge.requirements.minAmount)
                    continue;
            }
            // Update progress
            if (progress) {
                const source = metadata?.orderId || metadata?.reviewId || metadata?.referralId || 'system';
                await progress.addProgress(amount, source);
                updates.push(progress);
            }
        }
        return updates;
    }
    // Claim challenge rewards
    async claimRewards(userId, progressId) {
        const progress = await UserChallengeProgress_1.default.findOne({
            _id: progressId,
            user: userId
        }).populate('challenge');
        if (!progress) {
            throw new Error('Challenge progress not found');
        }
        if (!progress.completed) {
            throw new Error('Challenge not completed yet');
        }
        if (progress.rewardsClaimed) {
            throw new Error('Rewards already claimed');
        }
        // Mark as claimed
        await progress.claimRewards();
        // Get challenge rewards
        const challenge = progress.challenge;
        const coinsReward = challenge.rewards.coins || 0;
        const rewards = {
            coins: coinsReward,
            badges: challenge.rewards.badges || [],
            exclusiveDeals: challenge.rewards.exclusiveDeals || [],
            multiplier: challenge.rewards.multiplier
        };
        // Credit coins to wallet
        let newWalletBalance;
        if (coinsReward > 0) {
            try {
                console.log(`💰 [CHALLENGE SERVICE] Crediting ${coinsReward} coins to user ${userId} for challenge ${challenge.title}`);
                // Get or create wallet
                let wallet = await Wallet_1.Wallet.findOne({ user: userId });
                if (!wallet) {
                    wallet = await Wallet_1.Wallet.createForUser(new mongoose_1.default.Types.ObjectId(userId));
                }
                if (wallet) {
                    // Add to wasil coins (REZ coins)
                    const wasilCoin = wallet.coins.find((c) => c.type === 'wasil');
                    if (wasilCoin) {
                        wasilCoin.amount += coinsReward;
                        wasilCoin.lastUsed = new Date();
                    }
                    else {
                        // If wasil coin doesn't exist, create it
                        wallet.coins.push({
                            type: 'wasil',
                            amount: coinsReward,
                            isActive: true,
                            earnedDate: new Date(),
                            lastUsed: new Date()
                        });
                    }
                    // Update balances
                    wallet.balance.available += coinsReward;
                    wallet.balance.total += coinsReward;
                    wallet.statistics.totalEarned += coinsReward;
                    await wallet.save();
                    newWalletBalance = wallet.balance.available;
                    console.log(`✅ [CHALLENGE SERVICE] Coins credited successfully. New balance: ${newWalletBalance}`);
                    // Create transaction record
                    try {
                        await Transaction_1.Transaction.create({
                            user: userId,
                            type: 'credit',
                            category: 'earning',
                            amount: coinsReward,
                            currency: 'RC',
                            description: `Challenge reward: ${challenge.title}`,
                            source: {
                                type: 'bonus',
                                reference: challenge._id,
                                description: `Earned ${coinsReward} coins from completing challenge: ${challenge.title}`,
                                metadata: {
                                    challengeId: String(challenge._id),
                                    challengeTitle: challenge.title,
                                    progressId: String(progress._id)
                                }
                            },
                            status: {
                                current: 'completed',
                                history: [{
                                        status: 'completed',
                                        timestamp: new Date(),
                                        reason: 'Challenge reward credited successfully'
                                    }]
                            },
                            balanceBefore: wallet.balance.available - coinsReward,
                            balanceAfter: wallet.balance.available,
                            netAmount: coinsReward,
                            isReversible: false
                        });
                        console.log('✅ [CHALLENGE SERVICE] Transaction record created');
                    }
                    catch (txError) {
                        console.error('❌ [CHALLENGE SERVICE] Failed to create transaction:', txError);
                        // Don't fail the whole operation if transaction creation fails
                    }
                }
            }
            catch (walletError) {
                console.error('❌ [CHALLENGE SERVICE] Error crediting coins to wallet:', walletError);
                // Don't fail the claim if wallet credit fails - user can contact support
            }
        }
        return { progress, rewards, walletBalance: newWalletBalance };
    }
    // Create challenge from template
    async createChallengeFromTemplate(templateIndex, startDate, featured = false) {
        const template = challengeTemplates_1.default[templateIndex];
        if (!template) {
            throw new Error('Template not found');
        }
        const start = startDate || new Date();
        const end = new Date(start);
        end.setDate(end.getDate() + (template.durationDays || 1));
        return Challenge_1.default.create({
            ...template,
            startDate: start,
            endDate: end,
            featured,
            active: true
        });
    }
    // Auto-generate daily challenges
    async generateDailyChallenges() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Check if challenges already generated for today
        const existing = await this.getDailyChallenges();
        if (existing.length > 0) {
            return existing;
        }
        // Select 3-5 random daily challenge templates
        const dailyTemplates = challengeTemplates_1.default.filter(t => t.type === 'daily');
        const selectedIndices = new Set();
        while (selectedIndices.size < Math.min(5, dailyTemplates.length)) {
            selectedIndices.add(Math.floor(Math.random() * dailyTemplates.length));
        }
        const challenges = [];
        for (const index of selectedIndices) {
            const template = dailyTemplates[index];
            const challenge = await Challenge_1.default.create({
                ...template,
                startDate: today,
                endDate: new Date(today.getTime() + 24 * 60 * 60 * 1000),
                featured: challenges.length === 0, // First one is featured
                active: true
            });
            challenges.push(challenge);
        }
        return challenges;
    }
    // Get challenge leaderboard
    async getChallengeLeaderboard(challengeId, limit = 10) {
        return UserChallengeProgress_1.default.aggregate([
            {
                $match: {
                    challenge: new mongoose_1.default.Types.ObjectId(challengeId),
                    progress: { $gt: 0 }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userData'
                }
            },
            {
                $unwind: '$userData'
            },
            {
                $sort: { progress: -1, lastUpdatedAt: 1 }
            },
            {
                $limit: limit
            },
            {
                $project: {
                    user: {
                        id: '$userData._id',
                        name: '$userData.name',
                        avatar: '$userData.avatar'
                    },
                    progress: 1,
                    target: 1,
                    completed: 1,
                    completedAt: 1
                }
            }
        ]);
    }
    // Get user's challenge statistics
    async getUserStatistics(userId) {
        const stats = await UserChallengeProgress_1.default.aggregate([
            {
                $match: { user: new mongoose_1.default.Types.ObjectId(userId) }
            },
            {
                $group: {
                    _id: null,
                    totalChallenges: { $sum: 1 },
                    completedChallenges: {
                        $sum: { $cond: ['$completed', 1, 0] }
                    },
                    totalCoinsEarned: {
                        $sum: {
                            $cond: [
                                '$rewardsClaimed',
                                { $ifNull: ['$rewards.coins', 0] },
                                0
                            ]
                        }
                    }
                }
            }
        ]);
        return stats[0] || {
            totalChallenges: 0,
            completedChallenges: 0,
            totalCoinsEarned: 0
        };
    }
}
exports.default = new ChallengeService();
