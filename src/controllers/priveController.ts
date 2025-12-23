/**
 * Privé Controller
 *
 * Handles Privé eligibility, offers, check-in, and dashboard endpoints
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { reputationService } from '../services/reputationService';
import { UserReputation } from '../models/UserReputation';
import DailyCheckIn, { calculateStreakBonus, getStreakMessage } from '../models/DailyCheckIn';
import PriveOffer, { IPriveOffer } from '../models/PriveOffer';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { Order } from '../models/Order';
import { Review } from '../models/Review';
import Referral from '../models/Referral';

// Helper function to calculate expires in string from a date
const calculateExpiresIn = (expiresAt: Date): string => {
  const now = new Date();
  const diff = new Date(expiresAt).getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return 'Less than 1 hour';
};

/**
 * GET /api/prive/eligibility
 * Get current user's Privé eligibility status
 */
export const getPriveEligibility = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const eligibility = await reputationService.checkPriveEligibility(userId);

    return res.status(200).json({
      success: true,
      data: eligibility,
    });
  } catch (error: any) {
    console.error('[PRIVE] Error getting eligibility:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get eligibility status',
      message: error.message,
    });
  }
};

/**
 * GET /api/prive/pillars
 * Get detailed pillar breakdown for user
 */
export const getPillarBreakdown = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const breakdown = await reputationService.getPillarBreakdown(userId);

    return res.status(200).json({
      success: true,
      data: breakdown,
    });
  } catch (error: any) {
    console.error('[PRIVE] Error getting pillar breakdown:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get pillar breakdown',
      message: error.message,
    });
  }
};

/**
 * POST /api/prive/refresh
 * Force recalculation of user's reputation
 */
export const refreshEligibility = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Recalculate reputation
    const reputation = await reputationService.recalculateReputation(userId, 'user_refresh');

    // Get formatted eligibility response
    const eligibility = await reputationService.checkPriveEligibility(userId);

    return res.status(200).json({
      success: true,
      message: 'Eligibility refreshed successfully',
      data: eligibility,
    });
  } catch (error: any) {
    console.error('[PRIVE] Error refreshing eligibility:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to refresh eligibility',
      message: error.message,
    });
  }
};

/**
 * GET /api/prive/history
 * Get reputation history for user
 */
export const getReputationHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const reputation = await UserReputation.findOne({ userId });

    if (!reputation) {
      return res.status(200).json({
        success: true,
        data: {
          history: [],
          currentScore: 0,
          currentTier: 'none',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        history: reputation.history.slice(-20), // Last 20 entries
        currentScore: reputation.totalScore,
        currentTier: reputation.tier,
      },
    });
  } catch (error: any) {
    console.error('[PRIVE] Error getting history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get reputation history',
      message: error.message,
    });
  }
};

/**
 * GET /api/prive/tips
 * Get personalized tips to improve eligibility score
 */
export const getImprovementTips = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { pillars, factors } = await reputationService.getPillarBreakdown(userId);

    // Generate tips based on lowest scoring pillars
    const tips: Array<{ pillar: string; tip: string; priority: 'high' | 'medium' | 'low' }> = [];

    // Sort pillars by score (ascending)
    const sortedPillars = [...pillars].sort((a, b) => a.score - b.score);

    sortedPillars.forEach((pillar, index) => {
      const priority = index < 2 ? 'high' : index < 4 ? 'medium' : 'low';

      switch (pillar.id) {
        case 'engagement':
          if (pillar.score < 50) {
            tips.push({
              pillar: pillar.label,
              tip: 'Place more orders to boost your engagement score. Active users get higher scores!',
              priority,
            });
          }
          break;

        case 'trust':
          if (pillar.score < 70) {
            tips.push({
              pillar: pillar.label,
              tip: 'Verify your email and phone number to increase your trust score.',
              priority,
            });
          }
          break;

        case 'influence':
          if (pillar.score < 50) {
            tips.push({
              pillar: pillar.label,
              tip: 'Refer friends and write reviews to boost your influence score.',
              priority,
            });
          }
          break;

        case 'economicValue':
          if (pillar.score < 50) {
            tips.push({
              pillar: pillar.label,
              tip: 'Explore different categories and maintain regular purchases.',
              priority,
            });
          }
          break;

        case 'brandAffinity':
          if (pillar.score < 50) {
            tips.push({
              pillar: pillar.label,
              tip: 'Add items to your wishlist and make repeat purchases from favorite stores.',
              priority,
            });
          }
          break;

        case 'network':
          if (pillar.score < 50) {
            tips.push({
              pillar: pillar.label,
              tip: 'Grow your referral network by inviting friends to join.',
              priority,
            });
          }
          break;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        tips: tips.slice(0, 5), // Top 5 tips
        lowestPillar: sortedPillars[0],
        highestPillar: sortedPillars[sortedPillars.length - 1],
      },
    });
  } catch (error: any) {
    console.error('[PRIVE] Error getting tips:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get improvement tips',
      message: error.message,
    });
  }
};

