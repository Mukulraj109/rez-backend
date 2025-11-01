import { Request, Response } from 'express';
import { PromoCode, IPromoCode } from '../models/PromoCode';
import { SubscriptionTier, BillingCycle, Subscription } from '../models/Subscription';
import { Types } from 'mongoose';
import { createAuditLog } from '../services/auditLogService';

/**
 * Validate a promo code
 * POST /api/promo-codes/validate
 * Public endpoint (requires authentication)
 */
export const validatePromoCode = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { code, tier, billingCycle } = req.body;

    // Validate input
    if (!code || !tier || !billingCycle) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: code, tier, billingCycle'
      });
    }

    // Validate tier and billing cycle
    if (!['premium', 'vip'].includes(tier)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tier. Must be premium or vip'
      });
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid billing cycle. Must be monthly or yearly'
      });
    }

    // Get original price
    const tierPricing: { [key: string]: { monthly: number; yearly: number } } = {
      premium: { monthly: 99, yearly: 999 },
      vip: { monthly: 299, yearly: 2999 }
    };
    const originalPrice = billingCycle === 'monthly'
      ? tierPricing[tier].monthly
      : tierPricing[tier].yearly;

    // Validate promo code
    const validation = await PromoCode.validateCode(
      code,
      tier as SubscriptionTier,
      billingCycle as BillingCycle,
      userId,
      originalPrice
    );

    // Log validation attempt (for audit and fraud detection)
    if (process.env.NODE_ENV === 'production') {
      try {
        await createAuditLog({
          userId: new Types.ObjectId(userId.toString()),
          action: 'PROMO_CODE_VALIDATION',
          resource: 'PromoCode',
          resourceId: validation.promoCode?._id,
          status: validation.valid ? 'success' : 'failed',
          metadata: {
            code: PromoCode.sanitizeCode(code),
            tier,
            billingCycle,
            valid: validation.valid,
            message: validation.message
          }
        });
      } catch (auditError) {
        console.error('Error creating audit log:', auditError);
        // Continue even if audit log fails
      }
    }

    // Return validation result
    if (validation.valid) {
      return res.status(200).json({
        success: true,
        valid: true,
        message: validation.message,
        data: {
          code: validation.promoCode?.code,
          description: validation.promoCode?.description,
          discountType: validation.promoCode?.discountType,
          discountValue: validation.promoCode?.discountValue,
          discount: validation.discount,
          originalPrice,
          discountedPrice: validation.discountedPrice
        }
      });
    } else {
      return res.status(200).json({
        success: true,
        valid: false,
        message: validation.message
      });
    }
  } catch (error: any) {
    console.error('Error validating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate promo code',
      error: error.message
    });
  }
};

/**
 * Get available promo codes for current user
 * GET /api/promo-codes/available
 * Protected endpoint
 */
export const getAvailablePromoCodes = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const { tier, billingCycle } = req.query;

    // Get active promo codes
    const promoCodes = await PromoCode.getActivePromoCodes(
      tier as SubscriptionTier | undefined,
      billingCycle as BillingCycle | undefined
    );

    // Filter codes that user can still use
    const availableCodes = [];
    for (const code of promoCodes) {
      const canUse = await code.canBeUsedBy(userId);
      if (canUse) {
        availableCodes.push({
          code: code.code,
          description: code.description,
          discountType: code.discountType,
          discountValue: code.discountValue,
          applicableTiers: code.applicableTiers,
          applicableBillingCycles: code.applicableBillingCycles,
          validUntil: code.validUntil,
          remainingUses: code.maxUses === 0 ? null : code.maxUses - code.usedCount
        });
      }
    }

    res.status(200).json({
      success: true,
      data: availableCodes
    });
  } catch (error: any) {
    console.error('Error fetching available promo codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available promo codes',
      error: error.message
    });
  }
};

/**
 * Create a new promo code
 * POST /api/promo-codes
 * Admin only
 */
