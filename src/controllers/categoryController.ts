import { Request, Response } from 'express';
import { Category } from '../models/Category';
import { Order } from '../models/Order';
import {
  sendSuccess,
  sendNotFound
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// Get all categories with optional filtering
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const { type, featured, parent } = req.query;

  try {
    const query: any = { isActive: true };

    if (type) query.type = type;
    if (featured !== undefined) query['metadata.featured'] = featured === 'true';
    if (parent === 'null' || parent === 'root') {
      query.parentCategory = null;
    } else if (parent) {
      query.parentCategory = parent;
    }

    const categories = await Category.find(query)
      .populate('parentCategory', 'name slug')
      .populate('childCategories', 'name slug image')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    sendSuccess(res, categories, 'Categories retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch categories', 500);
  }
});

// Get category tree structure
export const getCategoryTree = asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.query;

  try {
    // Get root categories first
    const query: any = { parentCategory: null, isActive: true };
    if (type) query.type = type;

    const rootCategories = await Category.find(query)
      .populate('childCategories', 'name slug image sortOrder')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    sendSuccess(res, rootCategories, 'Category tree retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch category tree', 500);
  }
});

// Get single category by slug
export const getCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const category = await Category.findOne({
      slug,
      isActive: true
    })
      .populate('parentCategory', 'name slug')
      .populate('childCategories', 'name slug image sortOrder')
      .lean();

    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    sendSuccess(res, category, 'Category retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch category', 500);
  }
});

// Get categories with product/store counts
export const getCategoriesWithCounts = asyncHandler(async (req: Request, res: Response) => {
  const { type = 'general' } = req.query;

  try {
    const query: any = { isActive: true };
    if (type) query.type = type;

    const categories = await Category.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    sendSuccess(res, categories, 'Categories with counts retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch categories with counts', 500);
  }
});

// Get root categories (no parent)
export const getRootCategories = asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.query;

  try {
    const query: any = { parentCategory: null, isActive: true };
    if (type) query.type = type;

    const rootCategories = await Category.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    sendSuccess(res, rootCategories, 'Root categories retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch root categories', 500);
  }
});

// Get featured categories
export const getFeaturedCategories = asyncHandler(async (req: Request, res: Response) => {
  const { type, limit = 6 } = req.query;

  try {
    const query: any = {
      isActive: true,
      'metadata.featured': true
    };

    if (type) query.type = type;

    const categories = await Category.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .limit(Number(limit))
      .lean();

    sendSuccess(res, categories, 'Featured categories retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch featured categories', 500);
  }
});

// Get best discount categories
export const getBestDiscountCategories = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  try {
    const categories = await Category.find({
      isActive: true,
      isBestDiscount: true
    })
      .sort({ maxCashback: -1, sortOrder: 1 })
      .limit(Number(limit))
      .lean();

    sendSuccess(res, categories, 'Best discount categories retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch best discount categories', 500);
  }
});

// Get best seller categories
export const getBestSellerCategories = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  try {
    const categories = await Category.find({
      isActive: true,
      isBestSeller: true
    })
      .sort({ productCount: -1, storeCount: -1, sortOrder: 1 })
      .limit(Number(limit))
      .lean();

    sendSuccess(res, categories, 'Best seller categories retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch best seller categories', 500);
  }
});

// Get category vibes
export const getCategoryVibes = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    // Get category with embedded vibes
    const category = await Category.findOne({ slug, isActive: true })
      .select('vibes')
      .lean();

    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    const vibes = category.vibes || [];

    sendSuccess(res, { vibes }, 'Category vibes retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch category vibes', 500);
  }
});

// Get category occasions
export const getCategoryOccasions = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    // Get category with embedded occasions
    const category = await Category.findOne({ slug, isActive: true })
      .select('occasions')
      .lean();

    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    const occasions = category.occasions || [];

    sendSuccess(res, { occasions }, 'Category occasions retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch category occasions', 500);
  }
});

