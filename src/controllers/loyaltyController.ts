import { Request, Response } from 'express';
import UserLoyalty from '../models/UserLoyalty';
import { 
  sendSuccess, 
  sendNotFound
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// Get user's loyalty data
export const getUserLoyalty = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  try {
    let loyalty = await UserLoyalty.findOne({ userId });

    if (!loyalty) {
      // Create default loyalty record
      loyalty = await UserLoyalty.create({
        userId,
        streak: {
          current: 0,
          target: 7,
          history: []
        },
        brandLoyalty: [],
        missions: [],
        coins: {
          available: 0,
          expiring: 0,
          history: []
        }
      });
    }

    sendSuccess(res, { loyalty: loyalty.toObject() }, 'Loyalty data retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch loyalty data', 500);
  }
});

// Daily check-in
export const checkIn = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  try {
    let loyalty = await UserLoyalty.findOne({ userId });

    if (!loyalty) {
      loyalty = await UserLoyalty.create({
        userId,
        streak: {
          current: 0,
          target: 7,
          history: []
        },
        brandLoyalty: [],
        missions: [],
        coins: {
          available: 0,
          expiring: 0,
          history: []
        }
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastCheckin = loyalty.streak.lastCheckin 
      ? new Date(loyalty.streak.lastCheckin)
      : null;
    
    if (lastCheckin) {
      lastCheckin.setHours(0, 0, 0, 0);
    }

    const daysDiff = lastCheckin 
      ? Math.floor((today.getTime() - lastCheckin.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysDiff === 0) {
      throw new AppError('Already checked in today', 400);
    }

    if (daysDiff === 1) {
      // Continue streak
      loyalty.streak.current += 1;
    } else {
      // Reset streak
      loyalty.streak.current = 1;
    }

    loyalty.streak.lastCheckin = new Date();
    loyalty.streak.history.push(new Date());

    // Award coins for check-in
    const coinsEarned = 10;
    loyalty.coins.available += coinsEarned;
    loyalty.coins.history.push({
      amount: coinsEarned,
      type: 'earned',
      description: 'Daily check-in reward',
      date: new Date()
    });

    await loyalty.save();

    sendSuccess(res, { 
      loyalty,
      coinsEarned,
      streakContinued: daysDiff === 1
    }, 'Check-in successful');
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to check in', 500);
  }
});

// Complete mission
export const completeMission = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { missionId } = req.params;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  try {
    const loyalty = await UserLoyalty.findOne({ userId });

    if (!loyalty) {
      throw new AppError('Loyalty record not found', 404);
    }

    const mission = loyalty.missions.find(m => m.missionId === missionId);

    if (!mission) {
      throw new AppError('Mission not found', 404);
    }

    if (mission.completedAt) {
      throw new AppError('Mission already completed', 400);
    }

    if (mission.progress < mission.target) {
      throw new AppError('Mission target not reached', 400);
    }

    mission.completedAt = new Date();
    loyalty.coins.available += mission.reward;
    loyalty.coins.history.push({
      amount: mission.reward,
      type: 'earned',
      description: `Mission completed: ${mission.title}`,
      date: new Date()
    });

    await loyalty.save();

    sendSuccess(res, { 
      loyalty,
      reward: mission.reward
    }, 'Mission completed successfully');
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to complete mission', 500);
  }
});

// Get coin balance
export const getCoinBalance = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  try {
    const loyalty = await UserLoyalty.findOne({ userId })
      .select('coins')
      .lean();

    if (!loyalty) {
      return sendSuccess(res, { 
        coins: {
          available: 0,
          expiring: 0,
          expiryDate: null
        }
      }, 'Coin balance retrieved successfully');
    }

    sendSuccess(res, { coins: loyalty.coins }, 'Coin balance retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch coin balance', 500);
  }
});


