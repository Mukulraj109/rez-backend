/**
 * Offers Page Controller
 * Handles all offers page specific endpoints
 */

import { Request, Response } from 'express';
import Offer from '../models/Offer';
import HotspotArea from '../models/HotspotArea';
import DoubleCashbackCampaign from '../models/DoubleCashbackCampaign';
import CoinDrop from '../models/CoinDrop';
import UploadBillStore from '../models/UploadBillStore';
import BankOffer from '../models/BankOffer';
import ExclusiveZone from '../models/ExclusiveZone';
import SpecialProfile from '../models/SpecialProfile';
import LoyaltyMilestone from '../models/LoyaltyMilestone';
import FriendRedemption from '../models/FriendRedemption';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

// Helper: Common date filters for active items
const getActiveFilter = () => ({
  isActive: true,
  $or: [
    { endTime: { $exists: false } },
    { endTime: { $gte: new Date() } },
    { validUntil: { $exists: false } },
    { validUntil: { $gte: new Date() } },
  ],
});

/**
 * GET /api/offers/hotspots
 * Get hotspot areas with active offers count
 */
export const getHotspots = async (req: Request, res: Response) => {
  try {
    const { lat, lng, limit = 10 } = req.query;

    let query: any = { isActive: true };

    // If coordinates provided, sort by distance
    if (lat && lng) {
      const hotspots = await HotspotArea.aggregate([
        { $match: { isActive: true } },
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [parseFloat(lng as string), parseFloat(lat as string)],
            },
            distanceField: 'distance',
            maxDistance: 50000, // 50km
            spherical: true,
          },
        },
        { $sort: { priority: -1, distance: 1 } },
        { $limit: parseInt(limit as string) },
      ]);

      return sendSuccess(res, hotspots, 'Hotspots retrieved successfully');
    }

    const hotspots = await HotspotArea.find(query)
      .sort({ priority: -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, hotspots, 'Hotspots retrieved successfully');
  } catch (error) {
    console.error('Error fetching hotspots:', error);
    sendError(res, 'Failed to fetch hotspots', 500);
  }
};

/**
 * GET /api/offers/hotspots/:slug/offers
 * Get offers for a specific hotspot area
 */
export const getHotspotOffers = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { limit = 20 } = req.query;

    const hotspot = await HotspotArea.findOne({ slug, isActive: true });

    if (!hotspot) {
      return sendError(res, 'Hotspot not found', 404);
    }

    const offers = await Offer.find({
      'validity.isActive': true,
      'validity.endDate': { $gte: new Date() },
      location: {
        $geoWithin: {
          $centerSphere: [
            [hotspot.coordinates.lng, hotspot.coordinates.lat],
            hotspot.radius / 6378.1, // Convert km to radians
          ],
        },
      },
    })
      .sort({ 'metadata.priority': -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, { hotspot, offers }, 'Hotspot offers retrieved successfully');
  } catch (error) {
    console.error('Error fetching hotspot offers:', error);
    sendError(res, 'Failed to fetch hotspot offers', 500);
  }
};

/**
 * GET /api/offers/bogo
 * Get Buy One Get One offers
 */
