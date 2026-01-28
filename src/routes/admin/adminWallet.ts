import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import adminWalletService from '../../services/adminWalletService';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/wallet
 * @desc    Get admin wallet summary (balance + statistics)
 * @access  Admin
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const summary = await adminWalletService.getWalletSummary();
    res.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('[ADMIN WALLET] Error fetching summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch admin wallet summary'
    });
  }
});

/**
 * @route   GET /api/admin/wallet/transactions
 * @desc    Get paginated transaction history with optional date filters
 * @access  Admin
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await adminWalletService.getTransactionHistory(page, limit, startDate, endDate);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[ADMIN WALLET] Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transactions'
    });
  }
});

/**
 * @route   GET /api/admin/wallet/daily-breakdown
 * @desc    Get daily commission breakdown for charts
 * @access  Admin
 */
router.get('/daily-breakdown', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const result = await adminWalletService.getDailyBreakdown(days);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[ADMIN WALLET] Error fetching daily breakdown:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch daily breakdown'
    });
  }
});

export default router;
