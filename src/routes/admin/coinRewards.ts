import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { PendingCoinReward } from '../../models/PendingCoinReward';
import { CoinTransaction } from '../../models/CoinTransaction';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/coin-rewards
 * @desc    Get pending coin rewards for approval
 * @access  Admin
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};

    // Status filter (default to pending)
    filter.status = req.query.status || 'pending';

    // Source filter
    if (req.query.source) {
      filter.source = req.query.source;
    }

    // Date range filter
    if (req.query.dateFrom || req.query.dateTo) {
      filter.submittedAt = {};
      if (req.query.dateFrom) {
        filter.submittedAt.$gte = new Date(req.query.dateFrom as string);
      }
      if (req.query.dateTo) {
        filter.submittedAt.$lte = new Date(req.query.dateTo as string);
      }
    }

    const [rewards, total] = await Promise.all([
      PendingCoinReward.find(filter)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'profile.firstName profile.lastName phoneNumber email')
        .populate('reviewedBy', 'profile.firstName profile.lastName'),
      PendingCoinReward.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        rewards,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error: any) {
    console.error('❌ [ADMIN COIN REWARDS] Error fetching rewards:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch coin rewards'
    });
  }
});

/**
 * @route   GET /api/admin/coin-rewards/stats
 * @desc    Get coin reward statistics
 * @access  Admin
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await PendingCoinReward.aggregate([
      {
        $facet: {
          // By status
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
          ],
          // By source
          bySource: [
            { $group: { _id: '$source', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
          ],
          // Pending count
          pendingCount: [
            { $match: { status: 'pending' } },
            { $count: 'count' }
          ],
          // Total credited today
          creditedToday: [
            {
              $match: {
                status: 'credited',
                creditedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
              }
            },
            { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
          ]
        }
      }
    ]);

    // Also get coin transaction stats
    const coinStats = await CoinTransaction.aggregate([
      {
        $match: {
          source: { $in: ['purchase_reward', 'social_share_reward'] }
        }
      },
      {
        $group: {
          _id: '$source',
          totalCoins: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      byStatus: stats[0].byStatus.reduce((acc: any, item: any) => {
        acc[item._id] = { count: item.count, totalAmount: item.totalAmount };
        return acc;
      }, {}),
      bySource: stats[0].bySource.reduce((acc: any, item: any) => {
        acc[item._id] = { count: item.count, totalAmount: item.totalAmount };
        return acc;
      }, {}),
      pendingCount: stats[0].pendingCount[0]?.count || 0,
      creditedToday: stats[0].creditedToday[0] || { count: 0, totalAmount: 0 },
      coinTransactions: coinStats.reduce((acc: any, item: any) => {
        acc[item._id] = { totalCoins: item.totalCoins, count: item.count };
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('❌ [ADMIN COIN REWARDS] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch coin reward stats'
    });
  }
});

/**
 * @route   GET /api/admin/coin-rewards/:id
 * @desc    Get single coin reward details
 * @access  Admin
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const reward = await PendingCoinReward.findById(req.params.id)
      .populate('user', 'profile phoneNumber email')
      .populate('reviewedBy', 'profile.firstName profile.lastName');

    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Coin reward not found'
      });
    }

    res.json({
      success: true,
      data: reward
    });
  } catch (error: any) {
    console.error('❌ [ADMIN COIN REWARDS] Error fetching reward:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch coin reward'
    });
  }
});

/**
 * @route   POST /api/admin/coin-rewards/:id/approve
 * @desc    Approve a pending coin reward and credit coins
 * @access  Admin
 */
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const reward = await PendingCoinReward.findById(req.params.id);

    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Coin reward not found'
      });
    }

    if (reward.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve reward with status: ${reward.status}`
      });
    }

    const adminId = new Types.ObjectId(req.userId);
    const { notes } = req.body;

    // Approve the reward
    await reward.approve(adminId, notes);

    // Credit the coins
    await reward.creditCoins();

    res.json({
      success: true,
      message: `Successfully approved and credited ${reward.amount} coins to user`,
      data: reward
    });
  } catch (error: any) {
    console.error('❌ [ADMIN COIN REWARDS] Error approving reward:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to approve coin reward'
    });
  }
});

/**
 * @route   POST /api/admin/coin-rewards/:id/reject
 * @desc    Reject a pending coin reward
 * @access  Admin
 */
router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const reward = await PendingCoinReward.findById(req.params.id);

    if (!reward) {
      return res.status(404).json({
        success: false,
        message: 'Coin reward not found'
      });
    }

    if (reward.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject reward with status: ${reward.status}`
      });
    }

    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const adminId = new Types.ObjectId(req.userId);
    await reward.reject(adminId, reason);

    res.json({
      success: true,
      message: 'Coin reward rejected',
      data: reward
    });
  } catch (error: any) {
    console.error('❌ [ADMIN COIN REWARDS] Error rejecting reward:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reject coin reward'
    });
  }
});

/**
 * @route   POST /api/admin/coin-rewards/bulk-approve
 * @desc    Bulk approve multiple pending coin rewards
 * @access  Admin
 */
router.post('/bulk-approve', async (req: Request, res: Response) => {
  try {
    const { rewardIds, notes } = req.body;

    if (!rewardIds || !Array.isArray(rewardIds) || rewardIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reward IDs array is required'
      });
    }

    const adminId = new Types.ObjectId(req.userId);
    const results = {
      approved: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const rewardId of rewardIds) {
      try {
        const reward = await PendingCoinReward.findById(rewardId);
        if (reward && reward.status === 'pending') {
          await reward.approve(adminId, notes);
          await reward.creditCoins();
          results.approved++;
        } else {
          results.failed++;
          results.errors.push(`Reward ${rewardId}: Not found or not pending`);
        }
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Reward ${rewardId}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `Approved ${results.approved} rewards, ${results.failed} failed`,
      data: results
    });
  } catch (error: any) {
    console.error('❌ [ADMIN COIN REWARDS] Error bulk approving:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to bulk approve coin rewards'
    });
  }
});

/**
 * @route   POST /api/admin/coin-rewards/bulk-reject
 * @desc    Bulk reject multiple pending coin rewards
 * @access  Admin
 */
router.post('/bulk-reject', async (req: Request, res: Response) => {
  try {
    const { rewardIds, reason } = req.body;

    if (!rewardIds || !Array.isArray(rewardIds) || rewardIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reward IDs array is required'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const adminId = new Types.ObjectId(req.userId);
    const results = {
      rejected: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const rewardId of rewardIds) {
      try {
        const reward = await PendingCoinReward.findById(rewardId);
        if (reward && reward.status === 'pending') {
          await reward.reject(adminId, reason);
          results.rejected++;
        } else {
          results.failed++;
          results.errors.push(`Reward ${rewardId}: Not found or not pending`);
        }
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Reward ${rewardId}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `Rejected ${results.rejected} rewards, ${results.failed} failed`,
      data: results
    });
  } catch (error: any) {
    console.error('❌ [ADMIN COIN REWARDS] Error bulk rejecting:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to bulk reject coin rewards'
    });
  }
});

export default router;
