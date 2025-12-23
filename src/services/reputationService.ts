/**
 * Reputation Service
 *
 * Calculates user reputation for Privé eligibility using a 6-pillar system.
 * Fetches data from various sources (orders, reviews, referrals, etc.)
 * and computes weighted scores.
 */

import { Types } from 'mongoose';
import {
  UserReputation,
  IUserReputation,
  PILLAR_WEIGHTS,
  ELIGIBILITY_THRESHOLDS,
  PillarId,
  PriveTier,
} from '../models/UserReputation';
import { User } from '../models/User';
import { Order } from '../models/Order';
import Referral, { ReferralStatus } from '../models/Referral';
import { Review } from '../models/Review';
import { Wishlist } from '../models/Wishlist';

// Response types
export interface PriveEligibilityResponse {
  isEligible: boolean;
  score: number;
  tier: PriveTier;
  pillars: PillarScoreResponse[];
  trustScore: number;
  hasSeenGlowThisSession: boolean;
  nextTierThreshold: number;
  pointsToNextTier: number;
}

export interface PillarScoreResponse {
  id: PillarId;
  label: string;
  score: number;
  weight: number;
  weightedScore: number;
}

// Pillar labels for API responses
const PILLAR_LABELS: Record<PillarId, string> = {
  engagement: 'Engagement',
  trust: 'Trust & Integrity',
  influence: 'Influence',
  economicValue: 'Economic Value',
  brandAffinity: 'Brand Affinity',
  network: 'Network & Community',
};

class ReputationService {
  /**
   * Get or create user reputation record
   */
  async getOrCreateReputation(userId: Types.ObjectId): Promise<IUserReputation> {
    let reputation = await UserReputation.findOne({ userId });

    if (!reputation) {
      reputation = new UserReputation({ userId });
      await reputation.save();
    }

    return reputation;
  }

  /**
   * Check Privé eligibility for a user
   */
  async checkPriveEligibility(userId: string | Types.ObjectId): Promise<PriveEligibilityResponse> {
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    const reputation = await this.getOrCreateReputation(userObjectId);

    // Format pillars for response
    const pillars: PillarScoreResponse[] = Object.entries(PILLAR_WEIGHTS).map(([id, weight]) => {
      const pillarId = id as PillarId;
      const score = reputation.pillars[pillarId].score;
      return {
        id: pillarId,
        label: PILLAR_LABELS[pillarId],
        score,
        weight,
        weightedScore: Math.round(score * weight * 100) / 100,
      };
    });

    // Calculate next tier threshold
    let nextTierThreshold: number = ELIGIBILITY_THRESHOLDS.ENTRY_TIER;
    if (reputation.tier === 'entry') {
      nextTierThreshold = ELIGIBILITY_THRESHOLDS.ELITE_TIER;
    } else if (reputation.tier === 'elite') {
      nextTierThreshold = 100; // Already at max
    }

    const pointsToNextTier = Math.max(0, nextTierThreshold - reputation.totalScore);

    return {
      isEligible: reputation.isEligible,
      score: reputation.totalScore,
      tier: reputation.tier,
      pillars,
      trustScore: reputation.pillars.trust.score,
      hasSeenGlowThisSession: false, // Managed by frontend
      nextTierThreshold,
      pointsToNextTier: Math.round(pointsToNextTier * 100) / 100,
    };
  }

  /**
   * Get detailed pillar breakdown
   */
  async getPillarBreakdown(userId: string | Types.ObjectId): Promise<{
    pillars: PillarScoreResponse[];
    factors: Record<PillarId, any>;
  }> {
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    const reputation = await this.getOrCreateReputation(userObjectId);

    const pillars: PillarScoreResponse[] = Object.entries(PILLAR_WEIGHTS).map(([id, weight]) => {
      const pillarId = id as PillarId;
      const score = reputation.pillars[pillarId].score;
      return {
        id: pillarId,
        label: PILLAR_LABELS[pillarId],
        score,
        weight,
        weightedScore: Math.round(score * weight * 100) / 100,
      };
    });

    const factors: Record<PillarId, any> = {
      engagement: reputation.pillars.engagement.factors,
      trust: reputation.pillars.trust.factors,
      influence: reputation.pillars.influence.factors,
      economicValue: reputation.pillars.economicValue.factors,
      brandAffinity: reputation.pillars.brandAffinity.factors,
      network: reputation.pillars.network.factors,
    };

    return { pillars, factors };
  }

