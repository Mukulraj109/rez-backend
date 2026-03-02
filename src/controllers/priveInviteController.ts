/**
 * Privé Invite Controller
 *
 * User-facing endpoints for the Privé invite system.
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import priveAccessService from '../services/priveAccessService';
import priveInviteService from '../services/priveInviteService';
import { sendSuccess, sendError, sendBadRequest, sendForbidden, sendPaginated } from '../utils/response';
import gamificationEventBus from '../events/gamificationEventBus';

/**
 * GET /api/prive/access
 * Lightweight access check for navigation guard
 */
export const checkAccessStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const result = await priveAccessService.checkAccess(userId);

    return sendSuccess(res, {
      hasAccess: result.hasAccess,
      accessSource: result.accessSource,
      effectiveTier: result.effectiveTier,
      isWhitelisted: result.isWhitelisted,
      reputation: {
        score: result.reputation.score,
        tier: result.reputation.tier,
        isEligible: result.reputation.isEligible,
      },
    });
  } catch (error: any) {
    console.error('[PriveInvite] Error checking access:', error);
    return sendError(res, 'Failed to check access status');
  }
};

/**
 * POST /api/prive/invites/generate
 * Generate a new invite code
 */
export const generateInviteCode = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const metadata = {
      ip: req.ip || req.headers['x-forwarded-for']?.toString(),
      device: req.headers['user-agent'],
    };

    const inviteCode = await priveInviteService.generateCode(
      new Types.ObjectId(userId),
      metadata
    );

    return sendSuccess(res, {
      code: inviteCode.code,
      expiresAt: inviteCode.expiresAt,
      maxUses: inviteCode.maxUses,
      usageCount: inviteCode.usageCount,
    }, 'Invite code generated successfully');
  } catch (error: any) {
    console.error('[PriveInvite] Error generating code:', error);
    return sendBadRequest(res, error.message || 'Failed to generate invite code');
  }
};

/**
 * POST /api/prive/invites/validate
 * Validate an invite code without applying
 */
export const validateInviteCode = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return sendBadRequest(res, 'Invite code is required');
    }

    const result = await priveInviteService.validateCode(
      code.trim(),
      new Types.ObjectId(userId)
    );

    return sendSuccess(res, result);
  } catch (error: any) {
    console.error('[PriveInvite] Error validating code:', error);
    return sendError(res, 'Failed to validate invite code');
  }
};

/**
 * POST /api/prive/invites/apply
 * Apply an invite code to get Privé access
 */
export const applyInviteCode = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return sendBadRequest(res, 'Invite code is required');
    }

    const metadata = {
      ip: req.ip || req.headers['x-forwarded-for']?.toString(),
      device: req.headers['user-agent'],
      userAgent: req.headers['user-agent'],
    };

    const result = await priveInviteService.applyCode(
      code.trim(),
      new Types.ObjectId(userId),
      metadata
    );

    // Emit invite_applied event for mission progress tracking (for the inviter)
    if (result.inviterReward) {
      gamificationEventBus.emit('invite_applied', {
        userId,
        entityId: code.trim(),
        entityType: 'invite_code',
        metadata: { inviteeId: userId },
        source: { controller: 'priveInviteController', action: 'applyInviteCode' },
      });
    }

    return sendSuccess(res, {
      hasAccess: true,
      inviterReward: result.inviterReward,
      inviteeReward: result.inviteeReward,
    }, 'Welcome to Privé! Your access has been activated.');
  } catch (error: any) {
    console.error('[PriveInvite] Error applying code:', error);
    return sendBadRequest(res, error.message || 'Failed to apply invite code');
  }
};

/**
 * GET /api/prive/invites/stats
 * Get invite dashboard stats for current user
 */
export const getMyInviteStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    // Must have Privé access
    const access = await priveAccessService.checkAccess(userId);
    if (!access.hasAccess) {
      return sendForbidden(res, 'Privé access required');
    }

    const stats = await priveInviteService.getInviteStats(new Types.ObjectId(userId));

    // Get generation eligibility
    const canGenerate = await priveAccessService.canGenerateInvites(new Types.ObjectId(userId));

    return sendSuccess(res, {
      ...stats,
      canGenerate: canGenerate.canGenerate,
      canGenerateReason: canGenerate.reason,
      maxCodes: canGenerate.maxCodes,
      remainingCodes: canGenerate.remainingCodes,
      tier: access.effectiveTier,
      isWhitelisted: access.isWhitelisted,
    });
  } catch (error: any) {
    console.error('[PriveInvite] Error getting stats:', error);
    return sendError(res, 'Failed to load invite stats');
  }
};

/**
 * GET /api/prive/invites/codes
 * Get user's active invite codes
 */
export const getMyInviteCodes = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const access = await priveAccessService.checkAccess(userId);
    if (!access.hasAccess) {
      return sendForbidden(res, 'Privé access required');
    }

    const { default: PriveInviteCode } = await import('../models/PriveInviteCode');
    const codes = await PriveInviteCode.getActiveCodesByCreator(userId);

    return sendSuccess(res, {
      codes: codes.map(c => ({
        id: c._id,
        code: c.code,
        usageCount: c.usageCount,
        maxUses: c.maxUses,
        expiresAt: c.expiresAt,
        createdAt: c.createdAt,
        isActive: c.isActive,
      })),
    });
  } catch (error: any) {
    console.error('[PriveInvite] Error getting codes:', error);
    return sendError(res, 'Failed to load invite codes');
  }
};

/**
 * GET /api/prive/invites/leaderboard
 * Get invite leaderboard (paginated)
 */
export const getInviteLeaderboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const result = await priveInviteService.getLeaderboard({
      page,
      limit,
      userId: userId ? new Types.ObjectId(userId) : undefined,
    });

    return sendSuccess(res, result);
  } catch (error: any) {
    console.error('[PriveInvite] Error getting leaderboard:', error);
    return sendError(res, 'Failed to load leaderboard');
  }
};
