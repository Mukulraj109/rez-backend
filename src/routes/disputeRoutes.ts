import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { disputeService } from '../services/disputeService';
import { sendSuccess, sendError, sendBadRequest, sendNotFound } from '../utils/response';
import { logger } from '../config/logger';

const router = Router();

router.use(requireAuth);

/**
 * POST /api/disputes — Create a dispute
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { targetType, targetId, reason, description, evidence } = req.body;

    if (!targetType || !targetId || !reason || !description) {
      return sendBadRequest(res, 'targetType, targetId, reason, and description are required');
    }

    if (description.length > 1000) {
      return sendBadRequest(res, 'Description must be 1000 characters or less');
    }

    const validReasons = [
      'item_not_received', 'wrong_item', 'damaged_item', 'quality_issue',
      'unauthorized_charge', 'double_charge', 'service_not_rendered', 'other',
    ];
    if (!validReasons.includes(reason)) {
      return sendBadRequest(res, `Invalid reason. Must be one of: ${validReasons.join(', ')}`);
    }

    // Validate evidence attachments
    let evidenceData: { description: string; attachments: string[] } | undefined;
    if (evidence) {
      if (!evidence.description) {
        return sendBadRequest(res, 'Evidence must include a description');
      }
      evidenceData = {
        description: evidence.description,
        attachments: Array.isArray(evidence.attachments) ? evidence.attachments.slice(0, 5) : [],
      };
    }

    const dispute = await disputeService.createDispute({
      userId,
      targetType,
      targetId,
      reason,
      description,
      evidence: evidenceData,
    });

    return sendSuccess(res, dispute, 'Dispute created successfully', 201);
  } catch (err: any) {
    logger.error('[DISPUTES] Create dispute error:', err);
    if (err.message?.includes('not found') || err.message?.includes('does not belong')) {
      return sendNotFound(res, err.message);
    }
    if (err.message?.includes('already exists') || err.message?.includes('active dispute')) {
      return sendError(res, err.message, 409);
    }
    if (err.message?.includes('Cannot dispute')) {
      return sendBadRequest(res, err.message);
    }
    return sendError(res, 'Failed to create dispute', 500);
  }
});

/**
 * GET /api/disputes — List user's disputes (paginated)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const result = await disputeService.getUserDisputes(userId, page, limit);

    return sendSuccess(res, result, 'Disputes fetched');
  } catch (err: any) {
    logger.error('[DISPUTES] Get user disputes error:', err);
    return sendError(res, 'Failed to fetch disputes', 500);
  }
});

/**
 * GET /api/disputes/:id — Get dispute detail
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const dispute = await disputeService.getDisputeById(req.params.id);

    if (!dispute) {
      return sendNotFound(res, 'Dispute not found');
    }

    // Ensure user can only see their own disputes
    if (dispute.user.toString() !== userId && (dispute.user as any)?._id?.toString() !== userId) {
      return sendNotFound(res, 'Dispute not found');
    }

    return sendSuccess(res, dispute, 'Dispute fetched');
  } catch (err: any) {
    logger.error('[DISPUTES] Get dispute detail error:', err);
    return sendError(res, 'Failed to fetch dispute', 500);
  }
});

/**
 * POST /api/disputes/:id/evidence — Add evidence to dispute
 */
router.post('/:id/evidence', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { description, attachments } = req.body;

    if (!description) {
      return sendBadRequest(res, 'Evidence description is required');
    }

    const dispute = await disputeService.addUserEvidence({
      disputeId: req.params.id,
      userId,
      description,
      attachments: Array.isArray(attachments) ? attachments.slice(0, 5) : [],
    });

    return sendSuccess(res, dispute, 'Evidence added');
  } catch (err: any) {
    logger.error('[DISPUTES] Add evidence error:', err);
    if (err.message?.includes('not found') || err.message?.includes('not yours')) {
      return sendNotFound(res, err.message);
    }
    if (err.message?.includes('Maximum')) {
      return sendBadRequest(res, err.message);
    }
    return sendError(res, 'Failed to add evidence', 500);
  }
});

export default router;
