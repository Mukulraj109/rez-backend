/**
 * Admin Routes - Special Profiles
 * CRUD for SpecialProfile model
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import SpecialProfile from '../../models/SpecialProfile';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/special-profiles
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status === 'active') filter.isActive = true;
    else if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };

    const [profiles, total] = await Promise.all([
      SpecialProfile.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      SpecialProfile.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      profiles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }, 'Special profiles fetched');
  } catch (error) {
    console.error('[Admin] Error fetching special profiles:', error);
    return sendError(res, 'Failed to fetch special profiles', 500);
  }
});

/**
 * GET /api/admin/special-profiles/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const profile = await SpecialProfile.findById(req.params.id).lean();
    if (!profile) return sendError(res, 'Special profile not found', 404);
    return sendSuccess(res, profile, 'Special profile fetched');
  } catch (error) {
    console.error('[Admin] Error fetching special profile:', error);
    return sendError(res, 'Failed to fetch special profile', 500);
  }
});

/**
 * POST /api/admin/special-profiles
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, slug, verificationRequired } = req.body;
    if (!name || !slug || !verificationRequired) {
      return sendError(res, 'name, slug, and verificationRequired are required', 400);
    }

    const profile = await SpecialProfile.create({ ...req.body });
    return sendSuccess(res, profile, 'Special profile created');
  } catch (error) {
    console.error('[Admin] Error creating special profile:', error);
    return sendError(res, 'Failed to create special profile', 500);
  }
});

/**
 * PUT /api/admin/special-profiles/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const profile = await SpecialProfile.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!profile) return sendError(res, 'Special profile not found', 404);
    return sendSuccess(res, profile, 'Special profile updated');
  } catch (error) {
    console.error('[Admin] Error updating special profile:', error);
    return sendError(res, 'Failed to update special profile', 500);
  }
});

/**
 * PATCH /api/admin/special-profiles/:id/toggle
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const profile = await SpecialProfile.findById(req.params.id);
    if (!profile) return sendError(res, 'Special profile not found', 404);
    profile.isActive = !profile.isActive;
    await profile.save();
    return sendSuccess(res, profile, `Special profile ${profile.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    console.error('[Admin] Error toggling special profile:', error);
    return sendError(res, 'Failed to toggle special profile', 500);
  }
});

/**
 * DELETE /api/admin/special-profiles/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const profile = await SpecialProfile.findByIdAndDelete(req.params.id);
    if (!profile) return sendError(res, 'Special profile not found', 404);
    return sendSuccess(res, null, 'Special profile deleted');
  } catch (error) {
    console.error('[Admin] Error deleting special profile:', error);
    return sendError(res, 'Failed to delete special profile', 500);
  }
});

export default router;
