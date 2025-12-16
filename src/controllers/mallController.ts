/**
 * Mall Controller
 *
 * Handles all ReZ Mall API endpoints for brands, categories, collections, offers, and banners.
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import mallService from '../services/mallService';
import { MallBrand } from '../models/MallBrand';
import { MallCategory } from '../models/MallCategory';
import { MallCollection } from '../models/MallCollection';
import { MallOffer } from '../models/MallOffer';
import { MallBanner } from '../models/MallBanner';
import {
  sendSuccess,
  sendPaginated,
  sendNotFound,
  sendBadRequest,
  sendCreated,
  sendError
} from '../utils/response';

// Async handler wrapper
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Get Mall Homepage Data (aggregated)
 * GET /api/mall/homepage
 */
export const getMallHomepageData = asyncHandler(async (req: Request, res: Response) => {
  const homepageData = await mallService.getHomepageData();
  return sendSuccess(res, homepageData, 'Mall homepage data retrieved successfully');
});

/**
 * Get All Mall Brands with filters
 * GET /api/mall/brands
 */
export const getMallBrands = asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    tier,
    collection,
    minCashback,
    badges,
    search,
    page = '1',
    limit = '20'
  } = req.query;

  const filters = {
    category: category as string,
    tier: tier as string,
    collection: collection as string,
    minCashback: minCashback ? parseInt(minCashback as string) : undefined,
    badges: badges ? (badges as string).split(',') : undefined,
    search: search as string
  };

  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 20, 50);

  const { brands, total, pages } = await mallService.getBrands(filters, pageNum, limitNum);

  return sendPaginated(res, brands, pageNum, limitNum, total, 'Mall brands retrieved successfully');
});

/**
 * Get Featured Brands
 * GET /api/mall/brands/featured
 */
export const getFeaturedBrands = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const brands = await mallService.getFeaturedBrands(limit);
  return sendSuccess(res, brands, 'Featured brands retrieved successfully');
});

/**
 * Get New Arrivals
 * GET /api/mall/brands/new
 */
export const getNewArrivals = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const brands = await mallService.getNewArrivals(limit);
  return sendSuccess(res, brands, 'New arrivals retrieved successfully');
});

/**
 * Get Top Rated Brands
 * GET /api/mall/brands/top-rated
 */
export const getTopRatedBrands = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const brands = await mallService.getTopRatedBrands(limit);
  return sendSuccess(res, brands, 'Top rated brands retrieved successfully');
});

/**
 * Get Luxury Brands
 * GET /api/mall/brands/luxury
 */
export const getLuxuryBrands = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const brands = await mallService.getLuxuryBrands(limit);
  return sendSuccess(res, brands, 'Luxury brands retrieved successfully');
});

/**
 * Search Brands
 * GET /api/mall/brands/search
 */
export const searchBrands = asyncHandler(async (req: Request, res: Response) => {
  const { q, limit = '20' } = req.query;

  if (!q || (q as string).length < 2) {
    return sendBadRequest(res, 'Search query must be at least 2 characters');
  }

  const brands = await mallService.searchBrands(q as string, parseInt(limit as string));
  return sendSuccess(res, brands, 'Search results retrieved successfully');
});

/**
 * Get Brand by ID
 * GET /api/mall/brands/:brandId
 */
export const getMallBrandById = asyncHandler(async (req: Request, res: Response) => {
  const { brandId } = req.params;

  if (!Types.ObjectId.isValid(brandId)) {
    return sendBadRequest(res, 'Invalid brand ID');
  }

  const brand = await mallService.getBrandById(brandId);

  if (!brand) {
    return sendNotFound(res, 'Brand not found');
  }

  // Track view
  await mallService.trackBrandView(brandId);

  return sendSuccess(res, brand, 'Brand retrieved successfully');
});

/**
 * Get Mall Categories
 * GET /api/mall/categories
 */
export const getMallCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await mallService.getCategories();
  return sendSuccess(res, categories, 'Mall categories retrieved successfully');
});

/**
 * Get Brands by Category
 * GET /api/mall/categories/:slug/brands
 */
export const getBrandsByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const { page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 20, 50);

  const { brands, total, category } = await mallService.getBrandsByCategory(slug, pageNum, limitNum);

  if (!category) {
    return sendNotFound(res, 'Category not found');
  }

  return sendSuccess(res, {
    category,
    brands,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  }, 'Brands by category retrieved successfully');
});

