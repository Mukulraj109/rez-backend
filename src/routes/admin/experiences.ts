import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import StoreExperience from '../../models/StoreExperience';
import { Store } from '../../models/Store';
import { Category } from '../../models/Category';
import Joi from 'joi';
import mongoose from 'mongoose';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createExperienceSchema = Joi.object({
  slug: Joi.string().trim().lowercase().required().pattern(/^[a-z0-9-]+$/),
  title: Joi.string().trim().max(100).required(),
  subtitle: Joi.string().trim().max(200).optional().allow(''),
  description: Joi.string().trim().max(500).optional().allow(''),
  icon: Joi.string().trim().required(),
  iconType: Joi.string().valid('emoji', 'url', 'icon-name').default('emoji'),
  type: Joi.string().valid(
    'fastDelivery', 'budgetFriendly', 'premium', 'organic',
    'oneRupee', 'ninetyNine', 'luxury', 'verified', 'partner', 'mall', 'custom'
  ).required(),
  badge: Joi.string().trim().optional().allow(''),
  badgeBg: Joi.string().trim().optional(),
  badgeColor: Joi.string().trim().optional(),
  backgroundColor: Joi.string().trim().optional(),
  gradientColors: Joi.array().items(Joi.string()).optional(),
  image: Joi.string().trim().uri().optional().allow(''),
  bannerImage: Joi.string().trim().uri().optional().allow(''),
  benefits: Joi.array().items(Joi.string().trim()).optional(),
  filterCriteria: Joi.object({
    tags: Joi.array().items(Joi.string().trim()).optional(),
    maxDeliveryTime: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    minRating: Joi.number().min(0).max(5).optional(),
    isPremium: Joi.boolean().optional(),
    isOrganic: Joi.boolean().optional(),
    isPartner: Joi.boolean().optional(),
    isMall: Joi.boolean().optional(),
    isFastDelivery: Joi.boolean().optional(),
    isBudgetFriendly: Joi.boolean().optional(),
    isVerified: Joi.boolean().optional(),
    categories: Joi.array().items(Joi.string()).optional(),
  }).optional(),
  regions: Joi.array().items(Joi.string().valid('bangalore', 'dubai', 'china')).optional(),
  sortOrder: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false),
});

const updateExperienceSchema = createExperienceSchema.fork(
  ['slug', 'title', 'icon', 'type'],
  (schema) => schema.optional()
);

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('active', 'inactive', 'all').default('all'),
  featured: Joi.string().valid('true', 'false').optional(),
  type: Joi.string().optional(),
  search: Joi.string().trim().optional(),
  sortBy: Joi.string().valid('sortOrder', 'title', 'createdAt', 'updatedAt').default('sortOrder'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

const reorderSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      sortOrder: Joi.number().integer().min(0).required(),
    })
  ).min(1).required(),
});

// ============================================
// GET EXPERIENCES STATS
// ============================================

/**
 * @route   GET /api/admin/experiences/stats
 * @desc    Get experience statistics for dashboard
 * @access  Admin
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await StoreExperience.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          active: [{ $match: { isActive: true } }, { $count: 'count' }],
          inactive: [{ $match: { isActive: false } }, { $count: 'count' }],
          featured: [{ $match: { isFeatured: true, isActive: true } }, { $count: 'count' }],
          byType: [
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
        },
      },
    ]);

    const result = stats[0];

    return res.json({
      success: true,
      data: {
        total: result.total[0]?.count || 0,
        active: result.active[0]?.count || 0,
        inactive: result.inactive[0]?.count || 0,
        featured: result.featured[0]?.count || 0,
        byType: result.byType.reduce((acc: Record<string, number>, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (error: any) {
    console.error('[ADMIN EXPERIENCES] Stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
});

// ============================================
// LIST EXPERIENCES
// ============================================

/**
 * @route   GET /api/admin/experiences
 * @desc    List all experiences with pagination
 * @access  Admin
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = listQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { page, limit, status, featured, type, search, sortBy, sortOrder } = value;

    // Build query
    const query: any = {};

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (featured === 'true') {
      query.isFeatured = true;
    } else if (featured === 'false') {
      query.isFeatured = false;
    }

    if (type) {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    // Get total count
    const total = await StoreExperience.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Get experiences
    const experiences = await StoreExperience.find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: {
        experiences,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('[ADMIN EXPERIENCES] List error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch experiences',
      error: error.message,
    });
  }
});

// ============================================
// GET CATEGORIES FOR FILTER BUILDER
// ============================================

/**
 * @route   GET /api/admin/experiences/categories/list
 * @desc    Get all categories for filter criteria builder
 * @access  Admin
 */