export const getBOGOOffers = async (req: Request, res: Response) => {
  try {
    const { limit = 20, bogoType } = req.query;

    const filter: any = {
      'validity.isActive': true,
      'validity.endDate': { $gte: new Date() },
      bogoType: { $exists: true, $ne: null },
    };

    if (bogoType) {
      filter.bogoType = bogoType;
    }

    const offers = await Offer.find(filter)
      .sort({ 'metadata.priority': -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, offers, 'BOGO offers retrieved successfully');
  } catch (error) {
    console.error('Error fetching BOGO offers:', error);
    sendError(res, 'Failed to fetch BOGO offers', 500);
  }
};

/**
 * GET /api/offers/sales-clearance
 * Get sale and clearance offers
 */
export const getSaleOffers = async (req: Request, res: Response) => {
  try {
    const { limit = 20, saleTag } = req.query;

    const filter: any = {
      'validity.isActive': true,
      'validity.endDate': { $gte: new Date() },
      saleTag: { $exists: true, $ne: null },
    };

    if (saleTag) {
      filter.saleTag = saleTag;
    }

    const offers = await Offer.find(filter)
      .sort({ 'metadata.priority': -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, offers, 'Sale offers retrieved successfully');
  } catch (error) {
    console.error('Error fetching sale offers:', error);
    sendError(res, 'Failed to fetch sale offers', 500);
  }
};

/**
 * GET /api/offers/free-delivery
 * Get free delivery offers
 */
export const getFreeDeliveryOffers = async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const offers = await Offer.find({
      'validity.isActive': true,
      'validity.endDate': { $gte: new Date() },
      isFreeDelivery: true,
    })
      .sort({ 'metadata.priority': -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, offers, 'Free delivery offers retrieved successfully');
  } catch (error) {
    console.error('Error fetching free delivery offers:', error);
    sendError(res, 'Failed to fetch free delivery offers', 500);
  }
};

/**
 * GET /api/offers/bank-offers
 * Get bank and wallet offers
 */
export const getBankOffers = async (req: Request, res: Response) => {
  try {
    const { limit = 20, cardType } = req.query;

    const filter: any = {
      isActive: true,
      validUntil: { $gte: new Date() },
    };

    if (cardType) {
      filter.cardType = cardType;
    }

    const offers = await BankOffer.find(filter)
      .sort({ priority: -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, offers, 'Bank offers retrieved successfully');
  } catch (error) {
    console.error('Error fetching bank offers:', error);
    sendError(res, 'Failed to fetch bank offers', 500);
  }
};

/**
 * GET /api/offers/exclusive-zones
 * Get exclusive zone categories with user eligibility status
 */
export const getExclusiveZones = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;

    const zones = await ExclusiveZone.find({ isActive: true })
      .sort({ priority: -1 })
      .lean();

    // If user is authenticated, add eligibility status to each zone
    let zonesWithEligibility = zones;
    if (userId) {
      const { User } = await import('../models/User');
      const user = await User.findById(userId).lean();

      if (user) {
        zonesWithEligibility = zones.map((zone: any) => {
          let isEligible = false;

          switch (zone.eligibilityType) {
            case 'student':
              isEligible = (user as any).verifications?.student?.verified === true;
              break;
            case 'corporate_email':
              isEligible = (user as any).verifications?.corporate?.verified === true;
              break;
            case 'gender':
              isEligible = user.profile?.gender === 'female';
              break;
            case 'birthday_month':
              if (user.profile?.dateOfBirth) {
                const birthMonth = new Date(user.profile.dateOfBirth).getMonth();
                const currentMonth = new Date().getMonth();
                isEligible = birthMonth === currentMonth;
              }
              break;
            case 'age':
              if (user.profile?.dateOfBirth) {
                const age = Math.floor((Date.now() - new Date(user.profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                isEligible = age >= 60;
              }
              break;
            case 'verification':
              // First time user - check if no orders yet
              isEligible = true; // Will be refined when order tracking is implemented
              break;
            default:
              isEligible = !zone.verificationRequired;
          }

          return {
            ...zone,
            userEligible: isEligible,
          };
        });
      }
    }

    sendSuccess(res, zonesWithEligibility, 'Exclusive zones retrieved successfully');
  } catch (error) {
    console.error('Error fetching exclusive zones:', error);
    sendError(res, 'Failed to fetch exclusive zones', 500);
  }
};

/**
 * GET /api/offers/exclusive-zones/:slug/offers
 * Get offers for a specific exclusive zone
 */
export const getExclusiveZoneOffers = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { limit = 20 } = req.query;

    const zone = await ExclusiveZone.findOne({ slug, isActive: true });

    if (!zone) {
      return sendError(res, 'Exclusive zone not found', 404);
    }

    const offers = await Offer.find({
      'validity.isActive': true,
      'validity.endDate': { $gte: new Date() },
      exclusiveZone: slug,
    })
      .sort({ 'metadata.priority': -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, { zone, offers }, 'Exclusive zone offers retrieved successfully');
  } catch (error) {
    console.error('Error fetching exclusive zone offers:', error);
    sendError(res, 'Failed to fetch exclusive zone offers', 500);
  }
};

/**
 * GET /api/offers/special-profiles
 * Get special profile categories (Defence, Healthcare, etc.) with user eligibility
 */
export const getSpecialProfiles = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;

    const profiles = await SpecialProfile.find({ isActive: true })
      .sort({ priority: -1 })
      .lean();

    // If user is authenticated, add eligibility status to each profile
    let profilesWithEligibility = profiles;
    if (userId) {
      const { User } = await import('../models/User');
      const user = await User.findById(userId).lean();

      if (user) {
        profilesWithEligibility = profiles.map((profile: any) => {
          let isEligible = false;

          switch (profile.slug) {
            case 'defence':
              isEligible = (user as any).verifications?.defence?.verified === true;
              break;
            case 'healthcare':
              isEligible = (user as any).verifications?.healthcare?.verified === true;
              break;
            case 'senior':
              isEligible = (user as any).verifications?.senior?.verified === true;
              break;
            case 'teachers':
              isEligible = (user as any).verifications?.teacher?.verified === true;
              break;
            case 'government':
              isEligible = (user as any).verifications?.government?.verified === true;
              break;
            case 'differently-abled':
              isEligible = (user as any).verifications?.differentlyAbled?.verified === true;
              break;
            default:
              isEligible = !profile.verificationRequired;
          }

          return {
            ...profile,
            userEligible: isEligible,
          };
        });
      }
    }

    sendSuccess(res, profilesWithEligibility, 'Special profiles retrieved successfully');
  } catch (error) {
    console.error('Error fetching special profiles:', error);
    sendError(res, 'Failed to fetch special profiles', 500);
  }
};

