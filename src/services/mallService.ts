/**
 * Mall Service
 *
 * Business logic for ReZ Mall feature including caching, aggregation, and analytics.
 */

import { Types } from 'mongoose';
import { MallBrand, IMallBrand } from '../models/MallBrand';
import { MallCategory, IMallCategory } from '../models/MallCategory';
import { MallCollection, IMallCollection } from '../models/MallCollection';
import { MallOffer, IMallOffer } from '../models/MallOffer';
import { MallBanner, IMallBanner } from '../models/MallBanner';
import redisService from './redisService';

// Cache TTL constants (in seconds)
const CACHE_TTL = {
  HOMEPAGE: 300,      // 5 minutes
  BRANDS: 600,        // 10 minutes
  CATEGORIES: 1800,   // 30 minutes
  COLLECTIONS: 900,   // 15 minutes
  OFFERS: 300,        // 5 minutes
  BANNERS: 600,       // 10 minutes
};

// Cache key prefixes
const CACHE_KEYS = {
  HOMEPAGE: 'mall:homepage',
  FEATURED_BRANDS: 'mall:brands:featured',
  NEW_ARRIVALS: 'mall:brands:new',
  TOP_RATED: 'mall:brands:top-rated',
  LUXURY_BRANDS: 'mall:brands:luxury',
  CATEGORIES: 'mall:categories',
  COLLECTIONS: 'mall:collections',
  OFFERS: 'mall:offers',
  BANNERS: 'mall:banners',
  BRAND: 'mall:brand',
};

// Types
export interface MallBrandFilters {
  category?: string;
  tier?: string;
  collection?: string;
  minCashback?: number;
  badges?: string[];
  search?: string;
}

export interface MallHomepageData {
  banners: IMallBanner[];
  featuredBrands: IMallBrand[];
  collections: IMallCollection[];
  categories: IMallCategory[];
  exclusiveOffers: IMallOffer[];
  newArrivals: IMallBrand[];
  topRatedBrands: IMallBrand[];
  luxuryBrands: IMallBrand[];
}

class MallService {
  private static instance: MallService;

  private constructor() {}

  public static getInstance(): MallService {
    if (!MallService.instance) {
      MallService.instance = new MallService();
    }
    return MallService.instance;
  }

  /**
   * Get homepage data (aggregated)
   */
  async getHomepageData(): Promise<MallHomepageData> {
    // Try to get from cache first
    const cacheKey = CACHE_KEYS.HOMEPAGE;
    const cached = await redisService.get<MallHomepageData>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch all data in parallel
    const [
      banners,
      featuredBrands,
      collections,
      categories,
      exclusiveOffers,
      newArrivals,
      topRatedBrands,
      luxuryBrands
    ] = await Promise.all([
      this.getHeroBanners(5),
      this.getFeaturedBrands(10),
      this.getCollections(5),
      this.getCategories(),
      this.getExclusiveOffers(6),
      this.getNewArrivals(8),
      this.getTopRatedBrands(5),
      this.getLuxuryBrands(6)
    ]);

    const homepageData: MallHomepageData = {
      banners,
      featuredBrands,
      collections,
      categories,
      exclusiveOffers,
      newArrivals,
      topRatedBrands,
      luxuryBrands
    };

    // Cache the result
    await redisService.set(cacheKey, homepageData, CACHE_TTL.HOMEPAGE);

    return homepageData;
  }

  /**
   * Get featured brands
   */
  async getFeaturedBrands(limit: number = 10): Promise<IMallBrand[]> {
    const cacheKey = `${CACHE_KEYS.FEATURED_BRANDS}:${limit}`;
    const cached = await redisService.get<IMallBrand[]>(cacheKey);
    if (cached) return cached;

    const brands = await MallBrand.find({
      isFeatured: true,
      isActive: true
    })
      .populate('mallCategory', 'name slug color icon')
      .sort({ 'ratings.average': -1 })
      .limit(limit)
      .lean();

    await redisService.set(cacheKey, brands, CACHE_TTL.BRANDS);
    return brands;
  }

