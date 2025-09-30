import { Request, Response } from 'express';
import { VoucherBrand, UserVoucher } from '../models/Voucher';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

/**
 * GET /api/vouchers/brands
 * Get all voucher brands with filters
 */
export const getVoucherBrands = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      featured,
      newlyAdded,
      search,
      sortBy = 'name',
      order = 'asc',
    } = req.query;

    // Build filter
    const filter: any = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (featured === 'true') {
      filter.isFeatured = true;
    }

    if (newlyAdded === 'true') {
      filter.isNewlyAdded = true;
    }

    if (search) {
      filter.$text = { $search: search as string };
    }

    // Sort options
    const sortOptions: any = {};
    sortOptions[sortBy as string] = order === 'asc' ? 1 : -1;

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [brands, total] = await Promise.all([
      VoucherBrand.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      VoucherBrand.countDocuments(filter),
    ]);

    sendPaginated(res, brands, pageNum, limitNum, total, 'Voucher brands fetched successfully');
  } catch (error) {
    console.error('Error fetching voucher brands:', error);
    sendError(res, 'Failed to fetch voucher brands', 500);
  }
};

/**
 * GET /api/vouchers/brands/:id
 * Get single voucher brand by ID
 */
export const getVoucherBrandById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const brand = await VoucherBrand.findById(id).lean();

    if (!brand) {
      return sendError(res, 'Voucher brand not found', 404);
    }

    sendSuccess(res, brand, 'Voucher brand fetched successfully');
  } catch (error) {
    console.error('Error fetching voucher brand:', error);
    sendError(res, 'Failed to fetch voucher brand', 500);
  }
};

/**
 * GET /api/vouchers/brands/featured
 * Get featured voucher brands
 */
export const getFeaturedBrands = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const brands = await VoucherBrand.find({
      isActive: true,
      isFeatured: true,
    })
      .sort({ purchaseCount: -1 })
      .limit(Number(limit))
      .lean();

    sendSuccess(res, brands, 'Featured brands fetched successfully');
  } catch (error) {
    console.error('Error fetching featured brands:', error);
    sendError(res, 'Failed to fetch featured brands', 500);
  }
};

/**
 * GET /api/vouchers/brands/newly-added
 * Get newly added voucher brands
 */
export const getNewlyAddedBrands = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const brands = await VoucherBrand.find({
      isActive: true,
      isNewlyAdded: true,
    })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    sendSuccess(res, brands, 'Newly added brands fetched successfully');
  } catch (error) {
    console.error('Error fetching newly added brands:', error);
    sendError(res, 'Failed to fetch newly added brands', 500);
  }
};

/**
 * GET /api/vouchers/categories
 * Get voucher categories (distinct)
 */
export const getVoucherCategories = async (req: Request, res: Response) => {
  try {
    const categories = await VoucherBrand.distinct('category', { isActive: true });

    sendSuccess(res, categories, 'Categories fetched successfully');
  } catch (error) {
    console.error('Error fetching categories:', error);
    sendError(res, 'Failed to fetch categories', 500);
  }
};

/**
 * POST /api/vouchers/purchase
 * Purchase a voucher (authenticated users only)
 */
