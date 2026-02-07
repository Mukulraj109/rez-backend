import { Request, Response } from 'express';
import UserLoyalty from '../models/UserLoyalty';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { Wallet } from '../models/Wallet';
import { Review } from '../models/Review';
import {
  sendSuccess,
  sendNotFound
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { regionService, isValidRegion, RegionId } from '../services/regionService';

// Default food-dining missions to seed for new users
const FOOD_DINING_MISSIONS = [
  {
    missionId: 'food-try-3-restaurants',
    title: 'Try 3 New Restaurants',
    description: 'Order from 3 different restaurants you haven\'t tried before',
    target: 3,
    reward: 50,
    icon: '🍽️',
  },
  {
    missionId: 'food-leave-2-reviews',
    title: 'Leave 2 Reviews',
    description: 'Write reviews with photos for restaurants you\'ve visited',
    target: 2,
    reward: 30,
    icon: '⭐',
  },
  {
    missionId: 'food-place-10-orders',
    title: 'Place 10 Food Orders',
    description: 'Complete 10 food delivery or dine-in orders',
    target: 10,
    reward: 100,
    icon: '🛒',
  },
  {
    missionId: 'food-7-day-streak',
    title: '7-Day Check-in Streak',
    description: 'Check in every day for 7 consecutive days',
    target: 7,
    reward: 50,
    icon: '🔥',
  },
  {
    missionId: 'food-try-5-cuisines',
    title: 'Try 5 Different Cuisines',
    description: 'Order from restaurants with 5 different cuisine types',
    target: 5,
    reward: 75,
    icon: '🌍',
  },
];

// Tier thresholds for brand loyalty
function getTierFromPurchaseCount(count: number): { tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'; progress: number; nextTierAt: number } {
  if (count >= 20) return { tier: 'Platinum', progress: 100, nextTierAt: 0 };
  if (count >= 10) return { tier: 'Gold', progress: Math.round(((count - 10) / 10) * 100), nextTierAt: 20 };
  if (count >= 5) return { tier: 'Silver', progress: Math.round(((count - 5) / 5) * 100), nextTierAt: 10 };
  return { tier: 'Bronze', progress: Math.round((count / 5) * 100), nextTierAt: 5 };
}

// Auto-populate brand loyalty from order history
async function populateBrandLoyaltyFromOrders(userId: string): Promise<any[]> {
  try {
    const orders = await Order.find({
      user: userId,
      status: 'delivered',
    }).select('items store').lean();

    // Group by store using items[].store + items[].storeName
    const storeMap = new Map<string, { name: string; count: number }>();

    for (const order of orders) {
      // Use top-level store if available
      if (order.store) {
        const storeId = order.store.toString();
        const existing = storeMap.get(storeId);
        if (existing) {
          existing.count += 1;
        } else {
          // Try to get store name from items
          const storeName = order.items?.[0]?.storeName || 'Restaurant';
          storeMap.set(storeId, { name: storeName, count: 1 });
        }
        continue;
      }

      // Fallback: group by each item's store
      for (const item of (order.items || [])) {
        if (!item.store) continue;
        const storeId = item.store.toString();
        const existing = storeMap.get(storeId);
        if (existing) {
          existing.count += 1;
        } else {
          storeMap.set(storeId, { name: item.storeName || 'Restaurant', count: 1 });
        }
      }
    }

    // Convert to brandLoyalty entries
    const brandLoyalty: any[] = [];
    for (const [storeId, data] of storeMap) {
      const tierInfo = getTierFromPurchaseCount(data.count);
      brandLoyalty.push({
        brandId: storeId,
        brandName: data.name,
        purchaseCount: data.count,
        tier: tierInfo.tier,
        progress: tierInfo.progress,
        nextTierAt: tierInfo.nextTierAt,
      });
    }

    // Sort by purchase count descending
    brandLoyalty.sort((a, b) => b.purchaseCount - a.purchaseCount);
    return brandLoyalty;
  } catch (error) {
    console.error('[Loyalty] Error populating brand loyalty:', error);
    return [];
  }
}

// Compute mission progress from real data (orders, reviews, streak)
// Returns a map of missionId -> computed progress
async function computeMissionProgress(userId: string, streakCurrent: number): Promise<Map<string, number>> {
  const progressMap = new Map<string, number>();

  try {
    // Fetch orders and reviews in parallel
    const [deliveredOrders, reviewCount] = await Promise.all([
      Order.find({
        user: userId,
        status: 'delivered',
      }).select('items store').lean(),
      Review.countDocuments({
        user: userId,
        isActive: true,
      }),
    ]);

    // Count unique stores ordered from
    const uniqueStoreIds = new Set<string>();
    for (const order of deliveredOrders) {
      if (order.store) uniqueStoreIds.add(order.store.toString());
      for (const item of (order.items || [])) {
        if (item.store) uniqueStoreIds.add(item.store.toString());
      }
    }

    // Count unique cuisine categories from stores
    let uniqueCuisineCount = 0;
    if (uniqueStoreIds.size > 0) {
      try {
        const storeCategories = await Store.find({
          _id: { $in: Array.from(uniqueStoreIds) },
        }).select('category').lean();
        const uniqueCategories = new Set(
          storeCategories.map(s => s.category?.toString()).filter(Boolean)
        );
        uniqueCuisineCount = uniqueCategories.size;
      } catch {
        // If store query fails, keep at 0
      }
    }

    // Set progress for each mission type
    progressMap.set('food-try-3-restaurants', uniqueStoreIds.size);
    progressMap.set('food-leave-2-reviews', reviewCount);
    progressMap.set('food-place-10-orders', deliveredOrders.length);
    progressMap.set('food-7-day-streak', streakCurrent);
    progressMap.set('food-try-5-cuisines', uniqueCuisineCount);
  } catch (error) {
    console.error('[Loyalty] Error computing mission progress:', error);
  }

  return progressMap;
}

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
  const category = req.query.category as string | undefined;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  try {
    let loyalty = await UserLoyalty.findOne({ userId });
    let needsSave = false;

    if (!loyalty) {
      // Create default loyalty record with seeded missions
      const missions = FOOD_DINING_MISSIONS.map(m => ({ ...m, progress: 0 }));
      loyalty = await UserLoyalty.create({
        userId,
        streak: {
          current: 0,
          target: 7,
          history: []
        },
        brandLoyalty: [],
        missions,
        coins: {
          available: 0,
          expiring: 0,
          history: []
        }
      });
    }

    // Auto-seed missions if empty
    if (!loyalty.missions || loyalty.missions.length === 0) {
      loyalty.missions = FOOD_DINING_MISSIONS.map(m => ({ ...m, progress: 0 })) as any;
      needsSave = true;
    }

    // Auto-populate brand loyalty from order history if empty
    if (!loyalty.brandLoyalty || loyalty.brandLoyalty.length === 0) {
      const brandLoyalty = await populateBrandLoyaltyFromOrders(userId);
      if (brandLoyalty.length > 0) {
        loyalty.brandLoyalty = brandLoyalty as any;
        needsSave = true;
      }
    }

    if (needsSave) {
      await loyalty.save();
    }

    // Compute real mission progress from orders/reviews/streak and save
    const progressMap = await computeMissionProgress(userId, loyalty.streak?.current || 0);
    let missionProgressChanged = false;
    for (const mission of loyalty.missions) {
      const realProgress = progressMap.get(mission.missionId);
      if (realProgress !== undefined) {
        const capped = Math.min(realProgress, mission.target);
        if (mission.progress !== capped) {
          mission.progress = capped;
          missionProgressChanged = true;
        }
      }
    }
    if (missionProgressChanged) {
      await loyalty.save();
    }

    const loyaltyObj = loyalty.toObject();

    // Fetch wallet balance to merge with loyalty coins
    let walletBalance = 0;
    try {
      const wallet = await Wallet.findOne({ user: userId }).select('balance coins').lean();
      if (wallet) {
        walletBalance = wallet.balance?.available || 0;
      }
    } catch (walletErr) {
      console.error('[Loyalty] Error fetching wallet balance:', walletErr);
    }

    sendSuccess(res, {
      loyalty: loyaltyObj,
      walletBalance,
      totalCoins: (loyaltyObj.coins?.available || 0) + walletBalance,
    }, 'Loyalty data retrieved successfully');
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

    // Award coins for check-in (bonus for streaks)
    let coinsEarned = 10;
    if (loyalty.streak.current >= 7) coinsEarned = 20; // Bonus for 7+ day streak
    else if (loyalty.streak.current >= 3) coinsEarned = 15; // Bonus for 3+ day streak

    const category = req.query.category as string || req.body?.category;
    const description = category
      ? `Daily ${category.replace(/-/g, ' ')} check-in reward`
      : 'Daily check-in reward';

    loyalty.coins.available += coinsEarned;
    loyalty.coins.history.push({
      amount: coinsEarned,
      type: 'earned',
      description,
      date: new Date()
    });

    // Update 7-day streak mission progress
    const streakMission = loyalty.missions.find(m => m.missionId === 'food-7-day-streak' && !m.completedAt);
    if (streakMission) {
      streakMission.progress = Math.min(loyalty.streak.current, streakMission.target);
    }

    await loyalty.save();

    sendSuccess(res, {
      loyalty,
      coinsEarned,
      streakContinued: daysDiff === 1,
      streakBonus: coinsEarned > 10,
      message: `+${coinsEarned} coins earned! ${loyalty.streak.current} day streak${coinsEarned > 10 ? ' (streak bonus!)' : ''}`,
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

    // Recompute real mission progress before checking
    const progressMap = await computeMissionProgress(userId, loyalty.streak?.current || 0);
    for (const m of loyalty.missions) {
      const realProgress = progressMap.get(m.missionId);
      if (realProgress !== undefined) {
        m.progress = Math.min(realProgress, m.target);
      }
    }

    const mission = loyalty.missions.find(m => m.missionId === missionId);

    if (!mission) {
      throw new AppError('Mission not found', 404);
    }

    if (mission.completedAt) {
      throw new AppError('Mission already completed', 400);
    }

    if (mission.progress < mission.target) {
      throw new AppError(`Mission target not reached (${mission.progress}/${mission.target})`, 400);
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

// Get coin balance (combined loyalty + wallet)
export const getCoinBalance = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  try {
    const [loyalty, wallet] = await Promise.all([
      UserLoyalty.findOne({ userId }).select('coins').lean(),
      Wallet.findOne({ user: userId }).select('balance coins').lean(),
    ]);

    const loyaltyCoins = loyalty?.coins || { available: 0, expiring: 0, expiryDate: null, history: [] };
    const walletBalance = wallet?.balance?.available || 0;

    sendSuccess(res, {
      coins: loyaltyCoins,
      walletBalance,
      totalCoins: (loyaltyCoins.available || 0) + walletBalance,
    }, 'Coin balance retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to fetch coin balance', 500);
  }
});

// Sync/refresh brand loyalty from order history
export const syncBrandLoyalty = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  try {
    let loyalty = await UserLoyalty.findOne({ userId });

    if (!loyalty) {
      throw new AppError('Loyalty record not found', 404);
    }

    // Force refresh from order history
    const brandLoyalty = await populateBrandLoyaltyFromOrders(userId);
    loyalty.brandLoyalty = brandLoyalty as any;
    await loyalty.save();

    sendSuccess(res, {
      brandLoyalty,
      count: brandLoyalty.length,
    }, 'Brand loyalty synced from order history');
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to sync brand loyalty', 500);
  }
});

// Get homepage loyalty section summary (loyalty hub stats + featured products/services)
export const getHomepageLoyaltySummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?._id || (req as any).user?.id;
  const { latitude, longitude } = req.query;

  // Get region from header for filtering
  const regionHeader = req.headers['x-rez-region'] as string;
  const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
    ? regionHeader as RegionId
    : undefined;

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
    // Build store filter combining geo and region
    const storeFilter: any = {
      'location.coordinates': {
        $geoWithin: {
          $centerSphere: [coordinates, 10 / 6378.1] // 10km radius, Earth radius in km
        }
      },
      isActive: true
    };

    // Add region filter if specified
    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      Object.assign(storeFilter, regionFilter);
    }

    // Run all queries in parallel for performance
    const [loyaltyData, nearbyStores] = await Promise.all([
      // Get loyalty stats only if user is authenticated
      userId ? UserLoyalty.findOne({ userId }).lean() : Promise.resolve(null),
      // Get nearby stores (10km radius) filtered by region
      Store.find(storeFilter)
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


