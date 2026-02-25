import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { PartnerEarningsConfig } from '../../models/PartnerEarningsConfig';
import { CoinTransaction } from '../../models/CoinTransaction';
import Partner from '../../models/Partner';
import { Wallet } from '../../models/Wallet';
import mongoose from 'mongoose';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/partner-earnings/analytics
 * @desc    Get partner earnings analytics dashboard data
 * @access  Admin
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    // Use $facet to compute multiple metrics in a single pass
    const [analyticsResult] = await CoinTransaction.aggregate([
      {
        $match: {
          'metadata.partnerEarning': true,
          type: { $in: ['earned', 'bonus', 'refunded'] },
        },
      },
      {
        $facet: {
          // Total by type
          byType: [
            {
              $group: {
                _id: '$metadata.partnerEarningType',
                amount: { $sum: '$amount' },
                count: { $sum: 1 },
              },
            },
          ],
          // Total overall
          totals: [
            {
              $group: {
                _id: null,
                totalAmount: { $sum: '$amount' },
                totalCount: { $sum: 1 },
              },
            },
          ],
          // Monthly trend (last 6 months)
          monthlyTrend: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
                },
              },
            },
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' },
                },
                amount: { $sum: '$amount' },
                count: { $sum: 1 },
              },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
          ],
          // Top 20 earners
          topEarners: [
            {
              $group: {
                _id: '$user',
                totalEarned: { $sum: '$amount' },
                txCount: { $sum: 1 },
              },
            },
            { $sort: { totalEarned: -1 } },
            { $limit: 20 },
          ],
        },
      },
    ]);

    const totals = analyticsResult.totals[0] || { totalAmount: 0, totalCount: 0 };

    // Breakdown by type
    const breakdown: Record<string, { amount: number; count: number }> = {};
    analyticsResult.byType.forEach((item: any) => {
      breakdown[item._id || 'unknown'] = {
        amount: Math.round(item.amount * 100) / 100,
        count: item.count,
      };
    });

    // Partner level distribution
    const levelDistribution = await Partner.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$currentLevel.level', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Total active partners
    const totalPartners = await Partner.countDocuments({ isActive: true });

    // Pending liability: sum of Partner.earnings.pending across all partners
    const [liabilityResult] = await Partner.aggregate([
      { $group: { _id: null, totalPending: { $sum: '$earnings.pending' } } },
    ]);

    // Enrich top earners with user info
    const topEarnerIds = analyticsResult.topEarners.map((e: any) => e._id);
    const partners = await Partner.find({ userId: { $in: topEarnerIds.map((id: any) => id.toString()) } })
      .select('userId name currentLevel.level currentLevel.name earnings')
      .lean();
    const partnerMap = new Map(partners.map((p: any) => [p.userId, p]));

    const topEarners = analyticsResult.topEarners.map((e: any) => {
      const partner = partnerMap.get(e._id.toString());
      return {
        userId: e._id.toString(),
        name: (partner as any)?.name || 'Unknown',
        level: (partner as any)?.currentLevel?.level || 0,
        levelName: (partner as any)?.currentLevel?.name || 'None',
        totalEarned: Math.round(e.totalEarned * 100) / 100,
        txCount: e.txCount,
      };
    });

    res.json({
      success: true,
      data: {
        totalPartnerEarnings: Math.round(totals.totalAmount * 100) / 100,
        totalTransactions: totals.totalCount,
        breakdown,
        monthlyTrend: analyticsResult.monthlyTrend.map((m: any) => ({
          year: m._id.year,
          month: m._id.month,
          amount: Math.round(m.amount * 100) / 100,
          count: m.count,
        })),
        topEarners,
        totalPartners,
        pendingLiability: Math.round((liabilityResult?.totalPending || 0) * 100) / 100,
        levelDistribution: levelDistribution.map((l: any) => ({
          level: l._id,
          count: l.count,
        })),
      },
    });
  } catch (error: any) {
    console.error('[ADMIN] Partner earnings analytics error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch analytics' });
  }
});