/**
 * Get Mall Collections
 * GET /api/mall/collections
 */
export const getMallCollections = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const collections = await mallService.getCollections(limit);
  return sendSuccess(res, collections, 'Mall collections retrieved successfully');
});

/**
 * Get Brands by Collection
 * GET /api/mall/collections/:slug/brands
 */
export const getBrandsByCollection = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const { page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 20, 50);

  const { brands, total, collection } = await mallService.getBrandsByCollection(slug, pageNum, limitNum);

  if (!collection) {
    return sendNotFound(res, 'Collection not found');
  }

  return sendSuccess(res, {
    collection,
    brands,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  }, 'Brands by collection retrieved successfully');
});

/**
 * Get Exclusive Offers
 * GET /api/mall/offers/exclusive
 */
export const getExclusiveOffers = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const offers = await mallService.getExclusiveOffers(limit);
  return sendSuccess(res, offers, 'Exclusive offers retrieved successfully');
});

/**
 * Get All Active Offers
 * GET /api/mall/offers
 */
export const getMallOffers = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 20, 50);

  const { offers, total } = await mallService.getActiveOffers(pageNum, limitNum);

  return sendPaginated(res, offers, pageNum, limitNum, total, 'Mall offers retrieved successfully');
});

/**
 * Get Hero Banners
 * GET /api/mall/banners/hero
 */
export const getMallHeroBanners = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 5, 10);
  const banners = await mallService.getHeroBanners(limit);
  return sendSuccess(res, banners, 'Hero banners retrieved successfully');
});

/**
 * Get All Banners
 * GET /api/mall/banners
 */
export const getMallBanners = asyncHandler(async (req: Request, res: Response) => {
  const banners = await mallService.getAllBanners();
  return sendSuccess(res, banners, 'Mall banners retrieved successfully');
});

/**
 * Track Brand Click
 * POST /api/mall/brands/:brandId/click
 */
export const trackBrandClick = asyncHandler(async (req: Request, res: Response) => {
  const { brandId } = req.params;
  const userId = (req as any).user?._id?.toString();

  if (!Types.ObjectId.isValid(brandId)) {
    return sendBadRequest(res, 'Invalid brand ID');
  }

  await mallService.trackBrandClick(brandId, userId);
  return sendSuccess(res, null, 'Click tracked successfully');
});

/**
 * Track Brand Purchase
 * POST /api/mall/brands/:brandId/purchase
 */
export const trackBrandPurchase = asyncHandler(async (req: Request, res: Response) => {
  const { brandId } = req.params;
  const { cashbackAmount = 0 } = req.body;

  if (!Types.ObjectId.isValid(brandId)) {
    return sendBadRequest(res, 'Invalid brand ID');
  }

  await mallService.trackBrandPurchase(brandId, cashbackAmount);
  return sendSuccess(res, null, 'Purchase tracked successfully');
});

// ==================== ADMIN ENDPOINTS ====================

/**
 * Create Mall Brand (Admin)
 * POST /api/mall/admin/brands
 */
export const createMallBrand = asyncHandler(async (req: Request, res: Response) => {
  const brandData = req.body;

  // Validate required fields
  if (!brandData.name || !brandData.logo || !brandData.mallCategory) {
    return sendBadRequest(res, 'Name, logo, and category are required');
  }

  // Check if category exists
  const category = await MallCategory.findById(brandData.mallCategory);
  if (!category) {
    return sendBadRequest(res, 'Invalid category');
  }

  const brand = new MallBrand(brandData);
  await brand.save();

  // Update category brand count
  await MallCategory.findByIdAndUpdate(brandData.mallCategory, {
    $inc: { brandCount: 1 }
  });

  // Invalidate caches
  await mallService.invalidateAllCaches();

  return sendCreated(res, brand, 'Mall brand created successfully');
});

/**
 * Update Mall Brand (Admin)
 * PUT /api/mall/admin/brands/:brandId
 */
export const updateMallBrand = asyncHandler(async (req: Request, res: Response) => {
  const { brandId } = req.params;
  const updateData = req.body;

  if (!Types.ObjectId.isValid(brandId)) {
    return sendBadRequest(res, 'Invalid brand ID');
  }

  const brand = await MallBrand.findByIdAndUpdate(brandId, updateData, { new: true });

  if (!brand) {
    return sendNotFound(res, 'Brand not found');
  }

  // Invalidate caches
  await mallService.invalidateAllCaches();

  return sendSuccess(res, brand, 'Mall brand updated successfully');
});

