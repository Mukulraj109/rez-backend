import { logger } from '../../config/logger';
/**
 * Admin Routes - Feature Flags & Earning Config
 * CRUD for FeatureFlag model + single-document EarningConfig
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import FeatureFlag from '../../models/FeatureFlag';
import EarningConfig from '../../models/EarningConfig';
import { sendSuccess, sendError } from '../../utils/response';
import { featureFlagService } from '../../services/featureFlagService';
import redisService from '../../services/redisService';

// Clear Redis config cache when flags change so /api/config/feature-flags returns fresh data
async function clearConfigRedisCache() {
  try {
    await redisService.delPattern('config:feature-flags*');
  } catch {
    // Non-blocking
  }
}

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

// ============================================
// FEATURE FLAGS
// ============================================

/**
 * GET /api/admin/feature-flags/flags
 * List all flags, optionally filter by group query param
 */
router.get('/flags', async (req: Request, res: Response) => {
  try {
    const filter: any = {};
    if (req.query.group) {
      filter.group = req.query.group;
    }

    const flags = await FeatureFlag.find(filter)
      .sort({ group: 1, sortOrder: 1 })
      .lean();

    return sendSuccess(res, { flags }, 'Feature flags fetched');
  } catch (error) {
    logger.error('[Admin] Error fetching feature flags:', error);
    return sendError(res, 'Failed to fetch feature flags', 500);
  }
});

/**
 * GET /api/admin/feature-flags/flags/:key
 * Get single flag by key
 */
router.get('/flags/:key', async (req: Request, res: Response) => {
  try {
    const flag = await FeatureFlag.findOne({ key: req.params.key }).lean();
    if (!flag) {
      return sendError(res, 'Feature flag not found', 404);
    }
    return sendSuccess(res, flag, 'Feature flag fetched');
  } catch (error) {
    logger.error('[Admin] Error fetching feature flag:', error);
    return sendError(res, 'Failed to fetch feature flag', 500);
  }
});

/**
 * POST /api/admin/feature-flags/flags
 * Create new flag
 */
router.post('/flags', async (req: Request, res: Response) => {
  try {
    const { key, label, group, enabled, scope, configJson, sortOrder, metadata } = req.body;

    if (!key || !label || !group) {
      return sendError(res, 'key, label, and group are required', 400);
    }

    // Check key uniqueness
    const existing = await FeatureFlag.findOne({ key });
    if (existing) {
      return sendError(res, `Feature flag with key "${key}" already exists`, 409);
    }

    const flag = await FeatureFlag.create({
      key,
      label,
      group,
      enabled: enabled !== undefined ? enabled : true,
      scope: scope || 'global',
      configJson: configJson || {},
      sortOrder: sortOrder || 0,
      metadata: metadata || {}
    });

    featureFlagService.invalidateCache(key);
    await clearConfigRedisCache();
    return sendSuccess(res, flag, 'Feature flag created', 201);
  } catch (error) {
    logger.error('[Admin] Error creating feature flag:', error);
    return sendError(res, 'Failed to create feature flag', 500);
  }
});

/**
 * POST /api/admin/feature-flags/flags/seed
 * Seed default Play & Earn flags if they don't exist
 */
router.post('/flags/seed', async (req: Request, res: Response) => {
  try {
    const defaults = [
      { key: 'playandearn.wallet_summary', label: 'Wallet Summary', group: 'playandearn', sortOrder: 1 },
      { key: 'playandearn.streak', label: 'Daily Streak', group: 'playandearn', sortOrder: 2 },
      { key: 'playandearn.daily_games', label: 'Daily Games', group: 'playandearn', sortOrder: 3 },
      { key: 'playandearn.mini_games', label: 'Mini Games', group: 'playandearn', sortOrder: 4 },
      { key: 'playandearn.challenges', label: 'Challenges', group: 'playandearn', sortOrder: 5 },
      { key: 'playandearn.trending_picks', label: 'Trending Picks', group: 'playandearn', sortOrder: 6 },
      { key: 'playandearn.earning_programs', label: 'Earning Programs', group: 'playandearn', sortOrder: 7 },
      { key: 'playandearn.featured_creators', label: 'Featured Creators', group: 'playandearn', sortOrder: 8 },
      { key: 'playandearn.social_impact', label: 'Social Impact', group: 'playandearn', sortOrder: 9 },
      { key: 'playandearn.tournaments', label: 'Tournaments', group: 'playandearn', sortOrder: 10 },
      { key: 'playandearn.achievements', label: 'Achievements', group: 'playandearn', sortOrder: 11 },
    ];

    let created = 0;
    let skipped = 0;

    for (const item of defaults) {
      const exists = await FeatureFlag.findOne({ key: item.key });
      if (!exists) {
        await FeatureFlag.create({ ...item, enabled: true, metadata: {} });
        created++;
      } else {
        skipped++;
      }
    }

    return sendSuccess(res, { created, skipped }, `Seeded ${created} flags, ${skipped} already existed`);
  } catch (error) {
    logger.error('[Admin] Error seeding feature flags:', error);
    return sendError(res, 'Failed to seed feature flags', 500);
  }
});