/**
 * GET /api/offers/special-profiles/:slug/offers
 * Get offers for a specific special profile
 */
export const getSpecialProfileOffers = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { limit = 20 } = req.query;

    const profile = await SpecialProfile.findOne({ slug, isActive: true });

    if (!profile) {
      return sendError(res, 'Special profile not found', 404);
    }

    // Get offers tagged for this special profile
    const offers = await Offer.find({
      'validity.isActive': true,
      'validity.endDate': { $gte: new Date() },
      'metadata.tags': { $in: [slug, profile.name.toLowerCase()] },
    })
      .sort({ 'metadata.priority': -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, { profile, offers }, 'Special profile offers retrieved successfully');
  } catch (error) {
    console.error('Error fetching special profile offers:', error);
    sendError(res, 'Failed to fetch special profile offers', 500);
  }
};

/**
 * GET /api/offers/friends-redeemed
 * Get offers redeemed by user's friends (social proof)
 */
export const getFriendsRedeemed = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    const userId = (req as any).user?._id;

    // For now, get recent redemptions as social proof
    // TODO: Filter by actual friends when friend system is implemented
    const redemptions = await FriendRedemption.find({ isVisible: true })
      .populate('offerId')
      .populate('friendId', 'name avatar')
      .sort({ redeemedAt: -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, redemptions, 'Friends redemptions retrieved successfully');
  } catch (error) {
    console.error('Error fetching friends redemptions:', error);
    sendError(res, 'Failed to fetch friends redemptions', 500);
  }
};

/**
 * GET /api/cashback/double-campaigns
 * Get active double cashback campaigns
 */
export const getDoubleCashbackCampaigns = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const campaigns = await DoubleCashbackCampaign.find({
      isActive: true,
      endTime: { $gte: new Date() },
    })
      .sort({ startTime: 1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, campaigns, 'Double cashback campaigns retrieved successfully');
  } catch (error) {
    console.error('Error fetching double cashback campaigns:', error);
    sendError(res, 'Failed to fetch double cashback campaigns', 500);
  }
};

/**
 * GET /api/cashback/coin-drops
 * Get active coin drop events
 */
