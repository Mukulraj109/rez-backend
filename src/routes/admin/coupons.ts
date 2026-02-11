/**
 * Admin Routes - Coupons
 * CRUD for Coupon model (used by Coupons admin page)
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { Coupon } from '../../models/Coupon';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/coupons
 * List all coupons with pagination, search, status filter, category filter
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (req.query.status === 'active') {
      filter.status = 'active';
    } else if (req.query.status === 'inactive') {
      filter.status = 'inactive';
    } else if (req.query.status === 'expired') {
      filter.status = 'expired';
    }

    if (req.query.discountType) {
      filter.discountType = req.query.discountType;
    }

    if (req.query.featured === 'true') {
      filter.isFeatured = true;
    }

    if (req.query.autoApply === 'true') {
      filter.autoApply = true;
    }

    if (req.query.tag) {
      filter.tags = req.query.tag;
    }

    if (req.query.search) {
      filter.$or = [
        { couponCode: { $regex: req.query.search, $options: 'i' } },
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [coupons, total] = await Promise.all([
      Coupon.find(filter)
        .populate('createdBy', 'name email')
        .populate('applicableTo.stores', 'name logo')
        .populate('applicableTo.categories', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Coupon.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      coupons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Coupons fetched');
  } catch (error) {
    console.error('[Admin] Error fetching coupons:', error);
    return sendError(res, 'Failed to fetch coupons', 500);
  }
});

/**
 * GET /api/admin/coupons/:id
 * Get single coupon by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid coupon ID', 400);
    }

    const coupon = await Coupon.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('applicableTo.stores', 'name logo')
      .populate('applicableTo.categories', 'name')
      .populate('applicableTo.products', 'name images')
      .lean();

    if (!coupon) {
      return sendError(res, 'Coupon not found', 404);
    }

    return sendSuccess(res, coupon, 'Coupon fetched');
  } catch (error) {
    console.error('[Admin] Error fetching coupon:', error);
    return sendError(res, 'Failed to fetch coupon', 500);
  }
});

/**
 * POST /api/admin/coupons
 * Create new coupon
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      couponCode,
      title,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscountCap,
      validFrom,
      validTo,
      usageLimit,
      applicableTo,
      autoApply,
      autoApplyPriority,
      termsAndConditions,
      tags,
      imageUrl,
      isFeatured,
      isNewlyAdded,
      metadata,
    } = req.body;

    if (!couponCode || !title || !description || !discountType || !discountValue || !validFrom || !validTo) {
      return sendError(res, 'couponCode, title, description, discountType, discountValue, validFrom, and validTo are required', 400);
    }

    const coupon = await Coupon.create({
      couponCode,
      title,
      description,
      discountType,
      discountValue,
      minOrderValue: minOrderValue || 0,
      maxDiscountCap: maxDiscountCap || 0,
      validFrom: new Date(validFrom),
      validTo: new Date(validTo),
      usageLimit: usageLimit || { totalUsage: 0, perUser: 1, usedCount: 0 },
      applicableTo: applicableTo || { categories: [], products: [], stores: [], userTiers: [] },
      autoApply: autoApply || false,
      autoApplyPriority: autoApplyPriority || 0,
      status: 'active',
      termsAndConditions: termsAndConditions || [],
      createdBy: (req as any).user?._id,
      tags: tags || [],
      imageUrl,
      isFeatured: isFeatured || false,
      isNewlyAdded: isNewlyAdded !== undefined ? isNewlyAdded : true,
      metadata: metadata || null,
    });

    return sendSuccess(res, coupon, 'Coupon created');
  } catch (error) {
    console.error('[Admin] Error creating coupon:', error);
    return sendError(res, 'Failed to create coupon', 500);
  }
});

/**
 * PUT /api/admin/coupons/:id
 * Update existing coupon
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid coupon ID', 400);
    }

    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return sendError(res, 'Coupon not found', 404);
    }

    return sendSuccess(res, coupon, 'Coupon updated');
  } catch (error) {
    console.error('[Admin] Error updating coupon:', error);
    return sendError(res, 'Failed to update coupon', 500);
  }
});

/**
 * PATCH /api/admin/coupons/:id/toggle
 * Toggle coupon active/inactive status
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid coupon ID', 400);
    }

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return sendError(res, 'Coupon not found', 404);
    }

    coupon.status = coupon.status === 'active' ? 'inactive' : 'active';
    await coupon.save();

    return sendSuccess(res, coupon, `Coupon ${coupon.status === 'active' ? 'activated' : 'deactivated'}`);
  } catch (error) {
    console.error('[Admin] Error toggling coupon:', error);
    return sendError(res, 'Failed to toggle coupon', 500);
  }
});

/**
 * DELETE /api/admin/coupons/:id
 * Delete coupon
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid coupon ID', 400);
    }

    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return sendError(res, 'Coupon not found', 404);
    }

    return sendSuccess(res, null, 'Coupon deleted');
  } catch (error) {
    console.error('[Admin] Error deleting coupon:', error);
    return sendError(res, 'Failed to delete coupon', 500);
  }
});

export default router;
