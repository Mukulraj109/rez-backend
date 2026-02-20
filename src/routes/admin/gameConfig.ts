/**
 * Admin Routes - Game Configuration
 * CRUD for GameConfig model + Analytics + Game Ban + Manual Coin Ops
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import GameConfig from '../../models/GameConfig';
import { User } from '../../models/User';
import GameSession from '../../models/GameSession';
import { sendSuccess, sendError } from '../../utils/response';
import gameService from '../../services/gameService';
import coinService from '../../services/coinService';
import { invalidateGameConfigCache } from '../../services/gameService';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

const VALID_GAME_TYPES = ['spin_wheel', 'memory_match', 'coin_hunt', 'guess_price', 'quiz', 'scratch_card'] as const;

// Default seed data for all 6 game types
const DEFAULT_GAME_CONFIGS = [
  {
    gameType: 'spin_wheel',
    displayName: 'Spin Wheel',
    description: 'Spin the wheel to win coins and rewards!',
    icon: 'color-filter',
    isEnabled: true,
    dailyLimit: 3,
    cooldownMinutes: 60,
    rewards: { minCoins: 5, maxCoins: 100, bonusMultiplier: 1 },
    difficulty: {
      easy: { timeLimit: 0 },
      medium: { timeLimit: 0 },
      hard: { timeLimit: 0 },
    },
    config: {
      segments: [
        { label: '5 Coins', value: 5, color: '#FF6384' },
        { label: '10 Coins', value: 10, color: '#36A2EB' },
        { label: '25 Coins', value: 25, color: '#FFCE56' },
        { label: '50 Coins', value: 50, color: '#4BC0C0' },
        { label: '100 Coins', value: 100, color: '#9966FF' },
        { label: 'Try Again', value: 0, color: '#C9CBCF' },
      ],
    },
    schedule: { availableDays: [] },
    sortOrder: 0,
    featured: true,
  },
  {
    gameType: 'memory_match',
    displayName: 'Memory Match',
    description: 'Match pairs of cards to earn coins!',
    icon: 'grid',
    isEnabled: true,
    dailyLimit: 3,
    cooldownMinutes: 30,
    rewards: { minCoins: 10, maxCoins: 75, bonusMultiplier: 1 },
    difficulty: {
      easy: { timeLimit: 60, gridSize: 4, lives: 10 },
      medium: { timeLimit: 45, gridSize: 6, lives: 8 },
      hard: { timeLimit: 30, gridSize: 8, lives: 6 },
    },
    config: {},
    schedule: { availableDays: [] },
    sortOrder: 1,
    featured: false,
  },
  {
    gameType: 'coin_hunt',
    displayName: 'Coin Hunt',
    description: 'Find hidden coins before time runs out!',
    icon: 'search',
    isEnabled: true,
    dailyLimit: 3,
    cooldownMinutes: 45,
    rewards: { minCoins: 5, maxCoins: 50, bonusMultiplier: 1 },
    difficulty: {
      easy: { timeLimit: 60, lives: 5 },
      medium: { timeLimit: 45, lives: 3 },
      hard: { timeLimit: 30, lives: 2 },
    },
    config: {},
    schedule: { availableDays: [] },
    sortOrder: 2,
    featured: false,
  },
  {
    gameType: 'guess_price',
    displayName: 'Guess the Price',
    description: 'Guess the price of products to win coins!',
    icon: 'cash',
    isEnabled: true,
    dailyLimit: 5,
    cooldownMinutes: 15,
    rewards: { minCoins: 10, maxCoins: 100, bonusMultiplier: 1 },
    difficulty: {
      easy: { timeLimit: 30, lives: 3 },
      medium: { timeLimit: 20, lives: 2 },
      hard: { timeLimit: 15, lives: 1 },
    },
    config: { priceTolerancePercent: 10 },
    schedule: { availableDays: [] },
    sortOrder: 3,
    featured: false,
  },
  {
    gameType: 'quiz',
    displayName: 'Quiz',
    description: 'Answer questions correctly to earn coins!',
    icon: 'help-circle',
    isEnabled: true,
    dailyLimit: 5,
    cooldownMinutes: 10,
    rewards: { minCoins: 5, maxCoins: 50, bonusMultiplier: 1 },
    difficulty: {
      easy: { timeLimit: 30, lives: 3 },
      medium: { timeLimit: 20, lives: 2 },
      hard: { timeLimit: 15, lives: 1 },
    },
    config: { questionsPerRound: 5, categories: ['general', 'food', 'fashion', 'tech'] },
    schedule: { availableDays: [] },
    sortOrder: 4,
    featured: false,
  },
  {
    gameType: 'scratch_card',
    displayName: 'Scratch Card',
    description: 'Scratch to reveal your prize!',
    icon: 'card',
    isEnabled: true,
    dailyLimit: 2,
    cooldownMinutes: 120,
    rewards: { minCoins: 1, maxCoins: 200, bonusMultiplier: 1 },
    difficulty: {
      easy: { timeLimit: 0 },
      medium: { timeLimit: 0 },
      hard: { timeLimit: 0 },
    },
    config: {
      prizes: [
        { label: '1 Coin', value: 1, weight: 40 },
        { label: '5 Coins', value: 5, weight: 25 },
        { label: '25 Coins', value: 25, weight: 15 },
        { label: '50 Coins', value: 50, weight: 10 },
        { label: '100 Coins', value: 100, weight: 7 },
        { label: '200 Coins', value: 200, weight: 3 },
      ],
    },
    schedule: { availableDays: [] },
    sortOrder: 5,
    featured: false,
  },
];

/**
 * GET /api/admin/game-config
 * List all game configs, sorted by sortOrder
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filter: any = {};

    if (req.query.enabled === 'true') {
      filter.isEnabled = true;
    } else if (req.query.enabled === 'false') {
      filter.isEnabled = false;
    }

    const gameConfigs = await GameConfig.find(filter)
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    return sendSuccess(res, { gameConfigs }, 'Game configs fetched');
  } catch (error) {
    console.error('[Admin] Error fetching game configs:', error);
    return sendError(res, 'Failed to fetch game configs', 500);
  }
});

/**
 * GET /api/admin/game-config/:gameType
 * Get config by gameType string (not ObjectId)
 */
