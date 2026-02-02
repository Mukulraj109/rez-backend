import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import Campaign, { ICampaign, ICampaignDeal } from '../../models/Campaign';
import { Store } from '../../models/Store';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/campaigns
 * @desc    Get all campaigns with pagination and filters
 * @access  Admin
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};

    // Status filter
    if (req.query.status === 'active') {
      filter.isActive = true;
    } else if (req.query.status === 'inactive') {
      filter.isActive = false;
    }

    // Type filter
    if (req.query.type) {
      filter.type = req.query.type;
    }

    // Region filter
    if (req.query.region) {
      filter.region = req.query.region;
    }

    // Search filter
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      filter.$or = [
        { title: searchRegex },
        { subtitle: searchRegex },
        { campaignId: searchRegex },
      ];
    }

    // Running campaigns filter (currently active and within time range)
    if (req.query.running === 'true') {
      const now = new Date();
      filter.isActive = true;
      filter.startTime = { $lte: now };
      filter.endTime = { $gte: now };
    }

    // Expired campaigns filter
    if (req.query.expired === 'true') {
      const now = new Date();
      filter.endTime = { $lt: now };
    }

    // Upcoming campaigns filter
    if (req.query.upcoming === 'true') {
      const now = new Date();
      filter.startTime = { $gt: now };
    }

    const [campaigns, total] = await Promise.all([
      Campaign.find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Campaign.countDocuments(filter)
    ]);

    // Add computed fields
    const now = new Date();
    const enrichedCampaigns = campaigns.map(campaign => ({
      ...campaign,
      isRunning: campaign.isActive && campaign.startTime <= now && campaign.endTime >= now,
      isExpired: campaign.endTime < now,
      isUpcoming: campaign.startTime > now,
      dealsCount: campaign.deals?.length || 0,
    }));

    res.json({
      success: true,
      data: {
        campaigns: enrichedCampaigns,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error: any) {
    console.error('❌ [ADMIN CAMPAIGNS] Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch campaigns'
    });
  }
});

/**
 * @route   GET /api/admin/campaigns/stats
 * @desc    Get campaign statistics
 * @access  Admin
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const now = new Date();

    const stats = await Campaign.aggregate([
      {
        $facet: {
          // Total campaigns
          total: [{ $count: 'count' }],
          // Active campaigns
          active: [
            { $match: { isActive: true } },
            { $count: 'count' }
          ],
          // Currently running
          running: [
            {
              $match: {
                isActive: true,
                startTime: { $lte: now },
                endTime: { $gte: now }
              }
            },
            { $count: 'count' }
          ],
          // By type
          byType: [
            { $group: { _id: '$type', count: { $sum: 1 } } }
          ],
          // By region
          byRegion: [
            { $group: { _id: '$region', count: { $sum: 1 } } }
          ],
          // Upcoming (starting in next 7 days)
          upcoming: [
            {
              $match: {
                startTime: { $gt: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) }
              }
            },
            { $count: 'count' }
          ],
          // Expired (ended in last 30 days)
          recentlyExpired: [
            {
              $match: {
                endTime: { $lt: now, $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
              }
            },
            { $count: 'count' }
          ],
          // Total deals across all campaigns
          totalDeals: [
            { $unwind: { path: '$deals', preserveNullAndEmptyArrays: true } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const result = {
      total: stats[0].total[0]?.count || 0,
      active: stats[0].active[0]?.count || 0,
      running: stats[0].running[0]?.count || 0,
      upcoming: stats[0].upcoming[0]?.count || 0,
      recentlyExpired: stats[0].recentlyExpired[0]?.count || 0,
      totalDeals: stats[0].totalDeals[0]?.count || 0,
      byType: stats[0].byType.reduce((acc: any, item: any) => {
        acc[item._id || 'unknown'] = item.count;
        return acc;
      }, {}),
      byRegion: stats[0].byRegion.reduce((acc: any, item: any) => {
        acc[item._id || 'all'] = item.count;
        return acc;
      }, {}),
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('❌ [ADMIN CAMPAIGNS] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch campaign stats'
    });
  }
});

/**
 * @route   GET /api/admin/campaigns/stores
 * @desc    Get stores for deal assignment dropdown
 * @access  Admin
 */
router.get('/stores', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const limit = parseInt(req.query.limit as string) || 50;

    const filter: any = { isActive: true };
    if (search) {
      filter.name = new RegExp(search, 'i');
    }

    const stores = await Store.find(filter)
      .select('_id name logo category location')
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: stores
    });
  } catch (error: any) {
    console.error('❌ [ADMIN CAMPAIGNS] Error fetching stores:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stores'
    });
  }
});

