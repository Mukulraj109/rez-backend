import { Request, Response } from 'express';
import Offer, { IOffer } from '../models/Offer';
import OfferRedemption from '../models/OfferRedemption';
import Favorite from '../models/Favorite';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

/**
 * GET /api/offers
 * Get offers with filters, sorting, and pagination
 */
export const getOffers = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      store,
      featured,
      trending,
      new: isNew,
      minCashback,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    // Build filter query
    const filter: any = {
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    };

    if (category) {
      filter.category = category;
    }

    if (store) {
      filter.store = store;
    }

    if (featured === 'true') {
      filter.isFeatured = true;
    }

    if (trending === 'true') {
      filter.isTrending = true;
    }

    if (isNew === 'true') {
      filter.isNew = true;
    }

    if (minCashback) {
      filter.cashBackPercentage = { $gte: Number(minCashback) };
    }

    // Sort options
    const sortOptions: any = {};
    const sortField = sortBy as string;
    sortOptions[sortField] = order === 'asc' ? 1 : -1;

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [offers, total] = await Promise.all([
      Offer.find(filter)
        .populate('category', 'name slug')
        .populate('store', 'name logo location ratings')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Offer.countDocuments(filter),
    ]);

    sendPaginated(res, offers, pageNum, limitNum, total, 'Offers fetched successfully');
  } catch (error) {
    console.error('Error fetching offers:', error);
    sendError(res, 'Failed to fetch offers', 500);
  }
};

/**
 * GET /api/offers/featured
 * Get featured offers
 */
export const getFeaturedOffers = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const offers = await Offer.getFeatured(Number(limit));

    sendSuccess(res, offers, 'Featured offers fetched successfully');
  } catch (error) {
    console.error('Error fetching featured offers:', error);
    sendError(res, 'Failed to fetch featured offers', 500);
  }
};

/**
 * GET /api/offers/trending
 * Get trending offers
 */
export const getTrendingOffers = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const offers = await Offer.getTrending(Number(limit));

    sendSuccess(res, offers, 'Trending offers fetched successfully');
  } catch (error) {
    console.error('Error fetching trending offers:', error);
    sendError(res, 'Failed to fetch trending offers', 500);
  }
};

/**
 * GET /api/offers/search
 * Search offers by query
 */
export const searchOffers = async (req: Request, res: Response) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || typeof q !== 'string') {
      return sendError(res, 'Search query is required', 400);
    }

    // Text search
    const filter: any = {
      $text: { $search: q },
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    };

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [offers, total] = await Promise.all([
      Offer.find(filter, { score: { $meta: 'textScore' } })
        .populate('category', 'name slug')
        .populate('store', 'name logo location ratings')
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Offer.countDocuments(filter),
    ]);

    sendPaginated(res, offers, pageNum, limitNum, total, 'Offers fetched successfully');
  } catch (error) {
    console.error('Error searching offers:', error);
    sendError(res, 'Failed to search offers', 500);
  }
};

/**
 * GET /api/offers/category/:categoryId
 * Get offers by category
 */
export const getOffersByCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = req.query;

    const filter: any = {
      category: categoryId,
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    };

    // Sort options
    const sortOptions: any = {};
    sortOptions[sortBy as string] = order === 'asc' ? 1 : -1;

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [offers, total] = await Promise.all([
      Offer.find(filter)
        .populate('category', 'name slug')
        .populate('store', 'name logo location ratings')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Offer.countDocuments(filter),
    ]);

    sendPaginated(res, offers, pageNum, limitNum, total, 'Offers fetched successfully');
  } catch (error) {
    console.error('Error fetching offers by category:', error);
    sendError(res, 'Failed to fetch offers by category', 500);
  }
};

/**
 * GET /api/offers/store/:storeId
 * Get offers for a specific store
 */
export const getOffersByStore = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const filter: any = {
      $or: [
        { store: storeId },
        { applicableStores: storeId },
      ],
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    };

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [offers, total] = await Promise.all([
      Offer.find(filter)
        .populate('category', 'name slug')
        .populate('store', 'name logo location ratings')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Offer.countDocuments(filter),
    ]);

    sendPaginated(res, offers, pageNum, limitNum, total, 'Offers fetched successfully');
  } catch (error) {
    console.error('Error fetching store offers:', error);
    sendError(res, 'Failed to fetch store offers', 500);
  }
};

/**
 * GET /api/offers/:id
 * Get single offer by ID
 */
export const getOfferById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findById(id)
      .populate('category', 'name slug')
      .populate('store', 'name logo location ratings contact')
      .lean();

    if (!offer) {
      return sendError(res, 'Offer not found', 404);
    }

    // Check if user has favorited (if authenticated)
    let isFavorite = false;
    if (req.user) {
      const favorite = await Favorite.findOne({
        user: req.user.id,
        itemType: 'offer',
        item: id,
      });
      isFavorite = !!favorite;
    }

    sendSuccess(res, { ...offer, isFavorite }, 'Offer fetched successfully');
  } catch (error) {
    console.error('Error fetching offer:', error);
    sendError(res, 'Failed to fetch offer', 500);
  }
};

/**
 * POST /api/offers/:id/redeem
 * Redeem an offer (authenticated users only)
 */
