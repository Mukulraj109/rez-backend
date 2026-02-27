/**
 * Admin Routes - Subscription Tier Management
 * CRUD endpoints for managing subscription tier configuration.
 * Operates on SubscriptionTier model (single source of truth for tier config).
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { sendSuccess, sendError, sendCreated, sendNotFound, sendBadRequest } from '../../utils/response';
import { SubscriptionTier } from '../../models/SubscriptionTier';
import { Subscription } from '../../models/Subscription';
import tierConfigService from '../../services/tierConfigService';
import subscriptionAuditService from '../../services/subscriptionAuditService';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

// ============================================
// SUBSCRIPTION TIER ENDPOINTS
// ============================================

/**
 * GET /plans
 * List all tiers sorted by sortOrder. Supports optional ?isActive=true|false filter.
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const filter: Record<string, any> = {};

    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const tiers = await SubscriptionTier.find(filter)
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return sendSuccess(res, tiers, 'Subscription tiers fetched');
  } catch (error) {
    console.error('[Admin] Error fetching subscription tiers:', error);
    return sendError(res, 'Failed to fetch subscription tiers', 500);
  }
});

/**
 * POST /plans
 * Create a new subscription tier.
 */
router.post('/plans', async (req: Request, res: Response) => {
  try {
    const {
      tier,
      name,
      description,
      pricing,
      benefits,
      features,
      isActive,
      sortOrder,
      trialDays,
    } = req.body;

    if (!tier || !name) {
      return sendBadRequest(res, 'tier and name are required');
    }

    if (!pricing || pricing.monthly === undefined || pricing.yearly === undefined) {
      return sendBadRequest(res, 'pricing.monthly and pricing.yearly are required');
    }

    const newTier = await SubscriptionTier.create({
      tier,
      name,
      description: description || '',
      pricing: {
        monthly: pricing.monthly || 0,
        yearly: pricing.yearly || 0,
        yearlyDiscount: pricing.yearlyDiscount || 0,
      },
      benefits: {
        cashbackMultiplier: benefits?.cashbackMultiplier || 1,
        freeDeliveries: benefits?.freeDeliveries || 0,
        maxWishlists: benefits?.maxWishlists || 5,
        prioritySupport: benefits?.prioritySupport || false,
        exclusiveDeals: benefits?.exclusiveDeals || false,
        earlyAccess: benefits?.earlyAccess || false,
        freeDelivery: benefits?.freeDelivery || false,
        unlimitedWishlists: benefits?.unlimitedWishlists || false,
        earlyFlashSaleAccess: benefits?.earlyFlashSaleAccess || false,
        personalShopper: benefits?.personalShopper || false,
        premiumEvents: benefits?.premiumEvents || false,
        conciergeService: benefits?.conciergeService || false,
        birthdayOffer: benefits?.birthdayOffer || false,
        anniversaryOffer: benefits?.anniversaryOffer || false,
      },
      features: features || [],
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0,
      trialDays: trialDays || 0,
    });

    // Invalidate tier config cache
    tierConfigService.invalidateCache();

    return sendCreated(res, newTier, 'Subscription tier created');
  } catch (error: any) {
    console.error('[Admin] Error creating subscription tier:', error);
    if (error.code === 11000) {
      return sendBadRequest(res, 'A tier with that identifier already exists');
    }
    if (error.name === 'ValidationError') {
      return sendBadRequest(res, error.message);
    }
    return sendError(res, 'Failed to create subscription tier', 500);
  }
});

/**
 * PUT /plans/:id
 * Update an existing subscription tier.
 */
router.put('/plans/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendBadRequest(res, 'Invalid tier ID');
    }

    const {
      name,
      description,
      pricing,
      benefits,
      features,
      isActive,
      sortOrder,
      trialDays,
    } = req.body;

    const updatePayload: Record<string, any> = {};
    if (name !== undefined) updatePayload.name = name;
    if (description !== undefined) updatePayload.description = description;
    if (pricing !== undefined) updatePayload.pricing = pricing;
    if (benefits !== undefined) updatePayload.benefits = benefits;
    if (features !== undefined) updatePayload.features = features;
    if (isActive !== undefined) updatePayload.isActive = isActive;
    if (sortOrder !== undefined) updatePayload.sortOrder = sortOrder;
    if (trialDays !== undefined) updatePayload.trialDays = trialDays;

    const tier = await SubscriptionTier.findByIdAndUpdate(
      req.params.id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!tier) {
      return sendNotFound(res, 'Subscription tier not found');
    }

    // Invalidate tier config cache so changes propagate immediately
    tierConfigService.invalidateCache();

    return sendSuccess(res, tier, 'Subscription tier updated');
  } catch (error: any) {
    console.error('[Admin] Error updating subscription tier:', error);
    if (error.code === 11000) {
      return sendBadRequest(res, 'A tier with that identifier already exists');
    }
    if (error.name === 'ValidationError') {
      return sendBadRequest(res, error.message);
    }
    return sendError(res, 'Failed to update subscription tier', 500);
  }
});

