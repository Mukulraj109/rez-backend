// Referral Controller
// Handles referral program API endpoints

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import referralService from '../services/referralService';
import { User } from '../models/User';

/**
 * Get user's referral statistics
 * GET /api/user/referral/stats
 */
export const getReferralStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    // Get stats from referral service
    const stats = await referralService.getReferralStats(new Types.ObjectId(userId));

    // Get user's referral code
    const user = await User.findById(userId).select('referral.referralCode');
    const referralCode = user?.referral?.referralCode || '';

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        referralCode,
      },
    });
  } catch (error: any) {
    console.error('❌ [REFERRAL CONTROLLER] Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral statistics',
      error: error.message,
    });
  }
};

/**
 * Get user's referral history
 * GET /api/user/referral/history
 */
export const getReferralHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const history = await referralService.getReferralHistory(new Types.ObjectId(userId));

    res.status(200).json({
      success: true,
      data: {
        referrals: history,
        total: history.length,
      },
    });
  } catch (error: any) {
    console.error('❌ [REFERRAL CONTROLLER] Error getting history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral history',
      error: error.message,
    });
  }
};

/**
 * Validate a referral code
 * POST /api/user/referral/validate-code
 * Body: { code: string }
 */
export const validateReferralCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;

    if (!code) {
      res.status(400).json({
        success: false,
        message: 'Referral code is required',
      });
      return;
    }

    const result = await referralService.validateReferralCode(code.toUpperCase());

    if (!result.valid) {
      res.status(404).json({
        success: false,
        message: 'Invalid referral code',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Valid referral code',
      data: result.referrer,
    });
  } catch (error: any) {
    console.error('❌ [REFERRAL CONTROLLER] Error validating code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate referral code',
      error: error.message,
    });
  }
};

/**
 * Track referral share event
 * POST /api/user/referral/track-share
 * Body: { shareMethod: string }
 */
export const trackShare = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { shareMethod } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    if (!shareMethod) {
      res.status(400).json({
        success: false,
        message: 'Share method is required',
      });
      return;
    }

    await referralService.trackShare(new Types.ObjectId(userId), shareMethod);

    res.status(200).json({
      success: true,
      message: 'Share event tracked',
    });
  } catch (error: any) {
    console.error('❌ [REFERRAL CONTROLLER] Error tracking share:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track share event',
      error: error.message,
    });
  }
};

/**
 * Get referral code for current user
 * GET /api/user/referral/code
 */
export const getReferralCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const user = await User.findById(userId).select('referral.referralCode name phone');

    if (!user || !user.referral?.referralCode) {
      res.status(404).json({
        success: false,
        message: 'Referral code not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        referralCode: user.referral.referralCode,
        referralLink: `https://rezapp.com/invite/${user.referral.referralCode}`,
        shareMessage: `Join me on REZ App and get ₹30 off on your first order! Use my referral code: ${user.referral.referralCode}\n\nDownload now: https://rezapp.com/invite/${user.referral.referralCode}`,
      },
    });
  } catch (error: any) {
    console.error('❌ [REFERRAL CONTROLLER] Error getting referral code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get referral code',
      error: error.message,
    });
  }
};
