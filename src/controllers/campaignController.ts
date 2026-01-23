import { Request, Response } from 'express';
import Campaign from '../models/Campaign';
import { sendSuccess, sendNotFound, sendBadRequest } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { isValidRegion, RegionId } from '../services/regionService';

/**
 * Get all active campaigns
 * GET /api/campaigns/active
 */
export const getActiveCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const { type, limit = 10 } = req.query;

  // Get region from header
  const regionHeader = req.headers['x-rez-region'] as string;
  const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
    ? regionHeader as RegionId
    : undefined;

  try {
    const now = new Date();
    const query: any = {
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
    };

    if (type) {
      query.type = type;
    }

    // Filter by region: show campaigns for specific region OR 'all' regions
    if (region) {
      query.$or = [
        { region: region },
        { region: 'all' },
        { region: { $exists: false } }, // Legacy campaigns without region field
      ];
    }

    console.log(`🔍 [CAMPAIGNS] Fetching active campaigns for region: ${region || 'all'}...`);

    const campaigns = await Campaign.find(query)
      .sort({ priority: -1 })
      .limit(Number(limit))
      .lean();

    console.log(`✅ [CAMPAIGNS] Found ${campaigns.length} active campaigns`);

    sendSuccess(res, {
      campaigns,
      total: campaigns.length,
    }, 'Active campaigns retrieved successfully');

  } catch (error) {
    console.error('❌ [CAMPAIGNS] Error fetching campaigns:', error);
    throw new AppError('Failed to fetch campaigns', 500);
  }
});

/**
 * Get campaigns by type
 * GET /api/campaigns/type/:type
 */
export const getCampaignsByType = asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.params;
  const { limit = 10 } = req.query;

  // Get region from header
  const regionHeader = req.headers['x-rez-region'] as string;
  const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
    ? regionHeader as RegionId
    : undefined;

  try {
    const now = new Date();
    const query: any = {
      type,
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
    };

    // Filter by region: show campaigns for specific region OR 'all' regions
    if (region) {
      query.$or = [
        { region: region },
        { region: 'all' },
        { region: { $exists: false } }, // Legacy campaigns without region field
      ];
    }

    const campaigns = await Campaign.find(query)
      .sort({ priority: -1 })
      .limit(Number(limit))
      .lean();

    sendSuccess(res, {
      campaigns,
      total: campaigns.length,
    }, `Campaigns of type '${type}' retrieved successfully`);

  } catch (error) {
    console.error('❌ [CAMPAIGNS] Error fetching campaigns by type:', error);
    throw new AppError('Failed to fetch campaigns', 500);
  }
});

/**
 * Get single campaign by ID or slug
 * GET /api/campaigns/:campaignId
 */
export const getCampaignById = asyncHandler(async (req: Request, res: Response) => {
  const { campaignId } = req.params;

  try {
    const query = campaignId.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: campaignId }
      : { campaignId: campaignId.toLowerCase() };

    const campaign = await Campaign.findOne(query).lean();

    if (!campaign) {
      return sendNotFound(res, 'Campaign not found');
    }

    // Transform storeId ObjectIds to strings in deals
    const transformedCampaign: any = {
      ...campaign,
      deals: campaign.deals.map((deal: any) => ({
        ...deal,
        storeId: deal.storeId ? (deal.storeId.toString ? deal.storeId.toString() : String(deal.storeId)) : undefined,
      })),
    };

    sendSuccess(res, transformedCampaign, 'Campaign retrieved successfully');

  } catch (error) {
    console.error('❌ [CAMPAIGNS] Error fetching campaign:', error);
    throw new AppError('Failed to fetch campaign', 500);
  }
});

/**
 * Get all campaigns for homepage
 * GET /api/campaigns
 */
export const getAllCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, active = 'true' } = req.query;

  // Get region from header
  const regionHeader = req.headers['x-rez-region'] as string;
  const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
    ? regionHeader as RegionId
    : undefined;

  try {
    const query: any = {};

    if (active === 'true') {
      const now = new Date();
      query.isActive = true;
      query.startTime = { $lte: now };
      query.endTime = { $gte: now };
    }

    // Filter by region: show campaigns for specific region OR 'all' regions
    if (region) {
      query.$or = [
        { region: region },
        { region: 'all' },
        { region: { $exists: false } }, // Legacy campaigns without region field
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Campaign.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      campaigns,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
      },
    }, 'Campaigns retrieved successfully');

  } catch (error) {
    console.error('❌ [CAMPAIGNS] Error fetching campaigns:', error);
    throw new AppError('Failed to fetch campaigns', 500);
  }
});