// Get category hashtags
export const getCategoryHashtags = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const { limit = 6 } = req.query;

  try {
    // Get category with embedded hashtags
    const category = await Category.findOne({ slug, isActive: true })
      .select('trendingHashtags')
      .lean();

    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    let hashtags = category.trendingHashtags || [];

    // Sort by trending first, then count
    hashtags = hashtags
      .sort((a: any, b: any) => {
        if (a.trending !== b.trending) return b.trending ? 1 : -1;
        return b.count - a.count;
      })
      .slice(0, Number(limit));

    sendSuccess(res, { hashtags }, 'Category hashtags retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch category hashtags', 500);
  }
});

// Get category AI suggestions
export const getCategoryAISuggestions = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const category = await Category.findOne({ slug, isActive: true })
      .select('aiSuggestions aiPlaceholders')
      .lean();

    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    sendSuccess(res, {
      suggestions: category.aiSuggestions || [],
      placeholders: category.aiPlaceholders || []
    }, 'Category AI suggestions retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch AI suggestions', 500);
  }
});

// Get category loyalty stats for a user
export const getCategoryLoyaltyStats = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const userId = (req as any).userId;

  try {
    const category = await Category.findOne({ slug, isActive: true }).lean();

    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    // If no user, return zeros
    if (!userId) {
      return sendSuccess(res, { ordersCount: 0, brandsCount: 0 }, 'Category loyalty stats retrieved successfully');
    }

    // Aggregate user's orders for this category
    const stats = await Order.aggregate([
      { $match: { user: userId } },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'orderProducts'
        }
      },
      {
        $match: {
          'orderProducts.category': category._id
        }
      },
      {
        $group: {
          _id: null,
          ordersCount: { $sum: 1 },
          brands: { $addToSet: '$items.store' }
        }
      },
      {
        $project: {
          _id: 0,
          ordersCount: 1,
          brandsCount: {
            $size: {
              $reduce: {
                input: '$brands',
                initialValue: [],
                in: { $setUnion: ['$$value', '$$this'] }
              }
            }
          }
        }
      }
    ]);

    const result = stats[0] || { ordersCount: 0, brandsCount: 0 };
    sendSuccess(res, result, 'Category loyalty stats retrieved successfully');

  } catch (error) {
    console.error('Loyalty Stats Error:', error);
    throw new AppError('Failed to fetch loyalty stats', 500);
  }
});

// Get recent orders for a category (for social proof ticker)
export const getRecentOrders = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const limit = parseInt(req.query.limit as string) || 5;

  try {
    const category = await Category.findOne({ slug, isActive: true }).lean();

    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    const recentOrders = await Order.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'orderProducts'
        }
      },
      {
        $match: {
          'orderProducts.category': category._id
        }
      },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $lookup: {
          from: 'stores',
          localField: 'items.store',
          foreignField: '_id',
          as: 'storeInfo'
        }
      },
      {
        $project: {
          _id: 1,
          userName: { $arrayElemAt: ['$userInfo.name', 0] },
          storeName: { $arrayElemAt: ['$storeInfo.name', 0] },
          createdAt: 1
        }
      }
    ]);

    const formattedOrders = recentOrders.map(order => {
      const minutesAgo = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
      let timeAgo = '';
      if (minutesAgo < 1) timeAgo = 'just now';
      else if (minutesAgo < 60) timeAgo = `${minutesAgo}m ago`;
      else if (minutesAgo < 1440) timeAgo = `${Math.floor(minutesAgo / 60)}h ago`;
      else timeAgo = `${Math.floor(minutesAgo / 1440)}d ago`;

      return {
        id: order._id,
        userName: order.userName?.split(' ')[0] || 'Someone',
        storeName: order.storeName || 'a store',
        timeAgo
      };
    });

    sendSuccess(res, { orders: formattedOrders }, 'Recent orders retrieved successfully');

  } catch (error) {
    console.error('Recent Orders Error:', error);
    throw new AppError('Failed to fetch recent orders', 500);
  }
});