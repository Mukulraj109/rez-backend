// Referral Service
// Business logic for referral program

import { Types } from 'mongoose';
import Referral, { ReferralStatus, IReferral } from '../models/Referral';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { Wallet } from '../models/Wallet';
import activityService from './activityService';
import { ActivityType } from '../models/Activity';

interface CreateReferralParams {
  referrerId: Types.ObjectId;
  refereeId: Types.ObjectId;
  referralCode: string;
  shareMethod?: string;
  signupSource?: string;
}

interface ProcessFirstOrderParams {
  refereeId: Types.ObjectId;
  orderId: Types.ObjectId;
  orderAmount: number;
}

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  milestoneEarnings: number;
  referralBonus: number;
}

interface ReferralHistoryItem {
  _id: any;
  referee: {
    _id: any;
    name: string;
    phone: string;
  };
  status: ReferralStatus;
  rewards: {
    referrerAmount: number;
    milestoneBonus?: number;
  };
  referrerRewarded: boolean;
  milestoneRewarded: boolean;
  createdAt: Date;
  completedAt?: Date;
  metadata: any;
}

class ReferralService {
  /**
   * Create a new referral relationship when user signs up with referral code
   */
  async createReferral(params: CreateReferralParams): Promise<IReferral> {
    const { referrerId, refereeId, referralCode, shareMethod, signupSource } = params;

    // Check if referral already exists
    const existingReferral = await Referral.findOne({
      referee: refereeId,
    });

    if (existingReferral) {
      throw new Error('User already has a referral relationship');
    }

    // Create referral document
    const referral = await Referral.create({
      referrer: referrerId,
      referee: refereeId,
      referralCode,
      status: ReferralStatus.PENDING,
      metadata: {
        shareMethod,
        signupSource,
        sharedAt: new Date(),
      },
    });

    // Create activity for referrer
    await activityService.referral.onReferralSignup(
      referrerId,
      referral._id as Types.ObjectId,
      'New user signed up with your code!'
    );

    console.log(`✅ [REFERRAL] Created referral relationship: ${referrerId} -> ${refereeId}`);
    return referral;
  }

  /**
   * Process referee's first order completion
   * - Activate referral
   * - Credit referee's discount (already applied during order)
   * - Credit referrer's reward to wallet
   */
  async processFirstOrder(params: ProcessFirstOrderParams): Promise<void> {
    const { refereeId, orderId, orderAmount } = params;

    // Find pending referral for this referee
    const referral = await Referral.findOne({
      referee: refereeId,
      status: ReferralStatus.PENDING,
    }).populate('referrer', 'phoneNumber profile.firstName');

    if (!referral) {
      console.log(`ℹ️ [REFERRAL] No pending referral found for referee ${refereeId}`);
      return;
    }

    // Update referral status to ACTIVE
    referral.status = ReferralStatus.ACTIVE;
    referral.metadata.refereeFirstOrder = {
      orderId,
      amount: orderAmount,
      completedAt: new Date(),
    };

    // Mark referee as rewarded (discount was applied during order)
    referral.refereeRewarded = true;

    // Credit referrer's reward if not already done
    if (!referral.referrerRewarded) {
      const referrerWallet = await Wallet.findOne({ user: referral.referrer });

      if (referrerWallet) {
        // Add reward amount to wallet
        referrerWallet.balance.total += referral.rewards.referrerAmount;
        referrerWallet.balance.available += referral.rewards.referrerAmount;
        referrerWallet.statistics.totalEarned += referral.rewards.referrerAmount;
        await referrerWallet.save();

        // Create transaction record
        await Transaction.create({
          user: referral.referrer,
          type: 'credit',
          amount: referral.rewards.referrerAmount,
          description: 'Referral reward - Friend completed first order',
          status: 'success',
          source: {
            type: 'referral',
            referralInfo: {
              referredUser: refereeId,
              level: 'first_order',
            },
          },
        });

        // Create activity for referrer
        await activityService.referral.onReferralCompleted(
          referral.referrer as Types.ObjectId,
          referral._id as Types.ObjectId,
          `Friend completed first order! ₹${referral.rewards.referrerAmount} earned`
        );

        referral.referrerRewarded = true;
      }
    }

    // Check if this completes the referral (both rewarded)
    if (referral.referrerRewarded && referral.refereeRewarded) {
      referral.status = ReferralStatus.COMPLETED;
      referral.completedAt = new Date();
    }

    await referral.save();

    // Update user referral stats
    await this.updateUserReferralStats(referral.referrer as Types.ObjectId);

    console.log(`✅ [REFERRAL] Processed first order for referral ${referral._id}`);
  }