  /**
   * Recalculate all pillars for a user
   */
  async recalculateReputation(
    userId: string | Types.ObjectId,
    trigger: string = 'manual'
  ): Promise<IUserReputation> {
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    const reputation = await this.getOrCreateReputation(userObjectId);

    // Calculate each pillar
    await Promise.all([
      this.calculateEngagementScore(userObjectId, reputation),
      this.calculateTrustScore(userObjectId, reputation),
      this.calculateInfluenceScore(userObjectId, reputation),
      this.calculateEconomicValueScore(userObjectId, reputation),
      this.calculateBrandAffinityScore(userObjectId, reputation),
      this.calculateNetworkScore(userObjectId, reputation),
    ]);

    // Add snapshot before saving
    reputation.addSnapshot(trigger);

    // Save (pre-save hook will recalculate total)
    await reputation.save();

    console.log(`📊 [REPUTATION] Recalculated for user ${userId.toString().slice(-6)}: Score=${reputation.totalScore}, Tier=${reputation.tier}`);

    return reputation;
  }

  /**
   * Calculate Engagement score (25%)
   * Based on: orders, app opens, session duration, feature usage
   */
  private async calculateEngagementScore(
    userId: Types.ObjectId,
    reputation: IUserReputation
  ): Promise<void> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get order counts
    const [ordersLast30Days, ordersLast90Days] = await Promise.all([
      Order.countDocuments({
        user: userId,
        createdAt: { $gte: thirtyDaysAgo },
        status: { $nin: ['cancelled', 'failed'] },
      }),
      Order.countDocuments({
        user: userId,
        createdAt: { $gte: ninetyDaysAgo },
        status: { $nin: ['cancelled', 'failed'] },
      }),
    ]);

    // Update factors
    reputation.pillars.engagement.factors = {
      ordersLast30Days,
      ordersLast90Days,
      appOpensLast30Days: reputation.pillars.engagement.factors.appOpensLast30Days || 0,
      averageSessionDuration: reputation.pillars.engagement.factors.averageSessionDuration || 0,
      featuresUsed: reputation.pillars.engagement.factors.featuresUsed || [],
      lastActiveDate: reputation.pillars.engagement.factors.lastActiveDate || now,
    };

    // Calculate score (0-100)
    // Scoring logic:
    // - 0 orders = 0 points
    // - 1-2 orders/month = 30 points
    // - 3-5 orders/month = 50 points
    // - 6-10 orders/month = 70 points
    // - 10+ orders/month = 90 points
    // Additional points for consistency (90-day vs 30-day ratio)
    let score = 0;

    if (ordersLast30Days >= 10) score = 90;
    else if (ordersLast30Days >= 6) score = 70;
    else if (ordersLast30Days >= 3) score = 50;
    else if (ordersLast30Days >= 1) score = 30;

    // Consistency bonus (up to 10 points)
    if (ordersLast90Days > 0) {
      const consistencyRatio = ordersLast30Days / (ordersLast90Days / 3);
      score += Math.min(10, Math.round(consistencyRatio * 5));
    }