/**
 * Get campaigns for exciting deals section (grouped by type)
 * GET /api/campaigns/exciting-deals
 */
export const getExcitingDeals = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 6 } = req.query;

  // Get region from header
  const regionHeader = req.headers['x-rez-region'] as string;
  const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
    ? regionHeader as RegionId
    : undefined;

  try {
    const now = new Date();

    const query: any = {
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
    };

    // Filter by region: show campaigns for specific region OR 'all' regions
    if (region) {
      query.$or = [
        { region: region },
        { region: 'all' },
        { region: { $exists: false } }, // Legacy campaigns without region field
      ];
    }

    console.log(`🔍 [EXCITING DEALS] Fetching deals for region: ${region || 'all'}...`);

    const campaigns = await Campaign.find(query)
      .sort({ priority: -1 })
      .limit(Number(limit))
      .lean();

    // Transform to match frontend ExcitingDealsSection format
    const dealCategories = campaigns.map(campaign => {
      // Calculate remaining time for flash drops
      const deals = campaign.deals.map((deal: any) => {
        // Convert storeId ObjectId to string if it exists
        const transformedDeal: any = {
          ...deal,
          storeId: deal.storeId ? (deal.storeId.toString ? deal.storeId.toString() : String(deal.storeId)) : undefined,
        };

        if (campaign.type === 'drop' || campaign.type === 'flash') {
          const now = new Date();
          const endTime = campaign.endTime;
          const timeLeft = endTime.getTime() - now.getTime();
          
          if (timeLeft > 0) {
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            if (hours > 0) {
              transformedDeal.endsIn = `${hours}h`;
            } else if (minutes > 0) {
              transformedDeal.endsIn = `${minutes}m`;
            } else {
              transformedDeal.endsIn = 'Ending soon';
            }
          } else {
            transformedDeal.endsIn = 'Ended';
          }
        }
        return transformedDeal;
      });

      return {
        id: campaign.campaignId,
        title: campaign.title,
        subtitle: campaign.subtitle,
        badge: campaign.badge,
        gradientColors: campaign.gradientColors,
        badgeBg: campaign.badgeBg,
        badgeColor: campaign.badgeColor,
        deals,
      };
    });

    sendSuccess(res, {
      dealCategories,
      total: dealCategories.length,
    }, 'Exciting deals retrieved successfully');

  } catch (error) {
    console.error('❌ [CAMPAIGNS] Error fetching exciting deals:', error);
    throw new AppError('Failed to fetch exciting deals', 500);
  }
});

/**
 * Track deal interaction (view, redeem, like, share)
 * POST /api/campaigns/deals/track
 */
export const trackDealInteraction = asyncHandler(async (req: Request, res: Response) => {
  const { campaignId, dealIndex, action } = req.body;
  const userId = req.user?.id;

  try {
    // Validate inputs
    if (!campaignId || dealIndex === undefined || !action) {
      return sendBadRequest(res, 'campaignId, dealIndex, and action are required');
    }

    // Find campaign
    const query = campaignId.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: campaignId }
      : { campaignId: campaignId.toLowerCase() };

    const campaign = await Campaign.findOne(query).lean();

    if (!campaign) {
      return sendNotFound(res, 'Campaign not found');
    }

    // Validate deal index
    if (dealIndex < 0 || dealIndex >= campaign.deals.length) {
      return sendBadRequest(res, 'Invalid deal index');
    }

    // Log the interaction (in production, you might want to store this in a separate collection)
    console.log(`📊 [DEAL TRACK] ${action} - Campaign: ${campaign.title}, Deal: ${campaign.deals[dealIndex].store}, User: ${userId || 'anonymous'}`);

    // In the future, you can store this in a DealInteraction collection:
    // await DealInteraction.create({
    //   user: userId,
    //   campaign: campaign._id,
    //   dealIndex,
    //   action,
    //   timestamp: new Date(),
    // });

    sendSuccess(res, {
      success: true,
      message: 'Deal interaction tracked',
    }, 'Interaction tracked successfully');

  } catch (error) {
    console.error('❌ [CAMPAIGNS] Error tracking deal interaction:', error);
    throw new AppError('Failed to track deal interaction', 500);
  }
});
