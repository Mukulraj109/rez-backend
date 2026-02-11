/**
 * Admin Routes - Double Cashback Campaigns
 * CRUD for DoubleCashbackCampaign model (used by Extra Rewards page)
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import DoubleCashbackCampaign from '../../models/DoubleCashbackCampaign';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/double-campaigns
 * List all double cashback campaigns with pagination
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

    if (req.query.running === 'true') {
      const now = new Date();
      filter.isActive = true;
      filter.startTime = { $lte: now };
      filter.endTime = { $gte: now };
    }

    const [campaigns, total] = await Promise.all([
      DoubleCashbackCampaign.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DoubleCashbackCampaign.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Double campaigns fetched');
  } catch (error) {
    console.error('[Admin] Error fetching double campaigns:', error);
    return sendError(res, 'Failed to fetch double campaigns', 500);
  }
});

/**
 * GET /api/admin/double-campaigns/:id
 * Get single campaign by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid campaign ID', 400);
    }

    const campaign = await DoubleCashbackCampaign.findById(req.params.id).lean();
    if (!campaign) {
      return sendError(res, 'Campaign not found', 404);
    }

    return sendSuccess(res, campaign, 'Campaign fetched');
  } catch (error) {
    console.error('[Admin] Error fetching double campaign:', error);
    return sendError(res, 'Failed to fetch campaign', 500);
  }
});

/**
 * POST /api/admin/double-campaigns
 * Create new double cashback campaign
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title,
      subtitle,
      description,
      multiplier,
      startTime,
      endTime,
      eligibleStores,
      eligibleStoreNames,
      eligibleCategories,
      terms,
      minOrderValue,
      maxCashback,
      backgroundColor,
      bannerImage,
      icon,
      priority,
    } = req.body;

    if (!title || !subtitle || !multiplier || !startTime || !endTime) {
      return sendError(res, 'title, subtitle, multiplier, startTime, and endTime are required', 400);
    }

    const campaign = await DoubleCashbackCampaign.create({
      title,
      subtitle,
      description,
      multiplier,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      eligibleStores: eligibleStores || [],
      eligibleStoreNames: eligibleStoreNames || [],
      eligibleCategories: eligibleCategories || [],
      terms: terms || [],
      minOrderValue,
      maxCashback,
      backgroundColor: backgroundColor || '#FEF3C7',
      bannerImage,
      icon: icon || 'flash',
      isActive: true,
      priority: priority || 0,
      createdBy: (req as any).user?._id,
    });

    return sendSuccess(res, campaign, 'Double campaign created');
  } catch (error) {
    console.error('[Admin] Error creating double campaign:', error);
    return sendError(res, 'Failed to create campaign', 500);
  }
});

/**
 * PUT /api/admin/double-campaigns/:id
 * Update existing campaign
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid campaign ID', 400);
    }

    const campaign = await DoubleCashbackCampaign.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!campaign) {
      return sendError(res, 'Campaign not found', 404);
    }

    return sendSuccess(res, campaign, 'Campaign updated');
  } catch (error) {
    console.error('[Admin] Error updating double campaign:', error);
    return sendError(res, 'Failed to update campaign', 500);
  }
});

/**
 * PATCH /api/admin/double-campaigns/:id/toggle
 * Toggle campaign active status
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid campaign ID', 400);
    }

    const campaign = await DoubleCashbackCampaign.findById(req.params.id);
    if (!campaign) {
      return sendError(res, 'Campaign not found', 404);
    }

    campaign.isActive = !campaign.isActive;
    await campaign.save();

    return sendSuccess(res, campaign, `Campaign ${campaign.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    console.error('[Admin] Error toggling double campaign:', error);
    return sendError(res, 'Failed to toggle campaign', 500);
  }
});

/**
 * DELETE /api/admin/double-campaigns/:id
 * Delete campaign
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid campaign ID', 400);
    }

    const campaign = await DoubleCashbackCampaign.findByIdAndDelete(req.params.id);
    if (!campaign) {
      return sendError(res, 'Campaign not found', 404);
    }

    return sendSuccess(res, null, 'Campaign deleted');
  } catch (error) {
    console.error('[Admin] Error deleting double campaign:', error);
    return sendError(res, 'Failed to delete campaign', 500);
  }
});

export default router;
