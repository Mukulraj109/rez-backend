/**
 * Admin Routes - Challenges
 * CRUD for Challenge model (used by Play & Earn admin page)
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import Challenge from '../../models/Challenge';
import { CHALLENGE_TEMPLATES } from '../../config/challengeTemplates';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/challenges
 * List all challenges with pagination and filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Filter by type
    if (req.query.type && ['daily', 'weekly', 'monthly', 'special'].includes(req.query.type as string)) {
      filter.type = req.query.type;
    }

    // Filter by difficulty
    if (req.query.difficulty && ['easy', 'medium', 'hard'].includes(req.query.difficulty as string)) {
      filter.difficulty = req.query.difficulty;
    }

    // Filter by status
    if (req.query.status === 'active') {
      const now = new Date();
      filter.active = true;
      filter.startDate = { $lte: now };
      filter.endDate = { $gte: now };
    } else if (req.query.status === 'inactive') {
      filter.active = false;
    } else if (req.query.status === 'expired') {
      const now = new Date();
      filter.endDate = { $lt: now };
    }

    // Filter by featured
    if (req.query.featured === 'true') {
      filter.featured = true;
    } else if (req.query.featured === 'false') {
      filter.featured = false;
    }

    const [challenges, total] = await Promise.all([
      Challenge.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Challenge.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      challenges,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    }, 'Challenges fetched');
  } catch (error) {
    console.error('[Admin] Error fetching challenges:', error);
    return sendError(res, 'Failed to fetch challenges', 500);
  }
});

/**
 * GET /api/admin/challenges/templates
 * Return challenge templates from config
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    return sendSuccess(res, CHALLENGE_TEMPLATES, 'Challenge templates fetched');
  } catch (error) {
    console.error('[Admin] Error fetching challenge templates:', error);
    return sendError(res, 'Failed to fetch challenge templates', 500);
  }
});

/**
 * GET /api/admin/challenges/stats
 * Get aggregate stats for challenges
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const now = new Date();

    const [total, active, byType, byDifficulty, completionStats] = await Promise.all([
      Challenge.countDocuments(),
      Challenge.countDocuments({
        active: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      }),
      Challenge.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Challenge.aggregate([
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      ]),
      Challenge.aggregate([
        {
          $group: {
            _id: null,
            totalParticipants: { $sum: '$participantCount' },
            totalCompletions: { $sum: '$completionCount' },
          },
        },
      ]),
    ]);

    const typeMap: Record<string, number> = {};
    byType.forEach((item: any) => {
      typeMap[item._id] = item.count;
    });

    const difficultyMap: Record<string, number> = {};
    byDifficulty.forEach((item: any) => {
      difficultyMap[item._id] = item.count;
    });

    const stats = completionStats[0] || { totalParticipants: 0, totalCompletions: 0 };
    const avgCompletionRate = stats.totalParticipants > 0
      ? ((stats.totalCompletions / stats.totalParticipants) * 100).toFixed(1)
      : '0';

    return sendSuccess(res, {
      total,
      active,
      byType: typeMap,
      byDifficulty: difficultyMap,
      avgCompletionRate: parseFloat(avgCompletionRate),
      totalParticipants: stats.totalParticipants,
      totalCompletions: stats.totalCompletions,
    }, 'Challenge stats fetched');
  } catch (error) {
    console.error('[Admin] Error fetching challenge stats:', error);
    return sendError(res, 'Failed to fetch challenge stats', 500);
  }
});

/**
 * GET /api/admin/challenges/:id
 * Get single challenge by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid challenge ID', 400);
    }

    const challenge = await Challenge.findById(req.params.id).lean();

    if (!challenge) {
      return sendError(res, 'Challenge not found', 404);
    }

    return sendSuccess(res, challenge, 'Challenge fetched');
  } catch (error) {
    console.error('[Admin] Error fetching challenge:', error);
    return sendError(res, 'Failed to fetch challenge', 500);
  }
});

/**
 * POST /api/admin/challenges
 * Create new challenge
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      type,
      title,
      description,
      icon,
      requirements,
      rewards,
      startDate,
      endDate,
      difficulty,
      featured,
      active,
      maxParticipants,
    } = req.body;

    // Validate required fields
    if (!type || !title || !description || !icon || !requirements || !rewards || !startDate || !endDate) {
      return sendError(res, 'type, title, description, icon, requirements, rewards, startDate, and endDate are required', 400);
    }

    if (!requirements.action || !requirements.target) {
      return sendError(res, 'requirements.action and requirements.target are required', 400);
    }

    if (rewards.coins === undefined || rewards.coins === null) {
      return sendError(res, 'rewards.coins is required', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return sendError(res, 'endDate must be after startDate', 400);
    }

    const challenge = await Challenge.create({
      type,
      title,
      description,
      icon,
      requirements,
      rewards,
      difficulty: difficulty || 'easy',
      startDate: start,
      endDate: end,
      featured: featured || false,
      active: active !== false,
      maxParticipants,
    });

    return sendSuccess(res, challenge, 'Challenge created');
  } catch (error: any) {
    console.error('[Admin] Error creating challenge:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'Failed to create challenge', 500);
  }
});

/**
 * POST /api/admin/challenges/from-template
 * Create challenge from a template index
 */