/**
 * Delete Mall Brand (Admin)
 * DELETE /api/mall/admin/brands/:brandId
 */
export const deleteMallBrand = asyncHandler(async (req: Request, res: Response) => {
  const { brandId } = req.params;

  if (!Types.ObjectId.isValid(brandId)) {
    return sendBadRequest(res, 'Invalid brand ID');
  }

  const brand = await MallBrand.findById(brandId);

  if (!brand) {
    return sendNotFound(res, 'Brand not found');
  }

  // Update category brand count
  if (brand.mallCategory) {
    await MallCategory.findByIdAndUpdate(brand.mallCategory, {
      $inc: { brandCount: -1 }
    });
  }

  await MallBrand.findByIdAndDelete(brandId);

  // Invalidate caches
  await mallService.invalidateAllCaches();

  return sendSuccess(res, null, 'Mall brand deleted successfully');
});

/**
 * Create Mall Category (Admin)
 * POST /api/mall/admin/categories
 */
export const createMallCategory = asyncHandler(async (req: Request, res: Response) => {
  const categoryData = req.body;

  if (!categoryData.name || !categoryData.icon || !categoryData.color) {
    return sendBadRequest(res, 'Name, icon, and color are required');
  }

  const category = new MallCategory(categoryData);
  await category.save();

  await mallService.invalidateAllCaches();

  return sendCreated(res, category, 'Mall category created successfully');
});

/**
 * Update Mall Category (Admin)
 * PUT /api/mall/admin/categories/:categoryId
 */
export const updateMallCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const updateData = req.body;

  if (!Types.ObjectId.isValid(categoryId)) {
    return sendBadRequest(res, 'Invalid category ID');
  }

  const category = await MallCategory.findByIdAndUpdate(categoryId, updateData, { new: true });

  if (!category) {
    return sendNotFound(res, 'Category not found');
  }

  await mallService.invalidateAllCaches();

  return sendSuccess(res, category, 'Mall category updated successfully');
});

/**
 * Delete Mall Category (Admin)
 * DELETE /api/mall/admin/categories/:categoryId
 */
export const deleteMallCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params;

  if (!Types.ObjectId.isValid(categoryId)) {
    return sendBadRequest(res, 'Invalid category ID');
  }

  // Check if any brands use this category
  const brandsCount = await MallBrand.countDocuments({ mallCategory: categoryId });
  if (brandsCount > 0) {
    return sendBadRequest(res, `Cannot delete category. ${brandsCount} brands are using it.`);
  }

  const category = await MallCategory.findByIdAndDelete(categoryId);

  if (!category) {
    return sendNotFound(res, 'Category not found');
  }

  await mallService.invalidateAllCaches();

  return sendSuccess(res, null, 'Mall category deleted successfully');
});

/**
 * Create Mall Collection (Admin)
 * POST /api/mall/admin/collections
 */
export const createMallCollection = asyncHandler(async (req: Request, res: Response) => {
  const collectionData = req.body;

  if (!collectionData.name || !collectionData.image) {
    return sendBadRequest(res, 'Name and image are required');
  }

  const collection = new MallCollection(collectionData);
  await collection.save();

  await mallService.invalidateAllCaches();

  return sendCreated(res, collection, 'Mall collection created successfully');
});

/**
 * Update Mall Collection (Admin)
 * PUT /api/mall/admin/collections/:collectionId
 */
export const updateMallCollection = asyncHandler(async (req: Request, res: Response) => {
  const { collectionId } = req.params;
  const updateData = req.body;

  if (!Types.ObjectId.isValid(collectionId)) {
    return sendBadRequest(res, 'Invalid collection ID');
  }

  const collection = await MallCollection.findByIdAndUpdate(collectionId, updateData, { new: true });

  if (!collection) {
    return sendNotFound(res, 'Collection not found');
  }

  await mallService.invalidateAllCaches();

  return sendSuccess(res, collection, 'Mall collection updated successfully');
});

/**
 * Delete Mall Collection (Admin)
 * DELETE /api/mall/admin/collections/:collectionId
 */