  /**
   * Get new arrivals
   */
  async getNewArrivals(limit: number = 10): Promise<IMallBrand[]> {
    const cacheKey = `${CACHE_KEYS.NEW_ARRIVALS}:${limit}`;
    const cached = await redisService.get<IMallBrand[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const brands = await MallBrand.find({
      isActive: true,
      $or: [
        { isNewArrival: true },
        { newUntil: { $gte: now } }
      ]
    })
      .populate('mallCategory', 'name slug color icon')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    await redisService.set(cacheKey, brands, CACHE_TTL.BRANDS);
    return brands;
  }

  /**
   * Get top rated brands
   */
  async getTopRatedBrands(limit: number = 10): Promise<IMallBrand[]> {
    const cacheKey = `${CACHE_KEYS.TOP_RATED}:${limit}`;
    const cached = await redisService.get<IMallBrand[]>(cacheKey);
    if (cached) return cached;

    const brands = await MallBrand.find({
      isActive: true,
      'ratings.count': { $gte: 5 }
    })
      .populate('mallCategory', 'name slug color icon')
      .sort({ 'ratings.average': -1, 'ratings.successRate': -1 })
      .limit(limit)
      .lean();

    await redisService.set(cacheKey, brands, CACHE_TTL.BRANDS);
    return brands;
  }

  /**
   * Get luxury brands
   */
  async getLuxuryBrands(limit: number = 10): Promise<IMallBrand[]> {
    const cacheKey = `${CACHE_KEYS.LUXURY_BRANDS}:${limit}`;
    const cached = await redisService.get<IMallBrand[]>(cacheKey);
    if (cached) return cached;

    const brands = await MallBrand.find({
      isLuxury: true,
      isActive: true
    })
      .populate('mallCategory', 'name slug color icon')
      .sort({ 'ratings.average': -1 })
      .limit(limit)
      .lean();

    await redisService.set(cacheKey, brands, CACHE_TTL.BRANDS);
    return brands;
  }

  /**
   * Get all brands with filters
   */
  async getBrands(
    filters: MallBrandFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ brands: IMallBrand[]; total: number; pages: number }> {
    const query: any = { isActive: true };

    if (filters.category) {
      query.mallCategory = new Types.ObjectId(filters.category);
    }

    if (filters.tier) {
      query.tier = filters.tier;
    }

    if (filters.collection) {
      query.collections = new Types.ObjectId(filters.collection);
    }

    if (filters.minCashback) {
      query['cashback.percentage'] = { $gte: filters.minCashback };
    }

    if (filters.badges && filters.badges.length > 0) {
      query.badges = { $in: filters.badges };
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { tags: { $in: [new RegExp(filters.search, 'i')] } }
      ];
    }

    const skip = (page - 1) * limit;

    const [brands, total] = await Promise.all([
      MallBrand.find(query)
        .populate('mallCategory', 'name slug color icon')
        .sort({ 'ratings.average': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MallBrand.countDocuments(query)
    ]);

    return {
      brands,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * Get brand by ID
   */
  async getBrandById(brandId: string): Promise<IMallBrand | null> {
    const cacheKey = `${CACHE_KEYS.BRAND}:${brandId}`;
    const cached = await redisService.get<IMallBrand>(cacheKey);
    if (cached) return cached;

    const brand = await MallBrand.findById(brandId)
      .populate('mallCategory', 'name slug color icon')
      .populate('collections', 'name slug image')
      .lean();

    if (brand) {
      await redisService.set(cacheKey, brand, CACHE_TTL.BRANDS);
    }

    return brand;
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<IMallCategory[]> {
    const cacheKey = CACHE_KEYS.CATEGORIES;
    const cached = await redisService.get<IMallCategory[]>(cacheKey);
    if (cached) return cached;

    const categories = await MallCategory.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean();

    await redisService.set(cacheKey, categories, CACHE_TTL.CATEGORIES);
    return categories;
  }

  /**
   * Get brands by category
   */
  async getBrandsByCategory(
    categorySlug: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ brands: IMallBrand[]; total: number; category: IMallCategory | null }> {
    const category = await MallCategory.findOne({ slug: categorySlug, isActive: true }).lean();

    if (!category) {
      return { brands: [], total: 0, category: null };
    }

    const skip = (page - 1) * limit;
    const query = { mallCategory: category._id, isActive: true };

    const [brands, total] = await Promise.all([
      MallBrand.find(query)
        .populate('mallCategory', 'name slug color icon')
        .sort({ 'ratings.average': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MallBrand.countDocuments(query)
    ]);

    return { brands, total, category };
  }

  /**
   * Get all collections
   */
  async getCollections(limit: number = 10): Promise<IMallCollection[]> {
    const cacheKey = `${CACHE_KEYS.COLLECTIONS}:${limit}`;
    const cached = await redisService.get<IMallCollection[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const collections = await MallCollection.find({
      isActive: true,
      $or: [
        { validFrom: { $exists: false } },
        { validFrom: { $lte: now } }
      ]
    })
      .sort({ sortOrder: 1 })
      .limit(limit)
      .lean();

    // Filter out expired collections
    const validCollections = collections.filter(c =>
      !c.validUntil || new Date(c.validUntil) >= now
    );

    await redisService.set(cacheKey, validCollections, CACHE_TTL.COLLECTIONS);
    return validCollections;
  }

  /**
   * Get brands by collection
   */
  async getBrandsByCollection(
    collectionSlug: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ brands: IMallBrand[]; total: number; collection: IMallCollection | null }> {
    const collection = await MallCollection.findOne({ slug: collectionSlug, isActive: true }).lean();

    if (!collection) {
      return { brands: [], total: 0, collection: null };
    }

    const skip = (page - 1) * limit;
    const query = { collections: collection._id, isActive: true };

    const [brands, total] = await Promise.all([
      MallBrand.find(query)
        .populate('mallCategory', 'name slug color icon')
        .sort({ 'ratings.average': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MallBrand.countDocuments(query)
    ]);

    return { brands, total, collection };
  }

  /**
   * Get exclusive offers
   */
  async getExclusiveOffers(limit: number = 10): Promise<IMallOffer[]> {
    const cacheKey = `${CACHE_KEYS.OFFERS}:exclusive:${limit}`;
    const cached = await redisService.get<IMallOffer[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const offers = await MallOffer.find({
      isActive: true,
      isMallExclusive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    })
      .populate('brand', 'name slug logo tier')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    await redisService.set(cacheKey, offers, CACHE_TTL.OFFERS);
    return offers;
  }

  /**
   * Get all active offers
   */
  async getActiveOffers(page: number = 1, limit: number = 20): Promise<{ offers: IMallOffer[]; total: number }> {
    const now = new Date();
    const query = {
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    };

    const skip = (page - 1) * limit;

    const [offers, total] = await Promise.all([
      MallOffer.find(query)
        .populate('brand', 'name slug logo tier')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MallOffer.countDocuments(query)
    ]);

    return { offers, total };
  }

  /**
   * Get hero banners
   */
  async getHeroBanners(limit: number = 5): Promise<IMallBanner[]> {
    const cacheKey = `${CACHE_KEYS.BANNERS}:hero:${limit}`;
    const cached = await redisService.get<IMallBanner[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const banners = await MallBanner.find({
      isActive: true,
      position: 'hero',
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    })
      .populate('ctaBrand', 'name slug logo')
      .populate('ctaCategory', 'name slug')
      .populate('ctaCollection', 'name slug')
      .sort({ priority: -1 })
      .limit(limit)
      .lean();

    await redisService.set(cacheKey, banners, CACHE_TTL.BANNERS);
    return banners;
  }

  /**
   * Get all banners
   */
  async getAllBanners(): Promise<IMallBanner[]> {
    const cacheKey = `${CACHE_KEYS.BANNERS}:all`;
    const cached = await redisService.get<IMallBanner[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const banners = await MallBanner.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    })
      .populate('ctaBrand', 'name slug logo')
      .populate('ctaCategory', 'name slug')
      .populate('ctaCollection', 'name slug')
      .sort({ position: 1, priority: -1 })
      .lean();

    await redisService.set(cacheKey, banners, CACHE_TTL.BANNERS);
    return banners;
  }

  /**
   * Track brand click
   */
  async trackBrandClick(brandId: string, userId?: string): Promise<void> {
    try {
      await MallBrand.findByIdAndUpdate(brandId, {
        $inc: { 'analytics.clicks': 1 }
      });

      // Invalidate brand cache
      await redisService.del(`${CACHE_KEYS.BRAND}:${brandId}`);
    } catch (error) {
      console.error('Error tracking brand click:', error);
    }
  }

  /**
   * Track brand view
   */
  async trackBrandView(brandId: string): Promise<void> {
    try {
      await MallBrand.findByIdAndUpdate(brandId, {
        $inc: { 'analytics.views': 1 }
      });
    } catch (error) {
      console.error('Error tracking brand view:', error);
    }
  }

  /**
   * Track brand purchase
   */
  async trackBrandPurchase(brandId: string, cashbackAmount: number = 0): Promise<void> {
    try {
      await MallBrand.findByIdAndUpdate(brandId, {
        $inc: {
          'analytics.purchases': 1,
          'analytics.totalCashbackGiven': cashbackAmount
        }
      });

      // Invalidate brand cache
      await redisService.del(`${CACHE_KEYS.BRAND}:${brandId}`);
    } catch (error) {
      console.error('Error tracking brand purchase:', error);
    }
  }

  /**
   * Search brands
   */
  async searchBrands(query: string, limit: number = 20): Promise<IMallBrand[]> {
    if (!query || query.length < 2) return [];

    const brands = await MallBrand.find({
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } },
        { description: { $regex: query, $options: 'i' } }
      ]
    })
      .populate('mallCategory', 'name slug color icon')
      .sort({ 'ratings.average': -1 })
      .limit(limit)
      .lean();

    return brands;
  }

  /**
   * Invalidate all mall caches
   */
  async invalidateAllCaches(): Promise<void> {
    const keys = [
      CACHE_KEYS.HOMEPAGE,
      `${CACHE_KEYS.FEATURED_BRANDS}:*`,
      `${CACHE_KEYS.NEW_ARRIVALS}:*`,
      `${CACHE_KEYS.TOP_RATED}:*`,
      `${CACHE_KEYS.LUXURY_BRANDS}:*`,
      CACHE_KEYS.CATEGORIES,
      `${CACHE_KEYS.COLLECTIONS}:*`,
      `${CACHE_KEYS.OFFERS}:*`,
      `${CACHE_KEYS.BANNERS}:*`
    ];

    for (const key of keys) {
      if (key.includes('*')) {
        // Delete pattern - need to implement in redisService
        await redisService.del(key.replace(':*', ''));
      } else {
        await redisService.del(key);
      }
    }
  }
}

export default MallService.getInstance();