// ==========================================
// Daily Check-in & Habits
// ==========================================

/**
 * POST /api/prive/check-in
 * Daily check-in with streak tracking and coin reward
 */
export const dailyCheckIn = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Check if already checked in today
    const hasCheckedIn = await DailyCheckIn.hasCheckedInToday(
      new mongoose.Types.ObjectId(userId)
    );

    if (hasCheckedIn) {
      return res.status(400).json({
        success: false,
        error: 'Already checked in today',
        message: 'You have already checked in today. Come back tomorrow!',
      });
    }

    // Get current streak
    const currentStreak = await DailyCheckIn.getCurrentStreak(
      new mongoose.Types.ObjectId(userId)
    );
    const newStreak = currentStreak + 1;

    // Calculate rewards
    const baseCoins = 10;
    const bonusCoins = calculateStreakBonus(newStreak);
    const totalCoins = baseCoins + bonusCoins;

    // Create check-in record
    const checkIn = await DailyCheckIn.create({
      userId: new mongoose.Types.ObjectId(userId),
      date: new Date(),
      streak: newStreak,
      coinsEarned: baseCoins,
      bonusEarned: bonusCoins,
      totalEarned: totalCoins,
      coinType: 'rez',
    });

    // Award ReZ coins to user wallet
    try {
      const wallet = await Wallet.findOne({ user: new mongoose.Types.ObjectId(userId) });
      if (wallet) {
        // Update balance
        wallet.balance.total += totalCoins;
        wallet.balance.available += totalCoins;
        wallet.statistics.totalEarned += totalCoins;
        wallet.lastTransactionAt = new Date();

        // Also update the ReZ coins specifically in the coins array
        const rezCoin = wallet.coins.find((c: any) => c.type === 'rez');
        if (rezCoin) {
          rezCoin.amount += totalCoins;
          rezCoin.lastUsed = new Date();
        }

        await wallet.save();
      }
    } catch (walletError) {
      console.warn('[PRIVE] Failed to update wallet:', walletError);
    }

    return res.status(200).json({
      success: true,
      data: {
        streak: newStreak,
        coinsEarned: baseCoins,
        bonusEarned: bonusCoins,
        totalEarned: totalCoins,
        message: getStreakMessage(newStreak),
      },
    });
  } catch (error: any) {
    console.error('[PRIVE] Error checking in:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check in',
      message: error.message,
    });
  }
};

/**
 * GET /api/prive/habit-loops
 * Get daily habit loops with progress
 */
export const getHabitLoops = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Get today's data for each habit loop
    const [ordersToday, reviewsToday, referralsThisWeek, weeklyEarnings] = await Promise.all([
      Order.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: today },
        status: { $in: ['completed', 'delivered'] },
      }).catch(() => 0),
      Review.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: today },
      }).catch(() => 0),
      Referral.countDocuments({
        referrerId: userObjectId,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        status: 'COMPLETED',
      }).catch(() => 0),
      DailyCheckIn.getWeeklyEarnings(userObjectId),
    ]);

    const loops = [
      {
        id: 'smart_spend',
        name: 'Smart Spend',
        icon: '💰',
        completed: ordersToday > 0,
        progress: Math.min(ordersToday * 50, 100),
      },
      {
        id: 'influence',
        name: 'Influence',
        icon: '📢',
        completed: reviewsToday > 0,
        progress: Math.min(reviewsToday * 50, 100),
      },
      {
        id: 'redemption_pride',
        name: 'Redemption',
        icon: '🎁',
        completed: false, // Would need coin spending tracking
        progress: 30,
      },
      {
        id: 'network',
        name: 'Network',
        icon: '🔗',
        completed: referralsThisWeek > 0,
        progress: Math.min(referralsThisWeek * 25, 100),
      },
    ];

    return res.status(200).json({
      success: true,
      data: {
        loops,
        weeklyEarnings,
      },
    });
  } catch (error: any) {
    console.error('[PRIVE] Error getting habit loops:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get habit loops',
      message: error.message,
    });
  }
};