export const deleteMallCollection = asyncHandler(async (req: Request, res: Response) => {
  const { collectionId } = req.params;

  if (!Types.ObjectId.isValid(collectionId)) {
    return sendBadRequest(res, 'Invalid collection ID');
  }

  const collection = await MallCollection.findByIdAndDelete(collectionId);

  if (!collection) {
    return sendNotFound(res, 'Collection not found');
  }

  // Remove collection reference from brands
  await MallBrand.updateMany(
    { collections: collectionId },
    { $pull: { collections: collectionId } }
  );

  await mallService.invalidateAllCaches();

  return sendSuccess(res, null, 'Mall collection deleted successfully');
});

/**
 * Create Mall Offer (Admin)
 * POST /api/mall/admin/offers
 */
export const createMallOffer = asyncHandler(async (req: Request, res: Response) => {
  const offerData = req.body;

  if (!offerData.title || !offerData.image || !offerData.brand || !offerData.value) {
    return sendBadRequest(res, 'Title, image, brand, and value are required');
  }

  // Check if brand exists
  const brand = await MallBrand.findById(offerData.brand);
  if (!brand) {
    return sendBadRequest(res, 'Invalid brand');
  }

  const offer = new MallOffer(offerData);
  await offer.save();

  await mallService.invalidateAllCaches();

  return sendCreated(res, offer, 'Mall offer created successfully');
});

/**
 * Update Mall Offer (Admin)
 * PUT /api/mall/admin/offers/:offerId
 */
export const updateMallOffer = asyncHandler(async (req: Request, res: Response) => {
  const { offerId } = req.params;
  const updateData = req.body;

  if (!Types.ObjectId.isValid(offerId)) {
    return sendBadRequest(res, 'Invalid offer ID');
  }

  const offer = await MallOffer.findByIdAndUpdate(offerId, updateData, { new: true });

  if (!offer) {
    return sendNotFound(res, 'Offer not found');
  }

  await mallService.invalidateAllCaches();

  return sendSuccess(res, offer, 'Mall offer updated successfully');
});

/**
 * Delete Mall Offer (Admin)
 * DELETE /api/mall/admin/offers/:offerId
 */
export const deleteMallOffer = asyncHandler(async (req: Request, res: Response) => {
  const { offerId } = req.params;

  if (!Types.ObjectId.isValid(offerId)) {
    return sendBadRequest(res, 'Invalid offer ID');
  }

  const offer = await MallOffer.findByIdAndDelete(offerId);

  if (!offer) {
    return sendNotFound(res, 'Offer not found');
  }

  await mallService.invalidateAllCaches();

  return sendSuccess(res, null, 'Mall offer deleted successfully');
});

/**
 * Create Mall Banner (Admin)
 * POST /api/mall/admin/banners
 */
export const createMallBanner = asyncHandler(async (req: Request, res: Response) => {
  const bannerData = req.body;

  if (!bannerData.title || !bannerData.image) {
    return sendBadRequest(res, 'Title and image are required');
  }

  const banner = new MallBanner(bannerData);
  await banner.save();

  await mallService.invalidateAllCaches();

  return sendCreated(res, banner, 'Mall banner created successfully');
});

/**
 * Update Mall Banner (Admin)
 * PUT /api/mall/admin/banners/:bannerId
 */
export const updateMallBanner = asyncHandler(async (req: Request, res: Response) => {
  const { bannerId } = req.params;
  const updateData = req.body;

  if (!Types.ObjectId.isValid(bannerId)) {
    return sendBadRequest(res, 'Invalid banner ID');
  }

  const banner = await MallBanner.findByIdAndUpdate(bannerId, updateData, { new: true });

  if (!banner) {
    return sendNotFound(res, 'Banner not found');
  }

  await mallService.invalidateAllCaches();

  return sendSuccess(res, banner, 'Mall banner updated successfully');
});

/**
 * Delete Mall Banner (Admin)
 * DELETE /api/mall/admin/banners/:bannerId
 */
export const deleteMallBanner = asyncHandler(async (req: Request, res: Response) => {
  const { bannerId } = req.params;

  if (!Types.ObjectId.isValid(bannerId)) {
    return sendBadRequest(res, 'Invalid banner ID');
  }

  const banner = await MallBanner.findByIdAndDelete(bannerId);

  if (!banner) {
    return sendNotFound(res, 'Banner not found');
  }

  await mallService.invalidateAllCaches();

  return sendSuccess(res, null, 'Mall banner deleted successfully');
});