/**
 * @route   GET /api/admin/campaigns/:id
 * @desc    Get single campaign details
 * @access  Admin
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Support both MongoDB _id and campaignId
    let campaign;
    if (Types.ObjectId.isValid(id)) {
      campaign = await Campaign.findById(id).lean();
    }
    if (!campaign) {
      campaign = await Campaign.findOne({ campaignId: id }).lean();
    }

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Add computed fields
    const now = new Date();
    const enrichedCampaign = {
      ...campaign,
      isRunning: campaign.isActive && campaign.startTime <= now && campaign.endTime >= now,
      isExpired: campaign.endTime < now,
      isUpcoming: campaign.startTime > now,
      dealsCount: campaign.deals?.length || 0,
    };

    res.json({
      success: true,
      data: enrichedCampaign
    });
  } catch (error: any) {
    console.error('❌ [ADMIN CAMPAIGNS] Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch campaign'
    });
  }
});

/**
 * @route   POST /api/admin/campaigns
 * @desc    Create a new campaign
 * @access  Admin
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      campaignId,
      title,
      subtitle,
      description,
      badge,
      badgeBg,
      badgeColor,
      gradientColors,
      type,
      deals,
      startTime,
      endTime,
      isActive,
      priority,
      eligibleCategories,
      terms,
      minOrderValue,
      maxBenefit,
      icon,
      bannerImage,
      region,
    } = req.body;

    // Validate required fields
    if (!campaignId || !title || !subtitle || !badge || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: campaignId, title, subtitle, badge, startTime, endTime'
      });
    }

    // Check for duplicate campaignId
    const existingCampaign = await Campaign.findOne({ campaignId: campaignId.toLowerCase().trim() });
    if (existingCampaign) {
      return res.status(400).json({
        success: false,
        message: 'Campaign with this ID already exists'
      });
    }

    // Validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    // Validate deals if provided
    const validatedDeals: ICampaignDeal[] = [];
    if (deals && Array.isArray(deals)) {
      for (const deal of deals) {
        if (!deal.image) {
          return res.status(400).json({
            success: false,
            message: 'Each deal must have an image URL'
          });
        }
        validatedDeals.push({
          store: deal.store,
          storeId: deal.storeId ? new Types.ObjectId(deal.storeId) : undefined,
          image: deal.image,
          cashback: deal.cashback,
          coins: deal.coins,
          bonus: deal.bonus,
          drop: deal.drop,
          discount: deal.discount,
          endsIn: deal.endsIn,
        });
      }
    }

    const campaign = new Campaign({
      campaignId: campaignId.toLowerCase().trim().replace(/\s+/g, '-'),
      title: title.trim(),
      subtitle: subtitle.trim(),
      description: description?.trim(),
      badge: badge.trim(),
      badgeBg: badgeBg || '#FFFFFF',
      badgeColor: badgeColor || '#0B2240',
      gradientColors: gradientColors || ['#FF6B6B', '#FF8E53'],
      type: type || 'general',
      deals: validatedDeals,
      startTime: start,
      endTime: end,
      isActive: isActive !== false, // Default to true
      priority: priority || 50,
      eligibleCategories: eligibleCategories || [],
      terms: terms || [],
      minOrderValue: minOrderValue || 0,
      maxBenefit: maxBenefit,
      icon,
      bannerImage,
      region: region || 'all',
    });

    await campaign.save();

    console.log(`✅ [ADMIN CAMPAIGNS] Campaign created: ${campaign.campaignId} by admin ${req.userId}`);

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: campaign
    });
  } catch (error: any) {
    console.error('❌ [ADMIN CAMPAIGNS] Error creating campaign:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Campaign with this ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create campaign'
    });
  }
});

/**
 * @route   PUT /api/admin/campaigns/:id
 * @desc    Update a campaign
 * @access  Admin
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find campaign
    let campaign;
    if (Types.ObjectId.isValid(id)) {
      campaign = await Campaign.findById(id);
    }
    if (!campaign) {
      campaign = await Campaign.findOne({ campaignId: id });
    }

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const {
      title,
      subtitle,
      description,
      badge,
      badgeBg,
      badgeColor,
      gradientColors,
      type,
      deals,
      startTime,
      endTime,
      isActive,
      priority,
      eligibleCategories,
      terms,
      minOrderValue,
      maxBenefit,
      icon,
      bannerImage,
      region,
    } = req.body;

    // Validate dates if provided
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (end <= start) {
        return res.status(400).json({
          success: false,
          message: 'End time must be after start time'
        });
      }
    }

    // Update fields
    if (title !== undefined) campaign.title = title.trim();
    if (subtitle !== undefined) campaign.subtitle = subtitle.trim();
    if (description !== undefined) campaign.description = description?.trim();
    if (badge !== undefined) campaign.badge = badge.trim();
    if (badgeBg !== undefined) campaign.badgeBg = badgeBg;
    if (badgeColor !== undefined) campaign.badgeColor = badgeColor;
    if (gradientColors !== undefined) campaign.gradientColors = gradientColors;
    if (type !== undefined) campaign.type = type;
    if (startTime !== undefined) campaign.startTime = new Date(startTime);
    if (endTime !== undefined) campaign.endTime = new Date(endTime);
    if (isActive !== undefined) campaign.isActive = isActive;
    if (priority !== undefined) campaign.priority = priority;
    if (eligibleCategories !== undefined) campaign.eligibleCategories = eligibleCategories;
    if (terms !== undefined) campaign.terms = terms;
    if (minOrderValue !== undefined) campaign.minOrderValue = minOrderValue;
    if (maxBenefit !== undefined) campaign.maxBenefit = maxBenefit;
    if (icon !== undefined) campaign.icon = icon;
    if (bannerImage !== undefined) campaign.bannerImage = bannerImage;
    if (region !== undefined) campaign.region = region;

    // Update deals if provided
    if (deals !== undefined && Array.isArray(deals)) {
      const validatedDeals: ICampaignDeal[] = [];
      for (const deal of deals) {
        if (!deal.image) {
          return res.status(400).json({
            success: false,
            message: 'Each deal must have an image URL'
          });
        }
        validatedDeals.push({
          store: deal.store,
          storeId: deal.storeId ? new Types.ObjectId(deal.storeId) : undefined,
          image: deal.image,
          cashback: deal.cashback,
          coins: deal.coins,
          bonus: deal.bonus,
          drop: deal.drop,
          discount: deal.discount,
          endsIn: deal.endsIn,
        });
      }
      campaign.deals = validatedDeals;
    }

    await campaign.save();

    console.log(`✅ [ADMIN CAMPAIGNS] Campaign updated: ${campaign.campaignId} by admin ${req.userId}`);

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: campaign
    });
  } catch (error: any) {
    console.error('❌ [ADMIN CAMPAIGNS] Error updating campaign:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update campaign'
    });
  }
});

/**
 * @route   DELETE /api/admin/campaigns/:id
 * @desc    Delete a campaign
 * @access  Admin
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find and delete campaign
    let campaign;
    if (Types.ObjectId.isValid(id)) {
      campaign = await Campaign.findByIdAndDelete(id);
    }
    if (!campaign) {
      campaign = await Campaign.findOneAndDelete({ campaignId: id });
    }

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    console.log(`✅ [ADMIN CAMPAIGNS] Campaign deleted: ${campaign.campaignId} by admin ${req.userId}`);

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
      data: { campaignId: campaign.campaignId }
    });
  } catch (error: any) {
    console.error('❌ [ADMIN CAMPAIGNS] Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete campaign'
    });
  }
});

/**
 * @route   PATCH /api/admin/campaigns/:id/toggle
 * @desc    Toggle campaign active status
 * @access  Admin
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find campaign
    let campaign;
    if (Types.ObjectId.isValid(id)) {
      campaign = await Campaign.findById(id);
    }
    if (!campaign) {
      campaign = await Campaign.findOne({ campaignId: id });
    }

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    campaign.isActive = !campaign.isActive;
    await campaign.save();

    console.log(`✅ [ADMIN CAMPAIGNS] Campaign ${campaign.isActive ? 'activated' : 'deactivated'}: ${campaign.campaignId} by admin ${req.userId}`);

    res.json({
      success: true,
      message: `Campaign ${campaign.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: campaign.isActive }
    });
  } catch (error: any) {
    console.error('❌ [ADMIN CAMPAIGNS] Error toggling campaign:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to toggle campaign status'
    });
  }
});

/**
 * @route   POST /api/admin/campaigns/:id/deals
 * @desc    Add a deal to a campaign
 * @access  Admin
 */
