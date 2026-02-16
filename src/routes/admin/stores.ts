import { Router, Request, Response } from 'express';
import { Store } from '../../models/Store';
import { Category } from '../../models/Category';
import Joi from 'joi';
import mongoose from 'mongoose';
import { sendSuccess, sendBadRequest, sendNotFound } from '../../utils/response';
import { CacheInvalidator } from '../../utils/cacheHelper';
import { requireAuth, requireAdmin, requireSeniorAdmin } from '../../middleware/auth';

const router = Router();

// All routes require authenticated admin
router.use(requireAuth);
router.use(requireAdmin);

// Validate :storeId param is a valid ObjectId
router.param('storeId', (req: Request, res: Response, next, id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid store ID format' });
  }
  next();
});

// Validate :categoryId param is a valid ObjectId
router.param('categoryId', (req: Request, res: Response, next, id: string) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid category ID format' });
  }
  next();
});

// ============================================
// GET /admin/stores - List stores with filtering
// ============================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Build match filter
    const match: any = {};

    // Category filter
    if (req.query.category && mongoose.Types.ObjectId.isValid(req.query.category as string)) {
      match.category = new mongoose.Types.ObjectId(req.query.category as string);
    }

    // Search by store name (escape regex special chars to prevent ReDoS)
    if (req.query.search) {
      const escaped = (req.query.search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.name = { $regex: escaped, $options: 'i' };
    }

    // isActive filter
    if (req.query.isActive !== undefined) {
      match.isActive = req.query.isActive === 'true';
    }

    // adminApproved filter
    if (req.query.adminApproved !== undefined) {
      match.adminApproved = req.query.adminApproved === 'true';
    }

    const [stores, totalArr] = await Promise.all([
      Store.aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        {
          $lookup: {
            from: 'merchants',
            localField: 'merchantId',
            foreignField: '_id',
            as: 'merchantInfo'
          }
        },
        {
          $addFields: {
            categoryInfo: {
              $let: {
                vars: { cat: { $arrayElemAt: ['$categoryInfo', 0] } },
                in: {
                  _id: '$$cat._id',
                  name: '$$cat.name',
                  slug: '$$cat.slug'
                }
              }
            },
            merchantInfo: {
              $let: {
                vars: { merchant: { $arrayElemAt: ['$merchantInfo', 0] } },
                in: {
                  _id: '$$merchant._id',
                  businessName: '$$merchant.businessName',
                  ownerName: '$$merchant.ownerName',
                  email: '$$merchant.email'
                }
              }
            }
          }
        },
        {
          $project: {
            name: 1,
            slug: 1,
            logo: 1,
            isActive: 1,
            adminApproved: 1,
            isFeatured: 1,
            isSuspended: 1,
            category: 1,
            categoryInfo: 1,
            merchantId: 1,
            merchantInfo: 1,
            'ratings.average': 1,
            'ratings.count': 1,
            createdAt: 1,
            updatedAt: 1
          }
        }
      ]),
      Store.aggregate([{ $match: match }, { $count: 'total' }])
    ]);

    const total = totalArr[0]?.total || 0;

    res.json({
      success: true,
      data: {
        stores,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error: any) {
    console.error('[ADMIN STORES] Error fetching stores:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stores'
    });
  }
});

// ============================================
// GET /admin/stores/category/:categoryId - Stores in specific category (including subcategories)
// NOTE: Must be defined BEFORE /:storeId to avoid "category" matching as a storeId
// ============================================
router.get('/category/:categoryId', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Find the category and get its child category IDs
    const category = await Category.findById(req.params.categoryId)
      .select('_id childCategories name')
      .lean();

    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    // Build array of category IDs: parent + all children
    const categoryIds = [
      new mongoose.Types.ObjectId(req.params.categoryId),
      ...((category as any).childCategories || []).map((id: any) => new mongoose.Types.ObjectId(id.toString()))
    ];

    // Build match filter
    const match: any = {
      category: { $in: categoryIds }
    };

    // Search by store name (escape regex special chars to prevent ReDoS)
    if (req.query.search) {
      const escaped = (req.query.search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.name = { $regex: escaped, $options: 'i' };
    }

    // isActive filter
    if (req.query.isActive !== undefined) {
      match.isActive = req.query.isActive === 'true';
    }

    const [stores, totalArr] = await Promise.all([
      Store.aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        {
          $addFields: {
            categoryInfo: {
              $let: {
                vars: { cat: { $arrayElemAt: ['$categoryInfo', 0] } },
                in: {
                  _id: '$$cat._id',
                  name: '$$cat.name',
                  slug: '$$cat.slug'
                }
              }
            }
          }
        },
        {
          $project: {
            name: 1,
            slug: 1,
            logo: 1,
            isActive: 1,
            adminApproved: 1,
            isFeatured: 1,
            isSuspended: 1,
            category: 1,
            categoryInfo: 1,
            'ratings.average': 1,
            'ratings.count': 1,
            createdAt: 1
          }
        }
      ]),
      Store.aggregate([{ $match: match }, { $count: 'total' }])
    ]);

    const total = totalArr[0]?.total || 0;

    res.json({
      success: true,
      data: {
        category: { _id: (category as any)._id, name: (category as any).name },
        stores,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error: any) {
    console.error('[ADMIN STORES] Error fetching stores by category:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stores by category'
    });
  }
});

// ============================================
// POST /admin/stores/bulk-category - Bulk reassign stores to a category
// NOTE: Must be defined BEFORE /:storeId to avoid "bulk-category" matching as a storeId
// ============================================
const bulkCategorySchema = Joi.object({
  storeIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one storeId is required',
      'any.required': 'storeIds is required'
    }),
  categoryId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'categoryId must be a valid ObjectId',
    'any.required': 'categoryId is required'
  })
});