export const getCoinDrops = async (req: Request, res: Response) => {
  try {
    const { limit = 20, category } = req.query;

    const filter: any = {
      isActive: true,
      endTime: { $gte: new Date() },
    };

    if (category) {
      filter.category = category;
    }

    const coinDrops = await CoinDrop.find(filter)
      .populate('storeId', 'name logo')
      .sort({ multiplier: -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, coinDrops, 'Coin drops retrieved successfully');
  } catch (error) {
    console.error('Error fetching coin drops:', error);
    sendError(res, 'Failed to fetch coin drops', 500);
  }
};

/**
 * GET /api/cashback/upload-bill-stores
 * Get stores that accept bill uploads for cashback
 */
export const getUploadBillStores = async (req: Request, res: Response) => {
  try {
    const { limit = 20, category } = req.query;

    const filter: any = { isActive: true };

    if (category) {
      filter.category = category;
    }

    const stores = await UploadBillStore.find(filter)
      .sort({ coinsPerRupee: -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, stores, 'Upload bill stores retrieved successfully');
  } catch (error) {
    console.error('Error fetching upload bill stores:', error);
    sendError(res, 'Failed to fetch upload bill stores', 500);
  }
};

/**
 * GET /api/loyalty/progress
 * Get user's loyalty milestone progress
 */
export const getLoyaltyProgress = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;

    // Get all active milestones
    const milestones = await LoyaltyMilestone.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    // TODO: Calculate user's progress for each milestone
    // For now, return milestones with dummy progress
    const milestonesWithProgress = milestones.map((milestone) => ({
      ...milestone,
      currentProgress: 0, // Will be calculated based on user data
      progressPercentage: 0,
      isCompleted: false,
    }));

    sendSuccess(res, milestonesWithProgress, 'Loyalty progress retrieved successfully');
  } catch (error) {
    console.error('Error fetching loyalty progress:', error);
    sendError(res, 'Failed to fetch loyalty progress', 500);
  }
};

/**
 * GET /api/loyalty/milestones
 * Get all loyalty milestones
 */
export const getLoyaltyMilestones = async (req: Request, res: Response) => {
  try {
    const milestones = await LoyaltyMilestone.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    sendSuccess(res, milestones, 'Loyalty milestones retrieved successfully');
  } catch (error) {
    console.error('Error fetching loyalty milestones:', error);
    sendError(res, 'Failed to fetch loyalty milestones', 500);
  }
};

/**
 * GET /api/offers/discount-buckets
 * Get real-time aggregation of offers by discount ranges
 * Returns counts for 25% OFF, 50% OFF, 80% OFF, and Free Delivery
 */
export const getDiscountBuckets = async (req: Request, res: Response) => {
  try {
    console.log('📊 [DISCOUNT BUCKETS] Fetching discount bucket counts');

    const now = new Date();
    const baseFilter = {
      'validity.isActive': true,
      'validity.endDate': { $gte: now },
    };

    // Use MongoDB aggregation with $facet to get all counts in a single query
    const result = await Offer.aggregate([
      { $match: baseFilter },
      {
        $facet: {
          // 25% OFF: cashbackPercentage >= 25 and < 50
          '25off': [
            { $match: { cashbackPercentage: { $gte: 25, $lt: 50 } } },
            { $count: 'count' },
          ],
          // 50% OFF: cashbackPercentage >= 50 and < 80
          '50off': [
            { $match: { cashbackPercentage: { $gte: 50, $lt: 80 } } },
            { $count: 'count' },
          ],
          // 80% OFF: cashbackPercentage >= 80
          '80off': [
            { $match: { cashbackPercentage: { $gte: 80 } } },
            { $count: 'count' },
          ],
          // Free Delivery
          freeDelivery: [
            { $match: { isFreeDelivery: true } },
            { $count: 'count' },
          ],
        },
      },
    ]);

    // Extract counts from aggregation result (default to 0 if no matches)
    const counts = result[0] || {};
    const discountBuckets = [
      {
        id: 'db-1',
        label: '25% OFF',
        icon: 'pricetag',
        count: counts['25off']?.[0]?.count || 0,
        filterValue: '25',
      },
      {
        id: 'db-2',
        label: '50% OFF',
        icon: 'flash',
        count: counts['50off']?.[0]?.count || 0,
        filterValue: '50',
      },
      {
        id: 'db-3',
        label: '80% OFF',
        icon: 'flame',
        count: counts['80off']?.[0]?.count || 0,
        filterValue: '80',
      },
      {
        id: 'db-4',
        label: 'Free Delivery',
        icon: 'car',
        count: counts['freeDelivery']?.[0]?.count || 0,
        filterValue: 'free_delivery',
      },
    ];

    console.log('✅ [DISCOUNT BUCKETS] Counts:', discountBuckets.map(b => `${b.label}: ${b.count}`).join(', '));

    sendSuccess(res, discountBuckets, 'Discount buckets retrieved successfully');
  } catch (error) {
    console.error('❌ [DISCOUNT BUCKETS] Error:', error);
    sendError(res, 'Failed to fetch discount buckets', 500);
  }
};

