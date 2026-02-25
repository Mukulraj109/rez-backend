/**
 * Admin Routes - Exclusive Zones
 * CRUD for ExclusiveZone model
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import ExclusiveZone from '../../models/ExclusiveZone';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/exclusive-zones
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status === 'active') filter.isActive = true;
    else if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.eligibilityType) filter.eligibilityType = req.query.eligibilityType;
    if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };

    const [zones, total] = await Promise.all([
      ExclusiveZone.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      ExclusiveZone.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      zones,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }, 'Exclusive zones fetched');
  } catch (error) {
    console.error('[Admin] Error fetching exclusive zones:', error);
    return sendError(res, 'Failed to fetch exclusive zones', 500);
  }
});

/**
 * GET /api/admin/exclusive-zones/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const zone = await ExclusiveZone.findById(req.params.id).lean();
    if (!zone) return sendError(res, 'Exclusive zone not found', 404);
    return sendSuccess(res, zone, 'Exclusive zone fetched');
  } catch (error) {
    console.error('[Admin] Error fetching exclusive zone:', error);
    return sendError(res, 'Failed to fetch exclusive zone', 500);
  }
});

/**
 * POST /api/admin/exclusive-zones
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, slug, eligibilityType } = req.body;
    if (!name || !slug || !eligibilityType) {
      return sendError(res, 'name, slug, and eligibilityType are required', 400);
    }

    const zone = await ExclusiveZone.create({ ...req.body });
    return sendSuccess(res, zone, 'Exclusive zone created');
  } catch (error) {
    console.error('[Admin] Error creating exclusive zone:', error);
    return sendError(res, 'Failed to create exclusive zone', 500);
  }
});

/**
 * PUT /api/admin/exclusive-zones/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const zone = await ExclusiveZone.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!zone) return sendError(res, 'Exclusive zone not found', 404);
    return sendSuccess(res, zone, 'Exclusive zone updated');
  } catch (error) {
    console.error('[Admin] Error updating exclusive zone:', error);
    return sendError(res, 'Failed to update exclusive zone', 500);
  }
});

/**
 * PATCH /api/admin/exclusive-zones/:id/toggle
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const zone = await ExclusiveZone.findById(req.params.id);
    if (!zone) return sendError(res, 'Exclusive zone not found', 404);
    zone.isActive = !zone.isActive;
    await zone.save();
    return sendSuccess(res, zone, `Exclusive zone ${zone.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    console.error('[Admin] Error toggling exclusive zone:', error);
    return sendError(res, 'Failed to toggle exclusive zone', 500);
  }
});

/**
 * DELETE /api/admin/exclusive-zones/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const zone = await ExclusiveZone.findByIdAndDelete(req.params.id);
    if (!zone) return sendError(res, 'Exclusive zone not found', 404);
    return sendSuccess(res, null, 'Exclusive zone deleted');
  } catch (error) {
    console.error('[Admin] Error deleting exclusive zone:', error);
    return sendError(res, 'Failed to delete exclusive zone', 500);
  }
});

export default router;
