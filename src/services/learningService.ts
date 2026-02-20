import LearningContent, { ILearningContent } from '../models/LearningContent';
import UserLearningProgress, { IUserLearningProgress } from '../models/UserLearningProgress';
import { Wallet } from '../models/Wallet';
import { CoinTransaction } from '../models/CoinTransaction';
import mongoose from 'mongoose';

class LearningService {
  /**
   * Get all published learning content, optionally with user's progress
   */
  async getPublishedContent(userId?: string): Promise<any[]> {
    const content = await LearningContent.find({ isPublished: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    if (!userId) {
      return content.map(c => ({
        ...c,
        completed: false,
        rewardClaimed: false,
      }));
    }

    // Get user's progress for all content
    const progressList = await UserLearningProgress.find({
      user: userId,
      content: { $in: content.map(c => c._id) }
    }).lean();

    const progressMap = new Map<string, IUserLearningProgress>();
    for (const p of progressList) {
      progressMap.set(String(p.content), p as any);
    }

    return content.map(c => {
      const progress = progressMap.get(String(c._id));
      return {
        ...c,
        completed: progress?.completed || false,
        rewardClaimed: progress?.rewardClaimed || false,
        timeSpentSeconds: progress?.timeSpentSeconds || 0,
      };
    });
  }

  /**
   * Get a single content item by slug
   */
  async getContentBySlug(slug: string, userId?: string): Promise<any> {
    const content = await LearningContent.findOne({ slug, isPublished: true }).lean();
    if (!content) return null;

    let progress = null;
    if (userId) {
      progress = await UserLearningProgress.findOne({
        user: userId,
        content: content._id
      }).lean();
    }

    return {
      ...content,
      completed: progress?.completed || false,
      rewardClaimed: progress?.rewardClaimed || false,
      timeSpentSeconds: progress?.timeSpentSeconds || 0,
    };
  }

  /**
   * Mark learning content as completed and award coins (idempotent).
   * Requires minimum timeSpent to prevent instant-complete cheating.
   */
  async markCompleted(
    userId: string,
    contentId: string,
    timeSpentSeconds: number
  ): Promise<{ completed: boolean; coinsAwarded: number; alreadyClaimed: boolean }> {
    const content = await LearningContent.findById(contentId);
    if (!content) {
      throw new Error('Learning content not found');
    }

    // Minimum time requirement: at least 30% of estimated time
    const minTimeSeconds = content.estimatedMinutes * 60 * 0.3;
    if (timeSpentSeconds < minTimeSeconds) {
      throw new Error(`Please spend at least ${Math.ceil(minTimeSeconds)} seconds on this content`);
    }

    // Find or create progress record
    let progress = await UserLearningProgress.findOne({
      user: userId,
      content: contentId,
    });

    if (progress?.rewardClaimed) {
      return { completed: true, coinsAwarded: 0, alreadyClaimed: true };
    }

    if (!progress) {
      progress = await UserLearningProgress.create({
        user: new mongoose.Types.ObjectId(userId),
        content: new mongoose.Types.ObjectId(contentId),
        completed: true,
        completedAt: new Date(),
        rewardClaimed: false,
        timeSpentSeconds,
      });
    } else {
      progress.completed = true;
      progress.completedAt = new Date();
      progress.timeSpentSeconds = Math.max(progress.timeSpentSeconds, timeSpentSeconds);
      await progress.save();
    }

    // Award coins
    const coinsReward = content.coinReward || 0;
    if (coinsReward > 0) {
      // Atomic wallet update
      const updatedWallet = await Wallet.findOneAndUpdate(
        { user: userId, 'coins.type': 'rez' },
        {
          $inc: {
            'balance.available': coinsReward,
            'balance.total': coinsReward,
            'statistics.totalEarned': coinsReward,
            'coins.$.amount': coinsReward
          },
          $set: {
            'coins.$.lastEarned': new Date(),
            lastTransactionAt: new Date()
          }
        },
        { new: true }
      );

      if (!updatedWallet) {
        // Create wallet if not exists
        const wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
        if (wallet) {
          await Wallet.findOneAndUpdate(
            { _id: wallet._id, 'coins.type': 'rez' },
            {
              $inc: {
                'balance.available': coinsReward,
                'balance.total': coinsReward,
                'statistics.totalEarned': coinsReward,
                'coins.$.amount': coinsReward
              },
              $set: { lastTransactionAt: new Date() }
            }
          );
        }
      }

      // Create CoinTransaction record
      try {
        await CoinTransaction.createTransaction(
          userId,
          'earned',
          coinsReward,
          'learning_reward',
          `Learning completed: ${content.title}`,
          {
            contentId: String(content._id),
            contentSlug: content.slug,
            contentTitle: content.title,
          }
        );
      } catch (err) {
        console.error('[LEARNING SERVICE] Failed to create CoinTransaction:', err);
      }

      // Mark reward as claimed
      progress.rewardClaimed = true;
      progress.claimedAt = new Date();
      await progress.save();
    }

    return { completed: true, coinsAwarded: coinsReward, alreadyClaimed: false };
  }
}

export default new LearningService();
