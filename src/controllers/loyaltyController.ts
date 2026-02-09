import { Request, Response } from 'express';
import UserLoyalty from '../models/UserLoyalty';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { Wallet } from '../models/Wallet';
import { Review } from '../models/Review';
import coinService from '../services/coinService';
import { MainCategorySlug } from '../models/CoinTransaction';
import {
  sendSuccess,
  sendNotFound
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { regionService, isValidRegion, RegionId } from '../services/regionService';

const VALID_CATEGORIES: MainCategorySlug[] = ['food-dining', 'beauty-wellness', 'grocery-essentials', 'fitness-sports', 'healthcare', 'fashion', 'education-learning', 'home-services', 'travel-experiences', 'entertainment', 'financial-lifestyle', 'electronics'];

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

// Fitness & Sports missions
const FITNESS_SPORTS_MISSIONS = [
  { missionId: 'fitness-visit-3-gyms', title: 'Visit 3 Gyms/Studios', description: 'Try 3 different fitness venues', target: 3, reward: 50, icon: '🏋️' },
  { missionId: 'fitness-book-5-classes', title: 'Book 5 Fitness Classes', description: 'Book group classes or personal training', target: 5, reward: 75, icon: '📅' },
  { missionId: 'fitness-7-day-streak', title: '7-Day Check-in Streak', description: 'Check in every day for 7 consecutive days', target: 7, reward: 50, icon: '🔥' },
  { missionId: 'fitness-leave-2-reviews', title: 'Rate 2 Venues', description: 'Leave reviews at fitness venues', target: 2, reward: 30, icon: '⭐' },
  { missionId: 'fitness-try-3-workouts', title: 'Try 3 Workout Types', description: 'Try different workout categories', target: 3, reward: 60, icon: '💪' },
];

// Beauty & Wellness missions
const BEAUTY_WELLNESS_MISSIONS = [
  { missionId: 'beauty-visit-3-salons', title: 'Visit 3 Salons/Spas', description: 'Try 3 different beauty venues', target: 3, reward: 50, icon: '💇' },
  { missionId: 'beauty-book-5-services', title: 'Book 5 Services', description: 'Book beauty or wellness services', target: 5, reward: 75, icon: '📅' },
  { missionId: 'beauty-7-day-streak', title: '7-Day Self-Care Streak', description: 'Check in every day for 7 consecutive days', target: 7, reward: 50, icon: '🔥' },
  { missionId: 'beauty-leave-2-reviews', title: 'Rate 2 Venues', description: 'Leave reviews at beauty venues', target: 2, reward: 30, icon: '⭐' },
  { missionId: 'beauty-try-3-services', title: 'Try 3 Service Types', description: 'Try different beauty categories', target: 3, reward: 60, icon: '✨' },
];

// Grocery missions
const GROCERY_ESSENTIALS_MISSIONS = [
  { missionId: 'grocery-shop-3-stores', title: 'Shop at 3 Stores', description: 'Try 3 different grocery stores', target: 3, reward: 50, icon: '🛒' },
  { missionId: 'grocery-place-10-orders', title: 'Place 10 Orders', description: 'Complete 10 grocery orders', target: 10, reward: 100, icon: '📦' },
  { missionId: 'grocery-7-day-streak', title: '7-Day Shopping Streak', description: 'Check in every day for 7 consecutive days', target: 7, reward: 50, icon: '🔥' },
  { missionId: 'grocery-leave-2-reviews', title: 'Rate 2 Stores', description: 'Leave reviews at grocery stores', target: 2, reward: 30, icon: '⭐' },
  { missionId: 'grocery-try-5-categories', title: 'Try 5 Categories', description: 'Shop from 5 different product categories', target: 5, reward: 75, icon: '🧺' },
];

// Healthcare missions
const HEALTHCARE_MISSIONS = [
  { missionId: 'health-visit-3-clinics', title: 'Visit 3 Clinics', description: 'Try 3 different healthcare providers', target: 3, reward: 50, icon: '🏥' },
  { missionId: 'health-book-5-appointments', title: 'Book 5 Appointments', description: 'Book doctor or lab appointments', target: 5, reward: 75, icon: '📅' },
  { missionId: 'health-checkup-streak', title: 'Health Checkup Streak', description: 'Complete routine checkups for 3 months', target: 3, reward: 60, icon: '🔥' },
  { missionId: 'health-rate-2-doctors', title: 'Rate 2 Doctors', description: 'Leave reviews for healthcare providers', target: 2, reward: 30, icon: '⭐' },
  { missionId: 'health-try-3-specialties', title: 'Try 3 Specialties', description: 'Visit different medical specialties', target: 3, reward: 60, icon: '💊' },
];

// Fashion missions
const FASHION_MISSIONS = [
  { missionId: 'fashion-visit-3-stores', title: 'Visit 3 Stores', description: 'Shop at 3 different fashion stores', target: 3, reward: 50, icon: '👗' },
  { missionId: 'fashion-buy-5-brands', title: 'Buy from 5 Brands', description: 'Purchase from 5 different brands', target: 5, reward: 75, icon: '🛍️' },
  { missionId: 'fashion-7-day-streak', title: '7-Day Style Streak', description: 'Check in every day for 7 consecutive days', target: 7, reward: 50, icon: '🔥' },
  { missionId: 'fashion-rate-2-boutiques', title: 'Rate 2 Boutiques', description: 'Leave reviews at fashion stores', target: 2, reward: 30, icon: '⭐' },
  { missionId: 'fashion-try-3-categories', title: 'Try 3 Categories', description: 'Shop from 3 different fashion categories', target: 3, reward: 60, icon: '👠' },
];

// Education missions
const EDUCATION_MISSIONS = [
  { missionId: 'edu-enroll-3-courses', title: 'Enroll in 3 Courses', description: 'Join 3 different courses or classes', target: 3, reward: 50, icon: '📚' },
  { missionId: 'edu-complete-5-classes', title: 'Complete 5 Classes', description: 'Attend and complete 5 class sessions', target: 5, reward: 75, icon: '✅' },
  { missionId: 'edu-7-day-streak', title: '7-Day Learning Streak', description: 'Check in every day for 7 consecutive days', target: 7, reward: 50, icon: '🔥' },
  { missionId: 'edu-rate-2-institutes', title: 'Rate 2 Institutes', description: 'Leave reviews for educational institutes', target: 2, reward: 30, icon: '⭐' },
  { missionId: 'edu-try-3-subjects', title: 'Try 3 Subjects', description: 'Explore 3 different subject areas', target: 3, reward: 60, icon: '🎓' },
];

// Home Services missions
const HOME_SERVICES_MISSIONS = [
  { missionId: 'home-book-3-services', title: 'Book 3 Services', description: 'Book 3 different home services', target: 3, reward: 50, icon: '🏠' },
  { missionId: 'home-complete-5-jobs', title: 'Complete 5 Jobs', description: 'Get 5 home service jobs completed', target: 5, reward: 75, icon: '🔧' },
  { missionId: 'home-monthly-maintenance', title: 'Monthly Maintenance', description: 'Schedule maintenance services for 3 months', target: 3, reward: 60, icon: '🔥' },
  { missionId: 'home-rate-2-providers', title: 'Rate 2 Providers', description: 'Leave reviews for service providers', target: 2, reward: 30, icon: '⭐' },
  { missionId: 'home-try-3-services', title: 'Try 3 Service Types', description: 'Use 3 different types of home services', target: 3, reward: 60, icon: '🛠️' },
];

// Travel missions
const TRAVEL_MISSIONS = [
  { missionId: 'travel-book-3-trips', title: 'Book 3 Trips', description: 'Book 3 different travel experiences', target: 3, reward: 50, icon: '✈️' },
  { missionId: 'travel-visit-5-destinations', title: 'Visit 5 Destinations', description: 'Travel to 5 different destinations', target: 5, reward: 75, icon: '🗺️' },
  { missionId: 'travel-weekend-streak', title: 'Weekend Getaway Streak', description: 'Plan weekend trips for 3 months', target: 3, reward: 60, icon: '🔥' },
  { missionId: 'travel-rate-2-hotels', title: 'Rate 2 Hotels', description: 'Leave reviews for hotels or venues', target: 2, reward: 30, icon: '⭐' },
  { missionId: 'travel-try-3-modes', title: 'Try 3 Travel Modes', description: 'Use 3 different travel modes', target: 3, reward: 60, icon: '🚂' },
];

// Entertainment missions
const ENTERTAINMENT_MISSIONS = [
  { missionId: 'ent-attend-3-events', title: 'Attend 3 Events', description: 'Attend 3 different entertainment events', target: 3, reward: 50, icon: '🎬' },
  { missionId: 'ent-book-5-tickets', title: 'Book 5 Tickets', description: 'Book tickets for 5 shows or events', target: 5, reward: 75, icon: '🎟️' },
  { missionId: 'ent-weekend-streak', title: 'Weekend Fun Streak', description: 'Attend events for 4 consecutive weekends', target: 4, reward: 50, icon: '🔥' },
  { missionId: 'ent-rate-2-venues', title: 'Rate 2 Venues', description: 'Leave reviews for entertainment venues', target: 2, reward: 30, icon: '⭐' },
  { missionId: 'ent-try-3-types', title: 'Try 3 Entertainment Types', description: 'Experience 3 different entertainment types', target: 3, reward: 60, icon: '🎭' },
];

// Financial missions
const FINANCIAL_MISSIONS = [
  { missionId: 'fin-pay-3-bills', title: 'Pay 3 Bills', description: 'Pay 3 different utility or service bills', target: 3, reward: 50, icon: '💳' },
  { missionId: 'fin-use-5-services', title: 'Use 5 Services', description: 'Use 5 different financial services', target: 5, reward: 75, icon: '🏦' },
  { missionId: 'fin-savings-streak', title: 'Monthly Savings Streak', description: 'Save consistently for 3 months', target: 3, reward: 60, icon: '🔥' },
  { missionId: 'fin-rate-2-providers', title: 'Rate 2 Providers', description: 'Leave reviews for financial service providers', target: 2, reward: 30, icon: '⭐' },
  { missionId: 'fin-try-3-products', title: 'Try 3 Financial Products', description: 'Use 3 different financial product types', target: 3, reward: 60, icon: '📊' },
];

// Electronics missions
const ELECTRONICS_MISSIONS = [
  { missionId: 'elec-buy-3-stores', title: 'Buy from 3 Stores', description: 'Purchase from 3 different electronics stores', target: 3, reward: 50, icon: '📱' },
  { missionId: 'elec-purchase-5-items', title: 'Purchase 5 Items', description: 'Buy 5 different electronics products', target: 5, reward: 75, icon: '💻' },
  { missionId: 'elec-review-streak', title: 'Tech Review Streak', description: 'Write tech reviews for 3 consecutive weeks', target: 3, reward: 50, icon: '🔥' },
  { missionId: 'elec-rate-2-brands', title: 'Rate 2 Brands', description: 'Leave reviews for electronics brands', target: 2, reward: 30, icon: '⭐' },
  { missionId: 'elec-try-3-categories', title: 'Try 3 Categories', description: 'Shop from 3 different electronics categories', target: 3, reward: 60, icon: '🎮' },
];

// Category-aware mission selector
const CATEGORY_MISSIONS: Record<string, typeof FOOD_DINING_MISSIONS> = {
  'food-dining': FOOD_DINING_MISSIONS,
  'fitness-sports': FITNESS_SPORTS_MISSIONS,
  'beauty-wellness': BEAUTY_WELLNESS_MISSIONS,
  'grocery-essentials': GROCERY_ESSENTIALS_MISSIONS,
  'healthcare': HEALTHCARE_MISSIONS,
  'fashion': FASHION_MISSIONS,
  'education-learning': EDUCATION_MISSIONS,
  'home-services': HOME_SERVICES_MISSIONS,
  'travel-experiences': TRAVEL_MISSIONS,
  'entertainment': ENTERTAINMENT_MISSIONS,
  'financial-lifestyle': FINANCIAL_MISSIONS,
  'electronics': ELECTRONICS_MISSIONS,
};

function getMissionsForCategory(category?: string) {
  return CATEGORY_MISSIONS[category || 'food-dining'] || FOOD_DINING_MISSIONS;
}

// Category-aware brand name fallback
function getBrandFallbackName(category?: string): string {
  switch (category) {
    case 'fitness-sports': return 'Gym';
    case 'beauty-wellness': return 'Salon';
    case 'grocery-essentials': return 'Store';
    case 'healthcare': return 'Clinic';
    case 'fashion': return 'Brand';
    case 'education-learning': return 'Institute';
    case 'home-services': return 'Service';
    case 'travel-experiences': return 'Venue';
    case 'entertainment': return 'Venue';
    case 'financial-lifestyle': return 'Provider';
    case 'electronics': return 'Store';
    default: return 'Restaurant';
  }
}

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
          const storeName = order.items?.[0]?.storeName || 'Venue';
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
          storeMap.set(storeId, { name: item.storeName || 'Venue', count: 1 });
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

    // Set progress for ALL category missions (generalized)
    // Each category has 5 mission types following the same pattern
    const MISSION_PROGRESS_MAP: Record<string, number> = {
      // food-dining
      'food-try-3-restaurants': uniqueStoreIds.size,
      'food-leave-2-reviews': reviewCount,
      'food-place-10-orders': deliveredOrders.length,
      'food-7-day-streak': streakCurrent,
      'food-try-5-cuisines': uniqueCuisineCount,
      // fitness-sports
      'fitness-visit-3-gyms': uniqueStoreIds.size,
      'fitness-book-5-classes': deliveredOrders.length,
      'fitness-7-day-streak': streakCurrent,
      'fitness-leave-2-reviews': reviewCount,
      'fitness-try-3-workouts': uniqueCuisineCount,
      // beauty-wellness
      'beauty-visit-3-salons': uniqueStoreIds.size,
      'beauty-book-5-services': deliveredOrders.length,
      'beauty-7-day-streak': streakCurrent,
      'beauty-leave-2-reviews': reviewCount,
      'beauty-try-3-services': uniqueCuisineCount,
      // grocery-essentials
      'grocery-shop-3-stores': uniqueStoreIds.size,
      'grocery-place-10-orders': deliveredOrders.length,
      'grocery-7-day-streak': streakCurrent,
      'grocery-leave-2-reviews': reviewCount,
      'grocery-try-5-categories': uniqueCuisineCount,
      // healthcare
      'health-visit-3-clinics': uniqueStoreIds.size,
      'health-book-5-appointments': deliveredOrders.length,
      'health-checkup-streak': streakCurrent,
      'health-rate-2-doctors': reviewCount,
      'health-try-3-specialties': uniqueCuisineCount,
      // fashion
      'fashion-visit-3-stores': uniqueStoreIds.size,
      'fashion-buy-5-brands': deliveredOrders.length,
      'fashion-7-day-streak': streakCurrent,
      'fashion-rate-2-boutiques': reviewCount,
      'fashion-try-3-categories': uniqueCuisineCount,
      // education-learning
      'edu-enroll-3-courses': uniqueStoreIds.size,
      'edu-complete-5-classes': deliveredOrders.length,
      'edu-7-day-streak': streakCurrent,
      'edu-rate-2-institutes': reviewCount,
      'edu-try-3-subjects': uniqueCuisineCount,
      // home-services
      'home-book-3-services': uniqueStoreIds.size,
      'home-complete-5-jobs': deliveredOrders.length,
      'home-monthly-maintenance': streakCurrent,
      'home-rate-2-providers': reviewCount,
      'home-try-3-services': uniqueCuisineCount,
      // travel-experiences
      'travel-book-3-trips': uniqueStoreIds.size,
      'travel-visit-5-destinations': deliveredOrders.length,
      'travel-weekend-streak': streakCurrent,
      'travel-rate-2-hotels': reviewCount,
      'travel-try-3-modes': uniqueCuisineCount,
      // entertainment
      'ent-attend-3-events': uniqueStoreIds.size,
      'ent-book-5-tickets': deliveredOrders.length,
      'ent-weekend-streak': streakCurrent,
      'ent-rate-2-venues': reviewCount,
      'ent-try-3-types': uniqueCuisineCount,
      // financial-lifestyle
      'fin-pay-3-bills': uniqueStoreIds.size,
      'fin-use-5-services': deliveredOrders.length,
      'fin-savings-streak': streakCurrent,
      'fin-rate-2-providers': reviewCount,
      'fin-try-3-products': uniqueCuisineCount,
      // electronics
      'elec-buy-3-stores': uniqueStoreIds.size,
      'elec-purchase-5-items': deliveredOrders.length,
      'elec-review-streak': streakCurrent,
      'elec-rate-2-brands': reviewCount,
      'elec-try-3-categories': uniqueCuisineCount,
    };

    for (const [missionId, progress] of Object.entries(MISSION_PROGRESS_MAP)) {
      progressMap.set(missionId, progress);
    }
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
      const missions = getMissionsForCategory(category).map(m => ({ ...m, progress: 0 }));
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
      loyalty.missions = getMissionsForCategory(category).map(m => ({ ...m, progress: 0 })) as any;
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
    let categoryBalance = 0;
    let categoryCoinsData: { available: number; expiring: number; expiryDate?: Date } | null = null;
    try {
      const wallet = await Wallet.findOne({ user: userId }).select('balance coins categoryBalances').lean();
      if (wallet) {
        walletBalance = wallet.balance?.available || 0;

        // If category requested, get category-specific balance
        if (category && VALID_CATEGORIES.includes(category as MainCategorySlug)) {
          // .lean() returns plain object (not Map), so use bracket notation
          const catBal = (wallet as any).categoryBalances?.[category];
          categoryBalance = catBal?.available || 0;
        }
      }
    } catch (walletErr) {
      console.error('[Loyalty] Error fetching wallet balance:', walletErr);
    }

    // Get category-specific coins from UserLoyalty
    if (category && VALID_CATEGORIES.includes(category as MainCategorySlug)) {
      const catCoins = loyaltyObj.categoryCoins instanceof Map
        ? loyaltyObj.categoryCoins.get(category)
        : (loyaltyObj.categoryCoins as any)?.[category];
      if (catCoins) {
        categoryCoinsData = {
          available: catCoins.available || 0,
          expiring: catCoins.expiring || 0,
          expiryDate: catCoins.expiryDate,
        };
      }
    }

    sendSuccess(res, {
      loyalty: loyaltyObj,
      walletBalance,
      totalCoins: (loyaltyObj.coins?.available || 0) + walletBalance,
      // Category-specific data (only included when category query param is provided)
      ...(category && VALID_CATEGORIES.includes(category as MainCategorySlug) ? {
        categoryCoins: categoryCoinsData || { available: 0, expiring: 0 },
        categoryBalance,
        categoryTotalCoins: (categoryCoinsData?.available || 0) + categoryBalance,
      } : {}),
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

    const category = (req.query.category as string || req.body?.category) as MainCategorySlug | undefined;
    const validCategory = category && VALID_CATEGORIES.includes(category) ? category : null;
    const description = validCategory
      ? `Daily ${validCategory.replace(/-/g, ' ')} check-in reward`
      : 'Daily check-in reward';

    // Update global coins (legacy)
    loyalty.coins.available += coinsEarned;
    loyalty.coins.history.push({
      amount: coinsEarned,
      type: 'earned',
      description,
      date: new Date()
    });

    // Update 7-day streak mission progress
    const streakMission = loyalty.missions.find(m =>
      (m.missionId.includes('streak') || m.missionId.includes('maintenance')) && !m.completedAt
    );
    if (streakMission) {
      streakMission.progress = Math.min(loyalty.streak.current, streakMission.target);
    }

    await loyalty.save();

    // Sync wallet + category balance via coinService AFTER saving loyalty
    // This avoids race conditions (coinService does its own fresh DB read)
    try {
      await coinService.awardCoins(
        userId,
        coinsEarned,
        'daily_login',
        description,
        { streakDay: loyalty.streak.current },
        validCategory || null
      );
    } catch (coinErr) {
      console.error('[Loyalty] Failed to sync coins via coinService:', coinErr);
    }

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

    // Determine category for coin allocation
    const missionCategory = (req.query.category as string || req.body?.category) as MainCategorySlug | undefined;
    const validMissionCategory = missionCategory && VALID_CATEGORIES.includes(missionCategory) ? missionCategory : null;

    // Save loyalty first (global coins), then sync wallet + category via coinService
    await loyalty.save();

    // coinService handles: CoinTransaction, Wallet sync, and UserLoyalty.categoryCoins (if category)
    try {
      await coinService.awardCoins(
        userId,
        mission.reward,
        'achievement',
        `Mission completed: ${mission.title}`,
        { missionId: mission.missionId },
        validMissionCategory || null
      );
    } catch (coinErr) {
      console.error('[Loyalty] Failed to sync mission coins via coinService:', coinErr);
    }

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

// Get coin balance (combined loyalty + wallet, with per-category breakdown)
export const getCoinBalance = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const category = req.query.category as string | undefined;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  try {
    const [loyalty, wallet] = await Promise.all([
      UserLoyalty.findOne({ userId }).select('coins categoryCoins').lean(),
      Wallet.findOne({ user: userId }).select('balance coins categoryBalances').lean(),
    ]);

    const loyaltyCoins = loyalty?.coins || { available: 0, expiring: 0, expiryDate: null, history: [] };
    const walletBalance = wallet?.balance?.available || 0;

    // Build per-category breakdown (wallet is the source of truth for category balances)
    const categoryBreakdown: Record<string, { available: number; earned: number; spent: number }> = {};
    for (const cat of VALID_CATEGORIES) {
      // .lean() returns plain objects (not Maps), so use bracket notation
      const walletCatBal = (wallet as any)?.categoryBalances?.[cat];
      categoryBreakdown[cat] = {
        available: walletCatBal?.available || 0,
        earned: walletCatBal?.earned || 0,
        spent: walletCatBal?.spent || 0,
      };
    }

    // If a specific category is requested, also filter transaction history
    let filteredHistory = loyaltyCoins.history;
    if (category && VALID_CATEGORIES.includes(category as MainCategorySlug)) {
      // Get category-specific transactions
      try {
        const catTransactions = await coinService.getCoinTransactions(userId, {
          category: category as MainCategorySlug,
          limit: 50,
        });
        filteredHistory = catTransactions.transactions.map(t => ({
          amount: t.amount,
          type: t.type as 'earned' | 'spent' | 'expired',
          description: t.description,
          date: t.createdAt,
        }));
      } catch {
        // Fall back to unfiltered history
      }
    }

    // When a specific category is requested, override coins.available with category balance
    // so it's consistent with the already-filtered transaction history
    const isValidCategory = category && VALID_CATEGORIES.includes(category as MainCategorySlug);
    const categoryAvailable = isValidCategory ? (categoryBreakdown[category]?.available || 0) : 0;

    sendSuccess(res, {
      coins: {
        ...loyaltyCoins,
        ...(isValidCategory ? { available: categoryAvailable } : {}),
        history: filteredHistory,
      },
      walletBalance,
      totalCoins: (loyaltyCoins.available || 0) + walletBalance,
      categoryBreakdown,
      // Category-specific data if requested
      ...(isValidCategory ? {
        categoryBalance: categoryBreakdown[category],
      } : {}),
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


