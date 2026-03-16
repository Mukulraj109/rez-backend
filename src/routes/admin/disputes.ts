import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { disputeService } from '../../services/disputeService';
import { sendSuccess, sendError, sendBadRequest, sendNotFound } from '../../utils/response';
import { logger } from '../../config/logger';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/disputes/stats — Dashboard stats
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await disputeService.getDisputeStats();
    return sendSuccess(res, stats, 'Dispute stats fetched');
  } catch (err: any) {
    logger.error('[ADMIN-DISPUTES] Stats error:', err);
    return sendError(res, 'Failed to fetch stats', 500);
  }
});

/**
 * GET /api/admin/disputes — List all disputes (paginated, filtered)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const filters: any = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.priority) filters.priority = req.query.priority;
    if (req.query.assignedTo) filters.assignedTo = req.query.assignedTo;
    if (req.query.search) filters.search = req.query.search;
    if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
    if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);

    const result = await disputeService.getAdminDisputes(filters, page, limit);

    return sendSuccess(res, result, 'Disputes fetched');
  } catch (err: any) {
    logger.error('[ADMIN-DISPUTES] List error:', err);
    return sendError(res, 'Failed to fetch disputes', 500);
  }
});

/**
 * GET /api/admin/disputes/:id — Get dispute detail
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const dispute = await disputeService.getDisputeById(req.params.id);
    if (!dispute) {
      return sendNotFound(res, 'Dispute not found');
    }
    return sendSuccess(res, dispute, 'Dispute fetched');
  } catch (err: any) {
    logger.error('[ADMIN-DISPUTES] Detail error:', err);
    return sendError(res, 'Failed to fetch dispute', 500);
  }
});

/**
 * POST /api/admin/disputes/:id/assign — Assign dispute to self
 */
router.post('/:id/assign', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).userId;
    const dispute = await disputeService.assignDispute(req.params.id, adminId);
    return sendSuccess(res, dispute, 'Dispute assigned');
  } catch (err: any) {
    logger.error('[ADMIN-DISPUTES] Assign error:', err);
    if (err.message?.includes('not found') || err.message?.includes('not assignable')) {
      return sendNotFound(res, err.message);
    }
    return sendError(res, 'Failed to assign dispute', 500);
  }
});

/**
 * POST /api/admin/disputes/:id/resolve — Resolve dispute
 */
router.post('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).userId;
    const { decision, amount, reason } = req.body;

    if (!decision || !reason) {
      return sendBadRequest(res, 'decision and reason are required');
    }

    const validDecisions = ['refund', 'reject', 'partial_refund'];
    if (!validDecisions.includes(decision)) {
      return sendBadRequest(res, `Invalid decision. Must be one of: ${validDecisions.join(', ')}`);
    }

    if (decision === 'partial_refund' && (!amount || amount <= 0)) {
      return sendBadRequest(res, 'Partial refund requires a positive amount');
    }

    const dispute = await disputeService.resolveDispute({
      disputeId: req.params.id,
      adminId,
      decision,
      amount,
      reason,
    });

    return sendSuccess(res, dispute, `Dispute ${decision === 'reject' ? 'rejected' : 'resolved with refund'}`);
  } catch (err: any) {
    logger.error('[ADMIN-DISPUTES] Resolve error:', err);
    if (err.message?.includes('not found') || err.message?.includes('not in a resolvable')) {
      return sendNotFound(res, err.message);
    }
    if (err.message?.includes('Failed to process refund')) {
      return sendError(res, err.message, 502);
    }
    return sendError(res, 'Failed to resolve dispute', 500);
  }
});

/**
 * POST /api/admin/disputes/:id/escalate — Escalate dispute
 */
router.post('/:id/escalate', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).userId;
    const { reason } = req.body;

    if (!reason) {
      return sendBadRequest(res, 'Escalation reason is required');
    }

    const dispute = await disputeService.escalateDispute(req.params.id, adminId, reason);
    return sendSuccess(res, dispute, 'Dispute escalated');
  } catch (err: any) {
    logger.error('[ADMIN-DISPUTES] Escalate error:', err);
    if (err.message?.includes('not found')) {
      return sendNotFound(res, err.message);
    }
    return sendError(res, 'Failed to escalate dispute', 500);
  }
});

/**
 * POST /api/admin/disputes/:id/note — Add internal note
 */
router.post('/:id/note', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).userId;
    const { note } = req.body;

    if (!note?.trim()) {
      return sendBadRequest(res, 'Note content is required');
    }

    const dispute = await disputeService.addAdminNote(req.params.id, adminId, note);
    return sendSuccess(res, dispute, 'Note added');
  } catch (err: any) {
    logger.error('[ADMIN-DISPUTES] Add note error:', err);
    if (err.message?.includes('not found')) {
      return sendNotFound(res, err.message);
    }
    return sendError(res, 'Failed to add note', 500);
  }
});

export default router;
