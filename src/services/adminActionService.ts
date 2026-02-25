import { AdminAction, AdminActionType } from '../models/AdminAction';
import { Types } from 'mongoose';

/**
 * Admin Action Service — Maker-Checker pattern for sensitive operations
 */
class AdminActionService {
  /**
   * Create a pending admin action requiring approval
   */
  async createAction(
    initiatorId: string,
    actionType: AdminActionType,
    payload: Record<string, any>,
    reason: string,
    threshold: number = 0,
  ) {
    const action = await AdminAction.create({
      actionType,
      initiatorId: new Types.ObjectId(initiatorId),
      status: 'pending_approval',
      payload,
      reason,
      threshold,
    });
    return action;
  }

  /**
   * Approve and execute a pending action
   * Approver must be different from initiator
   */
  async approveAction(approverId: string, actionId: string) {
    const action = await AdminAction.findById(actionId);
    if (!action) throw new Error('Action not found');
    if (action.status !== 'pending_approval') throw new Error('Action is not pending approval');
    if (action.initiatorId.toString() === approverId) {
      throw new Error('Approver cannot be the same as initiator');
    }

    action.approverId = new Types.ObjectId(approverId);
    action.status = 'approved';
    action.executedAt = new Date();
    await action.save();

    return action;
  }

  /**
   * Reject a pending action
   */
  async rejectAction(approverId: string, actionId: string, rejectionReason: string) {
    const action = await AdminAction.findById(actionId);
    if (!action) throw new Error('Action not found');
    if (action.status !== 'pending_approval') throw new Error('Action is not pending approval');

    action.approverId = new Types.ObjectId(approverId);
    action.status = 'rejected';
    action.rejectionReason = rejectionReason;
    await action.save();

    return action;
  }

  /**
   * Get pending actions for a given type
   */
  async getPendingActions(actionType?: AdminActionType) {
    const query: any = { status: 'pending_approval' };
    if (actionType) query.actionType = actionType;
    return AdminAction.find(query)
      .sort({ createdAt: -1 })
      .populate('initiatorId', 'fullName email phoneNumber')
      .lean();
  }

  /**
   * Check if an operation requires maker-checker based on threshold
   */
  requiresApproval(amount: number, threshold: number): boolean {
    return amount >= threshold;
  }
}

export default new AdminActionService();