  /**
   * Process milestone bonus (after referee's 3rd order)
   */
  async processMilestoneBonus(refereeId: Types.ObjectId, orderCount: number): Promise<void> {
    // Only trigger on 3rd order
    if (orderCount !== 3) {
      return;
    }

    const referral = await Referral.findOne({
      referee: refereeId,
      status: { $in: [ReferralStatus.ACTIVE, ReferralStatus.COMPLETED] },
      milestoneRewarded: false,
    });

    if (!referral) {
      console.log(`ℹ️ [REFERRAL] No active referral found for milestone bonus`);
      return;
    }

    const bonusAmount = referral.rewards.milestoneBonus || 20;

    // Credit bonus to referrer's wallet
    const referrerWallet = await Wallet.findOne({ user: referral.referrer });

    if (referrerWallet) {
      referrerWallet.balance.total += bonusAmount;
      referrerWallet.balance.available += bonusAmount;
      referrerWallet.statistics.totalEarned += bonusAmount;
      await referrerWallet.save();

      // Create transaction record
      await Transaction.create({
        user: referral.referrer,
        type: 'credit',
        amount: bonusAmount,
        description: 'Referral milestone bonus - Friend completed 3 orders',
        status: 'success',
        source: {
          type: 'referral',
          referralInfo: {
            referredUser: refereeId,
            level: 'milestone_3',
          },
        },
      });

      // Create activity for milestone
      await activityService.referral.onReferralCompleted(
        referral.referrer as Types.ObjectId,
        referral._id as Types.ObjectId,
        `Milestone achieved! ₹${bonusAmount} bonus earned`
      );

      referral.milestoneRewarded = true;
      referral.metadata.milestoneOrders = {
        count: orderCount,
        totalAmount: referral.metadata.milestoneOrders?.totalAmount || 0,
        lastOrderAt: new Date(),
      };

      await referral.save();

      // Update user referral stats
      await this.updateUserReferralStats(referral.referrer as Types.ObjectId);

      console.log(`✅ [REFERRAL] Processed milestone bonus for referral ${referral._id}`);
    }
  }

  /**
   * Get user's referral statistics
   */
  async getReferralStats(userId: Types.ObjectId): Promise<ReferralStats> {
    const referrals = await Referral.find({ referrer: userId });

    const stats = referrals.reduce(
      (acc, ref) => {
        acc.totalReferrals++;

        if (ref.status === ReferralStatus.PENDING) acc.pendingReferrals++;
        if (ref.status === ReferralStatus.ACTIVE) acc.activeReferrals++;
        if (ref.status === ReferralStatus.COMPLETED) acc.completedReferrals++;

        if (ref.referrerRewarded) {
          acc.totalEarnings += ref.rewards.referrerAmount;
        } else if (ref.status !== ReferralStatus.EXPIRED) {
          acc.pendingEarnings += ref.rewards.referrerAmount;
        }

        if (ref.milestoneRewarded) {
          acc.milestoneEarnings += ref.rewards.milestoneBonus || 0;
          acc.totalEarnings += ref.rewards.milestoneBonus || 0;
        }

        return acc;
      },
      {
        totalReferrals: 0,
        activeReferrals: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
        milestoneEarnings: 0,
        referralBonus: 50, // Current referral bonus amount
      }
    );

    return stats;
  }

  /**
   * Get user's referral history with referee details
   */
  async getReferralHistory(userId: Types.ObjectId): Promise<ReferralHistoryItem[]> {
    const referrals = await Referral.find({ referrer: userId })
      .populate('referee', 'phoneNumber profile.firstName')
      .sort({ createdAt: -1 })
      .lean();

    return referrals.map(ref => {
      const referee = ref.referee as any;
      return {
        _id: ref._id,
        referee: {
          _id: referee._id,
          name: referee.profile?.firstName || referee.phoneNumber || 'User',
          phone: referee.phoneNumber || '',
        },
        status: ref.status,
        rewards: {
          referrerAmount: ref.rewards.referrerAmount,
          milestoneBonus: ref.rewards.milestoneBonus,
        },
        referrerRewarded: ref.referrerRewarded,
        milestoneRewarded: ref.milestoneRewarded,
        createdAt: ref.createdAt,
        completedAt: ref.completedAt,
        metadata: ref.metadata,
      };
    });
  }

  /**
   * Track referral share event
   */
  async trackShare(userId: Types.ObjectId, shareMethod: string): Promise<void> {
    // Log share event (could be stored in a separate collection if needed)
    console.log(`📤 [REFERRAL] User ${userId} shared via ${shareMethod}`);

    // Optional: Create activity for sharing
    // await activityService.referral.onReferralShared(userId, shareMethod);
  }

  /**
   * Validate referral code and get referrer info
   */
  async validateReferralCode(code: string): Promise<{ valid: boolean; referrer?: any }> {
    const user = await User.findOne({
      'referral.referralCode': code
    }).select('_id phoneNumber profile.firstName referral.referralCode');

    if (!user) {
      return { valid: false };
    }

    return {
      valid: true,
      referrer: {
        _id: user._id,
        name: user.profile?.firstName || user.phoneNumber,
        referralCode: user.referral?.referralCode,
      },
    };
  }

  /**
   * Update user's referral statistics in User model
   */
  private async updateUserReferralStats(userId: Types.ObjectId): Promise<void> {
    const stats = await this.getReferralStats(userId);

    await User.findByIdAndUpdate(userId, {
      $set: {
        'referral.totalReferrals': stats.totalReferrals,
        'referral.referralEarnings': stats.totalEarnings,
      },
    });
  }

  /**
   * Mark expired referrals (can be called by a cron job)
   */
  async markExpiredReferrals(): Promise<number> {
    const result = await Referral.updateMany(
      {
        status: { $in: [ReferralStatus.PENDING, ReferralStatus.ACTIVE] },
        expiresAt: { $lt: new Date() },
      },
      {
        $set: { status: ReferralStatus.EXPIRED },
      }
    );

    console.log(`⏰ [REFERRAL] Marked ${result.modifiedCount} referrals as expired`);
    return result.modifiedCount || 0;
  }
}

export default new ReferralService();
