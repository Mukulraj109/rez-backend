import { Request, Response } from 'express';
import StoreExperience from '../models/StoreExperience';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { sendSuccess, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { regionService, isValidRegion, RegionId } from '../services/regionService';

/**
 * Get all active store experiences
 * GET /api/experiences
 */
export const getExperiences = asyncHandler(async (req: Request, res: Response) => {
  const { featured, limit = 10 } = req.query;

  try {
    const query: any = { isActive: true };

    if (featured === 'true') {
      query.isFeatured = true;
    }

    console.log('🔍 [EXPERIENCES] Fetching store experiences...');

    const experiences = await StoreExperience.find(query)
      .sort({ sortOrder: 1 })
      .limit(Number(limit))
      .lean();

    console.log(`✅ [EXPERIENCES] Found ${experiences.length} experiences`);

    sendSuccess(res, {
      experiences,
      total: experiences.length,
    }, 'Store experiences retrieved successfully');

  } catch (error) {
    console.error('❌ [EXPERIENCES] Error fetching experiences:', error);
    throw new AppError('Failed to fetch experiences', 500);
  }
});

/**
 * Get experience by slug or ID
 * GET /api/experiences/:experienceId
 */
export const getExperienceById = asyncHandler(async (req: Request, res: Response) => {
  const { experienceId } = req.params;

  try {
    const query = experienceId.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: experienceId }
      : { slug: experienceId.toLowerCase() };

    const experience = await StoreExperience.findOne(query).lean();

    if (!experience) {
      return sendNotFound(res, 'Experience not found');
    }

    sendSuccess(res, experience, 'Experience retrieved successfully');

  } catch (error) {
    console.error('❌ [EXPERIENCES] Error fetching experience:', error);
    throw new AppError('Failed to fetch experience', 500);
  }
});

/**
 * Get stores by experience type
 * GET /api/experiences/:experienceId/stores
 */
export const getStoresByExperience = asyncHandler(async (req: Request, res: Response) => {
  const { experienceId } = req.params;
  const { page = 1, limit = 20, location } = req.query;

  try {
    // Find the experience first
    const query = experienceId.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: experienceId }
      : { slug: experienceId.toLowerCase() };

    const experience = await StoreExperience.findOne(query).lean();

    if (!experience) {
      return sendNotFound(res, 'Experience not found');
    }

    // Get region from X-Rez-Region header
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    // Build store query based on filter criteria
    const storeQuery: any = { isActive: true };
    const filterCriteria = experience.filterCriteria;

    // Add region filter
    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      Object.assign(storeQuery, regionFilter);
    }

    if (filterCriteria) {
      if (filterCriteria.tags && filterCriteria.tags.length > 0) {
        storeQuery.tags = { $in: filterCriteria.tags };
      }
      if (filterCriteria.minRating) {
        storeQuery['ratings.average'] = { $gte: filterCriteria.minRating };
      }
      if (filterCriteria.isPremium !== undefined) {
        storeQuery['offers.partnerLevel'] = { $in: ['gold', 'platinum'] };
      }
      if (filterCriteria.categories && filterCriteria.categories.length > 0) {
        // Fix: Look up Category IDs from names to prevent CastError
        const categories = await Category.find({
          name: { $in: filterCriteria.categories }
        }).select('_id');

        if (categories.length > 0) {
          storeQuery.category = { $in: categories.map(c => c._id) };
        } else {
          // If filter specifies categories but none found, return no stores
          storeQuery.category = { $in: [] };
        }
      }
    }

    // Handle location-based filtering
    let userLng: number | undefined;
    let userLat: number | undefined;
    if (location) {
      const [lng, lat] = (location as string).split(',').map(Number);
      if (!isNaN(lng) && !isNaN(lat)) {
        userLng = lng;
        userLat = lat;
        const radiusInRadians = 10 / 6371; // 10km radius
        storeQuery['location.coordinates'] = {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusInRadians],
          },
        };
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Handle keyword search
    const { q } = req.query;
    if (q) {
      const searchRegex = new RegExp(q as string, 'i');
      storeQuery.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } }
      ];
    }

    const [storesRaw, total] = await Promise.all([
      Store.find(storeQuery)
        .populate({ path: 'category', select: 'name slug' })
        .sort({ 'ratings.average': -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Store.countDocuments(storeQuery),
    ]);

    // Enhance store data for frontend
    const stores = storesRaw.map((store: any) => {
      // Calculate or mock distance
      let distance = '2.5 km'; // Default mock
      if (userLng && userLat && store.location?.coordinates) {
        const [storeLng, storeLat] = store.location.coordinates;
        const dist = Math.sqrt(
          Math.pow(storeLng - userLng, 2) + Math.pow(storeLat - userLat, 2)
        ) * 111; // Rough estimation in km
        distance = `${dist.toFixed(1)} km`;
      } else if (store.location?.distance) {
        distance = store.location.distance;
      }

      return {
        ...store,
        id: store._id, // Ensure ID is available as 'id'
        image: store.logo || store.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300', // Fallback image
        distance: distance,
        rating: store.ratings?.average || 4.5, // verified default
        offer: store.offers?.offer || (store.offers?.cashback ? `${store.offers.cashback}% Cashback` : 'Special Deal'),
      };
    });

    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      experience,
      stores,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
      },
    }, 'Stores for experience retrieved successfully');

  } catch (error) {
    console.error('❌ [EXPERIENCES] Error fetching stores by experience:', error);
    throw new AppError('Failed to fetch stores', 500);
  }
});

