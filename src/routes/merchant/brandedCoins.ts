import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/merchantauth';
import { Wallet } from '../../models/Wallet';
import { CoinTransaction } from '../../models/CoinTransaction';
import { Store } from '../../models/Store';
import mongoose from 'mongoose';

const router = Router();
router.use(authMiddleware);

/**
 * Verify that a store belongs to the authenticated merchant.
 * Returns the store document if valid, null otherwise.
 */
async function verifyStoreOwnership(storeId: string, merchantId: string): Promise<any> {
  if (!mongoose.Types.ObjectId.isValid(storeId)) return null;
  const store = await Store.findById(storeId).lean();
  if (!store) return null;
  if (
    String((store as any).merchantId) !== merchantId &&
    String((store as any).merchant) !== merchantId
  ) {
    return null;
  }
  return store;
}

/**
 * GET /stores/:storeId/branded-campaigns
 * Get branded coin analytics for a store.
 */
router.get('/stores/:storeId/branded-campaigns', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const merchantId = req.merchantId!;

    const store = await verifyStoreOwnership(storeId, merchantId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or access denied',
      });
    }

    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    // Total branded coins in circulation (sum of all wallet brandedCoins where merchantId matches)
    const circulationResult = await Wallet.aggregate([
      { $unwind: '$brandedCoins' },
      { $match: { 'brandedCoins.merchantId': storeObjectId } },
      {
        $group: {
          _id: null,
          totalInCirculation: { $sum: '$brandedCoins.amount' },
          uniqueCustomers: { $addToSet: '$user' },
        },
      },
    ]);

    const circulation = circulationResult[0] || {
      totalInCirculation: 0,
      uniqueCustomers: [],
    };

    // Total coins awarded (from CoinTransaction where metadata.storeId matches and type is branded_award or earned with merchant_award source)
    const awardedResult = await CoinTransaction.aggregate([
      {
        $match: {
          $or: [
            { 'metadata.storeId': storeObjectId, source: 'merchant_award' },
            { 'metadata.storeId': storeId, source: 'merchant_award' },
            { 'metadata.storeId': storeObjectId, type: 'branded_award' },
            { 'metadata.storeId': storeId, type: 'branded_award' },
          ],
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalAwarded = 0;
    let totalRedeemed = 0;
    for (const r of awardedResult) {
      if (r._id === 'earned' || r._id === 'bonus' || r._id === 'branded_award') {
        totalAwarded += r.total;
      } else if (r._id === 'spent') {
        totalRedeemed += r.total;
      }
    }

    return res.json({
      success: true,
      message: 'Branded coin analytics retrieved successfully',
      data: {
        totalInCirculation: circulation.totalInCirculation,
        totalAwarded,
        totalRedeemed,
        uniqueCustomers: circulation.uniqueCustomers?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('[Merchant BrandedCoins] Analytics error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve branded coin analytics',
    });
  }
});

/**
 * GET /stores/:storeId/branded-campaigns/customers
 * List customers who hold branded coins for this store.
 */
router.get('/stores/:storeId/branded-campaigns/customers', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const merchantId = req.merchantId!;

    const store = await verifyStoreOwnership(storeId, merchantId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or access denied',
      });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    // Get total count
    const countResult = await Wallet.aggregate([
      { $unwind: '$brandedCoins' },
      { $match: { 'brandedCoins.merchantId': storeObjectId, 'brandedCoins.amount': { $gt: 0 } } },
      { $count: 'total' },
    ]);
    const total = countResult[0]?.total || 0;

    // Get paginated customers
    const customers = await Wallet.aggregate([
      { $unwind: '$brandedCoins' },
      { $match: { 'brandedCoins.merchantId': storeObjectId, 'brandedCoins.amount': { $gt: 0 } } },
      { $sort: { 'brandedCoins.amount': -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: '$user',
          userName: {
            $concat: [
              { $ifNull: ['$userInfo.profile.firstName', ''] },
              ' ',
              { $ifNull: ['$userInfo.profile.lastName', ''] },
            ],
          },
          phoneNumber: '$userInfo.phoneNumber',
          amount: '$brandedCoins.amount',
          earnedDate: '$brandedCoins.earnedDate',
          lastUsed: '$brandedCoins.lastUsed',
        },
      },
    ]);

    return res.json({
      success: true,
      message: 'Branded coin customers retrieved successfully',
      data: {
        customers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('[Merchant BrandedCoins] Customers error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve branded coin customers',
    });
  }
});

/**
 * POST /stores/:storeId/branded-campaigns/award
 * Award branded coins to a customer.
 */
router.post('/stores/:storeId/branded-campaigns/award', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const merchantId = req.merchantId!;

    const store = await verifyStoreOwnership(storeId, merchantId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or access denied',
      });
    }

    const { userId, amount, reason } = req.body;

    // Validate required fields
    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, amount',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid userId',
      });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number',
      });
    }

    // Find or create the user's wallet
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      // Create wallet for user if it doesn't exist
      wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
    }

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'User wallet not found and could not be created',
      });
    }

    const storeName = store.name || store.storeName || 'Unknown Store';
    const storeLogo = store.logo || store.storeLogo || undefined;

    // Use the wallet's addBrandedCoins method
    await wallet.addBrandedCoins(
      new mongoose.Types.ObjectId(storeId),
      storeName,
      amount,
      storeLogo
    );

    // Create CoinTransaction record for audit trail
    try {
      await CoinTransaction.create({
        user: userId,
        type: 'branded_award',
        amount,
        balance: 0, // Branded coins are tracked separately
        source: 'merchant_award',
        description: reason || `Branded coins awarded by ${storeName}`,
        metadata: {
          storeId: new mongoose.Types.ObjectId(storeId),
          storeName,
          merchantId,
          reason: reason || 'Merchant branded coin award',
        },
      });
    } catch (txError: any) {
      console.error('[Merchant BrandedCoins] CoinTransaction creation error:', txError.message);
      // Don't fail the request -- the coins were already awarded
    }

    // Get the updated branded coin balance for this store
    const updatedWallet = await Wallet.findOne({ user: userId });
    const brandedCoin = updatedWallet?.brandedCoins?.find(
      (bc: any) => bc.merchantId.toString() === storeId
    );

    return res.status(201).json({
      success: true,
      message: `${amount} branded coins awarded successfully`,
      data: {
        userId,
        amount,
        storeName,
        reason: reason || 'Merchant branded coin award',
        newBrandedBalance: brandedCoin?.amount || amount,
      },
    });
  } catch (error: any) {
    console.error('[Merchant BrandedCoins] Award error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to award branded coins',
    });
  }
});

export default router;