router.get('/categories/list', async (req: Request, res: Response) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('_id name slug icon')
      .sort({ name: 1 })
      .lean();

    return res.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error('[ADMIN EXPERIENCES] Get categories error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message,
    });
  }
});

// ============================================
// GET COMMON TAGS FROM STORES
// ============================================

/**
 * @route   GET /api/admin/experiences/tags/list
 * @desc    Get common tags used by stores for filter criteria builder
 * @access  Admin
 */
router.get('/tags/list', async (req: Request, res: Response) => {
  try {
    const tags = await Store.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $match: { count: { $gte: 2 } } },
      { $sort: { count: -1 } },
      { $limit: 100 },
    ]);

    return res.json({
      success: true,
      data: tags.map(t => ({ tag: t._id, count: t.count })),
    });
  } catch (error: any) {
    console.error('[ADMIN EXPERIENCES] Get tags error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch tags',
      error: error.message,
    });
  }
});

// ============================================
// PREVIEW MATCHING STORES
// ============================================

/**
 * @route   POST /api/admin/experiences/preview-stores
 * @desc    Preview which stores match the filter criteria
 * @access  Admin
 */
router.post('/preview-stores', async (req: Request, res: Response) => {
  try {
    const { filterCriteria, limit = 10 } = req.body;

    const storeQuery: any = { isActive: true };

    if (filterCriteria) {
      if (filterCriteria.tags && filterCriteria.tags.length > 0) {
        storeQuery.tags = { $in: filterCriteria.tags };
      }
      if (filterCriteria.minRating && filterCriteria.minRating > 0) {
        storeQuery['ratings.average'] = { $gte: filterCriteria.minRating };
      }
      if (filterCriteria.isPremium === true) {
        storeQuery['deliveryCategories.premium'] = true;
      }
      if (filterCriteria.isOrganic === true) {
        storeQuery['deliveryCategories.organic'] = true;
      }
      if (filterCriteria.isMall === true) {
        storeQuery['deliveryCategories.mall'] = true;
      }
      if (filterCriteria.isPartner === true) {
        storeQuery['offers.isPartner'] = true;
      }
      if (filterCriteria.isFastDelivery === true) {
        storeQuery['deliveryCategories.fastDelivery'] = true;
      }
      if (filterCriteria.isBudgetFriendly === true) {
        storeQuery['deliveryCategories.budgetFriendly'] = true;
      }
      if (filterCriteria.categories && filterCriteria.categories.length > 0) {
        const categories = await Category.find({
          $or: [
            { _id: { $in: filterCriteria.categories.filter((c: string) => mongoose.Types.ObjectId.isValid(c)) } },
            { name: { $in: filterCriteria.categories } },
            { slug: { $in: filterCriteria.categories } },
          ]
        }).select('_id');

        if (categories.length > 0) {
          storeQuery.category = { $in: categories.map(c => c._id) };
        }
      }
    }

    const [total, stores] = await Promise.all([
      Store.countDocuments(storeQuery),
      Store.find(storeQuery)
        .select('name logo location.city ratings.average offers.cashback tags category')
        .populate('category', 'name')
        .sort({ 'ratings.average': -1 })
        .limit(Number(limit))
        .lean(),
    ]);

    return res.json({
      success: true,
      data: {
        total,
        stores: stores.map((store: any) => ({
          _id: store._id,
          name: store.name,
          logo: store.logo,
          city: store.location?.city,
          rating: store.ratings?.average,
          cashback: store.offers?.cashback,
          category: store.category?.name,
          tags: store.tags?.slice(0, 5),
        })),
      },
    });
  } catch (error: any) {
    console.error('[ADMIN EXPERIENCES] Preview stores error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to preview stores',
      error: error.message,
    });
  }
});

// ============================================
// REFRESH ALL STORE COUNTS
// ============================================

/**
 * @route   POST /api/admin/experiences/refresh-all-counts
 * @desc    Refresh store counts for all experiences
 * @access  Admin
 */
