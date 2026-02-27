// Admin Support Ticket Routes
// CRUD and management for support tickets

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { SupportTicket } from '../../models/SupportTicket';
import { User } from '../../models/User';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import supportSocketService from '../../services/supportSocketService';

const router = Router();

// All routes require authenticated admin
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /admin/support/tickets — list with pagination + filters
 */
router.get('/tickets', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      priority,
      assignedTo,
      search,
      dateFrom,
      dateTo,
    } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = new Types.ObjectId(assignedTo as string);
    if (search) {
      query.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) query.createdAt.$lte = new Date(dateTo as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('user', 'fullName phoneNumber')
        .populate('assignedTo', 'fullName')
        .lean(),
      SupportTicket.countDocuments(query),
    ]);

    sendSuccess(res, {
      tickets,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error: any) {
    console.error('[Admin Support] Error listing tickets:', error.message);
    sendError(res, 'Failed to list tickets', 500);
  }
});

/**
 * GET /admin/support/tickets/:id — detail with full message thread
 */
router.get('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid ticket ID', 400);
    }

    const ticket = await SupportTicket.findById(id)
      .populate('user', 'fullName phoneNumber')
      .populate('assignedTo', 'fullName')
      .lean();

    if (!ticket) {
      return sendError(res, 'Ticket not found', 404);
    }

    sendSuccess(res, { ticket });
  } catch (error: any) {
    console.error('[Admin Support] Error fetching ticket:', error.message);
    sendError(res, 'Failed to fetch ticket', 500);
  }
});

/**
 * PUT /admin/support/tickets/:id/assign — assign to admin user
 */
router.put('/tickets/:id/assign', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;

    if (!Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid ticket ID', 400);
    }

    const update: any = {};
    if (agentId) {
      if (!Types.ObjectId.isValid(agentId)) {
        return sendError(res, 'Invalid agent ID', 400);
      }
      update.assignedTo = new Types.ObjectId(agentId);
      update.status = 'in_progress';
    } else {
      update.assignedTo = null;
    }

    const ticket = await SupportTicket.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
      .populate('user', 'fullName phoneNumber')
      .populate('assignedTo', 'fullName profile.firstName profile.lastName')
      .lean();

    if (!ticket) {
      return sendError(res, 'Ticket not found', 404);
    }

    // Emit agent assigned event to user
    const userId = (ticket as any).user?._id?.toString();
    if (userId && agentId) {
      const assignedAgent = (ticket as any).assignedTo;
      supportSocketService.emitAgentAssigned(userId, id, {
        id: agentId,
        name: assignedAgent?.fullName || 'Support Agent',
        status: 'online',
      });
    }

    sendSuccess(res, { ticket });
  } catch (error: any) {
    console.error('[Admin Support] Error assigning ticket:', error.message);
    sendError(res, 'Failed to assign ticket', 500);
  }
});

/**
 * POST /admin/support/tickets/:id/messages — agent reply
 */
router.post('/tickets/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { message, attachments } = req.body;
    const adminId = (req as any).userId;

    if (!Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid ticket ID', 400);
    }
    if (!message || message.trim().length === 0) {
      return sendError(res, 'Message is required', 400);
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return sendError(res, 'Ticket not found', 404);
    }

    // Add agent message
    const newMessage = {
      sender: new Types.ObjectId(adminId),
      senderType: 'agent',
      message: message.trim(),
      attachments: attachments || [],
      timestamp: new Date(),
      isRead: false,
    };
    (ticket as any).messages.push(newMessage);

    // Update status to waiting_customer and set first response time if needed
    if (ticket.status === 'open' || ticket.status === 'in_progress') {
      ticket.status = 'waiting_customer' as any;
    }
    if (!ticket.firstResponseAt) {
      ticket.firstResponseAt = new Date();
    }

    await ticket.save();

    // Emit real-time message to user only (not ticket room — admin already added optimistically)
    const userId = ticket.user?.toString();
    if (userId) {
      const admin = await User.findById(adminId).select('profile.firstName profile.lastName').lean();
      const agentName = admin
        ? `${(admin as any).profile?.firstName || ''} ${(admin as any).profile?.lastName || ''}`.trim() || 'Support Agent'
        : 'Support Agent';

      const addedMsg = (ticket as any).messages[(ticket as any).messages.length - 1];
      const messagePayload = {
        ticketId: id,
        message: {
          id: addedMsg._id?.toString(),
          ticketId: id,
          content: message.trim(),
          sender: 'agent',
          senderType: 'agent',
          type: 'text',
          timestamp: addedMsg.timestamp,
          agentName,
          read: false,
          delivered: true,
        },
      };
      // Only emit to user — admin added optimistically, skip ticket room to avoid duplicate
      supportSocketService.emitToUser(userId, 'support_message_received', messagePayload);
    }

    sendSuccess(res, { ticket });
  } catch (error: any) {
    console.error('[Admin Support] Error adding agent message:', error.message);
    sendError(res, 'Failed to add message', 500);
  }
});