router.get('/:gameType', async (req: Request, res: Response) => {
  try {
    const { gameType } = req.params;

    // If it looks like an ObjectId, try finding by ID
    if (Types.ObjectId.isValid(gameType)) {
      const gameConfig = await GameConfig.findById(gameType).lean();
      if (gameConfig) {
        return sendSuccess(res, gameConfig, 'Game config fetched');
      }
    }

    // Otherwise, find by gameType string
    const gameConfig = await GameConfig.findOne({ gameType }).lean();

    if (!gameConfig) {
      return sendError(res, 'Game config not found', 404);
    }

    return sendSuccess(res, gameConfig, 'Game config fetched');
  } catch (error) {
    console.error('[Admin] Error fetching game config:', error);
    return sendError(res, 'Failed to fetch game config', 500);
  }
});

/**
 * POST /api/admin/game-config
 * Create new game config
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { gameType, displayName, description, icon } = req.body;

    if (!gameType || !displayName || !description || !icon) {
      return sendError(res, 'gameType, displayName, description, and icon are required', 400);
    }

    if (!VALID_GAME_TYPES.includes(gameType)) {
      return sendError(res, `Invalid gameType. Must be one of: ${VALID_GAME_TYPES.join(', ')}`, 400);
    }

    // Check uniqueness
    const existing = await GameConfig.findOne({ gameType });
    if (existing) {
      return sendError(res, `Game config for "${gameType}" already exists`, 409);
    }

    const gameConfig = await GameConfig.create(req.body);

    return sendSuccess(res, gameConfig, 'Game config created');
  } catch (error: any) {
    console.error('[Admin] Error creating game config:', error);
    if (error.code === 11000) {
      return sendError(res, 'A game config with this gameType already exists', 409);
    }
    return sendError(res, 'Failed to create game config', 500);
  }
});

/**
 * POST /api/admin/game-config/seed
 * Seed default configs for all 6 game types if they don't exist yet
 */
router.post('/seed', async (req: Request, res: Response) => {
  try {
    // Find which game types already exist
    const existingConfigs = await GameConfig.find({}).select('gameType').lean();
    const existingTypes = new Set<string>(existingConfigs.map(c => c.gameType));

    // Filter out configs that already exist
    const toCreate = DEFAULT_GAME_CONFIGS.filter(c => !existingTypes.has(c.gameType));

    if (toCreate.length === 0) {
      return sendSuccess(res, { created: 0, existing: existingConfigs.length }, 'All game configs already exist');
    }

    const created = await GameConfig.insertMany(toCreate);

    return sendSuccess(res, {
      created: created.length,
      existing: existingConfigs.length,
      newConfigs: created,
    }, `Seeded ${created.length} game configs`);
  } catch (error) {
    console.error('[Admin] Error seeding game configs:', error);
    return sendError(res, 'Failed to seed game configs', 500);
  }
});