router.post('/refresh-all-counts', async (req: Request, res: Response) => {
  try {
    const experiences = await StoreExperience.find();
    let updated = 0;

    for (const experience of experiences) {
      const storeQuery: any = { isActive: true };
      const filterCriteria = experience.filterCriteria;

      if (filterCriteria) {
        if (filterCriteria.tags && filterCriteria.tags.length > 0) {
          storeQuery.tags = { $in: filterCriteria.tags };
        }
        if (filterCriteria.minRating && filterCriteria.minRating > 0) {
          storeQuery['ratings.average'] = { $gte: filterCriteria.minRating };
        }
        if ((filterCriteria as any).isPremium === true) {
          storeQuery['deliveryCategories.premium'] = true;
        }
        if ((filterCriteria as any).isOrganic === true) {
          storeQuery['deliveryCategories.organic'] = true;
        }
        if ((filterCriteria as any).isMall === true) {
          storeQuery['deliveryCategories.mall'] = true;
        }
        if ((filterCriteria as any).isPartner === true) {
          storeQuery['offers.isPartner'] = true;
        }
        if (filterCriteria.categories && filterCriteria.categories.length > 0) {
          storeQuery.category = { $in: filterCriteria.categories };
        }
      }

      const storeCount = await Store.countDocuments(storeQuery);
      if (experience.storeCount !== storeCount) {
        experience.storeCount = storeCount;
        await experience.save();
        updated++;
      }
    }

    console.log(`🔄 [ADMIN EXPERIENCES] Refreshed counts for ${updated}/${experiences.length} experiences`);

    return res.json({
      success: true,
      message: `Store counts refreshed for ${updated} experiences`,
      data: { totalExperiences: experiences.length, updated },
    });
  } catch (error: any) {
    console.error('[ADMIN EXPERIENCES] Refresh all counts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to refresh store counts',
      error: error.message,
    });
  }
});

// ============================================
// BULK REORDER EXPERIENCES
// ============================================

/**
 * @route   PATCH /api/admin/experiences/reorder
 * @desc    Bulk update sort order
 * @access  Admin
 */
router.patch('/reorder', async (req: Request, res: Response) => {
  try {
    const { error, value } = reorderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { items } = value;

    const bulkOps = items.map((item: { id: string; sortOrder: number }) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(item.id) },
        update: { $set: { sortOrder: item.sortOrder } },
      },
    }));

    await StoreExperience.bulkWrite(bulkOps);

    console.log(`📋 [ADMIN EXPERIENCES] Reordered ${items.length} experiences`);

    return res.json({
      success: true,
      message: 'Experiences reordered successfully',
    });
  } catch (error: any) {
    console.error('[ADMIN EXPERIENCES] Reorder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reorder experiences',
      error: error.message,
    });
  }
});

// ============================================
// GET SINGLE EXPERIENCE
// ============================================

/**
 * @route   GET /api/admin/experiences/:id
 * @desc    Get single experience by ID
 * @access  Admin
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid experience ID',
      });
    }

    const experience = await StoreExperience.findById(id).lean();

    if (!experience) {
      return res.status(404).json({
        success: false,
        message: 'Experience not found',
      });
    }

    return res.json({
      success: true,
      data: experience,
    });
  } catch (error: any) {
    console.error('[ADMIN EXPERIENCES] Get error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch experience',
      error: error.message,
    });
  }
});

// ============================================
// CREATE EXPERIENCE
// ============================================

/**
 * @route   POST /api/admin/experiences
 * @desc    Create new experience
 * @access  Admin
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = createExperienceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Check if slug already exists
    const existingSlug = await StoreExperience.findOne({ slug: value.slug });
    if (existingSlug) {
      return res.status(400).json({
        success: false,
        message: 'An experience with this slug already exists',
      });
    }

    // Get max sortOrder for new item
    if (!value.sortOrder) {
      const maxSort = await StoreExperience.findOne().sort({ sortOrder: -1 }).select('sortOrder');
      value.sortOrder = (maxSort?.sortOrder || 0) + 1;
    }

    const experience = new StoreExperience(value);
    await experience.save();

    console.log(`✅ [ADMIN EXPERIENCES] Created: ${experience.title} (${experience.slug})`);

    return res.status(201).json({
      success: true,
      message: 'Experience created successfully',
      data: experience,
    });
  } catch (error: any) {
    console.error('[ADMIN EXPERIENCES] Create error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create experience',
      error: error.message,
    });
  }
});

// ============================================
// UPDATE EXPERIENCE
// ============================================

/**
 * @route   PUT /api/admin/experiences/:id
 * @desc    Update experience
 * @access  Admin
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid experience ID',
      });
    }

    const { error, value } = updateExperienceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Check slug uniqueness if being updated
    if (value.slug) {
      const existingSlug = await StoreExperience.findOne({
        slug: value.slug,
        _id: { $ne: id },
      });
      if (existingSlug) {
        return res.status(400).json({
          success: false,
          message: 'An experience with this slug already exists',
        });
      }
    }

    const experience = await StoreExperience.findByIdAndUpdate(
      id,
      { $set: value },
      { new: true, runValidators: true }
    );

    if (!experience) {
      return res.status(404).json({
        success: false,
        message: 'Experience not found',
      });
    }

    console.log(`✅ [ADMIN EXPERIENCES] Updated: ${experience.title} (${experience.slug})`);

    return res.json({
      success: true,
      message: 'Experience updated successfully',
      data: experience,
    });
  } catch (error: any) {
    console.error('[ADMIN EXPERIENCES] Update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update experience',
      error: error.message,
    });
  }
});

// ============================================
// DELETE EXPERIENCE
// ============================================

/**
 * @route   DELETE /api/admin/experiences/:id
 * @desc    Delete experience
 * @access  Admin
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid experience ID',
      });
    }

    const experience = await StoreExperience.findByIdAndDelete(id);

    if (!experience) {
      return res.status(404).json({
        success: false,
        message: 'Experience not found',
      });
    }

    console.log(`🗑️ [ADMIN EXPERIENCES] Deleted: ${experience.title} (${experience.slug})`);

    return res.json({
      success: true,
      message: 'Experience deleted successfully',
    });
  } catch (error: any) {
    console.error('[ADMIN EXPERIENCES] Delete error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete experience',
      error: error.message,
    });
  }
});

// ============================================
// TOGGLE EXPERIENCE ACTIVE STATUS
// ============================================

/**
 * @route   PATCH /api/admin/experiences/:id/toggle
 * @desc    Toggle experience active status
 * @access  Admin
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid experience ID',
      });
    }

    const experience = await StoreExperience.findById(id);

    if (!experience) {
      return res.status(404).json({
        success: false,
        message: 'Experience not found',
      });
    }

    experience.isActive = !experience.isActive;
    await experience.save();

    console.log(`🔄 [ADMIN EXPERIENCES] Toggled: ${experience.title} - isActive: ${experience.isActive}`);

    return res.json({
      success: true,
      message: `Experience ${experience.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: experience.isActive },
    });
  } catch (error: any) {
    console.error('[ADMIN EXPERIENCES] Toggle error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle experience',
      error: error.message,
    });
  }
});

// ============================================
// TOGGLE FEATURED STATUS
// ============================================

/**
 * @route   PATCH /api/admin/experiences/:id/feature
 * @desc    Toggle experience featured status
 * @access  Admin
 */