export const createPromoCode = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const {
      code,
      description,
      discountType,
      discountValue,
      applicableTiers,
      applicableBillingCycles,
      validFrom,
      validUntil,
      maxUses,
      maxUsesPerUser,
      metadata
    } = req.body;

    // Validate required fields
    if (!code || !description || !discountType || !discountValue || !applicableTiers || !validUntil) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Sanitize code
    const sanitizedCode = PromoCode.sanitizeCode(code);

    // Check if code already exists
    const existingCode = await PromoCode.findOne({ code: sanitizedCode });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: 'Promo code already exists'
      });
    }

    // Create promo code
    const promoCode = new PromoCode({
      code: sanitizedCode,
      description,
      discountType,
      discountValue,
      applicableTiers,
      applicableBillingCycles: applicableBillingCycles || [],
      validFrom: validFrom || new Date(),
      validUntil: new Date(validUntil),
      maxUses: maxUses || 0,
      maxUsesPerUser: maxUsesPerUser || 1,
      metadata: metadata || {},
      createdBy: userId
    });

    await promoCode.save();

    // Create audit log
    try {
      await createAuditLog({
        userId: new Types.ObjectId(userId.toString()),
        action: 'PROMO_CODE_CREATED',
        resource: 'PromoCode',
        resourceId: promoCode._id,
        status: 'success',
        metadata: {
          code: promoCode.code,
          discountType: promoCode.discountType,
          discountValue: promoCode.discountValue
        }
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    res.status(201).json({
      success: true,
      message: 'Promo code created successfully',
      data: promoCode
    });
  } catch (error: any) {
    console.error('Error creating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create promo code',
      error: error.message
    });
  }
};

/**
 * Get all promo codes
 * GET /api/promo-codes
 * Admin only
 */
export const getAllPromoCodes = async (req: Request, res: Response) => {
  try {
    const { isActive, campaign, page = 1, limit = 20 } = req.query;

    const query: any = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (campaign) {
      query['metadata.campaign'] = campaign;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const promoCodes = await PromoCode.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'name email');

    const total = await PromoCode.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        promoCodes,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching promo codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promo codes',
      error: error.message
    });
  }
};

/**
 * Get specific promo code
 * GET /api/promo-codes/:id
 * Admin only
 */
export const getPromoCode = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promo code ID'
      });
    }

    const promoCode = await PromoCode.findById(id)
      .populate('createdBy', 'name email')
      .populate('usedBy.user', 'name email')
      .populate('usedBy.subscriptionId');

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }

    res.status(200).json({
      success: true,
      data: promoCode
    });
  } catch (error: any) {
    console.error('Error fetching promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promo code',
      error: error.message
    });
  }
};

/**
 * Update promo code
 * PATCH /api/promo-codes/:id
 * Admin only
 */
export const updatePromoCode = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promo code ID'
      });
    }

    const promoCode = await PromoCode.findById(id);
    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }

    // Only allow updating certain fields
    const allowedUpdates = [
      'description',
      'validUntil',
      'maxUses',
      'maxUsesPerUser',
      'isActive',
      'metadata'
    ];

    const updates = Object.keys(req.body);
    const isValidUpdate = updates.every(update => allowedUpdates.includes(update));

    if (!isValidUpdate) {
      return res.status(400).json({
        success: false,
        message: 'Invalid updates. Only description, validUntil, maxUses, maxUsesPerUser, isActive, and metadata can be updated'
      });
    }

    // Apply updates
    updates.forEach(update => {
      (promoCode as any)[update] = req.body[update];
    });

    await promoCode.save();

    // Create audit log
    try {
      await createAuditLog({
        userId: new Types.ObjectId(userId!.toString()),
        action: 'PROMO_CODE_UPDATED',
        resource: 'PromoCode',
        resourceId: promoCode._id,
        status: 'success',
        metadata: {
          code: promoCode.code,
          updates
        }
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    res.status(200).json({
      success: true,
      message: 'Promo code updated successfully',
      data: promoCode
    });
  } catch (error: any) {
    console.error('Error updating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update promo code',
      error: error.message
    });
  }
};

/**
 * Deactivate promo code
 * DELETE /api/promo-codes/:id
 * Admin only
 */
