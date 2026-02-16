/**
 * Admin Routes - Achievements
 * CRUD for Achievement model (admin-manageable achievement definitions)
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import Achievement from '../../models/Achievement';
import UserAchievement from '../../models/UserAchievement';
import { ACHIEVEMENTS } from '../../config/achievements';
import { sendSuccess, sendError } from '../../utils/response';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/achievements
 * List all achievements with pagination, filtering, and unlock counts
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (req.query.type) {
      filter.type = { $regex: req.query.type, $options: 'i' };
    }

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.isActive === 'true') {
      filter.isActive = true;
    } else if (req.query.isActive === 'false') {
      filter.isActive = false;
    }

    // Determine sort
    const sortField = req.query.sort === 'sortOrder' ? 'sortOrder' : 'createdAt';
    const sortDir = req.query.sort === 'sortOrder' ? 1 : -1;

    const [achievements, total] = await Promise.all([
      Achievement.find(filter)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .lean(),
      Achievement.countDocuments(filter),
    ]);

    // Get unlock counts for each achievement
    const achievementTypes = achievements.map((a: any) => a.type);
    const unlockCounts = await UserAchievement.aggregate([
      {
        $match: {
          type: { $in: achievementTypes },
          unlockedDate: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const unlockMap: Record<string, number> = {};
    unlockCounts.forEach((u: any) => {
      unlockMap[u._id] = u.count;
    });

    const achievementsWithCounts = achievements.map((a: any) => ({
      ...a,
      unlockCount: unlockMap[a.type] || 0,
    }));

    return sendSuccess(res, {
      achievements: achievementsWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Achievements fetched');
  } catch (error) {
    console.error('[Admin] Error fetching achievements:', error);
    return sendError(res, 'Failed to fetch achievements', 500);
  }
});

/**
 * GET /api/admin/achievements/stats
 * Aggregate stats for achievements
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [totalAchievements, activeCount, totalUnlocks, mostUnlocked, leastUnlocked] = await Promise.all([
      Achievement.countDocuments(),
      Achievement.countDocuments({ isActive: true }),
      UserAchievement.countDocuments({ unlockedDate: { $exists: true, $ne: null } }),
      UserAchievement.aggregate([
        { $match: { unlockedDate: { $exists: true, $ne: null } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
      ]),
      UserAchievement.aggregate([
        { $match: { unlockedDate: { $exists: true, $ne: null } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: 1 } },
        { $limit: 1 }
      ]),
    ]);

    // Resolve most/least unlocked achievement names
    let mostUnlockedAchievement = null;
    let leastUnlockedAchievement = null;

    if (mostUnlocked.length > 0) {
      const achievement = await Achievement.findOne({ type: mostUnlocked[0]._id }).lean();
      mostUnlockedAchievement = {
        type: mostUnlocked[0]._id,
        title: achievement?.title || mostUnlocked[0]._id,
        count: mostUnlocked[0].count,
      };
    }

    if (leastUnlocked.length > 0) {
      const achievement = await Achievement.findOne({ type: leastUnlocked[0]._id }).lean();
      leastUnlockedAchievement = {
        type: leastUnlocked[0]._id,
        title: achievement?.title || leastUnlocked[0]._id,
        count: leastUnlocked[0].count,
      };
    }

    return sendSuccess(res, {
      totalAchievements,
      activeCount,
      totalUnlocks,
      mostUnlocked: mostUnlockedAchievement,
      leastUnlocked: leastUnlockedAchievement,
    }, 'Achievement stats fetched');
  } catch (error) {
    console.error('[Admin] Error fetching achievement stats:', error);
    return sendError(res, 'Failed to fetch achievement stats', 500);
  }
});

/**
 * GET /api/admin/achievements/:id
 * Get single achievement by ID with unlock stats
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid achievement ID', 400);
    }

    const achievement = await Achievement.findById(req.params.id).lean();
    if (!achievement) {
      return sendError(res, 'Achievement not found', 404);
    }

    const unlockCount = await UserAchievement.countDocuments({
      type: (achievement as any).type,
      unlockedDate: { $exists: true, $ne: null }
    });

    return sendSuccess(res, {
      ...achievement,
      unlockCount,
    }, 'Achievement fetched');
  } catch (error) {
    console.error('[Admin] Error fetching achievement:', error);
    return sendError(res, 'Failed to fetch achievement', 500);
  }
});

/**
 * POST /api/admin/achievements
 * Create new achievement
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, title, description, icon, coinReward, target, color, category, badge, isActive, sortOrder } = req.body;

    if (!type || !title || !description || !icon || coinReward === undefined || !target) {
      return sendError(res, 'type, title, description, icon, coinReward, and target are required', 400);
    }

    // Check for duplicate type
    const existing = await Achievement.findOne({ type });
    if (existing) {
      return sendError(res, `Achievement with type "${type}" already exists`, 400);
    }

    const achievement = await Achievement.create({
      type,
      title,
      description,
      icon,
      coinReward,
      target,
      color: color || '#10B981',
      category: category || 'general',
      badge,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0,
    });

    return sendSuccess(res, achievement, 'Achievement created');
  } catch (error) {
    console.error('[Admin] Error creating achievement:', error);
    return sendError(res, 'Failed to create achievement', 500);
  }
});

/**
 * POST /api/admin/achievements/seed
 * Seed achievements from config file
 */
