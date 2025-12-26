import { Request, Response } from 'express';
import UserLoyalty from '../models/UserLoyalty';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import {
  sendSuccess,
  sendNotFound
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// Interface for homepage loyalty section response
interface LoyaltyHubStats {
  activeBrands: number;
  streaks: number;
  unlocked: number;
  tiers: number;
}

interface FeaturedProduct {
  productId: string;
  name: string;
  image: string;
  originalPrice: number;
  sellingPrice: number;
  savings: number;
  cashbackCoins: number;
  storeName: string;
  storeId: string;
}

interface HomepageLoyaltySummary {
  loyaltyHub: LoyaltyHubStats | null;
  featuredLockProduct: FeaturedProduct | null;
  trendingService: FeaturedProduct | null;
}

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

// Get homepage loyalty section summary (loyalty hub stats + featured products/services)
export const getHomepageLoyaltySummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?._id || (req as any).user?.id;
  const { latitude, longitude } = req.query;

  // Default coordinates (Bangalore) if not provided
  const lat = latitude ? parseFloat(latitude as string) : 12.9716;
  const lng = longitude ? parseFloat(longitude as string) : 77.5946;
  const coordinates: [number, number] = [lng, lat]; // [longitude, latitude] for MongoDB

  const result: HomepageLoyaltySummary = {
    loyaltyHub: null,
    featuredLockProduct: null,
    trendingService: null
  };

  try {
    // Run all queries in parallel for performance
    const [loyaltyData, nearbyStores] = await Promise.all([
      // Get loyalty stats only if user is authenticated
      userId ? UserLoyalty.findOne({ userId }).lean() : Promise.resolve(null),
      // Get nearby stores (10km radius)
      Store.find({
        'location.coordinates': {
          $geoWithin: {
            $centerSphere: [coordinates, 10 / 6378.1] // 10km radius, Earth radius in km
          }
        },
        isActive: true
      })
        .select('_id name logo')
        .limit(50)
        .lean()
    ]);

    // Calculate loyalty hub stats if user is authenticated
    if (loyaltyData) {
      const completedMissions = loyaltyData.missions?.filter(m => m.completedAt)?.length || 0;
      const spentCoinsHistory = loyaltyData.coins?.history?.filter(h => h.type === 'spent')?.length || 0;
      const uniqueTiers = new Set(loyaltyData.brandLoyalty?.map(b => b.tier) || []);

      result.loyaltyHub = {
        activeBrands: loyaltyData.brandLoyalty?.length || 0,
        streaks: loyaltyData.streak?.current || 0,
        unlocked: completedMissions + spentCoinsHistory, // Combined: completed missions + redeemed rewards
        tiers: uniqueTiers.size || 0
      };
    }

    // Get store IDs for product queries
    const storeIds = nearbyStores.map(s => s._id);
    const storeMap = new Map(nearbyStores.map(s => [s._id.toString(), s]));

    if (storeIds.length > 0) {
      // Get featured lock product (highest discount physical product)
      const [featuredProduct, trendingService]: [any, any] = await Promise.all([
        Product.findOne({
          store: { $in: storeIds },
          productType: 'product',
          isActive: true,
          isDeleted: { $ne: true },
          'inventory.isAvailable': true,
          'pricing.original': { $gt: 0 },
          'pricing.selling': { $gt: 0 }
        })
          .sort({ 'pricing.discount': -1 }) // Sort by discount percentage
          .select('name images pricing cashback store')
          .lean(),

        // Get trending service (by views + purchases)
        Product.findOne({
          store: { $in: storeIds },
          productType: 'service',
          isActive: true,
          isDeleted: { $ne: true },
          'inventory.isAvailable': true,
          'pricing.selling': { $gt: 0 }
        })
          .sort({
            'analytics.purchases': -1,
            'analytics.views': -1,
            'ratings.average': -1
          })
          .select('name images pricing cashback store analytics')
          .lean()
      ]);

      // Format featured lock product
      if (featuredProduct) {
        const store = storeMap.get(featuredProduct.store.toString());
        const savings = (featuredProduct.pricing?.original || 0) - (featuredProduct.pricing?.selling || 0);
        const cashbackPercent = featuredProduct.cashback?.percentage || 0;
        const cashbackCoins = Math.floor((featuredProduct.pricing?.selling || 0) * cashbackPercent / 100);

        result.featuredLockProduct = {
          productId: featuredProduct._id.toString(),
          name: featuredProduct.name,
          image: featuredProduct.images?.[0] || '',
          originalPrice: featuredProduct.pricing?.original || 0,
          sellingPrice: featuredProduct.pricing?.selling || 0,
          savings: savings > 0 ? savings : 0,
          cashbackCoins: cashbackCoins,
          storeName: store?.name || '',
          storeId: featuredProduct.store.toString()
        };
      }

      // Format trending service
      if (trendingService) {
        const store = storeMap.get(trendingService.store.toString());
        const savings = (trendingService.pricing?.original || trendingService.pricing?.selling || 0) - (trendingService.pricing?.selling || 0);
        const cashbackPercent = trendingService.cashback?.percentage || 0;
        const cashbackCoins = Math.floor((trendingService.pricing?.selling || 0) * cashbackPercent / 100);

        result.trendingService = {
          productId: trendingService._id.toString(),
          name: trendingService.name,
          image: trendingService.images?.[0] || '',
          originalPrice: trendingService.pricing?.original || trendingService.pricing?.selling || 0,
          sellingPrice: trendingService.pricing?.selling || 0,
          savings: savings > 0 ? savings : 0,
          cashbackCoins: cashbackCoins,
          storeName: store?.name || '',
          storeId: trendingService.store.toString()
        };
      }
    }

    sendSuccess(res, result, 'Homepage loyalty summary retrieved successfully');
  } catch (error) {
    console.error('Error fetching homepage loyalty summary:', error);
    throw new AppError('Failed to fetch homepage loyalty summary', 500);
  }
});


