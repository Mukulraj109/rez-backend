/**
 * Cash Store Controller
 *
 * Handles Cash Store browsing endpoints:
 * - Dynamic categories for filter row
 * - Brands filtered by category/special filters
 * - Aggregated homepage data (single call)
 *
 * Delegates to mallService for all data access (MallBrand + MallCategory).
 */

import { Request, Response } from 'express';
import mallService from '../services/mallService';
import { sendSuccess, sendError } from '../utils/response';

// Virtual filter entries prepended to real categories
const VIRTUAL_FILTERS = [
  {
    _id: 'all',
    slug: 'all',
    name: 'All',
    icon: 'grid-outline',
    color: '#1a3a52',
    backgroundColor: '#faf1e0',
    maxCashback: 0,
    sortOrder: -2,
    brandCount: 0,
    isActive: true,
    isFeatured: false,
    isSpecialFilter: true,
  },
  {
    _id: 'most-popular',
    slug: 'most-popular',
    name: 'Popular',
    icon: 'star',
    color: '#E8B896',
    backgroundColor: '#faf1e0',
    maxCashback: 0,
    sortOrder: -1,
    brandCount: 0,
    isActive: true,
    isFeatured: false,
    isSpecialFilter: true,
  },
  {
    _id: 'high-cashback',
    slug: 'high-cashback',
    name: 'High Cashback',
    icon: 'flame',
    color: '#E8B896',
    backgroundColor: '#ffd7b5',
    maxCashback: 0,
    sortOrder: 0,
    brandCount: 0,
    isActive: true,
    isFeatured: false,
    isSpecialFilter: true,
  },
];

/**
 * GET /api/cashstore/categories
 * Returns active MallCategories with virtual filters prepended
 */
export const getCashStoreCategories = async (req: Request, res: Response) => {
  try {
    const dbCategories = await mallService.getCategories();

    // Map DB categories to include isSpecialFilter: false
    const mappedCategories = dbCategories.map((cat: any) => ({
      _id: cat._id,
      slug: cat.slug,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      backgroundColor: cat.backgroundColor || '#dfebf7',
      maxCashback: cat.maxCashback || 0,
      sortOrder: cat.sortOrder,
      brandCount: cat.brandCount || 0,
      isActive: cat.isActive,
      isFeatured: cat.isFeatured,
      isSpecialFilter: false,
    }));

    const allCategories = [...VIRTUAL_FILTERS, ...mappedCategories];

    return sendSuccess(res, allCategories, 'Categories fetched');
  } catch (error) {
    console.error('[CashStore] Error fetching categories:', error);
    return sendError(res, 'Failed to fetch categories', 500);
  }
};

/**
 * GET /api/cashstore/brands?category=<slug>&filter=<popular|high-cashback>&limit=12
 * Returns brands filtered by category slug or special filter
 */
export const getCashStoreBrands = async (req: Request, res: Response) => {
  try {
    const { category, filter, limit = '12', page = '1' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 12, 50);
    const pageNum = parseInt(page as string) || 1;

    let brands: any[] = [];
    let total = 0;

    if (filter === 'popular') {
      // Featured/popular brands
      const result = await mallService.getBrands(
        {},
        pageNum,
        limitNum
      );
      // Sort by isFeatured first, then rating
      brands = result.brands.sort((a: any, b: any) => {
        if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1;
        return (b.ratings?.average || 0) - (a.ratings?.average || 0);
      });
      total = result.total;
    } else if (filter === 'high-cashback') {
      // High cashback brands (10%+)
      const result = await mallService.getBrands(
        { minCashback: 10 },
        pageNum,
        limitNum
      );
      brands = result.brands;
      total = result.total;
    } else if (category && category !== 'all') {
      // Filter by category slug
      const result = await mallService.getBrandsByCategory(
        category as string,
        pageNum,
        limitNum
      );
      brands = result.brands;
      total = result.total;
    } else {
      // All brands (default)
      const result = await mallService.getBrands(
        {},
        pageNum,
        limitNum
      );
      brands = result.brands;
      total = result.total;
    }

    return sendSuccess(
      res,
      { brands, total, page: pageNum, limit: limitNum },
      'Brands fetched'
    );
  } catch (error) {
    console.error('[CashStore] Error fetching brands:', error);
    return sendError(res, 'Failed to fetch brands', 500);
  }
};

/**
 * GET /api/cashstore/homepage
 * Aggregated data for initial Cash Store load (single call instead of many)
 * Returns categories + top brands + trending brands + high cashback brands
 */
export const getCashStoreHomepage = async (req: Request, res: Response) => {
  try {
    const [
      dbCategories,
      topBrandsResult,
      featuredBrands,
      highCashbackResult,
    ] = await Promise.all([
      mallService.getCategories(),
      mallService.getBrands({}, 1, 12),
      mallService.getFeaturedBrands(12),
      mallService.getBrands({ minCashback: 10 }, 1, 10),
    ]);

    // Build categories with virtual filters
    const mappedCategories = dbCategories.map((cat: any) => ({
      _id: cat._id,
      slug: cat.slug,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      backgroundColor: cat.backgroundColor || '#dfebf7',
      maxCashback: cat.maxCashback || 0,
      sortOrder: cat.sortOrder,
      brandCount: cat.brandCount || 0,
      isActive: cat.isActive,
      isFeatured: cat.isFeatured,
      isSpecialFilter: false,
    }));

    const categories = [...VIRTUAL_FILTERS, ...mappedCategories];

    return sendSuccess(res, {
      categories,
      topBrands: topBrandsResult.brands,
      trendingBrands: featuredBrands,
      highCashbackBrands: highCashbackResult.brands,
    }, 'Cash Store homepage data fetched');
  } catch (error) {
    console.error('[CashStore] Error fetching homepage data:', error);
    return sendError(res, 'Failed to fetch homepage data', 500);
  }
};