/**
 * DELETE /plans/:id
 * Soft-delete (deactivate) a subscription tier.
 * Prevents deactivation if there are active subscribers.
 */
router.delete('/plans/:id', async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendBadRequest(res, 'Invalid tier ID');
    }

    // Check for active subscribers before deactivating
    const tierDoc = await SubscriptionTier.findById(req.params.id);
    if (!tierDoc) {
      return sendNotFound(res, 'Subscription tier not found');
    }

    const activeSubscribers = await Subscription.countDocuments({
      tier: tierDoc.tier,
      status: { $in: ['active', 'trial', 'grace_period'] },
    });

    if (activeSubscribers > 0) {
      return sendBadRequest(
        res,
        `Cannot deactivate tier with ${activeSubscribers} active subscriber(s). Migrate them first.`
      );
    }

    tierDoc.isActive = false;
    await tierDoc.save();

    tierConfigService.invalidateCache();

    return sendSuccess(res, tierDoc, 'Subscription tier deactivated');
  } catch (error) {
    console.error('[Admin] Error deactivating subscription tier:', error);
    return sendError(res, 'Failed to deactivate subscription tier', 500);
  }
});

// ============================================
// SUBSCRIBER MANAGEMENT ENDPOINTS
// ============================================

/**
 * GET /subscribers
 * List subscribers with pagination, filtering by tier/status/search.
 */
router.get('/subscribers', async (req: Request, res: Response) => {
  try {
    const {
      tier,
      status,
      search,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));

    const filter: Record<string, any> = {};
    if (tier) filter.tier = tier;
    if (status) filter.status = status;

    const subscriptions = await Subscription.find(filter)
      .populate('user', 'fullName phoneNumber email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const total = await Subscription.countDocuments(filter);

    // Tier distribution stats
    const tierDistribution = await Subscription.aggregate([
      { $match: { status: { $in: ['active', 'trial', 'grace_period'] } } },
      { $group: { _id: '$tier', count: { $sum: 1 } } },
    ]);

    return sendSuccess(res, {
      subscribers: subscriptions,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      tierDistribution,
    }, 'Subscribers fetched');
  } catch (error) {
    console.error('[Admin] Error fetching subscribers:', error);
    return sendError(res, 'Failed to fetch subscribers', 500);
  }
});

/**
 * POST /subscribers/:userId/override
 * Admin manual tier override (with audit logging)
 */
router.post('/subscribers/:userId/override', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { newTier, reason } = req.body;
    const adminUserId = (req as any).user?._id;

    if (!Types.ObjectId.isValid(userId)) {
      return sendBadRequest(res, 'Invalid user ID');
    }

    if (!['free', 'premium', 'vip'].includes(newTier)) {
      return sendBadRequest(res, 'Invalid tier. Must be free, premium, or vip.');
    }

    const subscription = await Subscription.findOne({
      user: userId,
      status: { $in: ['active', 'trial', 'grace_period'] },
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return sendBadRequest(res, 'No active subscription found for this user');
    }

    const previousTier = subscription.tier;
    const newBenefits = await tierConfigService.getTierBenefits(newTier);

    subscription.previousTier = previousTier;
    subscription.tier = newTier as any;
    subscription.benefits = newBenefits;
    await subscription.save();

    // Audit log
    await subscriptionAuditService.logChange({
      subscriptionId: (subscription._id as any)?.toString(),
      userId,
      action: 'admin_override',
      previousState: { tier: previousTier, status: subscription.status },
      newState: { tier: newTier, status: subscription.status },
      metadata: {
        adminUserId: adminUserId?.toString(),
        reason,
        description: `Admin override: ${previousTier} → ${newTier}`,
      },
    });

    return sendSuccess(res, subscription, `Subscription overridden to ${newTier}`);
  } catch (error) {
    console.error('[Admin] Error overriding subscription:', error);
    return sendError(res, 'Failed to override subscription', 500);
  }
});

export default router;