/**
 * Get experiences for homepage store experiences section
 * GET /api/experiences/homepage
 */
export const getHomepageExperiences = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 4 } = req.query;

  try {
    const experiences = await StoreExperience.find({
      isActive: true,
      isFeatured: true,
    })
      .sort({ sortOrder: 1 })
      .limit(Number(limit))
      .lean();

    // Format for frontend StoreExperiencesSection
    const formattedExperiences = experiences.map(exp => ({
      icon: exp.icon,
      title: exp.title,
      type: exp.type,
      badge: exp.badge,
      subtitle: exp.subtitle,
    }));

    sendSuccess(res, {
      experiences: formattedExperiences,
      total: formattedExperiences.length,
    }, 'Homepage experiences retrieved successfully');

  } catch (error) {
    console.error('❌ [EXPERIENCES] Error fetching homepage experiences:', error);
    throw new AppError('Failed to fetch experiences', 500);
  }
});

/**
 * Get Unique Finds for "Think Outside the Box" section
 * GET /api/experiences/unique-finds
 */
export const getUniqueFinds = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10, experience } = req.query;

  try {
    // Get region from X-Rez-Region header
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    // Strategy: Find products with stock that are active
    const query: any = {
      isActive: true,
      'inventory.stock': { $gt: 0 },
    };

    // Add region filter by finding stores in region first
    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      const storesInRegion = await Store.find({ isActive: true, ...regionFilter }).select('_id').lean();
      const storeIds = storesInRegion.map((s: any) => s._id);
      query.store = { $in: storeIds };
    }

    // Filter by experience type if provided
    if (experience) {
      const slug = (experience as string).toLowerCase();

      // Define filters based on experience slug
      if (slug.includes('fast') || slug.includes('delivery')) {
        query.tags = { $in: ['fast', 'express', 'essential', 'grocery'] };
      } else if (slug.includes('luxury') || slug.includes('premium')) {
        query.tags = { $in: ['luxury', 'premium', 'designer', 'gold'] };
        // Also filter by high price for luxury
        query['pricing.selling'] = { $gt: 2000 };
      } else if (slug.includes('sample') || slug.includes('trial')) {
        query.tags = { $in: ['sample', 'trial', 'tester', 'mini'] };
      } else if (slug.includes('organic') || slug.includes('green')) {
        query.tags = { $in: ['organic', 'natural', 'eco', 'sustainable'] };
      } else if (slug.includes('men')) {
        query.tags = { $in: ['men', 'male', 'grooming', 'fashion'] };
      } else if (slug.includes('women')) {
        query.tags = { $in: ['women', 'female', 'beauty', 'fashion'] };
      } else if (slug.includes('kid') || slug.includes('child')) {
        query.tags = { $in: ['kids', 'toys', 'baby', 'games'] };
      } else if (slug.includes('gift')) {
        query.tags = { $in: ['gift', 'present', 'hamper'] };
      }
      // If no specific tag mapping, we default to showing best rated products
    }

    // Handle keyword search
    const { q } = req.query;
    if (q) {
      const searchRegex = new RegExp(q as string, 'i');
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } }
      ];
    }

    const products = await (Product as any).find(query)
      .sort({ 'ratings.average': -1 }) // Highest rated first
      .select('name category pricing images ratings tags')
      .populate('category', 'name')
      .limit(Number(limit))
      .lean();

    const formattedProducts = products.map((p: any) => ({
      id: p._id,
      title: p.name,
      category: (p.category as any)?.name || 'General',
      price: p.pricing.selling === 0 ? 'Free' : `${p.pricing.currency === 'USD' ? '$' : '₹'}${p.pricing.selling}`,
      image: p.images?.[0] || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?w=300',
      rating: p.ratings?.average || 4.5
    }));

    sendSuccess(res, formattedProducts, 'Unique finds retrieved successfully');
  } catch (error) {
    console.error('❌ [EXPERIENCES] Error fetching unique finds:', error);
    throw new AppError('Failed to fetch unique finds', 500);
  }
});
