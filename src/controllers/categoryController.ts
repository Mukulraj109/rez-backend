import { Request, Response } from 'express';
import { Category } from '../models/Category';
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