// ==========================================
// Dashboard
// ==========================================

/**
 * GET /api/prive/dashboard
 * Get combined dashboard data
 */
export const getPriveDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // First fetch eligibility to get user's tier
    const eligibility = await reputationService.checkPriveEligibility(userId);
    const userTier = eligibility?.tier || 'building';

    // Fetch all other data in parallel
    const [
      user,
      wallet,
      checkInStatus,
      currentStreak,
      weeklyEarnings,
      featuredOffers,
      activeCampaigns,
      completedCampaigns,
    ] = await Promise.all([
      User.findById(userId).select('fullName profile createdAt').lean(),
      Wallet.findOne({ user: userObjectId }).lean(),
      DailyCheckIn.hasCheckedInToday(userObjectId),
      DailyCheckIn.getCurrentStreak(userObjectId),
      DailyCheckIn.getWeeklyEarnings(userObjectId),
      PriveOffer.findFeaturedOffers(userTier, 3),
      Order.countDocuments({
        userId: userObjectId,
        status: { $in: ['pending', 'processing', 'shipped'] },
      }).catch(() => 0),
      Order.countDocuments({
        userId: userObjectId,
        status: 'delivered',
      }).catch(() => 0),
    ]);

    // Format offers for response
    const formattedOffers = featuredOffers.map((offer: IPriveOffer) => ({
      id: offer._id.toString(),
      brand: offer.brand.name,
      brandLogo: offer.brand.logo,
      title: offer.title,
      subtitle: offer.subtitle,
      reward: offer.reward.displayText,
      expiresIn: calculateExpiresIn(offer.expiresAt),
      isExclusive: offer.isExclusive,
      tierRequired: offer.tierRequired,
    }));

    // Calculate tier progress
    const tierThresholds: Record<string, { min: number; max: number; next: string }> = {
      building: { min: 0, max: 49, next: 'entry' },
      entry: { min: 50, max: 69, next: 'signature' },
      signature: { min: 70, max: 84, next: 'elite' },
      elite: { min: 85, max: 100, next: 'elite' },
    };

    const currentTier = eligibility?.tier || 'building';
    const tierInfo = tierThresholds[currentTier] || tierThresholds.building;
    const score = eligibility?.score || 0;
    const tierProgress = (score - tierInfo.min) / (tierInfo.max - tierInfo.min + 1);
    const pointsToNext = Math.max(0, (tierThresholds[tierInfo.next]?.min || 100) - score);

    // Generate member ID from user ID
    const memberId = `${userId.slice(-4).toUpperCase()} ${Math.floor(Math.random() * 9000 + 1000)} ${Math.floor(Math.random() * 9000 + 1000)} ${Math.floor(Math.random() * 9000 + 1000)}`;

    // Format dates
    const memberSince = user?.createdAt
      ? new Date(user.createdAt).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })
      : '01/24';
    const validThru = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      month: '2-digit',
      year: '2-digit',
    });

    // Build response
    const dashboard = {
      eligibility: {
        isEligible: eligibility?.isEligible || false,
        score: eligibility?.score || 0,
        tier: eligibility?.tier || 'building',
        trustScore: eligibility?.trustScore || 0,
        pillars: eligibility?.pillars || [],
        accessState: score >= 70 ? 'active' : score >= 50 ? 'building' : 'building',
      },
      coins: (() => {
        // Extract coin balances from wallet
        const rezCoin = wallet?.coins?.find((c: any) => c.type === 'rez');
        const priveCoin = wallet?.coins?.find((c: any) => c.type === 'prive');
        const brandedTotal = (wallet?.brandedCoins || []).reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

        return {
          total: wallet?.balance?.total || 0,
          rez: rezCoin?.amount || wallet?.balance?.available || 0,
          prive: priveCoin?.amount || 0,
          branded: brandedTotal,
          brandedBreakdown: (wallet?.brandedCoins || []).map((c: any) => ({
            brandId: c.merchantId?.toString(),
            brandName: c.merchantName,
            amount: c.amount,
          })),
        };
      })(),
      dailyProgress: {
        isCheckedIn: checkInStatus,
        streak: currentStreak,
        weeklyEarnings,
        loops: [
          { id: 'smart_spend', name: 'Smart Spend', icon: '💰', completed: true, progress: 100 },
          { id: 'influence', name: 'Influence', icon: '📢', completed: false, progress: 60 },
          { id: 'redemption_pride', name: 'Redemption', icon: '🎁', completed: false, progress: 30 },
          { id: 'network', name: 'Network', icon: '🔗', completed: true, progress: 100 },
        ],
      },
      highlights: {
        curatedOffer: {
          id: 'offer1',
          type: 'offer',
          icon: '🎁',
          title: formattedOffers[0]?.title || 'Up to 40% at StyleHub',
          subtitle: 'Privé members only',
          badge: 'Limited',
          badgeColor: '#E91E63',
        },
        nearbyStore: {
          id: 'store1',
          type: 'store',
          icon: '📍',
          title: 'Café Artisan - 0.5km',
          subtitle: '25% Privé bonus today',
          badge: 'Nearby',
          badgeColor: '#4CAF50',
        },
        opportunity: {
          id: 'campaign1',
          type: 'campaign',
          icon: '📢',
          title: 'Brand Campaign',
          subtitle: 'Earn 500 Privé Coins',
          badge: 'New',
          badgeColor: '#FF9800',
        },
      },
      featuredOffers: formattedOffers,
      stats: {
        activeCampaigns,
        completedCampaigns,
        avgRating: 4.9,
      },
      user: {
        name: user?.fullName ||
              (user?.profile?.firstName && user?.profile?.lastName
                ? `${user.profile.firstName} ${user.profile.lastName}`
                : user?.profile?.firstName || 'Privé Member'),
        memberId,
        memberSince,
        validThru,
        tierProgress: Math.min(tierProgress, 1),
        pointsToNext,
        nextTier: tierInfo.next,
      },
    };

    return res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error: any) {
    console.error('[PRIVE] Error getting dashboard:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get dashboard',
      message: error.message,
    });
  }
};

