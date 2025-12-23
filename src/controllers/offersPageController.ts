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
 * Get exclusive zone categories
 */
export const getExclusiveZones = async (req: Request, res: Response) => {
  try {
    const zones = await ExclusiveZone.find({ isActive: true })
      .sort({ priority: -1 })
      .lean();

    sendSuccess(res, zones, 'Exclusive zones retrieved successfully');
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
 * Get special profile categories (Defence, Healthcare, etc.)
 */
export const getSpecialProfiles = async (req: Request, res: Response) => {
  try {
    const profiles = await SpecialProfile.find({ isActive: true })
      .sort({ priority: -1 })
      .lean();

    sendSuccess(res, profiles, 'Special profiles retrieved successfully');
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
