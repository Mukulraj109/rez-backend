/**
 * Price Tracking Controller
 *
 * Handles price history and price alert operations:
 * - Get price history for products
 * - Create price alerts
 * - Manage price alert subscriptions
 * - Get price statistics and trends
 */

import { Request, Response } from 'express';
import PriceHistory from '../models/PriceHistory';
import PriceAlert from '../models/PriceAlert';
import { Product } from '../models/Product';

/**
 * Get price history for a product
 * GET /api/price-tracking/history/:productId
 */
export const getPriceHistory = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { variantId, limit = '30', startDate, endDate } = req.query;

    console.log('📊 [PriceTracking] Fetching price history:', { productId, variantId });

    const history = await PriceHistory.getProductHistory(productId, variantId as string, {
      limit: parseInt(limit as string),
      startDate: startDate as string,
      endDate: endDate as string,
    });

    res.json({
      success: true,
      data: {
        history,
        count: history.length,
      },
    });
  } catch (error: any) {
    console.error('❌ [PriceTracking] Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch price history',
      error: error.message,
    });
  }
};

/**
 * Get price statistics for a product
 * GET /api/price-tracking/stats/:productId
 */
export const getPriceStats = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { variantId, days = '30' } = req.query;

    console.log('📈 [PriceTracking] Fetching price stats:', { productId, variantId, days });

    const [latest, lowest, highest, average, trend] = await Promise.all([
      PriceHistory.getLatestPrice(productId, variantId as string),
      PriceHistory.getLowestPrice(productId, variantId as string, parseInt(days as string)),
      PriceHistory.getHighestPrice(productId, variantId as string, parseInt(days as string)),
      PriceHistory.getAveragePrice(productId, variantId as string, parseInt(days as string)),
      PriceHistory.getPriceTrend(productId, variantId as string, parseInt(days as string)),
    ]);

    res.json({
      success: true,
      data: {
        latest: latest?.price,
        lowest: lowest?.price,
        highest: highest?.price,
        average: average
          ? {
              salePrice: Math.round(average.avgPrice),
              basePrice: Math.round(average.avgBasePrice),
            }
          : null,
        trend,
        period: `${days} days`,
      },
    });
  } catch (error: any) {
    console.error('❌ [PriceTracking] Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch price statistics',
      error: error.message,
    });
  }
};

/**
 * Create a price alert
 * POST /api/price-tracking/alerts
 */
export const createPriceAlert = async (req: Request, res: Response) => {
  try {
    const {
      productId,
      variantId,
      alertType,
      targetPrice,
      percentageDrop,
      notificationMethod,
      contact,
    } = req.body;
    const userId = (req as any).user._id;

    // Validation
    if (!productId || !alertType) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and alert type are required',
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if user already has an active alert
    const hasActive = await PriceAlert.hasActiveAlert(userId, productId, variantId);
    if (hasActive) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active price alert for this product',
      });
    }

    // Get current price
    let currentPrice = 0;
    if (variantId && product.inventory?.variants) {
      const variant = product.inventory.variants.find((v: any) => v._id.toString() === variantId);
      if (variant) {
        currentPrice = variant.pricing?.salePrice || variant.pricing?.basePrice || 0;
      }
    } else {
      currentPrice = product.pricing?.salePrice || product.pricing?.basePrice || 0;
    }

    // Create alert
    const alert = new PriceAlert({
      userId,
      productId,
      variantId: variantId || null,
      alertType,
      targetPrice: alertType === 'target_price' ? targetPrice : undefined,
      percentageDrop: alertType === 'percentage_drop' ? percentageDrop : undefined,
      currentPriceAtCreation: currentPrice,
      notificationMethod: notificationMethod || ['push'],
      contact: {
        email: contact?.email || (req as any).user.email,
        phone: contact?.phone || (req as any).user.phone,
      },
      metadata: {
        productName: product.name,
        productImage: product.images?.[0]?.url || product.images?.[0],
        variantAttributes: variantId
          ? product.inventory?.variants?.find((v: any) => v._id.toString() === variantId)?.attributes
          : null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    await alert.save();

    console.log('🔔 [PriceAlert] Created alert:', {
      userId,
      productId,
      alertType,
      targetPrice,
      percentageDrop,
    });

    res.status(201).json({
      success: true,
      message: 'Price alert created successfully',
      data: {
        alertId: alert._id,
        expiresAt: (alert as any).expiresAt,
        daysUntilExpiration: (alert as any).daysUntilExpiration,
      },
    });
  } catch (error: any) {
    console.error('❌ [PriceAlert] Create error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create price alert',
      error: error.message,
    });
  }
};

