import { Request, Response } from 'express';
import Campaign from '../models/Campaign';
import { sendSuccess, sendNotFound, sendBadRequest } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

/**
 * Get all active campaigns
 * GET /api/campaigns/active
 */
export const getActiveCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const { type, limit = 10 } = req.query;

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

    console.log('🔍 [CAMPAIGNS] Fetching active campaigns...');

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

  try {
    const now = new Date();
    const campaigns = await Campaign.find({
      type,
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
    })
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

    sendSuccess(res, campaign, 'Campaign retrieved successfully');

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

  try {
    const query: any = {};

    if (active === 'true') {
      const now = new Date();
      query.isActive = true;
      query.startTime = { $lte: now };
      query.endTime = { $gte: now };
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

  try {
    const now = new Date();

    const campaigns = await Campaign.find({
      isActive: true,
      startTime: { $lte: now },
      endTime: { $gte: now },
    })
      .sort({ priority: -1 })
      .limit(Number(limit))
      .lean();

    // Transform to match frontend ExcitingDealsSection format
    const dealCategories = campaigns.map(campaign => {
      // Calculate remaining time for flash drops
      const deals = campaign.deals.map((deal: any) => {
        if (campaign.type === 'drop' || campaign.type === 'flash') {
          const now = new Date();
          const endTime = campaign.endTime;
          const timeLeft = endTime.getTime() - now.getTime();
          
          if (timeLeft > 0) {
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            if (hours > 0) {
              deal.endsIn = `${hours}h`;
            } else if (minutes > 0) {
              deal.endsIn = `${minutes}m`;
            } else {
              deal.endsIn = 'Ending soon';
            }
          } else {
            deal.endsIn = 'Ended';
          }
        }
        return deal;
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