router.post('/:id/deals', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { store, storeId, image, cashback, coins, bonus, drop, discount, endsIn } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Deal image is required'
      });
    }

    // Find campaign
    let campaign;
    if (Types.ObjectId.isValid(id)) {
      campaign = await Campaign.findById(id);
    }
    if (!campaign) {
      campaign = await Campaign.findOne({ campaignId: id });
    }

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const newDeal: ICampaignDeal = {
      store,
      storeId: storeId ? new Types.ObjectId(storeId) : undefined,
      image,
      cashback,
      coins,
      bonus,
      drop,
      discount,
      endsIn,
    };

    campaign.deals.push(newDeal);
    await campaign.save();

    console.log(`✅ [ADMIN CAMPAIGNS] Deal added to campaign: ${campaign.campaignId} by admin ${req.userId}`);

    res.json({
      success: true,
      message: 'Deal added successfully',
      data: campaign
    });
  } catch (error: any) {
    console.error('❌ [ADMIN CAMPAIGNS] Error adding deal:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add deal'
    });
  }
});

/**
 * @route   DELETE /api/admin/campaigns/:id/deals/:dealIndex
 * @desc    Remove a deal from a campaign
 * @access  Admin
 */
router.delete('/:id/deals/:dealIndex', async (req: Request, res: Response) => {
  try {
    const { id, dealIndex } = req.params;
    const index = parseInt(dealIndex);

    if (isNaN(index) || index < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid deal index'
      });
    }

    // Find campaign
    let campaign;
    if (Types.ObjectId.isValid(id)) {
      campaign = await Campaign.findById(id);
    }
    if (!campaign) {
      campaign = await Campaign.findOne({ campaignId: id });
    }

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    if (index >= campaign.deals.length) {
      return res.status(400).json({
        success: false,
        message: 'Deal index out of range'
      });
    }

    campaign.deals.splice(index, 1);
    await campaign.save();

    console.log(`✅ [ADMIN CAMPAIGNS] Deal removed from campaign: ${campaign.campaignId} by admin ${req.userId}`);

    res.json({
      success: true,
      message: 'Deal removed successfully',
      data: campaign
    });
  } catch (error: any) {
    console.error('❌ [ADMIN CAMPAIGNS] Error removing deal:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to remove deal'
    });
  }
});