router.post('/from-template', async (req: Request, res: Response) => {
  try {
    const { templateIndex, startDate, featured } = req.body;

    if (templateIndex === undefined || templateIndex === null) {
      return sendError(res, 'templateIndex is required', 400);
    }

    const template = CHALLENGE_TEMPLATES[templateIndex];
    if (!template) {
      return sendError(res, 'Template not found at given index', 404);
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + (template.durationDays || 1));

    const challenge = await Challenge.create({
      ...template,
      startDate: start,
      endDate: end,
      featured: featured || false,
      active: true,
    });

    return sendSuccess(res, challenge, 'Challenge created from template');
  } catch (error: any) {
    console.error('[Admin] Error creating challenge from template:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'Failed to create challenge from template', 500);
  }
});

/**
 * PUT /api/admin/challenges/:id
 * Update existing challenge
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid challenge ID', 400);
    }

    const challenge = await Challenge.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!challenge) {
      return sendError(res, 'Challenge not found', 404);
    }

    return sendSuccess(res, challenge, 'Challenge updated');
  } catch (error: any) {
    console.error('[Admin] Error updating challenge:', error);
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 400);
    }
    return sendError(res, 'Failed to update challenge', 500);
  }
});

/**
 * PATCH /api/admin/challenges/:id/toggle
 * Toggle challenge active status
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid challenge ID', 400);
    }

    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return sendError(res, 'Challenge not found', 404);
    }

    challenge.active = !challenge.active;
    await challenge.save();

    return sendSuccess(res, challenge, `Challenge ${challenge.active ? 'activated' : 'deactivated'}`);
  } catch (error) {
    console.error('[Admin] Error toggling challenge:', error);
    return sendError(res, 'Failed to toggle challenge', 500);
  }
});

/**
 * PATCH /api/admin/challenges/:id/feature
 * Toggle challenge featured status
 */
router.patch('/:id/feature', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid challenge ID', 400);
    }

    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return sendError(res, 'Challenge not found', 404);
    }

    challenge.featured = !challenge.featured;
    await challenge.save();

    return sendSuccess(res, challenge, `Challenge ${challenge.featured ? 'featured' : 'unfeatured'}`);
  } catch (error) {
    console.error('[Admin] Error toggling challenge featured:', error);
    return sendError(res, 'Failed to toggle challenge featured status', 500);
  }
});

/**
 * DELETE /api/admin/challenges/:id
 * Delete challenge
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid challenge ID', 400);
    }

    const challenge = await Challenge.findByIdAndDelete(req.params.id);
    if (!challenge) {
      return sendError(res, 'Challenge not found', 404);
    }

    return sendSuccess(res, null, 'Challenge deleted');
  } catch (error) {
    console.error('[Admin] Error deleting challenge:', error);
    return sendError(res, 'Failed to delete challenge', 500);
  }
});

export default router;
