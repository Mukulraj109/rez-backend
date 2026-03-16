import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import adminActionService from '../../services/adminActionService';
import { AdminActionType, AdminActionStatus } from '../../models/AdminAction';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/admin-actions
 * @desc    List pending admin actions (paginated)
 * @access  Admin
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, actionType } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));

    const validTypes: AdminActionType[] = ['manual_adjustment', 'bulk_credit', 'freeze_override', 'config_change', 'cashback_reversal'];
    const typeFilter = actionType && validTypes.includes(actionType as AdminActionType)
      ? (actionType as AdminActionType)
      : undefined;

    const result = await adminActionService.getPendingActions(pageNum, limitNum, typeFilter);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch pending actions' });
  }
});

/**
 * @route   GET /api/admin/admin-actions/history
 * @desc    Get action history (paginated, filterable)
 * @access  Admin
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, actionType, status } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));

    const filters: { actionType?: AdminActionType; status?: AdminActionStatus } = {};
    const validTypes: AdminActionType[] = ['manual_adjustment', 'bulk_credit', 'freeze_override', 'config_change', 'cashback_reversal'];
    const validStatuses: AdminActionStatus[] = ['pending_approval', 'approved', 'rejected', 'executed'];

    if (actionType && validTypes.includes(actionType as AdminActionType)) {
      filters.actionType = actionType as AdminActionType;
    }
    if (status && validStatuses.includes(status as AdminActionStatus)) {
      filters.status = status as AdminActionStatus;
    }

    const result = await adminActionService.getActionHistory(pageNum, limitNum, filters);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch action history' });
  }
});

/**
 * @route   GET /api/admin/admin-actions/threshold
 * @desc    Get current approval threshold
 * @access  Admin
 */
router.get('/threshold', async (_req: Request, res: Response) => {
  try {
    const threshold = await adminActionService.getApprovalThreshold();
    res.json({ success: true, data: { threshold } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch threshold' });
  }
});

/**
 * @route   POST /api/admin/admin-actions/:actionId/approve
 * @desc    Approve and execute a pending action
 * @access  Admin (must be different from initiator)
 */
router.post('/:actionId/approve', async (req: Request, res: Response) => {
  try {
    const approverId = String((req as any).userId);
    const action = await adminActionService.approveAction(approverId, req.params.actionId);
    res.json({ success: true, message: 'Action approved and executed', data: { action } });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404
      : error.message.includes('same as initiator') ? 403
      : error.message.includes('not pending') ? 409
      : 400;
    res.status(status).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/admin/admin-actions/:actionId/reject
 * @desc    Reject a pending action
 * @access  Admin
 */
router.post('/:actionId/reject', async (req: Request, res: Response) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason?.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const approverId = String((req as any).userId);
    const action = await adminActionService.rejectAction(approverId, req.params.actionId, rejectionReason.trim());
    res.json({ success: true, message: 'Action rejected', data: { action } });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404
      : error.message.includes('not pending') ? 409
      : 400;
    res.status(status).json({ success: false, message: error.message });
  }
});

export default router;
