/**
 * Privé Controller
 *
 * Handles Privé eligibility and reputation endpoints
 */

import { Request, Response } from 'express';
import { reputationService } from '../services/reputationService';
import { UserReputation } from '../models/UserReputation';

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