/**
 * PUT /api/admin/feature-flags/flags/:key
 * Update flag by key
 */
router.put('/flags/:key', async (req: Request, res: Response) => {
  try {
    const { label, group, enabled, scope, configJson, sortOrder, metadata } = req.body;

    const updateFields: Record<string, any> = {};
    if (label !== undefined) updateFields.label = label;
    if (group !== undefined) updateFields.group = group;
    if (enabled !== undefined) updateFields.enabled = enabled;
    if (scope !== undefined) updateFields.scope = scope;
    if (configJson !== undefined) updateFields.configJson = configJson;
    if (sortOrder !== undefined) updateFields.sortOrder = sortOrder;
    if (metadata !== undefined) updateFields.metadata = metadata;

    const flag = await FeatureFlag.findOneAndUpdate(
      { key: req.params.key },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!flag) {
      return sendError(res, 'Feature flag not found', 404);
    }

    featureFlagService.invalidateCache(req.params.key);
    await clearConfigRedisCache();
    return sendSuccess(res, flag, 'Feature flag updated');
  } catch (error) {
    logger.error('[Admin] Error updating feature flag:', error);
    return sendError(res, 'Failed to update feature flag', 500);
  }
});

/**
 * PATCH /api/admin/feature-flags/flags/:key/toggle
 * Toggle enabled state
 */