/**
 * @route   GET /api/admin/partner-earnings/users
 * @desc    Paginated list of partners with earnings data
 * @access  Admin
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const {
      search,
      level,
      page = '1',
      limit = '20',
      sortBy = 'earnings.total',
      sortDir = 'desc',
    } = req.query;

    const query: any = { isActive: true };
    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phoneNumber: searchRegex },
      ];
    }
    if (level) {
      query['currentLevel.level'] = Number(level);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortObj: any = {};
    sortObj[String(sortBy)] = sortDir === 'asc' ? 1 : -1;

    const [partners, total] = await Promise.all([
      Partner.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit))
        .select('userId name email phoneNumber avatar currentLevel earnings totalOrders totalSpent lastActivityDate')
        .lean(),
      Partner.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        partners,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('[ADMIN] Partner users list error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch partners' });
  }
});

/**
 * @route   GET /api/admin/partner-earnings/config
 * @desc    Get partner earnings configuration
 * @access  Admin
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = await PartnerEarningsConfig.getOrCreate();
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch config' });
  }
});

/**
 * @route   PUT /api/admin/partner-earnings/config
 * @desc    Update partner earnings configuration
 * @access  Admin
 */
router.put('/config', async (req: Request, res: Response) => {
  try {
    const config = await PartnerEarningsConfig.getOrCreate();
    const updates = req.body;

    const allowedFields = [
      'cashbackRates', 'milestones', 'jackpots', 'levelUpBonuses',
      'transactionBonuses', 'taskRewards', 'referralBonus', 'settlementConfig',
    ];

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        (config as any)[field] = updates[field];
        config.markModified(field);
      }
    });

    await config.save();
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update config' });
  }
});

/**
 * @route   POST /api/admin/partner-earnings/:userId/adjust
 * @desc    Manual credit/debit partner earnings with audit trail
 * @access  Admin
 */
router.post('/:userId/adjust', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { amount, type, reason } = req.body;

    if (!amount || !type || !reason) {
      return res.status(400).json({ success: false, message: 'amount, type, and reason are required' });
    }

    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be credit or debit' });
    }

    if (amount <= 0 || amount > 100000) {
      return res.status(400).json({ success: false, message: 'amount must be between 0 and 100,000' });
    }

    // Find wallet
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'User wallet not found' });
    }

    // For debit, check sufficient balance
    if (type === 'debit' && wallet.balance.available < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance for debit' });
    }

    const adminUserId = (req.user as any)?._id?.toString() || 'unknown';

    // Atomic wallet update
    if (type === 'credit') {
      await Wallet.updateOne(
        { user: userId },
        { $inc: { 'balance.available': amount, 'balance.total': amount, 'statistics.totalEarned': amount } }
      );
    } else {
      await Wallet.updateOne(
        { user: userId, 'balance.available': { $gte: amount } },
        { $inc: { 'balance.available': -amount, 'balance.total': -amount } }
      );
    }

    // Create CoinTransaction record
    await CoinTransaction.create({
      user: userId,
      type: type === 'credit' ? 'earned' : 'spent',
      amount,
      source: 'admin',
      description: `Admin partner earnings adjustment: ${reason}`,
      metadata: {
        partnerEarning: true,
        partnerEarningType: 'cashback',
        adminUserId,
        adjustmentType: type,
        reason,
      },
    });

    // Update Partner.earnings
    const partner = await Partner.findOne({ userId });
    if (partner) {
      if (type === 'credit') {
        partner.earnings.total += amount;
        partner.earnings.pending += amount;
      } else {
        partner.earnings.total = Math.max(0, partner.earnings.total - amount);
      }
      await partner.save();
    }

    // Log audit
    try {
      const { logTransaction } = require('../../models/TransactionAuditLog');
      await logTransaction({
        userId,
        walletId: wallet._id,
        operation: type === 'credit' ? 'credit' : 'debit',
        amount,
        balanceBefore: { total: wallet.balance.total, available: wallet.balance.available },
        balanceAfter: {
          total: wallet.balance.total + (type === 'credit' ? amount : -amount),
          available: wallet.balance.available + (type === 'credit' ? amount : -amount),
        },
        reference: { type: 'admin_adjustment', description: reason },
        metadata: { adminUserId, source: 'partner_earnings_admin' },
      });
    } catch { /* audit logging is fire-and-forget */ }

    res.json({
      success: true,
      message: `Successfully ${type}ed ${amount} to partner earnings`,
    });
  } catch (error: any) {
    console.error('[ADMIN] Partner earnings adjust error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to adjust earnings' });
  }
});

export default router;
