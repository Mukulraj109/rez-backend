/**
 * Admin Routes - Voucher Brands
 * CRUD for VoucherBrand model (used by Vouchers admin page)
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { VoucherBrand } from '../../models/Voucher';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/vouchers
 * List all voucher brands with pagination, search, status filter
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (req.query.status === 'active') {
      filter.isActive = true;
    } else if (req.query.status === 'inactive') {
      filter.isActive = false;
    }

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.featured === 'true') {
      filter.isFeatured = true;
    }

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [vouchers, total] = await Promise.all([
      VoucherBrand.find(filter)
        .populate('store', 'name logo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      VoucherBrand.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      vouchers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Voucher brands fetched');
  } catch (error) {
    console.error('[Admin] Error fetching voucher brands:', error);
    return sendError(res, 'Failed to fetch voucher brands', 500);
  }
});

/**
 * GET /api/admin/vouchers/:id
 * Get single voucher brand by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid voucher brand ID', 400);
    }

    const voucher = await VoucherBrand.findById(req.params.id)
      .populate('store', 'name logo')
      .lean();

    if (!voucher) {
      return sendError(res, 'Voucher brand not found', 404);
    }

    return sendSuccess(res, voucher, 'Voucher brand fetched');
  } catch (error) {
    console.error('[Admin] Error fetching voucher brand:', error);
    return sendError(res, 'Failed to fetch voucher brand', 500);
  }
});

/**
 * POST /api/admin/vouchers
 * Create new voucher brand
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      logo,
      backgroundColor,
      logoColor,
      description,
      cashbackRate,
      category,
      denominations,
      termsAndConditions,
      isFeatured,
      isNewlyAdded,
      store,
    } = req.body;

    if (!name || !logo || !description || !category || !denominations) {
      return sendError(res, 'name, logo, description, category, and denominations are required', 400);
    }

    if (store && !Types.ObjectId.isValid(store)) {
      return sendError(res, 'Invalid store ID', 400);
    }

    const voucher = await VoucherBrand.create({
      name,
      logo,
      backgroundColor: backgroundColor || '#000000',
      logoColor: logoColor || '#FFFFFF',
      description,
      cashbackRate: cashbackRate || 0,
      category,
      denominations,
      termsAndConditions: termsAndConditions || [],
      isFeatured: isFeatured || false,
      isNewlyAdded: isNewlyAdded !== undefined ? isNewlyAdded : true,
      isActive: true,
      store: store || undefined,
    });

    return sendSuccess(res, voucher, 'Voucher brand created');
  } catch (error) {
    console.error('[Admin] Error creating voucher brand:', error);
    return sendError(res, 'Failed to create voucher brand', 500);
  }
});

/**
 * PUT /api/admin/vouchers/:id
 * Update existing voucher brand
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid voucher brand ID', 400);
    }

    const voucher = await VoucherBrand.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!voucher) {
      return sendError(res, 'Voucher brand not found', 404);
    }

    return sendSuccess(res, voucher, 'Voucher brand updated');
  } catch (error) {
    console.error('[Admin] Error updating voucher brand:', error);
    return sendError(res, 'Failed to update voucher brand', 500);
  }
});

/**
 * PATCH /api/admin/vouchers/:id/toggle
 * Toggle voucher brand active status
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid voucher brand ID', 400);
    }

    const voucher = await VoucherBrand.findById(req.params.id);
    if (!voucher) {
      return sendError(res, 'Voucher brand not found', 404);
    }

    voucher.isActive = !voucher.isActive;
    await voucher.save();

    return sendSuccess(res, voucher, `Voucher brand ${voucher.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    console.error('[Admin] Error toggling voucher brand:', error);
    return sendError(res, 'Failed to toggle voucher brand', 500);
  }
});

/**
 * DELETE /api/admin/vouchers/:id
 * Delete voucher brand
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid voucher brand ID', 400);
    }

    const voucher = await VoucherBrand.findByIdAndDelete(req.params.id);
    if (!voucher) {
      return sendError(res, 'Voucher brand not found', 404);
    }

    return sendSuccess(res, null, 'Voucher brand deleted');
  } catch (error) {
    console.error('[Admin] Error deleting voucher brand:', error);
    return sendError(res, 'Failed to delete voucher brand', 500);
  }
});

export default router;