router.patch('/flags/:key/toggle', async (req: Request, res: Response) => {
  try {
    const flag = await FeatureFlag.findOne({ key: req.params.key });
    if (!flag) {
      return sendError(res, 'Feature flag not found', 404);
    }

    flag.enabled = !flag.enabled;
    await flag.save();

    featureFlagService.invalidateCache(req.params.key);
    await clearConfigRedisCache();
    return sendSuccess(res, flag, `Feature flag ${flag.enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    logger.error('[Admin] Error toggling feature flag:', error);
    return sendError(res, 'Failed to toggle feature flag', 500);
  }
});

/**
 * PATCH /api/admin/feature-flags/flags/reorder
 * Bulk update sort orders
 */
router.patch('/flags/reorder', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return sendError(res, 'items array is required', 400);
    }

    const bulkOps = items.map((item: { key: string; sortOrder: number }) => ({
      updateOne: {
        filter: { key: item.key },
        update: { $set: { sortOrder: item.sortOrder } }
      }
    }));

    await FeatureFlag.bulkWrite(bulkOps);

    return sendSuccess(res, null, `Reordered ${items.length} flags`);
  } catch (error) {
    logger.error('[Admin] Error reordering feature flags:', error);
    return sendError(res, 'Failed to reorder feature flags', 500);
  }
});

/**
 * DELETE /api/admin/feature-flags/flags/:key
 * Delete flag
 */
router.delete('/flags/:key', async (req: Request, res: Response) => {
  try {
    const flag = await FeatureFlag.findOneAndDelete({ key: req.params.key });
    if (!flag) {
      return sendError(res, 'Feature flag not found', 404);
    }

    featureFlagService.invalidateCache(req.params.key);
    await clearConfigRedisCache();
    return sendSuccess(res, null, 'Feature flag deleted');
  } catch (error) {
    logger.error('[Admin] Error deleting feature flag:', error);
    return sendError(res, 'Failed to delete feature flag', 500);
  }
});

// ============================================
// EARNING CONFIG
// ============================================

/**
 * GET /api/admin/feature-flags/earning-config
 * Get the single EarningConfig document (or return defaults if none exists)
 */
router.get('/earning-config', async (req: Request, res: Response) => {
  try {
    let config = await EarningConfig.findOne().lean();

    if (!config) {
      // Return defaults without saving
      config = {
        streaks: {
          login: { milestones: [{ day: 3, coins: 50 }, { day: 7, coins: 200 }, { day: 14, coins: 500 }, { day: 30, coins: 1500 }] },
          order: { milestones: [{ day: 3, coins: 100 }, { day: 7, coins: 300 }, { day: 14, coins: 700 }] },
          review: { milestones: [{ day: 3, coins: 75 }, { day: 5, coins: 200 }, { day: 10, coins: 500 }] },
        },
        referral: {
          referrerAmount: 50,
          refereeDiscount: 50,
          milestoneBonus: 20,
          minOrders: 1,
          minSpend: 500,
          timeframeDays: 30,
          expiryDays: 90,
        },
        dailyCheckin: {
          baseCoins: 10,
          bonuses: [{ streak: 3, coins: 20 }, { streak: 7, coins: 50 }, { streak: 14, coins: 100 }, { streak: 30, coins: 300 }],
        },
        billUpload: {
          minAmount: 100,
          maxCashbackPercent: 10,
          maxCashbackAmount: 500,
        },
      } as any;
    }

    return sendSuccess(res, config, 'Earning config fetched');
  } catch (error) {
    logger.error('[Admin] Error fetching earning config:', error);
    return sendError(res, 'Failed to fetch earning config', 500);
  }
});

/**
 * PUT /api/admin/feature-flags/earning-config
 * Upsert the EarningConfig
 */
router.put('/earning-config', async (req: Request, res: Response) => {
  try {
    const { streaks, referral, dailyCheckin, billUpload } = req.body;

    const config = await EarningConfig.findOneAndUpdate(
      {},
      {
        $set: {
          streaks,
          referral,
          dailyCheckin,
          billUpload,
          updatedBy: (req as any).user?._id,
        }
      },
      { new: true, upsert: true, runValidators: true }
    );

    return sendSuccess(res, config, 'Earning config updated');
  } catch (error) {
    logger.error('[Admin] Error updating earning config:', error);
    return sendError(res, 'Failed to update earning config', 500);
  }
});

/**
 * POST /api/admin/feature-flags/earning-config/seed
 * Seed default EarningConfig if not exists
 */
router.post('/earning-config/seed', async (req: Request, res: Response) => {
  try {
    const existing = await EarningConfig.findOne();
    if (existing) {
      return sendSuccess(res, existing, 'Earning config already exists');
    }

    const config = await EarningConfig.create({
      streaks: {
        login: { milestones: [{ day: 3, coins: 50 }, { day: 7, coins: 200 }, { day: 14, coins: 500 }, { day: 30, coins: 1500 }] },
        order: { milestones: [{ day: 3, coins: 100 }, { day: 7, coins: 300 }, { day: 14, coins: 700 }] },
        review: { milestones: [{ day: 3, coins: 75 }, { day: 5, coins: 200 }, { day: 10, coins: 500 }] },
      },
      referral: {
        referrerAmount: 50,
        refereeDiscount: 50,
        milestoneBonus: 20,
        minOrders: 1,
        minSpend: 500,
        timeframeDays: 30,
        expiryDays: 90,
      },
      dailyCheckin: {
        baseCoins: 10,
        bonuses: [{ streak: 3, coins: 20 }, { streak: 7, coins: 50 }, { streak: 14, coins: 100 }, { streak: 30, coins: 300 }],
      },
      billUpload: {
        minAmount: 100,
        maxCashbackPercent: 10,
        maxCashbackAmount: 500,
      },
      updatedBy: (req as any).user?._id,
    });

    return sendSuccess(res, config, 'Earning config seeded with defaults', 201);
  } catch (error) {
    logger.error('[Admin] Error seeding earning config:', error);
    return sendError(res, 'Failed to seed earning config', 500);
  }
});

export default router;
