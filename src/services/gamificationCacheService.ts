/**
 * Gamification Cache Service
 *
 * A caching wrapper service for gamification-related data that uses redisService.
 * Provides typed get/set/invalidate methods for:
 *
 * - Leaderboard data (daily/weekly/monthly/all-time)
 * - Game configuration (per game type)
 * - Feature flags (per group)
 * - Active challenges (per type)
 * - Available games list
 *
 * All methods gracefully degrade to null/void when Redis is unavailable,
 * matching the behavior of the underlying redisService.
 */

import redisService from './redisService';
import { CacheTTL } from '../config/redis';

class GamificationCacheService {
  // ─── Leaderboard Cache ───────────────────────────────────────────────

  /**
   * Get cached leaderboard data for a period and page
   */
  async getLeaderboard(period: string, page: number = 1): Promise<any | null> {
    return redisService.get(`leaderboard:${period}:${page}`);
  }

  /**
   * Cache leaderboard data for a period and page
   */
  async setLeaderboard(period: string, page: number, data: any): Promise<void> {
    await redisService.set(`leaderboard:${period}:${page}`, data, CacheTTL.LEADERBOARD);
  }

  /**
   * Get leaderboard metadata (entry count, last updated)
   */
  async getLeaderboardMeta(period: string): Promise<any | null> {
    return redisService.get(`leaderboard:${period}:meta`);
  }

  /**
   * Invalidate all leaderboard caches
   */
  async invalidateLeaderboards(): Promise<void> {
    await redisService.delPattern('leaderboard:*');
  }

  /**
   * Invalidate leaderboard for a specific period
   */
  async invalidateLeaderboard(period: string): Promise<void> {
    await redisService.delPattern(`leaderboard:${period}:*`);
  }

  // ─── Game Config Cache ───────────────────────────────────────────────

  /**
   * Get cached game configuration for a specific game type
   */
  async getGameConfig(gameType: string): Promise<any | null> {
    return redisService.get(`game-config:${gameType}`);
  }

  /**
   * Cache game configuration for a specific game type
   */
  async setGameConfig(gameType: string, data: any): Promise<void> {
    await redisService.set(`game-config:${gameType}`, data, CacheTTL.GAME_CONFIG);
  }

  /**
   * Invalidate game configuration for a specific game type
   */
  async invalidateGameConfig(gameType: string): Promise<void> {
    await redisService.del(`game-config:${gameType}`);
  }

  /**
   * Invalidate all game configurations
   */
  async invalidateAllGameConfigs(): Promise<void> {
    await redisService.delPattern('game-config:*');
  }

  // ─── Feature Flags Cache ─────────────────────────────────────────────

  /**
   * Get cached feature flags for a specific group
   */
  async getFeatureFlags(group: string): Promise<any | null> {
    return redisService.get(`feature-flags:${group}`);
  }

  /**
   * Cache feature flags for a specific group
   */
  async setFeatureFlags(group: string, data: any): Promise<void> {
    await redisService.set(`feature-flags:${group}`, data, CacheTTL.FEATURE_FLAGS);
  }

  /**
   * Invalidate feature flags for a specific group
   */
  async invalidateFeatureFlags(group: string): Promise<void> {
    await redisService.del(`feature-flags:${group}`);
  }

  /**
   * Invalidate all feature flag caches
   */
  async invalidateAllFeatureFlags(): Promise<void> {
    await redisService.delPattern('feature-flags:*');
  }

  // ─── Available Games Cache ───────────────────────────────────────────

  /**
   * Get cached list of available games
   */
  async getAvailableGames(): Promise<any | null> {
    return redisService.get('games:available');
  }

  /**
   * Cache list of available games
   */
  async setAvailableGames(data: any): Promise<void> {
    await redisService.set('games:available', data, CacheTTL.AVAILABLE_GAMES);
  }

  /**
   * Invalidate available games cache
   */
  async invalidateAvailableGames(): Promise<void> {
    await redisService.del('games:available');
  }

  // ─── Active Challenges Cache ─────────────────────────────────────────

  /**
   * Get cached active challenges, optionally filtered by type
   */
  async getActiveChallenges(type?: string): Promise<any | null> {
    const key = type ? `challenges:active:${type}` : 'challenges:active:all';
    return redisService.get(key);
  }

  /**
   * Cache active challenges, optionally by type
   */
  async setActiveChallenges(type: string | undefined, data: any): Promise<void> {
    const key = type ? `challenges:active:${type}` : 'challenges:active:all';
    await redisService.set(key, data, CacheTTL.CHALLENGES_ACTIVE);
  }

  /**
   * Invalidate all challenge-related caches
   */
  async invalidateChallenges(): Promise<void> {
    // Delete all known challenge type keys
    const knownKeys = [
      'challenges:active:all',
      'challenges:active:daily',
      'challenges:active:weekly',
      'challenges:active:monthly',
      'challenges:active:special',
    ];
    await Promise.all(knownKeys.map(k => redisService.del(k)));

    // Also use pattern delete to catch any other challenge keys
    await redisService.delPattern('challenges:active:*');
  }

  /**
   * Invalidate a specific challenge type cache
   */
  async invalidateChallengeType(type: string): Promise<void> {
    await Promise.all([
      redisService.del(`challenges:active:${type}`),
      redisService.del('challenges:active:all'), // Also invalidate the "all" cache
    ]);
  }

  // ─── Utility Methods ─────────────────────────────────────────────────

  /**
   * Invalidate all gamification caches (nuclear option)
   */
  async invalidateAll(): Promise<void> {
    await Promise.all([
      this.invalidateLeaderboards(),
      this.invalidateAllGameConfigs(),
      this.invalidateAllFeatureFlags(),
      this.invalidateAvailableGames(),
      this.invalidateChallenges(),
    ]);
    console.log('🗑️ [GAMIFICATION CACHE] All gamification caches invalidated');
  }
}

export default new GamificationCacheService();