/**
 * PUT /api/admin/game-config/:id
 * Update game config by ID
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid game config ID', 400);
    }

    // Don't allow changing gameType to avoid breaking uniqueness
    if (req.body.gameType) {
      const existing = await GameConfig.findById(req.params.id);
      if (existing && existing.gameType !== req.body.gameType) {
        return sendError(res, 'Cannot change gameType of an existing config', 400);
      }
    }

    const gameConfig = await GameConfig.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!gameConfig) {
      return sendError(res, 'Game config not found', 404);
    }

    invalidateGameConfigCache(gameConfig.gameType);
    return sendSuccess(res, gameConfig, 'Game config updated');
  } catch (error) {
    console.error('[Admin] Error updating game config:', error);
    return sendError(res, 'Failed to update game config', 500);
  }
});

/**
 * PATCH /api/admin/game-config/:id/toggle
 * Toggle isEnabled
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid game config ID', 400);
    }

    const gameConfig = await GameConfig.findById(req.params.id);
    if (!gameConfig) {
      return sendError(res, 'Game config not found', 404);
    }

    gameConfig.isEnabled = !gameConfig.isEnabled;
    await gameConfig.save();

    return sendSuccess(res, gameConfig, `Game "${gameConfig.displayName}" ${gameConfig.isEnabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('[Admin] Error toggling game config:', error);
    return sendError(res, 'Failed to toggle game config', 500);
  }
});

/**
 * PATCH /api/admin/game-config/:id/featured
 * Toggle featured
 */
router.patch('/:id/featured', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid game config ID', 400);
    }

    const gameConfig = await GameConfig.findById(req.params.id);
    if (!gameConfig) {
      return sendError(res, 'Game config not found', 404);
    }

    gameConfig.featured = !gameConfig.featured;
    await gameConfig.save();

    return sendSuccess(res, gameConfig, `Game "${gameConfig.displayName}" ${gameConfig.featured ? 'featured' : 'unfeatured'}`);
  } catch (error) {
    console.error('[Admin] Error toggling game config featured:', error);
    return sendError(res, 'Failed to toggle featured status', 500);
  }
});

/**
 * PATCH /api/admin/game-config/reorder
 * Bulk update sort orders
 */
router.patch('/reorder', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 'items array is required with { id, sortOrder } objects', 400);
    }

    const bulkOps = items.map((item: { id: string; sortOrder: number }) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(item.id) },
        update: { $set: { sortOrder: item.sortOrder } },
      },
    }));

    await GameConfig.bulkWrite(bulkOps);

    const updated = await GameConfig.find({}).sort({ sortOrder: 1 }).lean();

    return sendSuccess(res, { gameConfigs: updated }, 'Sort orders updated');
  } catch (error) {
    console.error('[Admin] Error reordering game configs:', error);
    return sendError(res, 'Failed to reorder game configs', 500);
  }
});

/**
 * DELETE /api/admin/game-config/:id
 * Delete game config
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 'Invalid game config ID', 400);
    }

    const gameConfig = await GameConfig.findByIdAndDelete(req.params.id);
    if (!gameConfig) {
      return sendError(res, 'Game config not found', 404);
    }

    invalidateGameConfigCache(gameConfig.gameType);
    return sendSuccess(res, null, 'Game config deleted');
  } catch (error) {
    console.error('[Admin] Error deleting game config:', error);
    return sendError(res, 'Failed to delete game config', 500);
  }
});

// ======== PHASE 5: GAME ANALYTICS ========

/**
 * GET /api/admin/game-config/analytics
 * Game analytics dashboard data
 */
router.get('/analytics/overview', async (req: Request, res: Response) => {
  try {
    const { gameType, days = '30' } = req.query;
    const analytics = await gameService.getGameAnalytics(
      gameType as string | undefined,
      parseInt(days as string) || 30
    );
    return sendSuccess(res, analytics, 'Game analytics fetched');
  } catch (error) {
    console.error('[Admin] Error fetching game analytics:', error);
    return sendError(res, 'Failed to fetch game analytics', 500);
  }
});

/**
 * GET /api/admin/game-config/user/:userId/history
 * Get a specific user's game history (for admin investigation)
 */
router.get('/user/:userId/history', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { gameType, limit = '50' } = req.query;

    if (!Types.ObjectId.isValid(userId)) {
      return sendError(res, 'Invalid user ID', 400);
    }

    const query: any = { user: userId };
    if (gameType) query.gameType = gameType;

    const [sessions, user] = await Promise.all([
      GameSession.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit as string) || 50)
        .lean(),
      User.findById(userId).select('fullName username phoneNumber gameBanned gameBanReason gameBannedAt').lean()
    ]);

    return sendSuccess(res, { user, sessions, total: sessions.length }, 'User game history fetched');
  } catch (error) {
    console.error('[Admin] Error fetching user game history:', error);
    return sendError(res, 'Failed to fetch user game history', 500);
  }
});

