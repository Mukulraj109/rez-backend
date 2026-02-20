import { Request, Response } from 'express';
import specialProgramService from '../services/specialProgramService';
import { SpecialProgramSlug } from '../models/SpecialProgramConfig';
import ProgramMembership, { MembershipStatus } from '../models/ProgramMembership';
import {
  sendSuccess,
  sendError,
  sendBadRequest,
  sendNotFound,
  sendPaginated,
} from '../utils/response';

const VALID_SLUGS: SpecialProgramSlug[] = ['student_zone', 'corporate_perks', 'nuqta_prive'];

function isValidSlug(slug: string): slug is SpecialProgramSlug {
  return VALID_SLUGS.includes(slug as SpecialProgramSlug);
}

/**
 * GET /api/special-programs
 * List all programs. If authenticated, includes user's status per program.
 */
export const listPrograms = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const programs = await specialProgramService.listProgramsForUser(userId);
    return sendSuccess(res, programs, 'Programs retrieved');
  } catch (error: any) {
    console.error('[SPECIAL PROGRAMS] Error listing programs:', error);
    return sendError(res, error.message || 'Failed to list programs');
  }
};

/**
 * GET /api/special-programs/my-memberships
 * Get user's active memberships
 */
export const getUserMemberships = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const memberships = await specialProgramService.getUserMemberships(userId);
    return sendSuccess(res, memberships, 'Memberships retrieved');
  } catch (error: any) {
    console.error('[SPECIAL PROGRAMS] Error getting memberships:', error);
    return sendError(res, error.message || 'Failed to get memberships');
  }
};

/**
 * GET /api/special-programs/:slug/check-eligibility
 * Check user's eligibility for a specific program
 */
export const checkEligibility = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    if (!isValidSlug(slug)) {
      return sendBadRequest(res, `Invalid program slug: ${slug}`);
    }

    const userId = req.user!.id;
    const result = await specialProgramService.checkEligibility(userId, slug);
    return sendSuccess(res, result, 'Eligibility checked');
  } catch (error: any) {
    console.error('[SPECIAL PROGRAMS] Error checking eligibility:', error);
    return sendError(res, error.message || 'Failed to check eligibility');
  }
};

/**
 * POST /api/special-programs/:slug/activate
 * Activate program membership (re-verifies eligibility server-side)
 */
export const activateProgram = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    if (!isValidSlug(slug)) {
      return sendBadRequest(res, `Invalid program slug: ${slug}`);
    }

    const userId = req.user!.id;
    const membership = await specialProgramService.activateProgram(userId, slug);
    return sendSuccess(res, { membership }, 'Program activated successfully');
  } catch (error: any) {
    console.error('[SPECIAL PROGRAMS] Error activating program:', error);
    if (error.message.includes('Already an active member')) {
      return sendBadRequest(res, error.message);
    }
    if (error.message.includes('Cannot activate')) {
      return sendBadRequest(res, error.message);
    }
    return sendError(res, error.message || 'Failed to activate program');
  }
};

/**
 * GET /api/special-programs/:slug/dashboard
 * Get active member dashboard data
 */
export const getMemberDashboard = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    if (!isValidSlug(slug)) {
      return sendBadRequest(res, `Invalid program slug: ${slug}`);
    }

    const userId = req.user!.id;
    const dashboard = await specialProgramService.getMemberDashboard(userId, slug);
    return sendSuccess(res, dashboard, 'Dashboard retrieved');
  } catch (error: any) {
    console.error('[SPECIAL PROGRAMS] Error getting dashboard:', error);
    if (error.message.includes('Not an active member')) {
      return sendBadRequest(res, error.message);
    }
    return sendError(res, error.message || 'Failed to get dashboard');
  }
};

// ============ ADMIN ENDPOINTS ============

/**
 * GET /api/admin/special-programs
 * List all program configurations
 */
