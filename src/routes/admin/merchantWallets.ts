import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { MerchantWallet } from '../../models/MerchantWallet';
import merchantWalletService from '../../services/merchantWalletService';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/merchant-wallets
 * @desc    Get all merchant wallets with balances
 * @access  Admin
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sortBy = (req.query.sortBy as string) || 'statistics.totalSales';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const result = await merchantWalletService.getAllWallets(page, limit, sortBy, sortOrder);

    res.json({
      success: true,
      data: {
        wallets: result.wallets,
        pagination: result.pagination
      }
    });
  } catch (error: any) {
    console.error('❌ [ADMIN MERCHANT WALLETS] Error fetching wallets:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch merchant wallets'
    });
  }
});

/**
 * @route   GET /api/admin/merchant-wallets/stats
 * @desc    Get platform-wide wallet statistics
 * @access  Admin
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await merchantWalletService.getPlatformStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('❌ [ADMIN MERCHANT WALLETS] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch platform stats'
    });
  }
});

/**
 * @route   GET /api/admin/merchant-wallets/:merchantId
 * @desc    Get single merchant wallet details
 * @access  Admin
 */
router.get('/:merchantId', async (req: Request, res: Response) => {
  try {
    const wallet = await MerchantWallet.findOne({ merchant: req.params.merchantId })
      .populate('merchant', 'profile.firstName profile.lastName phoneNumber email')
      .populate('store', 'name logo address');

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Merchant wallet not found'
      });
    }

    res.json({
      success: true,
      data: wallet
    });
  } catch (error: any) {
    console.error('❌ [ADMIN MERCHANT WALLETS] Error fetching wallet:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch merchant wallet'
    });
  }
});

/**
 * @route   GET /api/admin/merchant-wallets/:merchantId/transactions
 * @desc    Get merchant wallet transaction history
 * @access  Admin
 */
router.get('/:merchantId/transactions', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as 'credit' | 'debit' | 'withdrawal' | 'refund' | 'adjustment' | undefined;

    const result = await merchantWalletService.getTransactionHistory(
      req.params.merchantId,
      page,
      limit,
      type
    );

    res.json({
      success: true,
      data: result.transactions,
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error('❌ [ADMIN MERCHANT WALLETS] Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch transaction history'
    });
  }
});

/**
 * @route   POST /api/admin/merchant-wallets/:merchantId/process-withdrawal
 * @desc    Process a pending withdrawal request
 * @access  Admin
 */
router.post('/:merchantId/process-withdrawal', async (req: Request, res: Response) => {
  try {
    const { transactionId, transactionReference } = req.body;

    if (!transactionId || !transactionReference) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID and reference are required'
      });
    }

    await merchantWalletService.processWithdrawal(
      req.params.merchantId,
      transactionId,
      transactionReference
    );

    res.json({
      success: true,
      message: 'Withdrawal processed successfully'
    });
  } catch (error: any) {
    console.error('❌ [ADMIN MERCHANT WALLETS] Error processing withdrawal:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process withdrawal'
    });
  }
});

/**
 * @route   POST /api/admin/merchant-wallets/:merchantId/verify-bank
 * @desc    Verify merchant bank details
 * @access  Admin
 */
router.post('/:merchantId/verify-bank', async (req: Request, res: Response) => {
  try {
    await merchantWalletService.verifyBankDetails(req.params.merchantId);

    res.json({
      success: true,
      message: 'Bank details verified successfully'
    });
  } catch (error: any) {
    console.error('❌ [ADMIN MERCHANT WALLETS] Error verifying bank:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify bank details'
    });
  }
});

/**
 * @route   GET /api/admin/merchant-wallets/pending-withdrawals
 * @desc    Get all pending withdrawal requests
 * @access  Admin
 */
router.get('/pending-withdrawals', async (_req: Request, res: Response) => {
  try {
    const walletsWithPending = await MerchantWallet.find({
      'balance.pending': { $gt: 0 }
    })
      .populate('merchant', 'profile.firstName profile.lastName phoneNumber email')
      .populate('store', 'name')
      .select('merchant store balance.pending balance.available transactions');

    // Filter to only get pending withdrawal transactions
    const pendingWithdrawals = walletsWithPending.map(wallet => {
      const pendingTransactions = wallet.transactions.filter(
        t => t.type === 'withdrawal' && t.status === 'pending'
      );
      return {
        merchantId: wallet.merchant,
        store: wallet.store,
        pendingAmount: wallet.balance.pending,
        pendingTransactions
      };
    }).filter(w => w.pendingTransactions.length > 0);

    res.json({
      success: true,
      data: pendingWithdrawals
    });
  } catch (error: any) {
    console.error('❌ [ADMIN MERCHANT WALLETS] Error fetching pending withdrawals:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch pending withdrawals'
    });
  }
});

export default router;