// ======== PHASE 5: GAME BAN MANAGEMENT ========

/**
 * POST /api/admin/game-config/user/:userId/ban
 * Ban a user from playing games
 */
router.post('/user/:userId/ban', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!Types.ObjectId.isValid(userId)) {
      return sendError(res, 'Invalid user ID', 400);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          gameBanned: true,
          gameBanReason: reason || 'Banned by admin',
          gameBannedAt: new Date()
        }
      },
      { new: true }
    ).select('fullName username phoneNumber gameBanned gameBanReason gameBannedAt');

    if (!user) return sendError(res, 'User not found', 404);

    return sendSuccess(res, user, `User ${user.fullName || userId} banned from games`);
  } catch (error) {
    console.error('[Admin] Error banning user from games:', error);
    return sendError(res, 'Failed to ban user', 500);
  }
});

/**
 * POST /api/admin/game-config/user/:userId/unban
 * Unban a user from playing games
 */
router.post('/user/:userId/unban', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!Types.ObjectId.isValid(userId)) {
      return sendError(res, 'Invalid user ID', 400);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: { gameBanned: false },
        $unset: { gameBanReason: 1, gameBannedAt: 1 }
      },
      { new: true }
    ).select('fullName username phoneNumber gameBanned');

    if (!user) return sendError(res, 'User not found', 404);

    return sendSuccess(res, user, `User ${user.fullName || userId} unbanned from games`);
  } catch (error) {
    console.error('[Admin] Error unbanning user from games:', error);
    return sendError(res, 'Failed to unban user', 500);
  }
});

// ======== PHASE 5: MANUAL COIN OPERATIONS ========

/**
 * POST /api/admin/game-config/user/:userId/credit-coins
 * Manually credit coins to a user (with reason logged)
 */
router.post('/user/:userId/credit-coins', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;

    if (!Types.ObjectId.isValid(userId)) {
      return sendError(res, 'Invalid user ID', 400);
    }
    if (!amount || amount <= 0 || amount > 10000) {
      return sendError(res, 'Amount must be between 1 and 10000', 400);
    }
    if (!reason || reason.trim().length < 3) {
      return sendError(res, 'A reason is required (min 3 characters)', 400);
    }

    const result = await coinService.awardCoins(
      userId,
      amount,
      'admin',
      `Admin credit: ${reason}`,
      { adminAction: true, reason, adminId: (req.user as any)?.id }
    );

    return sendSuccess(res, { amount, newBalance: result.newBalance, reason }, `Credited ${amount} coins to user`);
  } catch (error: any) {
    console.error('[Admin] Error crediting coins:', error);
    return sendError(res, error.message || 'Failed to credit coins', 500);
  }
});

/**
 * POST /api/admin/game-config/user/:userId/revoke-coins
 * Manually revoke (deduct) coins from a user (with reason logged)
 */
router.post('/user/:userId/revoke-coins', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;

    if (!Types.ObjectId.isValid(userId)) {
      return sendError(res, 'Invalid user ID', 400);
    }
    if (!amount || amount <= 0 || amount > 10000) {
      return sendError(res, 'Amount must be between 1 and 10000', 400);
    }
    if (!reason || reason.trim().length < 3) {
      return sendError(res, 'A reason is required (min 3 characters)', 400);
    }

    // Deduct coins via coinService (negative amount)
    const result = await coinService.awardCoins(
      userId,
      -amount,
      'admin',
      `Admin revoke: ${reason}`,
      { adminAction: true, reason, adminId: (req.user as any)?.id, revoke: true }
    );

    return sendSuccess(res, { amount, newBalance: result.newBalance, reason }, `Revoked ${amount} coins from user`);
  } catch (error: any) {
    console.error('[Admin] Error revoking coins:', error);
    return sendError(res, error.message || 'Failed to revoke coins', 500);
  }
});

/**
 * POST /api/admin/game-config/invalidate-cache
 * Invalidate game config cache (after admin changes)
 */
router.post('/invalidate-cache', async (_req: Request, res: Response) => {
  try {
    invalidateGameConfigCache();
    return sendSuccess(res, null, 'Game config cache invalidated');
  } catch (error) {
    console.error('[Admin] Error invalidating cache:', error);
    return sendError(res, 'Failed to invalidate cache', 500);
  }
});

export default router;