export const adminListPrograms = async (req: Request, res: Response) => {
  try {
    const configs = await specialProgramService.getAllConfigsAdmin();
    return sendSuccess(res, configs, 'Program configs retrieved');
  } catch (error: any) {
    console.error('[ADMIN SPECIAL PROGRAMS] Error listing configs:', error);
    return sendError(res, error.message || 'Failed to list program configs');
  }
};

/**
 * GET /api/admin/special-programs/stats
 * Get program analytics
 */
export const adminGetStats = async (req: Request, res: Response) => {
  try {
    const stats = await specialProgramService.getProgramStats();
    return sendSuccess(res, stats, 'Stats retrieved');
  } catch (error: any) {
    console.error('[ADMIN SPECIAL PROGRAMS] Error getting stats:', error);
    return sendError(res, error.message || 'Failed to get stats');
  }
};

/**
 * GET /api/admin/special-programs/:slug
 * Get single program config
 */
export const adminGetProgram = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    if (!isValidSlug(slug)) {
      return sendBadRequest(res, `Invalid program slug: ${slug}`);
    }

    const SpecialProgramConfig = (await import('../models/SpecialProgramConfig')).default;
    const config = await SpecialProgramConfig.findOne({ slug }).lean();
    if (!config) {
      return sendNotFound(res, 'Program not found');
    }

    return sendSuccess(res, config, 'Program config retrieved');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to get program config');
  }
};

/**
 * PUT /api/admin/special-programs/:slug
 * Update program config
 */
export const adminUpdateProgram = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    if (!isValidSlug(slug)) {
      return sendBadRequest(res, `Invalid program slug: ${slug}`);
    }

    // Whitelist allowed fields to prevent unintended updates
    const topLevelFields = [
      'description', 'benefits', 'gradientColors', 'isActive', 'priority', 'linkedCampaigns',
    ];
    const updateData: Record<string, any> = {};

    for (const field of topLevelFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Handle nested subdocs with dot-notation to avoid overwriting unset fields
    if (req.body.earningConfig && typeof req.body.earningConfig === 'object') {
      const allowedEarningFields = ['monthlyCap', 'multiplier', 'multiplierAppliesTo', 'earningsDisplayText'];
      for (const key of allowedEarningFields) {
        if (req.body.earningConfig[key] !== undefined) {
          updateData[`earningConfig.${key}`] = req.body.earningConfig[key];
        }
      }
    }

    if (req.body.eligibility && typeof req.body.eligibility === 'object') {
      const allowedEligibilityFields = ['requiresVerification', 'verificationZone', 'requiresPriveScore', 'minPriveScore', 'customRules'];
      for (const key of allowedEligibilityFields) {
        if (req.body.eligibility[key] !== undefined) {
          updateData[`eligibility.${key}`] = req.body.eligibility[key];
        }
      }
    }

    const SpecialProgramConfig = (await import('../models/SpecialProgramConfig')).default;
    const updated = await SpecialProgramConfig.findOneAndUpdate(
      { slug },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return sendNotFound(res, 'Program not found');
    }

    // Invalidate cache
    await specialProgramService.invalidateConfigCache();

    return sendSuccess(res, updated, 'Program config updated');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to update program config');
  }
};

/**
 * POST /api/admin/special-programs
 * Create program config (for seeding)
 */
export const adminCreateProgram = async (req: Request, res: Response) => {
  try {
    const SpecialProgramConfig = (await import('../models/SpecialProgramConfig')).default;
    const config = await SpecialProgramConfig.create(req.body);

    // Invalidate cache
    await specialProgramService.invalidateConfigCache();

    return sendSuccess(res, config, 'Program config created', 201);
  } catch (error: any) {
    if (error.code === 11000) {
      return sendBadRequest(res, 'Program with this slug already exists');
    }
    return sendError(res, error.message || 'Failed to create program config');
  }
};

/**
 * GET /api/admin/special-programs/:slug/members
 * Paginated member list
 */