/**
 * GET /api/cashback/super-cashback-stores
 * Get stores with high cashback percentage (10% or more)
 */
export const getSuperCashbackStores = async (req: Request, res: Response) => {
  try {
    const { limit = 20, minCashback = 10 } = req.query;
    const { Store } = await import('../models/Store');

    console.log('🔥 [SUPER CASHBACK] Fetching stores with high cashback');

    // Find stores with cashback >= minCashback percentage
    const stores = await Store.find({
      isActive: true,
      $or: [
        { 'paymentInfo.cashback': { $gte: parseInt(minCashback as string) } },
        { 'paymentInfo.baseCashbackPercent': { $gte: parseInt(minCashback as string) } },
      ],
    })
      .select('name logo description category location paymentInfo ratings stats')
      .sort({ 'paymentInfo.cashback': -1, 'paymentInfo.baseCashbackPercent': -1 })
      .limit(parseInt(limit as string))
      .lean();

    // Transform stores to super cashback format
    const superCashbackStores = stores.map((store: any) => ({
      id: store._id,
      name: store.name,
      logo: store.logo,
      description: store.description,
      category: store.category,
      cashbackPercentage: store.paymentInfo?.cashback || store.paymentInfo?.baseCashbackPercent || 0,
      rating: store.ratings?.average || 4.5,
      totalReviews: store.ratings?.count || 0,
      location: store.location?.address?.city || '',
      isSuperCashback: true,
      badge: store.paymentInfo?.cashback >= 20 ? 'MEGA CASHBACK' : 'SUPER CASHBACK',
    }));

    console.log(`✅ [SUPER CASHBACK] Found ${superCashbackStores.length} stores with high cashback`);

    sendSuccess(res, superCashbackStores, 'Super cashback stores retrieved successfully');
  } catch (error) {
    console.error('❌ [SUPER CASHBACK] Error:', error);
    sendError(res, 'Failed to fetch super cashback stores', 500);
  }
};

/**
 * GET /api/offers/flash-sales
 * Get active flash sale offers from the offers collection
 */
export const getFlashSaleOffers = async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    console.log('⚡ [FLASH SALES] Fetching flash sale offers');

    // Find offers with active flash sale metadata
    // Filter by endTime to only show non-expired sales
    const offers = await Offer.find({
      'metadata.flashSale.isActive': true,
      'metadata.flashSale.endTime': { $gte: new Date() },
    })
      .populate('store', 'name logo')
      .sort({ 'metadata.flashSale.endTime': 1, 'metadata.priority': -1 })
      .limit(parseInt(limit as string))
      .lean();

    console.log(`✅ [FLASH SALES] Found ${offers.length} flash sale offers`);

    // Transform offers to include calculated fields
    const transformedOffers = offers.map((offer: any) => ({
      ...offer,
      // Ensure flash sale data is easily accessible
      flashSalePrice: offer.metadata?.flashSale?.salePrice || offer.discountedPrice,
      originalPrice: offer.metadata?.flashSale?.originalPrice || offer.originalPrice,
      endTime: offer.metadata?.flashSale?.endTime || offer.validity?.endDate,
      // Calculate stock from maxQuantity if available
      stock: offer.metadata?.flashSale?.maxQuantity
        ? (offer.metadata.flashSale.maxQuantity - (offer.metadata.flashSale.soldQuantity || 0))
        : 10, // Default stock
      discountPercentage: offer.cashbackPercentage ||
        (offer.metadata?.flashSale?.originalPrice && offer.metadata?.flashSale?.salePrice
          ? Math.round(((offer.metadata.flashSale.originalPrice - offer.metadata.flashSale.salePrice) / offer.metadata.flashSale.originalPrice) * 100)
          : 0),
    }));

    sendSuccess(res, transformedOffers, 'Flash sale offers retrieved successfully');
  } catch (error) {
    console.error('❌ [FLASH SALES] Error fetching flash sale offers:', error);
    sendError(res, 'Failed to fetch flash sale offers', 500);
  }
};
