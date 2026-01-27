import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { Wallet } from '../models/Wallet';
import { CoinTransaction } from '../models/CoinTransaction';
import { Store } from '../models/Store';
import { User } from '../models/User';
import mongoose from 'mongoose';

const router = Router();

// All routes require merchant authentication
router.use(authMiddleware);

// Maximum coins a merchant can award per transaction
const MAX_COINS_PER_AWARD = 1000;

/**
 * @route   POST /api/merchant/coins/award
 * @desc    Award branded coins to a customer
 * @access  Merchant
 */
router.post('/award', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID missing' });
    }

    const { userId, storeId, amount, reason } = req.body;

    // Validate required fields
    if (!userId || !storeId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'userId, storeId, and amount are required'
      });
    }

    // Validate amount
    const coinAmount = parseInt(amount);
    if (isNaN(coinAmount) || coinAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    if (coinAmount > MAX_COINS_PER_AWARD) {
      return res.status(400).json({
        success: false,
        message: `Maximum coins per award is ${MAX_COINS_PER_AWARD}`
      });
    }

    // Verify store belongs to merchant
    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    if (store.merchantId?.toString() !== merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Store does not belong to this merchant'
      });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get or create user's wallet
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
    }

    if (!wallet) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create wallet for user'
      });
    }

    // Add branded coins to user's wallet
    await wallet.addBrandedCoins(
      new mongoose.Types.ObjectId(storeId),
      store.name,
      coinAmount,
      store.logo,
      '#6366F1'  // Default brand color for merchant coins
    );

    // Create a coin transaction record for tracking
    await CoinTransaction.createTransaction(
      userId,
      'earned',
      coinAmount,
      'merchant_award',
      reason || `Bonus coins from ${store.name}`,
      {
        merchantId,
        storeId,
        storeName: store.name,
        coinType: 'branded',
        awardedBy: merchantId
      }
    );

    console.log(`🎁 [MERCHANT COINS] ${store.name} awarded ${coinAmount} branded coins to user ${userId}`);

    return res.json({
      success: true,
      message: `Successfully awarded ${coinAmount} ${store.name} coins to customer`,
      data: {
        userId,
        amount: coinAmount,
        storeName: store.name,
        reason: reason || 'Bonus coins',
        newBrandedBalance: wallet.brandedCoins.find(
          (c: any) => c.merchantId.toString() === storeId
        )?.amount || coinAmount
      }
    });
  } catch (error: any) {
    console.error('❌ [MERCHANT COINS] Error awarding coins:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to award coins'
    });
  }
});

/**
 * @route   GET /api/merchant/coins/history
 * @desc    Get coin award history for merchant
 * @access  Merchant
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID missing' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const storeId = req.query.storeId as string;

    // Build query
    const query: any = {
      source: 'merchant_award',
      'metadata.merchantId': merchantId
    };

    if (storeId) {
      query['metadata.storeId'] = storeId;
    }

    // Get transactions
    const [transactions, total] = await Promise.all([
      CoinTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'profile.firstName profile.lastName phoneNumber')
        .lean(),
      CoinTransaction.countDocuments(query)
    ]);

    return res.json({
      success: true,
      data: {
        transactions: transactions.map(t => ({
          id: t._id,
          user: t.user,
          amount: t.amount,
          reason: t.description,
          storeName: (t.metadata as any)?.storeName,
          storeId: (t.metadata as any)?.storeId,
          createdAt: t.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error: any) {
    console.error('❌ [MERCHANT COINS] Error fetching history:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch coin award history'
    });
  }
});

/**
 * @route   GET /api/merchant/coins/stats
 * @desc    Get coin award statistics for merchant
 * @access  Merchant
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID missing' });
    }

    const storeId = req.query.storeId as string;

    // Build match query
    const matchQuery: any = {
      source: 'merchant_award',
      'metadata.merchantId': merchantId
    };

    if (storeId) {
      matchQuery['metadata.storeId'] = storeId;
    }

    // Get statistics
    const stats = await CoinTransaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalCoinsAwarded: { $sum: '$amount' },
          totalAwards: { $sum: 1 },
          uniqueCustomers: { $addToSet: '$user' },
          avgCoinsPerAward: { $avg: '$amount' }
        }
      },
      {
        $project: {
          _id: 0,
          totalCoinsAwarded: 1,
          totalAwards: 1,
          uniqueCustomers: { $size: '$uniqueCustomers' },
          avgCoinsPerAward: { $round: ['$avgCoinsPerAward', 0] }
        }
      }
    ]);

    // Get monthly breakdown
    const monthlyStats = await CoinTransaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          coinsAwarded: { $sum: '$amount' },
          awardCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 }
    ]);

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await CoinTransaction.aggregate([
      {
        $match: {
          ...matchQuery,
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          coinsAwarded: { $sum: '$amount' },
          awardCount: { $sum: 1 }
        }
      }
    ]);

    return res.json({
      success: true,
      data: {
        overall: stats[0] || {
          totalCoinsAwarded: 0,
          totalAwards: 0,
          uniqueCustomers: 0,
          avgCoinsPerAward: 0
        },
        today: todayStats[0] || {
          coinsAwarded: 0,
          awardCount: 0
        },
        monthlyBreakdown: monthlyStats.map(m => ({
          year: m._id.year,
          month: m._id.month,
          coinsAwarded: m.coinsAwarded,
          awardCount: m.awardCount
        })),
        limits: {
          maxCoinsPerAward: MAX_COINS_PER_AWARD
        }
      }
    });
  } catch (error: any) {
    console.error('❌ [MERCHANT COINS] Error fetching stats:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch coin statistics'
    });
  }
});

/**
 * @route   GET /api/merchant/coins/search-customer
 * @desc    Search for a customer to award coins
 * @access  Merchant
 */
router.get('/search-customer', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID missing' });
    }

    const { phone, email } = req.query;

    if (!phone && !email) {
      return res.status(400).json({
        success: false,
        message: 'Phone number or email is required'
      });
    }

    const query: any = { isActive: true };

    if (phone) {
      // Clean phone number - remove spaces and country code
      const cleanPhone = (phone as string).replace(/\s+/g, '').replace(/^\+91/, '');
      query.phoneNumber = { $regex: cleanPhone, $options: 'i' };
    }

    if (email) {
      query.email = { $regex: email as string, $options: 'i' };
    }

    const users = await User.find(query)
      .select('_id profile.firstName profile.lastName phoneNumber email avatar')
      .limit(10)
      .lean();

    return res.json({
      success: true,
      data: users.map((u: any) => ({
        id: u._id,
        name: `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || 'Unknown',
        phoneNumber: u.phoneNumber,
        email: u.email,
        avatar: u.avatar
      }))
    });
  } catch (error: any) {
    console.error('❌ [MERCHANT COINS] Error searching customer:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to search customers'
    });
  }
});

export default router;