    reputation.pillars.engagement.score = Math.min(100, score);
    reputation.pillars.engagement.lastCalculated = now;
  }

  /**
   * Calculate Trust score (20%)
   * Based on: order completion, payment success, verification, account age
   */
  private async calculateTrustScore(
    userId: Types.ObjectId,
    reputation: IUserReputation
  ): Promise<void> {
    const now = new Date();

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      reputation.pillars.trust.score = 50; // Neutral if no user found
      return;
    }

    // Get order completion stats
    const [totalOrders, completedOrders, cancelledOrders] = await Promise.all([
      Order.countDocuments({ user: userId }),
      Order.countDocuments({ user: userId, status: 'delivered' }),
      Order.countDocuments({ user: userId, status: 'cancelled' }),
    ]);

    const orderCompletionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 100;
    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

    // Account age in days
    const accountAge = Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));

    // Check verification status (User model uses auth.isVerified for general verification)
    const isVerified = user.auth?.isVerified || false;
    const hasEmail = !!user.email;

    // Update factors
    reputation.pillars.trust.factors = {
      orderCompletionRate: Math.round(orderCompletionRate),
      paymentSuccessRate: 100 - cancellationRate, // Simplified
      chargebackCount: 0, // Would need payment integration
      isEmailVerified: isVerified && hasEmail, // Consider email verified if user is verified and has email
      isPhoneVerified: isVerified, // Consider phone verified if user is verified (phone is primary auth)
      isIdentityVerified: false, // Would need KYC integration
      accountAge,
      hasSecurityEnabled: false, // Would check 2FA settings
    };

    // Calculate score (0-100)
    let score = 50; // Start neutral

    // Order completion rate (+/-30 points)
    if (orderCompletionRate >= 95) score += 30;
    else if (orderCompletionRate >= 80) score += 20;
    else if (orderCompletionRate >= 60) score += 10;
    else if (orderCompletionRate < 50) score -= 20;

    // Verification bonuses
    if (isVerified && hasEmail) score += 5;
    if (isVerified) score += 5;

    // Account age bonus (up to 10 points)
    if (accountAge >= 365) score += 10;
    else if (accountAge >= 180) score += 7;
    else if (accountAge >= 90) score += 5;
    else if (accountAge >= 30) score += 2;

    reputation.pillars.trust.score = Math.max(0, Math.min(100, score));
    reputation.pillars.trust.lastCalculated = now;
  }

  /**
   * Calculate Influence score (20%)
   * Based on: referrals, reviews, social shares, helpful votes
   */
  private async calculateInfluenceScore(
    userId: Types.ObjectId,
    reputation: IUserReputation
  ): Promise<void> {
    const now = new Date();

    // Get referral stats
    const [totalReferrals, successfulReferrals] = await Promise.all([
      Referral.countDocuments({ referrer: userId }),
      Referral.countDocuments({ referrer: userId, status: ReferralStatus.COMPLETED }),
    ]);

    // Get review stats
    const [reviewsWritten, reviewsWithHelpfulVotes] = await Promise.all([
      Review.countDocuments({ user: userId }),
      Review.countDocuments({ user: userId, helpfulVotes: { $gt: 0 } }),
    ]);

    // Update factors
    reputation.pillars.influence.factors = {
      totalReferrals,
      successfulReferrals,
      reviewsWritten,
      reviewsHelpfulVotes: reviewsWithHelpfulVotes,
      socialSharesCount: 0, // Would need social tracking
      followersCount: 0, // Would need follower system
    };

    // Calculate score (0-100)
    let score = 0;

    // Referral points (up to 40)
    score += Math.min(40, successfulReferrals * 10);

    // Review points (up to 30)
    score += Math.min(30, reviewsWritten * 5);

    // Helpful reviews bonus (up to 30)
    score += Math.min(30, reviewsWithHelpfulVotes * 10);

    reputation.pillars.influence.score = Math.min(100, score);
    reputation.pillars.influence.lastCalculated = now;
  }

  /**
   * Calculate Economic Value score (15%)
   * Based on: total spend, AOV, purchase frequency, category diversity
   */
  private async calculateEconomicValueScore(
    userId: Types.ObjectId,
    reputation: IUserReputation
  ): Promise<void> {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get order stats
    const orders = await Order.find({
      user: userId,
      status: 'delivered',
    }).select('totalAmount createdAt items');

    const totalSpend = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const averageOrderValue = orders.length > 0 ? totalSpend / orders.length : 0;

    // Recent orders for frequency
    const recentOrders = orders.filter(o => o.createdAt >= ninetyDaysAgo);
    const purchaseFrequency = recentOrders.length / 3; // Per month

    // Category diversity (unique categories)
    const categories = new Set<string>();
    orders.forEach(order => {
      order.items?.forEach((item: any) => {
        if (item.category) categories.add(item.category);
      });
    });
    const categoryDiversity = categories.size;

    // Last purchase
    const lastPurchase = orders.length > 0
      ? orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
      : undefined;

    // Update factors
    reputation.pillars.economicValue.factors = {
      totalSpend,
      averageOrderValue: Math.round(averageOrderValue),
      purchaseFrequency: Math.round(purchaseFrequency * 10) / 10,
      categoryDiversity,
      lastPurchaseDate: lastPurchase,
      lifetimeValue: totalSpend, // Simplified
    };

    // Calculate score (0-100)
    let score = 0;

    // Total spend points (up to 40)
    if (totalSpend >= 50000) score += 40;
    else if (totalSpend >= 20000) score += 30;
    else if (totalSpend >= 10000) score += 20;
    else if (totalSpend >= 5000) score += 10;

    // AOV points (up to 20)
    if (averageOrderValue >= 2000) score += 20;
    else if (averageOrderValue >= 1000) score += 15;
    else if (averageOrderValue >= 500) score += 10;

    // Frequency points (up to 20)
    if (purchaseFrequency >= 4) score += 20;
    else if (purchaseFrequency >= 2) score += 15;
    else if (purchaseFrequency >= 1) score += 10;

    // Diversity points (up to 20)
    score += Math.min(20, categoryDiversity * 4);

    reputation.pillars.economicValue.score = Math.min(100, score);
    reputation.pillars.economicValue.lastCalculated = now;
  }

  /**
   * Calculate Brand Affinity score (10%)
   * Based on: repeat purchases, wishlists, brand follows
   */
  private async calculateBrandAffinityScore(
    userId: Types.ObjectId,
    reputation: IUserReputation
  ): Promise<void> {
    const now = new Date();

    // Get wishlist items
    const wishlistCount = await Wishlist.countDocuments({ user: userId });

    // Get repeat purchase data
    const orders = await Order.find({
      user: userId,
      status: 'delivered',
    }).select('items.store');

    // Count repeat stores (stores are inside order items)
    const storeCounts: Record<string, number> = {};
    orders.forEach(order => {
      order.items?.forEach((item: any) => {
        const storeId = item.store?.toString();
        if (storeId) {
          storeCounts[storeId] = (storeCounts[storeId] || 0) + 1;
        }
      });
    });

    const repeatStores = Object.values(storeCounts).filter(count => count > 1).length;
    const repeatPurchaseRate = orders.length > 0 ? (repeatStores / Object.keys(storeCounts).length) * 100 : 0;

    // Update factors
    reputation.pillars.brandAffinity.factors = {
      repeatPurchaseRate: Math.round(repeatPurchaseRate),
      wishlistItemCount: wishlistCount,
      brandsFollowed: 0, // Would need brand follow system
      brandInteractions: 0, // Would need interaction tracking
      loyaltyProgramsJoined: 0, // Would need loyalty system
    };

    // Calculate score (0-100)
    let score = 0;

    // Repeat purchase rate (up to 50)
    score += Math.min(50, repeatPurchaseRate / 2);

    // Wishlist items (up to 30)
    score += Math.min(30, wishlistCount * 3);

    // Base engagement if any orders (up to 20)
    if (orders.length > 0) score += Math.min(20, orders.length * 2);

    reputation.pillars.brandAffinity.score = Math.min(100, score);
    reputation.pillars.brandAffinity.lastCalculated = now;
  }

  /**
   * Calculate Network score (10%)
   * Based on: referral network, quality of referrals, social connections
   */
  private async calculateNetworkScore(
    userId: Types.ObjectId,
    reputation: IUserReputation
  ): Promise<void> {
    const now = new Date();

    // Get referral network
    const referrals = await Referral.find({ referrer: userId }).populate('referee', 'name');
    const networkSize = referrals.length;

    // Calculate quality score (based on active referred users)
    const completedReferrals = referrals.filter(r => r.status === ReferralStatus.COMPLETED);
    const referralQualityScore = networkSize > 0
      ? (completedReferrals.length / networkSize) * 100
      : 0;

    // Update factors
    reputation.pillars.network.factors = {
      referralNetworkSize: networkSize,
      referralQualityScore: Math.round(referralQualityScore),
      socialConnectionsCount: 0, // Would need social system
      communityEngagementScore: 0, // Would need community features
    };

    // Calculate score (0-100)
    let score = 0;

    // Network size (up to 50)
    score += Math.min(50, networkSize * 10);

    // Quality bonus (up to 50)
    score += Math.min(50, referralQualityScore / 2);

    reputation.pillars.network.score = Math.min(100, score);
    reputation.pillars.network.lastCalculated = now;
  }

  /**
   * Trigger recalculation based on specific events
   */
  async onOrderCompleted(userId: string | Types.ObjectId): Promise<void> {
    await this.recalculateReputation(userId, 'order_completed');
  }

  async onReviewSubmitted(userId: string | Types.ObjectId): Promise<void> {
    await this.recalculateReputation(userId, 'review_submitted');
  }

  async onReferralCompleted(userId: string | Types.ObjectId): Promise<void> {
    await this.recalculateReputation(userId, 'referral_completed');
  }

  /**
   * Get users eligible for Privé (for admin/analytics)
   */
  async getEligibleUsers(tier?: PriveTier): Promise<IUserReputation[]> {
    const query: any = { isEligible: true };
    if (tier) query.tier = tier;

    return UserReputation.find(query)
      .sort({ totalScore: -1 })
      .limit(100);
  }
}

// Export singleton instance
export const reputationService = new ReputationService();
export default reputationService;