router.patch('/:id/feature', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid experience ID',
      });
    }

    const experience = await StoreExperience.findById(id);

    if (!experience) {
      return res.status(404).json({
        success: false,
        message: 'Experience not found',
      });
    }

    experience.isFeatured = !experience.isFeatured;
    await experience.save();

    console.log(`⭐ [ADMIN EXPERIENCES] Feature toggled: ${experience.title} - isFeatured: ${experience.isFeatured}`);

    return res.json({
      success: true,
      message: `Experience ${experience.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      data: { isFeatured: experience.isFeatured },
    });
  } catch (error: any) {
    console.error('[ADMIN EXPERIENCES] Feature toggle error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle featured status',
      error: error.message,
    });
  }
});

// ============================================
// REFRESH STORE COUNT FOR EXPERIENCE
// ============================================

/**
 * @route   PATCH /api/admin/experiences/:id/refresh-count
 * @desc    Refresh the cached store count for an experience
 * @access  Admin
 */
router.patch('/:id/refresh-count', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid experience ID',
      });
    }

    const experience = await StoreExperience.findById(id);

    if (!experience) {
      return res.status(404).json({
        success: false,
        message: 'Experience not found',
      });
    }

    const storeQuery: any = { isActive: true };
    const filterCriteria = experience.filterCriteria;

    if (filterCriteria) {
      if (filterCriteria.tags && filterCriteria.tags.length > 0) {
        storeQuery.tags = { $in: filterCriteria.tags };
      }
      if (filterCriteria.minRating && filterCriteria.minRating > 0) {
        storeQuery['ratings.average'] = { $gte: filterCriteria.minRating };
      }
      if ((filterCriteria as any).isPremium === true) {
        storeQuery['deliveryCategories.premium'] = true;
      }
      if ((filterCriteria as any).isOrganic === true) {
        storeQuery['deliveryCategories.organic'] = true;
      }
      if ((filterCriteria as any).isMall === true) {
        storeQuery['deliveryCategories.mall'] = true;
      }
      if ((filterCriteria as any).isPartner === true) {
        storeQuery['offers.isPartner'] = true;
      }
      if (filterCriteria.categories && filterCriteria.categories.length > 0) {
        storeQuery.category = { $in: filterCriteria.categories };
      }
    }

    const storeCount = await Store.countDocuments(storeQuery);

    experience.storeCount = storeCount;
    await experience.save();

    console.log(`🔄 [ADMIN EXPERIENCES] Refreshed count for ${experience.title}: ${storeCount} stores`);

    return res.json({
      success: true,
      message: 'Store count refreshed',
      data: { storeCount },
    });
  } catch (error: any) {
    console.error('[ADMIN EXPERIENCES] Refresh count error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to refresh store count',
      error: error.message,
    });
  }
});

export default router;