/**
 * Get user's price alerts
 * GET /api/price-tracking/alerts/my-alerts
 */
export const getMyAlerts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user._id;
    const { page = '1', limit = '20', status } = req.query;

    const alerts = await PriceAlert.getUserAlerts(userId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      status: status as string,
    });

    // Count total for pagination
    const query: any = { userId };
    if (status) query.status = status;
    const total = await PriceAlert.countDocuments(query);

    res.json({
      success: true,
      data: {
        alerts,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('❌ [PriceAlert] Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: error.message,
    });
  }
};

/**
 * Check if user has active alert for product
 * GET /api/price-tracking/alerts/check/:productId
 */
export const checkAlert = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { variantId } = req.query;
    const userId = (req as any).user._id;

    const hasActive = await PriceAlert.hasActiveAlert(userId, productId, (variantId as string) || null);

    res.json({
      success: true,
      data: {
        hasActiveAlert: hasActive,
      },
    });
  } catch (error: any) {
    console.error('❌ [PriceAlert] Check alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check alert status',
      error: error.message,
    });
  }
};

/**
 * Cancel a price alert
 * DELETE /api/price-tracking/alerts/:alertId
 */
export const cancelAlert = async (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const userId = (req as any).user._id;

    const alert = await PriceAlert.findOne({
      _id: alertId,
      userId,
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found',
      });
    }

    if ((alert as any).status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel alert with status: ${(alert as any).status}`,
      });
    }

    await (alert as any).cancel();

    console.log('🔕 [PriceAlert] Alert cancelled:', alertId);

    res.json({
      success: true,
      message: 'Alert cancelled successfully',
    });
  } catch (error: any) {
    console.error('❌ [PriceAlert] Cancel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel alert',
      error: error.message,
    });
  }
};

/**
 * Get alert statistics for a product (Admin/Store)
 * GET /api/price-tracking/alerts/stats/:productId
 */
export const getAlertStats = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    // TODO: Add authorization check (admin or store owner)

    const stats = await PriceAlert.getProductStats(productId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('❌ [PriceAlert] Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alert statistics',
      error: error.message,
    });
  }
};

/**
 * Record price change (System endpoint)
 * POST /api/price-tracking/record-price
 */
export const recordPriceChange = async (req: Request, res: Response) => {
  try {
    const { productId, variantId, price, source = 'system' } = req.body;

    console.log('📊 [PriceTracking] Recording price change:', { productId, variantId, price });

    // Record price in history
    const history = await PriceHistory.recordPriceChange({
      productId,
      variantId,
      price,
      source,
    });

    // Check and trigger price alerts if price decreased
    let triggeredAlerts: any[] = [];
    if ((history as any).changeType === 'decrease') {
      triggeredAlerts = await PriceAlert.checkAndTriggerAlerts(productId, variantId, price.salePrice);
    }

    res.json({
      success: true,
      message: 'Price change recorded',
      data: {
        historyId: history._id,
        changeType: (history as any).changeType,
        changeAmount: (history as any).changeAmount,
        triggeredAlerts: triggeredAlerts.length,
      },
    });
  } catch (error: any) {
    console.error('❌ [PriceTracking] Record price error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record price change',
      error: error.message,
    });
  }
};

/**
 * Cleanup old data (Cron job endpoint)
 * POST /api/price-tracking/cleanup
 */
export const cleanupOldData = async (req: Request, res: Response) => {
  try {
    const [historyCleanup, alertsExpired] = await Promise.all([
      PriceHistory.cleanupOldHistory(90), // Keep 90 days
      PriceAlert.expireOldAlerts(),
    ]);

    console.log('🧹 [PriceTracking] Cleanup complete:', {
      historyDeleted: historyCleanup,
      alertsExpired,
    });

    res.json({
      success: true,
      message: 'Cleanup completed',
      data: {
        historyDeleted: historyCleanup,
        alertsExpired,
      },
    });
  } catch (error: any) {
    console.error('❌ [PriceTracking] Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup',
      error: error.message,
    });
  }
};