// ==========================================
// Offers
// ==========================================

/**
 * GET /api/prive/offers
 * Get Privé exclusive offers
 */
export const getPriveOffers = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { page = 1, limit = 10, category, tier: tierFilter } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    // Get user's tier
    const eligibility = await reputationService.checkPriveEligibility(userId);
    const userTier = eligibility?.tier || 'building';

    // Build query
    const now = new Date();
    const query: any = {
      isActive: true,
      startsAt: { $lte: now },
      expiresAt: { $gte: now },
    };

    // Filter by accessible tiers
    const tierHierarchy: Record<string, number> = {
      building: 0,
      entry: 1,
      signature: 2,
      elite: 3,
    };
    const userTierLevel = tierHierarchy[userTier] ?? 0;
    const accessibleTiers = Object.keys(tierHierarchy).filter(
      (t) => tierHierarchy[t] <= userTierLevel
    );
    query.tierRequired = { $in: accessibleTiers };

    if (category) {
      query.category = category;
    }

    // Get total count
    const total = await PriveOffer.countDocuments(query);

    // Get offers with pagination
    const offers = await PriveOffer.find(query)
      .sort({ priority: -1, isFeatured: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Format offers
    const formattedOffers = offers.map((offer: any) => ({
      id: offer._id.toString(),
      brand: offer.brand.name,
      brandLogo: offer.brand.logo,
      title: offer.title,
      subtitle: offer.subtitle,
      description: offer.description,
      reward: offer.reward.displayText,
      rewardValue: offer.reward.value,
      rewardType: offer.reward.type,
      coinType: offer.reward.coinType,
      expiresIn: calculateExpiresIn(offer.expiresAt),
      expiresAt: offer.expiresAt,
      isExclusive: offer.isExclusive,
      tierRequired: offer.tierRequired,
      images: offer.images,
      terms: offer.terms,
    }));

    return res.status(200).json({
      success: true,
      data: {
        offers: formattedOffers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error('[PRIVE] Error getting offers:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get offers',
      message: error.message,
    });
  }
};

/**
 * GET /api/prive/offers/:id
 * Get single Privé offer by ID
 */
export const getPriveOfferById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid offer ID',
      });
    }

    const offer = await PriveOffer.findById(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found',
      });
    }

    // Increment views
    offer.views += 1;
    await offer.save();

    return res.status(200).json({
      success: true,
      data: {
        id: offer._id.toString(),
        brand: offer.brand.name,
        brandLogo: offer.brand.logo,
        title: offer.title,
        subtitle: offer.subtitle,
        description: offer.description,
        reward: offer.reward.displayText,
        rewardValue: offer.reward.value,
        rewardType: offer.reward.type,
        coinType: offer.reward.coinType,
        expiresIn: calculateExpiresIn(offer.expiresAt),
        expiresAt: offer.expiresAt,
        isExclusive: offer.isExclusive,
        tierRequired: offer.tierRequired,
        images: offer.images,
        coverImage: offer.coverImage,
        terms: offer.terms,
        howToRedeem: offer.howToRedeem,
        redemptions: offer.redemptions,
        totalLimit: offer.totalLimit,
      },
    });
  } catch (error: any) {
    console.error('[PRIVE] Error getting offer:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get offer',
      message: error.message,
    });
  }
};