export const adminGetMembers = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    if (!isValidSlug(slug)) {
      return sendBadRequest(res, `Invalid program slug: ${slug}`);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as MembershipStatus | undefined;
    const search = req.query.search as string | undefined;

    const { members, total } = await specialProgramService.getProgramMembers(slug, {
      page,
      limit,
      status,
      search,
    });

    return sendPaginated(res, members, page, limit, total, 'Members retrieved');
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to get members');
  }
};

/**
 * PATCH /api/admin/special-programs/:slug/members/:userId
 * Update member status (approve/suspend/revoke/reactivate)
 */
export const adminUpdateMember = async (req: Request, res: Response) => {
  try {
    const { slug, userId } = req.params;
    if (!isValidSlug(slug)) {
      return sendBadRequest(res, `Invalid program slug: ${slug}`);
    }

    const { action, reason, expiresAt } = req.body;

    // Map admin action verbs to membership statuses
    const actionToStatus: Record<string, MembershipStatus> = {
      activate: 'active',
      reactivate: 'active',
      suspend: 'suspended',
      suspended: 'suspended',
      revoke: 'revoked',
      revoked: 'revoked',
      active: 'active',
    };

    const targetStatus = actionToStatus[action];
    if (!targetStatus) {
      return sendBadRequest(res, `Invalid action: ${action}. Must be one of: activate, reactivate, suspend, revoke`);
    }

    // Validate expiresAt if provided
    const parsedExpiresAt = expiresAt ? new Date(expiresAt) : undefined;
    if (parsedExpiresAt && isNaN(parsedExpiresAt.getTime())) {
      return sendBadRequest(res, 'Invalid expiresAt date');
    }

    const adminId = req.user?.id;
    const membership = await specialProgramService.updateMemberStatus(
      userId,
      slug,
      targetStatus,
      reason,
      adminId,
      parsedExpiresAt
    );

    if (!membership) {
      return sendNotFound(res, 'Membership not found');
    }

    return sendSuccess(res, membership, `Member status updated to ${action}`);
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to update member status');
  }
};

/**
 * PATCH /api/admin/special-programs/:slug/toggle
 * Toggle program active/inactive
 */
export const adminToggleProgram = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    if (!isValidSlug(slug)) {
      return sendBadRequest(res, `Invalid program slug: ${slug}`);
    }

    const SpecialProgramConfig = (await import('../models/SpecialProgramConfig')).default;
    const config = await SpecialProgramConfig.findOne({ slug });
    if (!config) {
      return sendNotFound(res, 'Program not found');
    }

    const wasActive = config.isActive;
    config.isActive = !config.isActive;
    await config.save();

    // When deactivating: suspend all active members so they don't silently lose multipliers
    let membersAffected = 0;
    if (wasActive && !config.isActive) {
      const result = await ProgramMembership.updateMany(
        { programSlug: slug, status: 'active' },
        {
          $set: { status: 'suspended' },
          $push: {
            statusHistory: {
              status: 'suspended',
              changedAt: new Date(),
              reason: 'Program deactivated by admin',
              changedBy: req.user?.id ? new (await import('mongoose')).Types.ObjectId(req.user.id) : undefined,
            },
          },
        }
      );
      membersAffected = result.modifiedCount;

      // Invalidate per-user membership caches for all suspended members
      if (membersAffected > 0) {
        await specialProgramService.invalidateMembershipCachesForProgram(slug, 'suspended');
      }
    }

    // Invalidate config cache
    await specialProgramService.invalidateConfigCache();

    return sendSuccess(
      res,
      { isActive: config.isActive, membersAffected },
      `Program ${config.isActive ? 'activated' : 'deactivated'}${membersAffected > 0 ? ` (${membersAffected} members suspended)` : ''}`
    );
  } catch (error: any) {
    return sendError(res, error.message || 'Failed to toggle program');
  }
};