/**
 * PUT /admin/support/tickets/:id/status — change status
 */
router.put('/tickets/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid ticket ID', 400);
    }

    const validStatuses = ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return sendError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const update: any = { status };
    if (status === 'resolved') {
      update.resolvedAt = new Date();
    }
    if (status === 'closed') {
      update.closedAt = new Date();
    }

    const ticket = await SupportTicket.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
      .populate('user', 'fullName phoneNumber')
      .populate('assignedTo', 'fullName')
      .lean();

    if (!ticket) {
      return sendError(res, 'Ticket not found', 404);
    }

    // Emit status change event to user
    const userId = (ticket as any).user?._id?.toString();
    if (userId) {
      supportSocketService.emitStatusChanged(userId, id, status);
    }

    sendSuccess(res, { ticket });
  } catch (error: any) {
    console.error('[Admin Support] Error updating status:', error.message);
    sendError(res, 'Failed to update status', 500);
  }
});

/**
 * GET /admin/support/agents — list available agents for assignment
 */
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const admins = await User.find({ role: 'admin', isActive: true })
      .select('profile.firstName profile.lastName email')
      .lean();

    // For each admin, count their open assigned tickets
    const agents = await Promise.all(
      admins.map(async (admin: any) => {
        const openTickets = await SupportTicket.countDocuments({
          assignedTo: admin._id,
          status: { $in: ['open', 'in_progress', 'waiting_customer'] },
        });
        return {
          _id: admin._id,
          fullName: `${admin.profile?.firstName || ''} ${admin.profile?.lastName || ''}`.trim() || 'Admin',
          email: admin.email,
          openTickets,
        };
      })
    );

    sendSuccess(res, { agents });
  } catch (error: any) {
    console.error('[Admin Support] Error fetching agents:', error.message);
    sendError(res, 'Failed to fetch agents', 500);
  }
});

/**
 * GET /admin/support/statistics — dashboard metrics
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const [total, byStatus, byCategory, avgRating] = await Promise.all([
      SupportTicket.countDocuments(),
      SupportTicket.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      SupportTicket.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      SupportTicket.aggregate([
        { $match: { 'rating.score': { $exists: true } } },
        { $group: { _id: null, avg: { $avg: '$rating.score' }, count: { $sum: 1 } } },
      ]),
    ]);

    const statusMap: Record<string, number> = {};
    byStatus.forEach((s: any) => { statusMap[s._id] = s.count; });

    const categoryMap: Record<string, number> = {};
    byCategory.forEach((c: any) => { categoryMap[c._id] = c.count; });

    sendSuccess(res, {
      total,
      byStatus: statusMap,
      byCategory: categoryMap,
      averageRating: avgRating[0]?.avg || 0,
      ratingCount: avgRating[0]?.count || 0,
      openCount: statusMap.open || 0,
      inProgressCount: statusMap.in_progress || 0,
    });
  } catch (error: any) {
    console.error('[Admin Support] Error fetching statistics:', error.message);
    sendError(res, 'Failed to fetch statistics', 500);
  }
});

/**
 * POST /admin/support/tickets/:id/read — mark user messages as read by agent
 */
router.post('/tickets/:id/read', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid ticket ID', 400);
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return sendError(res, 'Ticket not found', 404);
    }

    await ticket.markMessagesAsRead('agent');

    // Notify user in real-time so they see double ticks
    const userId = ticket.user?.toString();
    if (userId) {
      supportSocketService.emitMessagesRead(userId, id, 'agent');
    }

    sendSuccess(res, { message: 'Messages marked as read' });
  } catch (error: any) {
    console.error('[Admin Support] Error marking messages as read:', error.message);
    sendError(res, 'Failed to mark messages as read', 500);
  }
});

export default router;
