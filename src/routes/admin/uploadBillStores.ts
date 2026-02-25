/**
 * Admin Routes - Upload Bill Stores
 * CRUD for UploadBillStore model
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import UploadBillStore from '../../models/UploadBillStore';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/upload-bill-stores
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status === 'active') filter.isActive = true;
    else if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };

    const [stores, total] = await Promise.all([
      UploadBillStore.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      UploadBillStore.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      stores,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }, 'Upload bill stores fetched');
  } catch (error) {
    console.error('[Admin] Error fetching upload bill stores:', error);
    return sendError(res, 'Failed to fetch upload bill stores', 500);
  }
});

/**
 * GET /api/admin/upload-bill-stores/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const store = await UploadBillStore.findById(req.params.id).lean();
    if (!store) return sendError(res, 'Upload bill store not found', 404);
    return sendSuccess(res, store, 'Upload bill store fetched');
  } catch (error) {
    console.error('[Admin] Error fetching upload bill store:', error);
    return sendError(res, 'Failed to fetch upload bill store', 500);
  }
});

/**
 * POST /api/admin/upload-bill-stores
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, category } = req.body;
    if (!name || !category) {
      return sendError(res, 'name and category are required', 400);
    }

    const store = await UploadBillStore.create({ ...req.body });
    return sendSuccess(res, store, 'Upload bill store created');
  } catch (error) {
    console.error('[Admin] Error creating upload bill store:', error);
    return sendError(res, 'Failed to create upload bill store', 500);
  }
});

/**
 * PUT /api/admin/upload-bill-stores/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const store = await UploadBillStore.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!store) return sendError(res, 'Upload bill store not found', 404);
    return sendSuccess(res, store, 'Upload bill store updated');
  } catch (error) {
    console.error('[Admin] Error updating upload bill store:', error);
    return sendError(res, 'Failed to update upload bill store', 500);
  }
});

/**
 * PATCH /api/admin/upload-bill-stores/:id/toggle
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const store = await UploadBillStore.findById(req.params.id);
    if (!store) return sendError(res, 'Upload bill store not found', 404);
    store.isActive = !store.isActive;
    await store.save();
    return sendSuccess(res, store, `Upload bill store ${store.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    console.error('[Admin] Error toggling upload bill store:', error);
    return sendError(res, 'Failed to toggle upload bill store', 500);
  }
});

/**
 * DELETE /api/admin/upload-bill-stores/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const store = await UploadBillStore.findByIdAndDelete(req.params.id);
    if (!store) return sendError(res, 'Upload bill store not found', 404);
    return sendSuccess(res, null, 'Upload bill store deleted');
  } catch (error) {
    console.error('[Admin] Error deleting upload bill store:', error);
    return sendError(res, 'Failed to delete upload bill store', 500);
  }
});

export default router;
