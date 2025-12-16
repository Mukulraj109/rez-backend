// Cashback Controller
// Handles user cashback API endpoints

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import cashbackService from '../services/cashbackService';

/**
 * Get cashback summary
 * GET /api/cashback/summary
 */
export const getCashbackSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    console.log('📊 [CASHBACK CONTROLLER] getCashbackSummary called');
    console.log('📊 [CASHBACK CONTROLLER] userId:', userId);

    if (!userId) {
      console.log('❌ [CASHBACK CONTROLLER] No userId found - unauthorized');
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    console.log('📊 [CASHBACK CONTROLLER] Fetching summary for user:', userId);
    const summary = await cashbackService.getUserSummary(new Types.ObjectId(userId));

    console.log('📊 [CASHBACK CONTROLLER] Summary result:', JSON.stringify(summary, null, 2));

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('❌ [CASHBACK CONTROLLER] Error getting summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cashback summary',
      error: error.message,
    });
  }
};

/**
 * Get cashback history with filters
 * GET /api/cashback/history
 */
export const getCashbackHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { status, source, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const filters: any = {};
    if (status) filters.status = status;
    if (source) filters.source = source;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);

    const result = await cashbackService.getUserCashbackHistory(
      new Types.ObjectId(userId),
      filters,
      Number(page),
      Number(limit)
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('❌ [CASHBACK CONTROLLER] Error getting history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cashback history',
      error: error.message,
    });
  }
};

/**
 * Get pending cashback ready for credit
 * GET /api/cashback/pending
 */
export const getPendingCashback = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const cashbacks = await cashbackService.getPendingReadyForCredit(
      new Types.ObjectId(userId)
    );

    const totalAmount = cashbacks.reduce((sum, cb) => sum + cb.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        cashbacks,
        totalAmount,
        count: cashbacks.length,
      },
    });
  } catch (error: any) {
    console.error('❌ [CASHBACK CONTROLLER] Error getting pending:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending cashback',
      error: error.message,
    });
  }
};

/**
 * Get expiring soon cashback
 * GET /api/cashback/expiring-soon
 */
export const getExpiringSoon = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { days = 7 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const cashbacks = await cashbackService.getExpiringSoon(
      new Types.ObjectId(userId),
      Number(days)
    );

    const totalAmount = cashbacks.reduce((sum, cb) => sum + cb.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        cashbacks,
        totalAmount,
        count: cashbacks.length,
      },
    });
  } catch (error: any) {
    console.error('❌ [CASHBACK CONTROLLER] Error getting expiring soon:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get expiring cashback',
      error: error.message,
    });
  }
};

/**
 * Redeem pending cashback
 * POST /api/cashback/redeem
 */
export const redeemCashback = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const result = await cashbackService.redeemPendingCashback(
      new Types.ObjectId(userId)
    );

    if (result.count === 0) {
      res.status(400).json({
        success: false,
        message: 'No cashback available for redemption',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Successfully redeemed ₹${result.totalAmount} cashback`,
      data: result,
    });
  } catch (error: any) {
    console.error('❌ [CASHBACK CONTROLLER] Error redeeming cashback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to redeem cashback',
      error: error.message,
    });
  }
};

/**
 * Get active cashback campaigns
 * GET /api/cashback/campaigns
 */
export const getCashbackCampaigns = async (req: Request, res: Response): Promise<void> => {
  try {
    const campaigns = await cashbackService.getActiveCampaigns();

    res.status(200).json({
      success: true,
      data: { campaigns },
    });
  } catch (error: any) {
    console.error('❌ [CASHBACK CONTROLLER] Error getting campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cashback campaigns',
      error: error.message,
    });
  }
};

/**
 * Forecast cashback for cart
 * POST /api/cashback/forecast
 */
export const forecastCashback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cartData } = req.body;

    if (!cartData || !cartData.items || !cartData.subtotal) {
      res.status(400).json({
        success: false,
        message: 'Cart data with items and subtotal is required',
      });
      return;
    }

    const forecast = await cashbackService.forecastCashbackForCart(cartData);

    res.status(200).json({
      success: true,
      data: forecast,
    });
  } catch (error: any) {
    console.error('❌ [CASHBACK CONTROLLER] Error forecasting cashback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to forecast cashback',
      error: error.message,
    });
  }
};

/**
 * Get cashback statistics
 * GET /api/cashback/statistics
 */
export const getCashbackStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { period = 'month' } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const validPeriods = ['day', 'week', 'month', 'year'];
    if (!validPeriods.includes(period as string)) {
      res.status(400).json({
        success: false,
        message: 'Invalid period. Must be one of: day, week, month, year',
      });
      return;
    }

    const statistics = await cashbackService.getCashbackStatistics(
      new Types.ObjectId(userId),
      period as 'day' | 'week' | 'month' | 'year'
    );

    res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error: any) {
    console.error('❌ [CASHBACK CONTROLLER] Error getting statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cashback statistics',
      error: error.message,
    });
  }
};
