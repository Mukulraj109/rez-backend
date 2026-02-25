import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { Wallet } from '../../models/Wallet';
import { User } from '../../models/User';
import { TransactionAuditLog, logTransaction } from '../../models/TransactionAuditLog';
import mongoose from 'mongoose';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/user-wallets
 * @desc    Search user wallets
 * @access  Admin
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));

    let userQuery: any = {};
    if (search) {
      userQuery = {
        $or: [
          { phoneNumber: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ]
      };
    }

    const users = await User.find(userQuery)
      .select('phoneNumber fullName email profile.avatar')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const userIds = users.map(u => u._id);
    const wallets = await Wallet.find({ user: { $in: userIds } }).lean();
    const walletMap = new Map(wallets.map(w => [w.user.toString(), w]));

    const results = users.map(u => ({
      user: u,
      wallet: walletMap.get(u._id.toString()) || null,
    }));

    const total = await User.countDocuments(userQuery);

    res.json({
      success: true,
      data: {
        users: results,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to search user wallets' });
  }
});

/**
 * @route   POST /api/admin/user-wallets/:userId/freeze
 * @desc    Freeze a user's wallet
 * @access  Admin
 */
router.post('/:userId/freeze', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Reason is required to freeze a wallet' });
    }

    const wallet = await Wallet.findOneAndUpdate(
      { user: req.params.userId },
      { isFrozen: true, frozenReason: reason.trim(), frozenAt: new Date() },
      { new: true }
    );

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    logTransaction({
      userId: new mongoose.Types.ObjectId(req.params.userId),
      walletId: wallet._id as mongoose.Types.ObjectId,
      walletType: 'user',
      operation: 'adjustment',
      amount: 0,
      balanceBefore: { total: wallet.balance.total, available: wallet.balance.available, pending: 0, cashback: 0 },
      balanceAfter: { total: wallet.balance.total, available: wallet.balance.available, pending: 0, cashback: 0 },
      reference: { type: 'other', description: `Wallet FROZEN by admin: ${reason.trim()}` },
      metadata: { source: 'admin', adminUserId: String((req as any).userId) },
    });

    res.json({ success: true, message: 'Wallet frozen', data: { isFrozen: true } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to freeze wallet' });
  }
});

/**
 * @route   POST /api/admin/user-wallets/:userId/unfreeze
 * @desc    Unfreeze a user's wallet
 * @access  Admin
 */
router.post('/:userId/unfreeze', async (req: Request, res: Response) => {
  try {
    const wallet = await Wallet.findOneAndUpdate(
      { user: req.params.userId },
      { isFrozen: false, frozenReason: null, frozenAt: null },
      { new: true }
    );

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    logTransaction({
      userId: new mongoose.Types.ObjectId(req.params.userId),
      walletId: wallet._id as mongoose.Types.ObjectId,
      walletType: 'user',
      operation: 'adjustment',
      amount: 0,
      balanceBefore: { total: wallet.balance.total, available: wallet.balance.available, pending: 0, cashback: 0 },
      balanceAfter: { total: wallet.balance.total, available: wallet.balance.available, pending: 0, cashback: 0 },
      reference: { type: 'other', description: 'Wallet UNFROZEN by admin' },
      metadata: { source: 'admin', adminUserId: String((req as any).userId) },
    });

    res.json({ success: true, message: 'Wallet unfrozen', data: { isFrozen: false } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to unfreeze wallet' });
  }
});

/**
 * @route   POST /api/admin/user-wallets/:userId/adjust
 * @desc    Manual credit/debit adjustment with audit reason
 * @access  Admin (super_admin recommended)
 */
router.post('/:userId/adjust', async (req: Request, res: Response) => {
  try {
    const { amount, type, reason } = req.body;
    if (!amount || !type || !reason?.trim()) {
      return res.status(400).json({ success: false, message: 'Amount, type (credit/debit), and reason are required' });
    }
    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be "credit" or "debit"' });
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 100000) {
      return res.status(400).json({ success: false, message: 'Amount must be between 0 and 100,000 NC' });
    }

    const wallet = await Wallet.findOne({ user: req.params.userId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const balanceBefore = {
      total: wallet.balance.total,
      available: wallet.balance.available,
      pending: 0,
      cashback: 0,
    };

    const incAmount = type === 'credit' ? parsedAmount : -parsedAmount;

    const updated = await Wallet.findOneAndUpdate(
      {
        _id: wallet._id,
        ...(type === 'debit' ? { 'balance.available': { $gte: parsedAmount } } : {}),
      },
      {
        $inc: {
          'balance.available': incAmount,
          'balance.total': incAmount,
        },
        $set: { lastTransactionAt: new Date() }
      },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({ success: false, message: 'Insufficient balance for debit' });
    }

    logTransaction({
      userId: new mongoose.Types.ObjectId(req.params.userId),
      walletId: wallet._id as mongoose.Types.ObjectId,
      walletType: 'user',
      operation: type === 'credit' ? 'credit' : 'debit',
      amount: parsedAmount,
      balanceBefore,
      balanceAfter: { total: updated.balance.total, available: updated.balance.available, pending: 0, cashback: 0 },
      reference: { type: 'adjustment', description: `Admin adjustment: ${reason.trim()}` },
      metadata: { source: 'admin', adminUserId: String((req as any).userId) },
    });

    res.json({
      success: true,
      message: `${type === 'credit' ? 'Credited' : 'Debited'} ${parsedAmount} NC`,
      data: { balance: updated.balance }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to adjust wallet' });
  }
});

/**
 * @route   GET /api/admin/user-wallets/:userId/audit-trail
 * @desc    Get audit trail for a user's wallet
 * @access  Admin
 */
router.get('/:userId/audit-trail', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));

    const [logs, total] = await Promise.all([
      TransactionAuditLog.find({ userId: req.params.userId })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      TransactionAuditLog.countDocuments({ userId: req.params.userId }),
    ]);

    res.json({
      success: true,
      data: {
        auditLogs: logs,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch audit trail' });
  }
});

export default router;
