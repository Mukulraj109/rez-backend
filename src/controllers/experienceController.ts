import { Request, Response } from 'express';
import StoreExperience from '../models/StoreExperience';
import { Store } from '../models/Store';
import { sendSuccess, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

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

    // Build store query based on filter criteria
    const storeQuery: any = { isActive: true };
    const filterCriteria = experience.filterCriteria;

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
        storeQuery.category = { $in: filterCriteria.categories };
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

    const [stores, total] = await Promise.all([
      Store.find(storeQuery)
        .populate({ path: 'category', select: 'name slug' })
        .sort({ 'ratings.average': -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Store.countDocuments(storeQuery),
    ]);

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