/**
 * POST /api/prive/offers/:id/click
 * Track offer click for analytics
 */
export const trackOfferClick = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid offer ID',
      });
    }

    await PriveOffer.findByIdAndUpdate(id, {
      $inc: { clicks: 1 },
    });

    return res.status(200).json({
      success: true,
      message: 'Click tracked',
    });
  } catch (error: any) {
    console.error('[PRIVE] Error tracking click:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to track click',
      message: error.message,
    });
  }
};

// ==========================================
// Highlights
// ==========================================

/**
 * GET /api/prive/highlights
 * Get today's personalized highlights
 */
export const getPriveHighlights = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Get user's tier for personalization
    const eligibility = await reputationService.checkPriveEligibility(userId);
    const userTier = eligibility?.tier || 'building';

    // Get a featured offer for the user
    const featuredOffers = await PriveOffer.findFeaturedOffers(userTier, 1);
    const curatedOffer = featuredOffers[0];

    const highlights = {
      curatedOffer: curatedOffer
        ? {
            id: curatedOffer._id.toString(),
            type: 'offer' as const,
            icon: '🎁',
            title: curatedOffer.title,
            subtitle: curatedOffer.subtitle,
            badge: curatedOffer.isExclusive ? 'Exclusive' : 'Featured',
            badgeColor: '#E91E63',
          }
        : {
            id: 'offer1',
            type: 'offer' as const,
            icon: '🎁',
            title: 'Up to 40% at StyleHub',
            subtitle: 'Privé members only',
            badge: 'Limited',
            badgeColor: '#E91E63',
          },
      nearbyStore: {
        id: 'store1',
        type: 'store' as const,
        icon: '📍',
        title: 'Café Artisan - 0.5km',
        subtitle: '25% Privé bonus today',
        badge: 'Nearby',
        badgeColor: '#4CAF50',
      },
      opportunity: {
        id: 'campaign1',
        type: 'campaign' as const,
        icon: '📢',
        title: 'Brand Campaign',
        subtitle: 'Earn 500 Privé Coins',
        badge: 'New',
        badgeColor: '#FF9800',
      },
    };

    return res.status(200).json({
      success: true,
      data: highlights,
    });
  } catch (error: any) {
    console.error('[PRIVE] Error getting highlights:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get highlights',
      message: error.message,
    });
  }
};
