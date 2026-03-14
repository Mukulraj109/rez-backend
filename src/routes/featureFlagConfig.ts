import { Router, Request, Response } from 'express';
import { optionalAuth } from '../middleware/auth';
import { featureFlagService } from '../services/featureFlagService';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

const router = Router();

const CACHE_KEY_PREFIX = 'config:feature-flags';
const CACHE_TTL = 60; // 60 seconds

/**
 * @route   GET /api/config/feature-flags
 * @desc    Get all feature flags for the current user context.
 *          Uses optional auth — works for both logged-in and anonymous users.
 * @access  Public
 */
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string | undefined;
    const city = (req as any).user?.profile?.location?.city
      || (req.headers['x-rez-region'] as string | undefined);

    // Cache key includes user + city for scope-aware caching
    const cityKey = city ? city.toLowerCase() : 'none';
    const cacheKey = userId
      ? `${CACHE_KEY_PREFIX}:${userId}:${cityKey}`
      : `${CACHE_KEY_PREFIX}:anon:${cityKey}`;

    // Check Redis cache
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const flags = await featureFlagService.getEnabledFlags({ userId, city });

    const result = {
      flags,
      fetchedAt: new Date().toISOString(),
    };

    // Cache result
    await redisService.set(cacheKey, result, CACHE_TTL).catch(() => {});

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Failed to fetch feature flag config', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch feature flags',
    });
  }
});

export default router;