export const purchaseVoucher = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      brandId,
      denomination,
      paymentMethod = 'wallet',
    } = req.body;

    // Validate input
    if (!brandId || !denomination) {
      return sendError(res, 'Brand ID and denomination are required', 400);
    }

    // Find brand
    const brand = await VoucherBrand.findById(brandId);

    if (!brand) {
      return sendError(res, 'Voucher brand not found', 404);
    }

    if (!brand.isActive) {
      return sendError(res, 'This voucher brand is currently unavailable', 400);
    }

    // Check if denomination is available
    if (!brand.denominations.includes(Number(denomination))) {
      return sendError(res, 'Invalid denomination for this brand', 400);
    }

    // For now, only support wallet payment
    if (paymentMethod !== 'wallet') {
      return sendError(res, 'Only wallet payment is supported currently', 400);
    }

    // Get user's wallet
    const wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      return sendError(res, 'Wallet not found', 404);
    }

    // Calculate price (currently 1:1, but can add discounts later)
    const purchasePrice = Number(denomination);

    // Check sufficient balance
    if (wallet.balance.available < purchasePrice) {
      return sendError(res, 'Insufficient wallet balance', 400);
    }

    // Create voucher
    const userVoucher = new UserVoucher({
      user: userId,
      brand: brandId,
      denomination: Number(denomination),
      purchasePrice,
      purchaseDate: new Date(),
      validityDays: 365, // 1 year
      status: 'active',
      deliveryMethod: 'app',
      deliveryStatus: 'delivered',
      deliveredAt: new Date(),
      paymentMethod: 'wallet',
    });

    await userVoucher.save();

    // Deduct from wallet
    wallet.balance.total -= purchasePrice;
    wallet.balance.available -= purchasePrice;

    // Update coins
    const wasilCoin = wallet.coins.find((c: any) => c.type === 'wasil');
    if (wasilCoin && wasilCoin.amount >= purchasePrice) {
      wasilCoin.amount -= purchasePrice;
      wasilCoin.lastUsed = new Date();
    }

    await wallet.save();

    // Create transaction record
    const transaction = new Transaction({
      user: userId,
      type: 'debit',
      amount: purchasePrice,
      currency: wallet.currency,
      category: 'voucher_purchase',
      description: `Purchased ${brand.name} voucher - ${denomination}`,
      status: {
        current: 'completed',
        history: [{
          status: 'completed',
          timestamp: new Date(),
          message: 'Voucher purchased successfully',
        }],
      },
      source: {
        type: 'voucher',
        id: String(userVoucher._id),
        metadata: {
          brandId: String(brand._id),
          brandName: brand.name,
          denomination,
        },
      },
      balance: {
        before: wallet.balance.total + purchasePrice,
        after: wallet.balance.total,
      },
    });

    await transaction.save();

    // Update brand purchase count
    brand.purchaseCount += 1;
    await brand.save();

    // Populate voucher for response
    await userVoucher.populate('brand', 'name logo backgroundColor cashbackRate');

    sendSuccess(
      res,
      {
        voucher: userVoucher,
        transaction,
        wallet: {
          balance: wallet.balance.total,
          available: wallet.balance.available,
        },
      },
      'Voucher purchased successfully',
      201
    );
  } catch (error) {
    console.error('Error purchasing voucher:', error);
    sendError(res, 'Failed to purchase voucher', 500);
  }
};

/**
 * GET /api/vouchers/my-vouchers
 * Get user's purchased vouchers
 */
export const getUserVouchers = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, page = 1, limit = 20 } = req.query;

    const filter: any = { user: userId };

    if (status) {
      filter.status = status;
    }

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [vouchers, total] = await Promise.all([
      UserVoucher.find(filter)
        .populate('brand', 'name logo backgroundColor cashbackRate category')
        .sort({ purchaseDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      UserVoucher.countDocuments(filter),
    ]);

    sendPaginated(res, vouchers, pageNum, limitNum, total, 'User vouchers fetched successfully');
  } catch (error) {
    console.error('Error fetching user vouchers:', error);
    sendError(res, 'Failed to fetch vouchers', 500);
  }
};

/**
 * GET /api/vouchers/my-vouchers/:id
 * Get single user voucher by ID
 */
export const getUserVoucherById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const voucher = await UserVoucher.findOne({
      _id: id,
      user: userId,
    })
      .populate('brand', 'name logo backgroundColor cashbackRate category termsAndConditions')
      .lean();

    if (!voucher) {
      return sendError(res, 'Voucher not found', 404);
    }

    sendSuccess(res, voucher, 'Voucher fetched successfully');
  } catch (error) {
    console.error('Error fetching voucher:', error);
    sendError(res, 'Failed to fetch voucher', 500);
  }
};

/**
 * POST /api/vouchers/:id/use
 * Mark voucher as used
 */
export const useVoucher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { usageLocation } = req.body;

    // Find voucher
    const voucher = await UserVoucher.findOne({
      _id: id,
      user: userId,
    });

    if (!voucher) {
      return sendError(res, 'Voucher not found', 404);
    }

    // Check if valid
    if (!voucher.isValid()) {
      return sendError(res, 'Voucher is not valid or has expired', 400);
    }

    // Mark as used
    await voucher.markAsUsed(usageLocation);

    sendSuccess(res, voucher, 'Voucher marked as used successfully');
  } catch (error) {
    console.error('Error using voucher:', error);
    sendError(res, 'Failed to use voucher', 500);
  }
};

/**
 * POST /api/vouchers/brands/:id/track-view
 * Track brand view (analytics)
 */
export const trackBrandView = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await VoucherBrand.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    sendSuccess(res, { success: true }, 'View tracked');
  } catch (error) {
    console.error('Error tracking brand view:', error);
    // Don't return error for analytics
    res.status(200).json({ success: true });
  }
};