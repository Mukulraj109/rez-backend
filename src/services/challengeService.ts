import Challenge, { IChallenge } from '../models/Challenge';
import UserChallengeProgress, { IUserChallengeProgress } from '../models/UserChallengeProgress';
import CHALLENGE_TEMPLATES from '../config/challengeTemplates';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import mongoose from 'mongoose';

class ChallengeService {
  // Get active challenges
  async getActiveChallenges(type?: string): Promise<IChallenge[]> {
    const now = new Date();
    const query: any = {
      active: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    };

    if (type) {
      query.type = type;
    }

    return Challenge.find(query)
      .sort({ featured: -1, difficulty: 1, endDate: 1 })
      .exec();
  }

  // Get today's daily challenges
  async getDailyChallenges(): Promise<IChallenge[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return Challenge.find({
      type: 'daily',
      active: true,
      startDate: { $gte: today, $lt: tomorrow }
    }).exec();
  }

  // Get user's challenge progress
  async getUserProgress(
    userId: string,
    includeCompleted: boolean = true
  ): Promise<IUserChallengeProgress[]> {
    const query: any = { user: userId };

    if (!includeCompleted) {
      query.completed = false;
    }

    return UserChallengeProgress.find(query)
      .populate('challenge')
      .sort({ completed: 1, lastUpdatedAt: -1 })
      .exec();
  }

  // Join a challenge
  async joinChallenge(
    userId: string,
    challengeId: string
  ): Promise<IUserChallengeProgress> {
    // Check if challenge exists and is active
    const challenge = await Challenge.findById(challengeId);

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
    const existing = await UserChallengeProgress.findOne({
      user: userId,
      challenge: challengeId
    });

    if (existing) {
      return existing;
    }

    // Create progress record
    const progress = await UserChallengeProgress.create({
      user: userId,
      challenge: challengeId,
      progress: 0,
      target: challenge.requirements.target,
      startedAt: new Date()
    });

    // Update participant count
    await Challenge.findByIdAndUpdate(challengeId, {
      $inc: { participantCount: 1 }
    });

    return progress;
  }

  // Update challenge progress
  async updateProgress(
    userId: string,
    action: string,
    amount: number = 1,
    metadata?: any
  ): Promise<IUserChallengeProgress[]> {
    // Find all active challenges for this action
    const now = new Date();
    const challenges = await Challenge.find({
      'requirements.action': action,
      active: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    });

    const updates: IUserChallengeProgress[] = [];

    for (const challenge of challenges) {
      // Check if user has joined
      let progress = await UserChallengeProgress.findOne({
        user: userId,
        challenge: challenge._id
      });

      // Auto-join if not joined
      if (!progress) {
        progress = await this.joinChallenge(userId, String(challenge._id)) as any;
      }

      // Skip if already completed
      if (progress?.completed) continue;

      // Apply filters if specified
      if (challenge.requirements.stores && metadata?.storeId) {
        const storeIds = challenge.requirements.stores.map(s => s.toString());
        if (!storeIds.includes(metadata.storeId.toString())) continue;
      }

      if (challenge.requirements.categories && metadata?.category) {
        if (!challenge.requirements.categories.includes(metadata.category)) continue;
      }

      if (challenge.requirements.minAmount && metadata?.amount) {
        if (metadata.amount < challenge.requirements.minAmount) continue;
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
  async claimRewards(
    userId: string,
    progressId: string
  ): Promise<{ progress: IUserChallengeProgress; rewards: any; walletBalance?: number }> {
    const progress = await UserChallengeProgress.findOne({
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
    const challenge = progress.challenge as any;
    const coinsReward = challenge.rewards.coins || 0;
    const rewards = {
      coins: coinsReward,
      badges: challenge.rewards.badges || [],
      exclusiveDeals: challenge.rewards.exclusiveDeals || [],
      multiplier: challenge.rewards.multiplier
    };

    // Credit coins to wallet
    let newWalletBalance: number | undefined;
    if (coinsReward > 0) {
      try {
        console.log(`💰 [CHALLENGE SERVICE] Crediting ${coinsReward} coins to user ${userId} for challenge ${challenge.title}`);

        // Get or create wallet
        let wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
          wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
        }

        if (wallet) {
          // Add to rez coins (REZ coins)
          const rezCoin = wallet.coins.find((c: any) => c.type === 'rez');
          if (rezCoin) {
            rezCoin.amount += coinsReward;
            rezCoin.lastUsed = new Date();
          } else {
            // If rez coin doesn't exist, create it
            wallet.coins.push({
              type: 'rez',
              amount: coinsReward,
              isActive: true,
              color: '#00C06A',
              earnedDate: new Date(),
              lastUsed: new Date()
            } as any);
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
            await Transaction.create({
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
          } catch (txError) {
            console.error('❌ [CHALLENGE SERVICE] Failed to create transaction:', txError);
            // Don't fail the whole operation if transaction creation fails
          }
        }
      } catch (walletError) {
        console.error('❌ [CHALLENGE SERVICE] Error crediting coins to wallet:', walletError);
        // Don't fail the claim if wallet credit fails - user can contact support
      }
    }

    return { progress, rewards, walletBalance: newWalletBalance };
  }

  // Create challenge from template
  async createChallengeFromTemplate(
    templateIndex: number,
    startDate?: Date,
    featured: boolean = false
  ): Promise<IChallenge> {
    const template = CHALLENGE_TEMPLATES[templateIndex];

    if (!template) {
      throw new Error('Template not found');
    }

    const start = startDate || new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + (template.durationDays || 1));

    return Challenge.create({
      ...template,
      startDate: start,
      endDate: end,
      featured,
      active: true
    });
  }

  // Auto-generate daily challenges
  async generateDailyChallenges(): Promise<IChallenge[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if challenges already generated for today
    const existing = await this.getDailyChallenges();
    if (existing.length > 0) {
      return existing;
    }

    // Select 3-5 random daily challenge templates
    const dailyTemplates = CHALLENGE_TEMPLATES.filter(t => t.type === 'daily');
    const selectedIndices = new Set<number>();

    while (selectedIndices.size < Math.min(5, dailyTemplates.length)) {
      selectedIndices.add(Math.floor(Math.random() * dailyTemplates.length));
    }

    const challenges: IChallenge[] = [];

    for (const index of selectedIndices) {
      const template = dailyTemplates[index];
      const challenge = await Challenge.create({
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
  async getChallengeLeaderboard(
    challengeId: string,
    limit: number = 10
  ): Promise<any[]> {
    return UserChallengeProgress.aggregate([
      {
        $match: {
          challenge: new mongoose.Types.ObjectId(challengeId),
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
  async getUserStatistics(userId: string): Promise<any> {
    const stats = await UserChallengeProgress.aggregate([
      {
        $match: { user: new mongoose.Types.ObjectId(userId) }
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

export default new ChallengeService();
