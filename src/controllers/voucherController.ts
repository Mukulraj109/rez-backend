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
        .populate('store', 'name slug logo location.address location.city')
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

    const brand = await VoucherBrand.findById(id)
      .populate('store', 'name slug logo location.address location.city')
      .lean();

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
      .populate('store', 'name slug logo location.address location.city')
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
      .populate('store', 'name slug logo location.address location.city')
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

    // Generate voucher code
    const brandPrefix = brandId.toString().substring(0, 6).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const voucherCode = `${brandPrefix}-${denomination}-${random}`;

    // Calculate expiry date (365 days from now)
    const purchaseDate = new Date();
    const expiryDate = new Date(purchaseDate);
    expiryDate.setDate(expiryDate.getDate() + 365);

    // Create voucher
    const userVoucher = new UserVoucher({
      user: userId,
      brand: brandId,
      voucherCode,
      denomination: Number(denomination),
      purchasePrice,
      purchaseDate,
      expiryDate,
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
    const rezCoin = wallet.coins.find((c: any) => c.type === 'rez');
    if (rezCoin && rezCoin.amount >= purchasePrice) {
      rezCoin.amount -= purchasePrice;
      rezCoin.lastUsed = new Date();
    }

    await wallet.save();

    // Create transaction record
    const transaction = new Transaction({
      user: userId,
      type: 'debit',
      amount: purchasePrice,
      currency: wallet.currency,
      category: 'spending',
      description: `Purchased ${brand.name} voucher - ₹${denomination}`,
      status: {
        current: 'completed',
        history: [{
          status: 'completed',
          timestamp: new Date(),
          reason: 'Voucher purchased successfully',
        }],
      },
      source: {
        type: 'order',
        reference: userVoucher._id as any,
        description: `Voucher purchase - ${brand.name}`,
        metadata: {
          orderNumber: `VOUCHR-${String(userVoucher._id).substring(0, 8)}`,
          storeInfo: brand.store ? {
            name: brand.name,
            id: brand.store as any,
          } : undefined,
        },
      },
      balanceBefore: wallet.balance.total + purchasePrice,
      balanceAfter: wallet.balance.total,
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

/**
 * GET /api/vouchers/hero-carousel
 * Get hero carousel items for online voucher page
 */
export const getHeroCarousel = async (req: Request, res: Response) => {
  try {
    const { limit = 5 } = req.query;

    // Get featured brands with highest cashback rates, prioritizing travel brands (like MakeMyTrip) for hero carousel
    const featuredBrands = await VoucherBrand.find({
      isActive: true,
      $or: [
        { isFeatured: true },
        { category: 'travel' }, // Include travel brands in hero carousel
      ],
    })
      .populate('store', 'name slug logo location.address location.city')
      .sort({ 
        // Prioritize travel brands first, then by cashback rate
        category: 1, // travel comes first alphabetically, but we'll manually sort
        cashbackRate: -1, 
        purchaseCount: -1 
      })
      .limit(Number(limit) + 5) // Get extra to filter
      .lean();

    // Manually sort: travel brands first, then others
    featuredBrands.sort((a, b) => {
      const aIsTravel = a.category === 'travel';
      const bIsTravel = b.category === 'travel';
      if (aIsTravel && !bIsTravel) return -1;
      if (!aIsTravel && bIsTravel) return 1;
      return b.cashbackRate - a.cashbackRate;
    });

    // Limit to requested number
    const limitedBrands = featuredBrands.slice(0, Number(limit));

    // Transform to carousel format
    const carouselItems = limitedBrands.map((brand, index) => {
      // Special handling for MakeMyTrip to match image format
      const title = brand.name.toLowerCase() === 'makemytrip' 
        ? 'make my trip' 
        : brand.name;

      return {
        id: brand._id.toString(),
        title,
        subtitle: `Cashback upto ${brand.cashbackRate}%`,
        image: brand.logo, // Use logo as image for now
        backgroundColor: brand.backgroundColor || '#F97316',
        textColor: brand.logoColor || '#FFFFFF',
        cashbackRate: brand.cashbackRate,
        brandId: brand._id.toString(),
        store: brand.store ? {
          id: (brand.store as any)._id?.toString(),
          name: (brand.store as any).name,
          slug: (brand.store as any).slug,
          address: (brand.store as any).location?.address,
        } : null,
        action: {
          type: 'brand' as const,
          target: brand._id.toString(),
        },
      };
    });

    sendSuccess(res, carouselItems, 'Hero carousel items fetched successfully');
  } catch (error) {
    console.error('Error fetching hero carousel:', error);
    sendError(res, 'Failed to fetch hero carousel', 500);
  }
};