/**
 * @route   POST /api/admin/campaigns/:id/duplicate
 * @desc    Duplicate a campaign
 * @access  Admin
 */
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find original campaign
    let originalCampaign;
    if (Types.ObjectId.isValid(id)) {
      originalCampaign = await Campaign.findById(id).lean();
    }
    if (!originalCampaign) {
      originalCampaign = await Campaign.findOne({ campaignId: id }).lean();
    }

    if (!originalCampaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Generate new campaignId
    const timestamp = Date.now();
    const newCampaignId = `${originalCampaign.campaignId}-copy-${timestamp}`;

    // Create duplicate
    const duplicateCampaign = new Campaign({
      ...originalCampaign,
      _id: new Types.ObjectId(),
      campaignId: newCampaignId,
      title: `${originalCampaign.title} (Copy)`,
      isActive: false, // Start as inactive
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await duplicateCampaign.save();

    console.log(`✅ [ADMIN CAMPAIGNS] Campaign duplicated: ${originalCampaign.campaignId} -> ${newCampaignId} by admin ${req.userId}`);

    res.status(201).json({
      success: true,
      message: 'Campaign duplicated successfully',
      data: duplicateCampaign
    });
  } catch (error: any) {
    console.error('❌ [ADMIN CAMPAIGNS] Error duplicating campaign:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to duplicate campaign'
    });
  }
});

/**
 * @route   POST /api/admin/campaigns/bulk-action
 * @desc    Perform bulk actions on campaigns
 * @access  Admin
 */
router.post('/bulk-action', async (req: Request, res: Response) => {
  try {
    const { action, campaignIds } = req.body;

    if (!action || !campaignIds || !Array.isArray(campaignIds) || campaignIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Action and campaign IDs array required'
      });
    }

    const validActions = ['activate', 'deactivate', 'delete'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `Invalid action. Valid actions: ${validActions.join(', ')}`
      });
    }

    let result;
    const objectIds = campaignIds.map(id => new Types.ObjectId(id));

    switch (action) {
      case 'activate':
        result = await Campaign.updateMany(
          { _id: { $in: objectIds } },
          { $set: { isActive: true } }
        );
        break;
      case 'deactivate':
        result = await Campaign.updateMany(
          { _id: { $in: objectIds } },
          { $set: { isActive: false } }
        );
        break;
      case 'delete':
        result = await Campaign.deleteMany({ _id: { $in: objectIds } });
        break;
    }

    console.log(`✅ [ADMIN CAMPAIGNS] Bulk action '${action}' on ${campaignIds.length} campaigns by admin ${req.userId}`);

    const count = (result as any)?.modifiedCount || (result as any)?.deletedCount || 0;
    res.json({
      success: true,
      message: `Successfully ${action}d ${count} campaigns`,
      data: result
    });
  } catch (error: any) {
    console.error('❌ [ADMIN CAMPAIGNS] Error performing bulk action:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to perform bulk action'
    });
  }
});

export default router;
