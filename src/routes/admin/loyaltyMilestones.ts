/**
 * Admin Routes - Loyalty Milestones
 * CRUD for LoyaltyMilestone model
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import LoyaltyMilestone from '../../models/LoyaltyMilestone';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/loyalty-milestones
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status === 'active') filter.isActive = true;
    else if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.targetType) filter.targetType = req.query.targetType;
    if (req.query.rewardType) filter.rewardType = req.query.rewardType;
    if (req.query.tier) filter.tier = req.query.tier;
    if (req.query.search) filter.title = { $regex: req.query.search, $options: 'i' };

    const [milestones, total] = await Promise.all([
      LoyaltyMilestone.find(filter).sort({ order: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      LoyaltyMilestone.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      milestones,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }, 'Loyalty milestones fetched');
  } catch (error) {
    console.error('[Admin] Error fetching loyalty milestones:', error);
    return sendError(res, 'Failed to fetch loyalty milestones', 500);
  }
});

/**
 * GET /api/admin/loyalty-milestones/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const milestone = await LoyaltyMilestone.findById(req.params.id).lean();
    if (!milestone) return sendError(res, 'Loyalty milestone not found', 404);
    return sendSuccess(res, milestone, 'Loyalty milestone fetched');
  } catch (error) {
    console.error('[Admin] Error fetching loyalty milestone:', error);
    return sendError(res, 'Failed to fetch loyalty milestone', 500);
  }
});

/**
 * POST /api/admin/loyalty-milestones
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, targetType, targetValue, reward, rewardType } = req.body;
    if (!title || !description || !targetType || !targetValue || !reward || !rewardType) {
      return sendError(res, 'title, description, targetType, targetValue, reward, rewardType are required', 400);
    }

    const milestone = await LoyaltyMilestone.create({ ...req.body });
    return sendSuccess(res, milestone, 'Loyalty milestone created');
  } catch (error) {
    console.error('[Admin] Error creating loyalty milestone:', error);
    return sendError(res, 'Failed to create loyalty milestone', 500);
  }
});

/**
 * PUT /api/admin/loyalty-milestones/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const milestone = await LoyaltyMilestone.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!milestone) return sendError(res, 'Loyalty milestone not found', 404);
    return sendSuccess(res, milestone, 'Loyalty milestone updated');
  } catch (error) {
    console.error('[Admin] Error updating loyalty milestone:', error);
    return sendError(res, 'Failed to update loyalty milestone', 500);
  }
});

/**
 * PATCH /api/admin/loyalty-milestones/:id/toggle
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const milestone = await LoyaltyMilestone.findById(req.params.id);
    if (!milestone) return sendError(res, 'Loyalty milestone not found', 404);
    milestone.isActive = !milestone.isActive;
    await milestone.save();
    return sendSuccess(res, milestone, `Loyalty milestone ${milestone.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    console.error('[Admin] Error toggling loyalty milestone:', error);
    return sendError(res, 'Failed to toggle loyalty milestone', 500);
  }
});

/**
 * DELETE /api/admin/loyalty-milestones/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const milestone = await LoyaltyMilestone.findByIdAndDelete(req.params.id);
    if (!milestone) return sendError(res, 'Loyalty milestone not found', 404);
    return sendSuccess(res, null, 'Loyalty milestone deleted');
  } catch (error) {
    console.error('[Admin] Error deleting loyalty milestone:', error);
    return sendError(res, 'Failed to delete loyalty milestone', 500);
  }
});

export default router;
