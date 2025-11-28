import { Request, Response } from 'express';
import stockAuditService from '../services/stockAuditService';
import { StockChangeType } from '../models/StockHistory';

/**
 * Get stock history for a product
 */
export const getProductStockHistory = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const {
      variantType,
      variantValue,
      startDate,
      endDate,
      changeTypes,
      limit,
      skip
    } = req.query;

    const filters: any = {};

    if (variantType && variantValue) {
      filters.variant = {
        type: variantType as string,
        value: variantValue as string
      };
    }

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    if (changeTypes) {
      filters.changeTypes = (changeTypes as string).split(',') as StockChangeType[];
    }

    if (limit) {
      filters.limit = parseInt(limit as string);
    }

    if (skip) {
      filters.skip = parseInt(skip as string);
    }

    const history = await stockAuditService.getStockHistory(productId, filters);

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('Error fetching product stock history:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch stock history'
    });
  }
};

/**
 * Get stock snapshot at a specific date
 */
export const getStockSnapshot = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { date, variantType, variantValue } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    const snapshotDate = new Date(date as string);

    let variant;
    if (variantType && variantValue) {
      variant = {
        type: variantType as string,
        value: variantValue as string
      };
    }

    const stock = await stockAuditService.getStockSnapshot(productId, snapshotDate, variant);

    res.json({
      success: true,
      data: {
        productId,
        date: snapshotDate,
        variant,
        stock
      }
    });
  } catch (error) {
    console.error('Error fetching stock snapshot:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch stock snapshot'
    });
  }
};

/**
 * Detect stock anomalies for a store
 */
export const detectStockAnomalies = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { days, threshold } = req.query;

    const options: any = {};

    if (days) {
      options.days = parseInt(days as string);
    }

    if (threshold) {
      options.threshold = parseInt(threshold as string);
    }

    const anomalies = await stockAuditService.detectAnomalies(storeId, options);

    res.json({
      success: true,
      data: anomalies,
      count: anomalies.length
    });
  } catch (error) {
    console.error('Error detecting stock anomalies:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to detect anomalies'
    });
  }
};

/**
 * Generate stock report for a date range
 */
export const generateStockReport = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const report = await stockAuditService.generateStockReport(storeId, start, end);

    res.json({
      success: true,
      data: {
        storeId,
        startDate: start,
        endDate: end,
        report
      }
    });
  } catch (error) {
    console.error('Error generating stock report:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate stock report'
    });
  }
};

/**
 * Get stock movement summary for a product
 */
export const getStockMovementSummary = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { startDate, endDate, variantType, variantValue } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    let variant;
    if (variantType && variantValue) {
      variant = {
        type: variantType as string,
        value: variantValue as string
      };
    }

    const summary = await stockAuditService.getStockMovementSummary(
      productId,
      start,
      end,
      variant
    );

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching stock movement summary:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch stock movement summary'
    });
  }
};

/**
 * Get low stock alerts for a store
 */
export const getLowStockAlerts = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { threshold } = req.query;

    const alertThreshold = threshold ? parseInt(threshold as string) : 10;

    const alerts = await stockAuditService.getLowStockAlerts(storeId, alertThreshold);

    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch low stock alerts'
    });
  }
};

/**
 * Get stock value over time for a store
 */
export const getStockValueOverTime = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { startDate, endDate, interval } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const timeInterval = (interval as 'day' | 'week' | 'month') || 'day';

    const valueOverTime = await stockAuditService.getStockValueOverTime(
      storeId,
      start,
      end,
      timeInterval
    );

    res.json({
      success: true,
      data: {
        storeId,
        startDate: start,
        endDate: end,
        interval: timeInterval,
        data: valueOverTime
      }
    });
  } catch (error) {
    console.error('Error fetching stock value over time:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch stock value over time'
    });
  }
};
