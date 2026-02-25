/**
 * Admin Routes - Hotspot Areas
 * CRUD for HotspotArea model
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import HotspotArea from '../../models/HotspotArea';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/hotspot-areas
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status === 'active') filter.isActive = true;
    else if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.city) filter.city = { $regex: req.query.city, $options: 'i' };
    if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };

    const [areas, total] = await Promise.all([
      HotspotArea.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      HotspotArea.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      areas,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }, 'Hotspot areas fetched');
  } catch (error) {
    console.error('[Admin] Error fetching hotspot areas:', error);
    return sendError(res, 'Failed to fetch hotspot areas', 500);
  }
});

/**
 * GET /api/admin/hotspot-areas/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const area = await HotspotArea.findById(req.params.id).lean();
    if (!area) return sendError(res, 'Hotspot area not found', 404);
    return sendSuccess(res, area, 'Hotspot area fetched');
  } catch (error) {
    console.error('[Admin] Error fetching hotspot area:', error);
    return sendError(res, 'Failed to fetch hotspot area', 500);
  }
});

/**
 * POST /api/admin/hotspot-areas
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, city, coordinates } = req.body;
    if (!name || !city || !coordinates?.lat || !coordinates?.lng) {
      return sendError(res, 'name, city, and coordinates (lat, lng) are required', 400);
    }

    const area = await HotspotArea.create({ ...req.body });
    return sendSuccess(res, area, 'Hotspot area created');
  } catch (error) {
    console.error('[Admin] Error creating hotspot area:', error);
    return sendError(res, 'Failed to create hotspot area', 500);
  }
});

/**
 * PUT /api/admin/hotspot-areas/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const area = await HotspotArea.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!area) return sendError(res, 'Hotspot area not found', 404);
    return sendSuccess(res, area, 'Hotspot area updated');
  } catch (error) {
    console.error('[Admin] Error updating hotspot area:', error);
    return sendError(res, 'Failed to update hotspot area', 500);
  }
});

/**
 * PATCH /api/admin/hotspot-areas/:id/toggle
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const area = await HotspotArea.findById(req.params.id);
    if (!area) return sendError(res, 'Hotspot area not found', 404);
    area.isActive = !area.isActive;
    await area.save();
    return sendSuccess(res, area, `Hotspot area ${area.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    console.error('[Admin] Error toggling hotspot area:', error);
    return sendError(res, 'Failed to toggle hotspot area', 500);
  }
});

/**
 * DELETE /api/admin/hotspot-areas/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const area = await HotspotArea.findByIdAndDelete(req.params.id);
    if (!area) return sendError(res, 'Hotspot area not found', 404);
    return sendSuccess(res, null, 'Hotspot area deleted');
  } catch (error) {
    console.error('[Admin] Error deleting hotspot area:', error);
    return sendError(res, 'Failed to delete hotspot area', 500);
  }
});

export default router;