export const deactivatePromoCode = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promo code ID'
      });
    }

    const promoCode = await PromoCode.findById(id);
    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }

    promoCode.isActive = false;
    await promoCode.save();

    // Create audit log
    try {
      await createAuditLog({
        userId: new Types.ObjectId(userId!.toString()),
        action: 'PROMO_CODE_DEACTIVATED',
        resource: 'PromoCode',
        resourceId: promoCode._id,
        status: 'success',
        metadata: {
          code: promoCode.code
        }
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    res.status(200).json({
      success: true,
      message: 'Promo code deactivated successfully',
      data: promoCode
    });
  } catch (error: any) {
    console.error('Error deactivating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate promo code',
      error: error.message
    });
  }
};

/**
 * Get promo code usage statistics
 * GET /api/promo-codes/:id/usage
 * Admin only
 */
export const getPromoCodeUsage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promo code ID'
      });
    }

    const promoCode = await PromoCode.findById(id)
      .populate('usedBy.user', 'name email')
      .populate('usedBy.subscriptionId');

    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }

    // Calculate statistics
    const totalDiscount = promoCode.usedBy.reduce(
      (sum, usage) => sum + usage.discountApplied,
      0
    );

    const totalRevenue = promoCode.usedBy.reduce(
      (sum, usage) => sum + usage.finalPrice,
      0
    );

    const totalOriginalRevenue = promoCode.usedBy.reduce(
      (sum, usage) => sum + usage.originalPrice,
      0
    );

    const stats = {
      code: promoCode.code,
      description: promoCode.description,
      isActive: promoCode.isActive,
      totalUses: promoCode.usedCount,
      maxUses: promoCode.maxUses,
      remainingUses: promoCode.maxUses === 0 ? null : promoCode.maxUses - promoCode.usedCount,
      usagePercentage: promoCode.maxUses === 0 ? 0 : (promoCode.usedCount / promoCode.maxUses) * 100,
      totalDiscount,
      totalRevenue,
      totalOriginalRevenue,
      revenueLoss: totalOriginalRevenue - totalRevenue,
      uniqueUsers: new Set(promoCode.usedBy.map(u => u.user.toString())).size,
      recentUsage: promoCode.usedBy.slice(-10).reverse(),
      validFrom: promoCode.validFrom,
      validUntil: promoCode.validUntil
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error fetching promo code usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promo code usage',
      error: error.message
    });
  }
};

/**
 * Get promo code analytics
 * GET /api/promo-codes/analytics/overview
 * Admin only
 */
export const getPromoCodeAnalytics = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    // Get all promo codes
    const allCodes = await PromoCode.find();
    const activeCodes = await PromoCode.find({ isActive: true });
    const validCodes = await PromoCode.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    });

    // Calculate total statistics
    let totalDiscount = 0;
    let totalRevenue = 0;
    let totalOriginalRevenue = 0;

    allCodes.forEach(code => {
      code.usedBy.forEach(usage => {
        totalDiscount += usage.discountApplied;
        totalRevenue += usage.finalPrice;
        totalOriginalRevenue += usage.originalPrice;
      });
    });

    // Get most used codes
    const mostUsedCodes = allCodes
      .sort((a, b) => b.usedCount - a.usedCount)
      .slice(0, 10)
      .map(code => ({
        code: code.code,
        description: code.description,
        usedCount: code.usedCount,
        totalDiscount: code.usedBy.reduce((sum, u) => sum + u.discountApplied, 0)
      }));

    const analytics = {
      totalCodes: allCodes.length,
      activeCodes: activeCodes.length,
      validCodes: validCodes.length,
      expiredCodes: allCodes.filter(c => c.validUntil < now).length,
      totalUsage: allCodes.reduce((sum, code) => sum + code.usedCount, 0),
      totalDiscount,
      totalRevenue,
      totalOriginalRevenue,
      revenueLoss: totalOriginalRevenue - totalRevenue,
      averageDiscountPerUse: totalDiscount / Math.max(allCodes.reduce((sum, code) => sum + code.usedCount, 0), 1),
      mostUsedCodes
    };

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error: any) {
    console.error('Error fetching promo code analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promo code analytics',
      error: error.message
    });
  }
};