export const redeemOffer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { redemptionType = 'online' } = req.body;

    // Find offer
    const offer = await Offer.findById(id);

    if (!offer) {
      return sendError(res, 'Offer not found', 404);
    }

    // Check if offer is valid
    if (!offer.isValid()) {
      return sendError(res, 'Offer is no longer valid', 400);
    }

    // Check user redemption limit
    const userRedemptionCount = await OfferRedemption.countUserOfferRedemptions(userId, id);

    if (!offer.canUserRedeem(userRedemptionCount)) {
      return sendError(res, 'You have already reached the redemption limit for this offer', 400);
    }

    // Check global redemption limit
    if (offer.maxRedemptions && offer.currentRedemptions >= offer.maxRedemptions) {
      return sendError(res, 'Offer redemption limit reached', 400);
    }

    // Create redemption
    const redemption = new OfferRedemption({
      user: userId,
      offer: id,
      redemptionType,
      redemptionDate: new Date(),
      validityDays: 30, // Can be customized
      status: 'active',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    await redemption.save();

    // Update offer redemption count
    offer.currentRedemptions += 1;
    offer.redemptionCount += 1;
    await offer.save();

    // Populate for response
    await redemption.populate('offer', 'title image cashBackPercentage validUntil');

    sendSuccess(res, redemption, 'Offer redeemed successfully', 201);
  } catch (error) {
    console.error('Error redeeming offer:', error);
    sendError(res, 'Failed to redeem offer', 500);
  }
};

/**
 * GET /api/offers/my-redemptions
 * Get user's offer redemptions
 */
export const getUserRedemptions = async (req: Request, res: Response) => {
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

    const [redemptions, total] = await Promise.all([
      OfferRedemption.find(filter)
        .populate('offer', 'title image cashBackPercentage category validUntil')
        .populate('order', 'orderNumber totalAmount status')
        .sort({ redemptionDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      OfferRedemption.countDocuments(filter),
    ]);

    sendPaginated(res, redemptions, pageNum, limitNum, total, 'Redemptions fetched successfully');
  } catch (error) {
    console.error('Error fetching user redemptions:', error);
    sendError(res, 'Failed to fetch redemptions', 500);
  }
};

/**
 * POST /api/offers/:id/favorite
 * Add offer to favorites
 */
export const addOfferToFavorites = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if offer exists
    const offer = await Offer.findById(id);

    if (!offer) {
      return sendError(res, 'Offer not found', 404);
    }

    // Check if already favorited
    const existing = await Favorite.findOne({
      user: userId,
      itemType: 'offer',
      item: id,
    });

    if (existing) {
      return sendError(res, 'Offer already in favorites', 400);
    }

    // Create favorite
    const favorite = new Favorite({
      user: userId,
      itemType: 'offer',
      item: id,
    });

    await favorite.save();

    // Update offer favorite count
    offer.favoriteCount += 1;
    await offer.save();

    sendSuccess(res, { success: true }, 'Offer added to favorites', 201);
  } catch (error) {
    console.error('Error adding to favorites:', error);
    sendError(res, 'Failed to add to favorites', 500);
  }
};

/**
 * DELETE /api/offers/:id/favorite
 * Remove offer from favorites
 */
export const removeOfferFromFavorites = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Remove favorite
    const result = await Favorite.findOneAndDelete({
      user: userId,
      itemType: 'offer',
      item: id,
    });

    if (!result) {
      return sendError(res, 'Favorite not found', 404);
    }

    // Update offer favorite count
    await Offer.findByIdAndUpdate(id, { $inc: { favoriteCount: -1 } });

    sendSuccess(res, { success: true }, 'Offer removed from favorites');
  } catch (error) {
    console.error('Error removing from favorites:', error);
    sendError(res, 'Failed to remove from favorites', 500);
  }
};

/**
 * GET /api/offers/favorites
 * Get user's favorite offers
 */
export const getUserFavoriteOffers = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Get favorites
    const [favorites, total] = await Promise.all([
      Favorite.find({
        user: userId,
        itemType: 'offer',
      })
        .populate({
          path: 'item',
          model: 'Offer',
          populate: [
            { path: 'category', select: 'name slug' },
            { path: 'store', select: 'name logo location ratings' },
          ],
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Favorite.countDocuments({
        user: userId,
        itemType: 'offer',
      }),
    ]);

    // Extract offers
    const offers = favorites.map((fav: any) => ({
      ...fav.item,
      isFavorite: true,
    }));

    sendPaginated(res, offers, pageNum, limitNum, total, 'Offers fetched successfully');
  } catch (error) {
    console.error('Error fetching favorite offers:', error);
    sendError(res, 'Failed to fetch favorite offers', 500);
  }
};

/**
 * POST /api/offers/:id/view
 * Track offer view (analytics)
 */
export const trackOfferView = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Increment view count
    await Offer.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

    sendSuccess(res, { success: true }, 'View tracked');
  } catch (error) {
    console.error('Error tracking view:', error);
    // Don't return error for analytics endpoints
    res.status(200).json({ success: true });
  }
};

/**
 * POST /api/offers/:id/click
 * Track offer click (analytics)
 */
export const trackOfferClick = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Increment click count
    await Offer.findByIdAndUpdate(id, { $inc: { clickCount: 1 } });

    sendSuccess(res, { success: true }, 'Click tracked');
  } catch (error) {
    console.error('Error tracking click:', error);
    // Don't return error for analytics endpoints
    res.status(200).json({ success: true });
  }
};

/**
 * GET /api/offers/recommendations
 * Get personalized offer recommendations (optional auth)
 */
export const getRecommendedOffers = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    // For now, return trending offers as recommendations
    // Can be enhanced with ML-based recommendations later
    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    })
      .sort({ viewCount: -1, redemptionCount: -1, favoriteCount: -1 })
      .limit(Number(limit))
      .populate('category', 'name slug')
      .populate('store', 'name logo location ratings')
      .lean();

    sendSuccess(res, offers, 'Recommended offers fetched successfully');
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    sendError(res, 'Failed to fetch recommendations', 500);
  }
};