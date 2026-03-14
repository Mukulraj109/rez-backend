import FeatureFlag, { IFeatureFlag, FeatureFlagScope } from '../models/FeatureFlag';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('feature-flags');

// ─── Types ───────────────────────────────────────────────

export interface FlagContext {
  userId?: string;
  city?: string;
}

interface CachedFlag {
  enabled: boolean;
  scope: FeatureFlagScope;
  configJson: Record<string, any>;
  cachedAt: number;
}

// ─── In-memory cache (same pattern as walletFeatureService) ──

const flagCache = new Map<string, CachedFlag>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

// ─── Service ─────────────────────────────────────────────

class FeatureFlagService {
  /**
   * Check if a flag is enabled for the given context.
   * Fail-open: returns true if flag doesn't exist or on error.
   */
  async isEnabled(flagKey: string, context?: FlagContext): Promise<boolean> {
    const flag = await this.getCachedFlag(flagKey);

    // Flag doesn't exist → fail-open
    if (!flag) return true;

    // Flag globally disabled
    if (!flag.enabled) return false;

    // Check scope
    return this.evaluateScope(flag, context);
  }

  /**
   * Get a flag's config (for frontend/controller config needs).
   */
  async getFlag(flagKey: string): Promise<{ enabled: boolean; configJson: Record<string, any> } | null> {
    const flag = await this.getCachedFlag(flagKey);
    if (!flag) return null;
    return { enabled: flag.enabled, configJson: flag.configJson };
  }

  /**
   * Get all flags evaluated for a user context (for frontend bulk fetch).
   * Returns a map of flagKey → { enabled, config }.
   */
  async getEnabledFlags(context?: FlagContext): Promise<Record<string, { enabled: boolean; config: Record<string, any> }>> {
    try {
      const flags = await FeatureFlag.find({}).lean() as any[];
      const result: Record<string, { enabled: boolean; config: Record<string, any> }> = {};

      for (const flag of flags) {
        const enabled = flag.enabled && this.evaluateScope({
          enabled: flag.enabled,
          scope: flag.scope || 'global',
          configJson: flag.configJson || {},
          cachedAt: 0,
        }, context);

        result[flag.key] = {
          enabled,
          config: flag.configJson || {},
        };

        // Warm the cache while we're at it
        flagCache.set(flag.key, {
          enabled: flag.enabled,
          scope: flag.scope || 'global',
          configJson: flag.configJson || {},
          cachedAt: Date.now(),
        });
      }

      return result;
    } catch (error) {
      logger.error('Failed to fetch all flags', error as Error);
      return {};
    }
  }

  /**
   * Invalidate cache for a specific flag or all flags.
   */
  invalidateCache(flagKey?: string): void {
    if (flagKey) {
      flagCache.delete(flagKey);
    } else {
      flagCache.clear();
    }
  }

  // ─── Private helpers ─────────────────────────────────

  private async getCachedFlag(flagKey: string): Promise<CachedFlag | null> {
    const cached = flagCache.get(flagKey);
    if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL_MS) {
      return cached;
    }

    try {
      const flag = await FeatureFlag.findOne({ key: flagKey }).lean() as IFeatureFlag | null;
      if (!flag) return null;

      const entry: CachedFlag = {
        enabled: flag.enabled,
        scope: (flag.scope as FeatureFlagScope) || 'global',
        configJson: flag.configJson || {},
        cachedAt: Date.now(),
      };
      flagCache.set(flagKey, entry);
      return entry;
    } catch (error) {
      logger.error('Failed to fetch feature flag', error as Error, { flagKey });
      return null; // Fail-open handled by caller
    }
  }

  private evaluateScope(flag: CachedFlag, context?: FlagContext): boolean {
    switch (flag.scope) {
      case 'global':
        return true;

      case 'city': {
        const cities: string[] | undefined = flag.configJson?.cities;
        if (!cities || cities.length === 0) return true; // No cities restriction → enabled for all
        if (!context?.city) return false; // City-scoped but no city in context
        return cities.some((c) => c.toLowerCase() === context.city!.toLowerCase());
      }

      case 'user': {
        const userIds: string[] | undefined = flag.configJson?.userIds;
        if (!userIds || userIds.length === 0) return false; // User-scoped but no allowlist → disabled
        if (!context?.userId) return false;
        return userIds.includes(context.userId);
      }

      default:
        return true;
    }
  }
}

export const featureFlagService = new FeatureFlagService();
export default featureFlagService;