router.post('/bulk-category', requireSeniorAdmin, async (req: Request, res: Response) => {
  try {
    const { error, value } = bulkCategorySchema.validate(req.body);
    if (error) {
      return sendBadRequest(res, error.details[0].message);
    }

    const { storeIds, categoryId } = value;

    // Verify target category exists
    const targetCategory = await Category.findById(categoryId).lean();
    if (!targetCategory) {
      return sendNotFound(res, 'Target category not found');
    }

    // Validate that all store IDs actually exist
    const existingStores = await Store.find({ _id: { $in: storeIds } }).select('_id').lean();
    const existingIds = new Set(existingStores.map((s: any) => s._id.toString()));
    const missingIds = storeIds.filter((id: string) => !existingIds.has(id));
    if (missingIds.length > 0) {
      return sendBadRequest(res, `${missingIds.length} store(s) not found: ${missingIds.slice(0, 5).join(', ')}${missingIds.length > 5 ? '...' : ''}`);
    }

    const result = await Store.updateMany(
      { _id: { $in: storeIds } },
      { $set: { category: categoryId } }
    );

    // Invalidate cache for each store
    for (const storeId of storeIds) {
      CacheInvalidator.invalidateStore(storeId).catch((err) => {
        console.error(`[ADMIN STORES] Cache invalidation error for store ${storeId}:`, err);
      });
    }

    return sendSuccess(res, { count: result.modifiedCount }, 'Stores reassigned successfully');
  } catch (error: any) {
    console.error('[ADMIN STORES] Error bulk reassigning stores:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to bulk reassign stores'
    });
  }
});

// ============================================
// GET /admin/stores/:storeId - Get single store detail
// ============================================
router.get('/:storeId', async (req: Request, res: Response) => {
  try {
    const store = await Store.findById(req.params.storeId)
      .populate('category', 'name slug icon')
      .populate('merchantId', 'businessName ownerName email phone')
      .lean();

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    return sendSuccess(res, { store });
  } catch (error: any) {
    console.error('[ADMIN STORES] Error fetching store:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch store'
    });
  }
});

// ============================================
// PUT /admin/stores/:storeId/category - Reassign store to different category
// ============================================
const reassignCategorySchema = Joi.object({
  categoryId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'categoryId must be a valid ObjectId',
    'any.required': 'categoryId is required'
  })
});

router.put('/:storeId/category', requireSeniorAdmin, async (req: Request, res: Response) => {
  try {
    const { error, value } = reassignCategorySchema.validate(req.body);
    if (error) {
      return sendBadRequest(res, error.details[0].message);
    }

    // Verify target category exists
    const targetCategory = await Category.findById(value.categoryId).lean();
    if (!targetCategory) {
      return sendNotFound(res, 'Target category not found');
    }

    const store = await Store.findByIdAndUpdate(
      req.params.storeId,
      { $set: { category: value.categoryId } },
      { new: true }
    ).populate('category', 'name slug icon');

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Invalidate cache
    CacheInvalidator.invalidateStore(req.params.storeId).catch((err) => {
      console.error('[ADMIN STORES] Cache invalidation error:', err);
    });

    return sendSuccess(res, { store }, 'Store category reassigned successfully');
  } catch (error: any) {
    console.error('[ADMIN STORES] Error reassigning store category:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reassign store category'
    });
  }
});

// ============================================
// PUT /admin/stores/:storeId/admin-actions - Admin approve/suspend/feature store
// ============================================
const adminActionsSchema = Joi.object({
  adminApproved: Joi.boolean(),
  isSuspended: Joi.boolean(),
  suspensionReason: Joi.string().trim().max(500).allow(''),
  isFeatured: Joi.boolean(),
  adminNotes: Joi.string().trim().max(1000).allow('')
}).min(1).messages({
  'object.min': 'At least one field is required'
});

router.put('/:storeId/admin-actions', requireSeniorAdmin, async (req: Request, res: Response) => {
  try {
    const { error, value } = adminActionsSchema.validate(req.body);
    if (error) {
      return sendBadRequest(res, error.details[0].message);
    }

    const updateFields: any = {};

    if (value.adminApproved !== undefined) {
      updateFields.adminApproved = value.adminApproved;
      if (value.adminApproved) {
        updateFields.adminApprovedAt = new Date();
        updateFields.adminApprovedBy = req.userId;
      }
    }

    if (value.isSuspended !== undefined) {
      updateFields.isSuspended = value.isSuspended;
      if (value.isSuspended && value.suspensionReason) {
        updateFields.suspensionReason = value.suspensionReason;
      }
      if (!value.isSuspended) {
        updateFields.suspensionReason = '';
      }
    }

    if (value.isFeatured !== undefined) {
      updateFields.isFeatured = value.isFeatured;
    }

    if (value.adminNotes !== undefined) {
      updateFields.adminNotes = value.adminNotes;
    }

    const store = await Store.findByIdAndUpdate(
      req.params.storeId,
      { $set: updateFields },
      { new: true }
    )
      .populate('category', 'name slug icon')
      .lean();

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Invalidate cache
    CacheInvalidator.invalidateStore(req.params.storeId).catch((err) => {
      console.error('[ADMIN STORES] Cache invalidation error:', err);
    });

    return sendSuccess(res, { store }, 'Store updated successfully');
  } catch (error: any) {
    console.error('[ADMIN STORES] Error updating store admin actions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update store'
    });
  }
});

export default router;