router.post('/seed', async (req: Request, res: Response) => {
  try {
    let created = 0;
    let skipped = 0;

    const achievementEntries = Object.values(ACHIEVEMENTS);

    for (const def of achievementEntries) {
      const exists = await Achievement.findOne({ type: def.id });
      if (exists) {
        skipped++;
        continue;
      }

      await Achievement.create({
        type: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        color: '#10B981',
        category: def.category,
        target: def.target,
        coinReward: def.rewards.coins,
        badge: def.rewards.badge,
        isActive: true,
        sortOrder: created,
      });
      created++;
    }

    return sendSuccess(res, { created, skipped, total: achievementEntries.length }, `Seed complete: ${created} created, ${skipped} skipped`);
  } catch (error) {
    console.error('[Admin] Error seeding achievements:', error);
    return sendError(res, 'Failed to seed achievements', 500);
  }
});

/**
 * PUT /api/admin/achievements/:id
 * Update achievement
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid achievement ID', 400);
    }

    const achievement = await Achievement.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!achievement) {
      return sendError(res, 'Achievement not found', 404);
    }

    return sendSuccess(res, achievement, 'Achievement updated');
  } catch (error) {
    console.error('[Admin] Error updating achievement:', error);
    return sendError(res, 'Failed to update achievement', 500);
  }
});

/**
 * PATCH /api/admin/achievements/:id/toggle
 * Toggle achievement active status
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid achievement ID', 400);
    }

    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) {
      return sendError(res, 'Achievement not found', 404);
    }

    achievement.isActive = !achievement.isActive;
    await achievement.save();

    return sendSuccess(res, achievement, `Achievement ${achievement.isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    console.error('[Admin] Error toggling achievement:', error);
    return sendError(res, 'Failed to toggle achievement', 500);
  }
});

/**
 * DELETE /api/admin/achievements/:id
 * Delete achievement (only if no users have unlocked it)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid achievement ID', 400);
    }

    const achievement = await Achievement.findById(req.params.id);
    if (!achievement) {
      return sendError(res, 'Achievement not found', 404);
    }

    // Check if any users have unlocked it
    const unlockCount = await UserAchievement.countDocuments({
      type: achievement.type,
      unlockedDate: { $exists: true, $ne: null }
    });

    if (unlockCount > 0) {
      return sendError(res, `Cannot delete: ${unlockCount} user(s) have unlocked this achievement`, 400);
    }

    await Achievement.findByIdAndDelete(req.params.id);

    return sendSuccess(res, null, 'Achievement deleted');
  } catch (error) {
    console.error('[Admin] Error deleting achievement:', error);
    return sendError(res, 'Failed to delete achievement', 500);
  }
});

export default router;
